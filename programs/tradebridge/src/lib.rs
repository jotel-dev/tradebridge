use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("3dmv4RrSanjP9Qdaj4E3D9ra9YNJrDg4QZP9sCmaK81v");

/// Compile-time designated arbiter public key for resolving disputes.
pub const ARBITER: Pubkey = pubkey!("78ubWYfiyGatWLPkmP7FkssbshanZ6vYyC1nf4KchmWr");

#[program]
pub mod tradebridge {
    use super::*;

    /// 1. create_trade_escrow:
    ///    - The buyer deposits tokens into an Associated Token Account (ATA) owned by the escrow PDA.
    ///    - Sets the status to Created.
    ///    - Validates that amount > 0 and the deadline is in the future.
    pub fn create_trade_escrow(
        ctx: Context<CreateTradeEscrow>,
        amount: u64,
        deadline: i64,
    ) -> Result<()> {
        // Validation: The escrowed amount must be greater than zero.
        require!(amount > 0, TradeBridgeError::InvalidAmount);

        // Validation: Deadline must be in the future relative to the on-chain Clock.
        let clock = Clock::get()?;
        require!(
            deadline > clock.unix_timestamp,
            TradeBridgeError::DeadlineInPast
        );

        // CPI (Cross-Program Invocation) to the SPL Token Program:
        // We transfer `amount` tokens from the buyer's token account into the escrow PDA's token account.
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.escrow_token_account.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            amount,
        )?;

        // Populate the TradeEscrow PDA state account.
        let escrow = &mut ctx.accounts.escrow;
        escrow.buyer = ctx.accounts.buyer.key();
        escrow.seller = ctx.accounts.seller.key();
        escrow.mint = ctx.accounts.mint.key();
        escrow.amount = amount;
        escrow.deadline = deadline;
        escrow.status = EscrowStatus::Created;
        escrow.tracking_ref = String::new();
        escrow.bump = ctx.bumps.escrow;

        msg!(
            "Escrow created: Buyer={}, Seller={}, Amount={}, Deadline={}",
            escrow.buyer,
            escrow.seller,
            escrow.amount,
            escrow.deadline
        );

        Ok(())
    }

    /// 2. confirm_shipment:
    ///    - Called by the designated seller to register shipping details (tracking reference).
    ///    - Status must be `Created`. Transitions to `ShipmentConfirmed`.
    pub fn confirm_shipment(
        ctx: Context<ConfirmShipment>,
        tracking_ref: String,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        // Validation: Must be in Created state (reject if already confirmed, released, or refunded).
        require!(
            escrow.status == EscrowStatus::Created,
            TradeBridgeError::InvalidStatusForShipment
        );

        // Validation: Tracking reference cannot be empty and max 100 characters.
        require!(
            !tracking_ref.trim().is_empty(),
            TradeBridgeError::EmptyTrackingRef
        );
        require!(
            tracking_ref.len() <= 100,
            TradeBridgeError::TrackingRefTooLong
        );

        // Store the tracking reference and advance the lifecycle state.
        escrow.tracking_ref = tracking_ref;
        escrow.status = EscrowStatus::ShipmentConfirmed;

        msg!(
            "Shipment confirmed for seller {}: Tracking Ref = {}",
            escrow.seller,
            escrow.tracking_ref
        );

        Ok(())
    }

    /// 3. release_funds:
    ///    - Called by the buyer once satisfied with shipment/goods.
    ///    - Status must be `ShipmentConfirmed`. Cannot be released if disputed.
    ///    - Transfers the escrowed tokens to the seller's token account using the PDA's seeds to sign.
    pub fn release_funds(ctx: Context<ReleaseFunds>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        // Validation: Escrow cannot be disputed
        require!(
            escrow.status != EscrowStatus::Disputed,
            TradeBridgeError::EscrowDisputed
        );

        // Validation: Funds can only be released after the seller has confirmed shipment.
        require!(
            escrow.status == EscrowStatus::ShipmentConfirmed,
            TradeBridgeError::ShipmentNotConfirmed
        );

        // Seeds for PDA signing:
        // Since the escrow token account authority is the Escrow PDA,
        // the program must authorize the token transfer using the PDA seeds and bump.
        let buyer_key = escrow.buyer;
        let seller_key = escrow.seller;
        let bump = escrow.bump;
        let amount = escrow.amount;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            buyer_key.as_ref(),
            seller_key.as_ref(),
            &[bump],
        ]];

        // CPI transfer from Escrow ATA to Seller's ATA with PDA signature:
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.seller_token_account.to_account_info(),
                    authority: escrow.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        // Close the escrow_token_account (vault) and return rent to buyer:
        token::close_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::CloseAccount {
                    account: ctx.accounts.escrow_token_account.to_account_info(),
                    destination: ctx.accounts.buyer.to_account_info(),
                    authority: escrow.to_account_info(),
                },
                signer_seeds,
            ),
        )?;

        msg!(
            "Funds released to seller {}. Amount = {}. Escrow and vault closed; rent reclaimed.",
            seller_key,
            amount
        );

        Ok(())
    }

    /// 4. refund_if_expired:
    ///    - Called by the buyer if the deadline passed without shipment confirmation.
    ///    - Status MUST be `Created` (if shipment was confirmed, buyer cannot refund). Cannot be refunded if disputed.
    ///    - Current on-chain timestamp must be strictly greater than the deadline.
    pub fn refund_if_expired(ctx: Context<RefundIfExpired>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        // Validation: Escrow cannot be disputed
        require!(
            escrow.status != EscrowStatus::Disputed,
            TradeBridgeError::EscrowDisputed
        );

        // Validation: Cannot refund if shipment has already been confirmed (or already released/refunded).
        require!(
            escrow.status == EscrowStatus::Created,
            TradeBridgeError::InvalidStatusForRefund
        );

        // Validation: The deadline must have expired on-chain.
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp > escrow.deadline,
            TradeBridgeError::DeadlineNotPassed
        );

        // Seeds for PDA signing:
        let buyer_key = escrow.buyer;
        let seller_key = escrow.seller;
        let bump = escrow.bump;
        let amount = escrow.amount;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            buyer_key.as_ref(),
            seller_key.as_ref(),
            &[bump],
        ]];

        // CPI transfer from Escrow ATA back to Buyer's ATA with PDA signature:
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: escrow.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        // Close the escrow_token_account (vault) and return rent to buyer:
        token::close_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::CloseAccount {
                    account: ctx.accounts.escrow_token_account.to_account_info(),
                    destination: ctx.accounts.buyer.to_account_info(),
                    authority: escrow.to_account_info(),
                },
                signer_seeds,
            ),
        )?;

        msg!(
            "Escrow refunded to buyer {}. Amount = {}. Escrow and vault closed; rent reclaimed.",
            buyer_key,
            amount
        );

        Ok(())
    }

    /// 5. raise_dispute:
    ///    - Called by either the buyer OR the seller stored in the escrow.
    ///    - Current status must be `ShipmentConfirmed`.
    ///    - Updates status to `Disputed` and emits `DisputeRaised` event.
    ///    - Freezes the escrow from unilateral release or refund.
    pub fn raise_dispute(ctx: Context<RaiseDispute>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        // Validation: Cannot raise dispute if already disputed.
        require!(
            escrow.status != EscrowStatus::Disputed,
            TradeBridgeError::DisputeAlreadyRaised
        );

        // Validation: A dispute only makes sense after shipment is confirmed and before funds are released.
        require!(
            escrow.status == EscrowStatus::ShipmentConfirmed,
            TradeBridgeError::InvalidStatusForDispute
        );

        // Transition status to Disputed
        escrow.status = EscrowStatus::Disputed;

        // Emit on-chain indexable event for off-chain indexers and arbitration systems
        emit!(DisputeRaised {
            escrow: escrow.key(),
            buyer: escrow.buyer,
            seller: escrow.seller,
            amount: escrow.amount,
        });

        msg!(
            "Dispute raised for escrow {}: Buyer={}, Seller={}, Signer={}",
            escrow.key(),
            escrow.buyer,
            escrow.seller,
            ctx.accounts.signer.key()
        );

        Ok(())
    }

    /// 6. resolve_dispute:
    ///    - Called by the designated arbiter to resolve an escrow in Disputed status.
    ///    - If release_to_seller is true, transfers full amount to seller_token_account.
    ///    - If release_to_seller is false, refunds full amount to buyer_token_account.
    ///    - Closes the vault token account and the escrow account, returning rent to buyer.
    ///    - Emits DisputeResolved event.
    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        release_to_seller: bool,
    ) -> Result<()> {
        let escrow = &ctx.accounts.escrow;

        // Validation: Escrow must be in Disputed status
        require!(
            escrow.status == EscrowStatus::Disputed,
            TradeBridgeError::InvalidStatusForResolution
        );

        // Copy needed fields into locals before CPIs
        let escrow_key = escrow.key();
        let buyer_key = escrow.buyer;
        let seller_key = escrow.seller;
        let bump = escrow.bump;
        let amount = escrow.amount;

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            buyer_key.as_ref(),
            seller_key.as_ref(),
            &[bump],
        ]];

        let destination = if release_to_seller {
            ctx.accounts.seller_token_account.to_account_info()
        } else {
            ctx.accounts.buyer_token_account.to_account_info()
        };

        // Transfer full amount from escrow vault to destination
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: destination,
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        // Close vault token account and return rent to buyer
        token::close_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::CloseAccount {
                    account: ctx.accounts.escrow_token_account.to_account_info(),
                    destination: ctx.accounts.buyer.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer_seeds,
            ),
        )?;

        // Emit DisputeResolved event
        emit!(DisputeResolved {
            escrow: escrow_key,
            buyer: buyer_key,
            seller: seller_key,
            amount,
            released_to_seller: release_to_seller,
        });

        msg!(
            "Dispute resolved for escrow {}: release_to_seller={}, amount={}",
            escrow_key,
            release_to_seller,
            amount
        );

        Ok(())
    }
}

// ==============================================================================
// ACCOUNTS CONTEXT STRUCTS
// ==============================================================================

/// Context for creating an escrow and locking buyer funds.
#[derive(Accounts)]
pub struct CreateTradeEscrow<'info> {
    /// The buyer funding the escrow. Must sign and pay the lamports for account rent.
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: The designated seller. Unchecked because seller does not need to sign
    /// or exist as an initialized account at creation time; used solely as a seed for the PDA.
    pub seller: AccountInfo<'info>,

    /// The SPL token mint of the currency being traded (e.g., USDC).
    pub mint: Account<'info, Mint>,

    /// The buyer's token account containing the tokens to deposit.
    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key() @ TradeBridgeError::InvalidBuyerTokenAccount,
        constraint = buyer_token_account.mint == mint.key() @ TradeBridgeError::InvalidTokenMint,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// The Escrow state PDA, derived from [b"escrow", buyer_pubkey, seller_pubkey].
    #[account(
        init,
        payer = buyer,
        space = 8 + TradeEscrow::INIT_SPACE,
        seeds = [b"escrow", buyer.key().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, TradeEscrow>,

    /// The Associated Token Account (ATA) owned by the escrow PDA to safely custody the funds.
    #[account(
        init,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = escrow,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// Context for seller confirming shipment with a tracking number.
#[derive(Accounts)]
pub struct ConfirmShipment<'info> {
    /// Must be the designated seller stored in the escrow. `has_one` validates `seller == escrow.seller`.
    pub seller: Signer<'info>,

    /// The Escrow state PDA to update.
    #[account(
        mut,
        has_one = seller @ TradeBridgeError::UnauthorizedSeller,
        seeds = [b"escrow", escrow.buyer.as_ref(), escrow.seller.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, TradeEscrow>,
}

/// Context for buyer releasing the escrowed tokens to the seller.
#[derive(Accounts)]
pub struct ReleaseFunds<'info> {
    /// Must be the designated buyer stored in the escrow. `has_one` validates `buyer == escrow.buyer`.
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// The Escrow state PDA, closed and rent returned to the buyer upon completion.
    #[account(
        mut,
        close = buyer,
        has_one = buyer @ TradeBridgeError::UnauthorizedBuyer,
        seeds = [b"escrow", escrow.buyer.as_ref(), escrow.seller.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, TradeEscrow>,

    /// Token mint of the held assets.
    #[account(
        constraint = mint.key() == escrow.mint @ TradeBridgeError::InvalidTokenMint,
    )]
    pub mint: Account<'info, Mint>,

    /// The escrow PDA's token vault holding the tokens.
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// The seller's token account that will receive the funds.
    #[account(
        mut,
        constraint = seller_token_account.owner == escrow.seller @ TradeBridgeError::InvalidSellerTokenAccount,
        constraint = seller_token_account.mint == mint.key() @ TradeBridgeError::InvalidTokenMint,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

/// Context for buyer claiming a refund if deadline expired without shipment.
#[derive(Accounts)]
pub struct RefundIfExpired<'info> {
    /// Must be the designated buyer stored in the escrow. `has_one` validates `buyer == escrow.buyer`.
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// The Escrow state PDA, closed and rent returned to the buyer upon refund.
    #[account(
        mut,
        close = buyer,
        has_one = buyer @ TradeBridgeError::UnauthorizedBuyer,
        seeds = [b"escrow", escrow.buyer.as_ref(), escrow.seller.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, TradeEscrow>,

    /// Token mint of the held assets.
    #[account(
        constraint = mint.key() == escrow.mint @ TradeBridgeError::InvalidTokenMint,
    )]
    pub mint: Account<'info, Mint>,

    /// The escrow PDA's token vault holding the tokens.
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// The buyer's token account receiving the refunded funds.
    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key() @ TradeBridgeError::InvalidBuyerTokenAccount,
        constraint = buyer_token_account.mint == mint.key() @ TradeBridgeError::InvalidTokenMint,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

/// Context for raising a dispute on an escrow.
#[derive(Accounts)]
pub struct RaiseDispute<'info> {
    /// Signer can be either the designated buyer OR the designated seller stored in the escrow.
    #[account(
        constraint = signer.key() == escrow.buyer || signer.key() == escrow.seller @ TradeBridgeError::UnauthorizedParty,
    )]
    pub signer: Signer<'info>,

    /// The Escrow state PDA to transition into Disputed status.
    #[account(
        mut,
        seeds = [b"escrow", escrow.buyer.as_ref(), escrow.seller.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, TradeEscrow>,
}

/// Context for designated arbiter resolving a disputed escrow.
#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    /// Must be the compile-time designated arbiter.
    #[account(
        constraint = arbiter.key() == ARBITER @ TradeBridgeError::UnauthorizedArbiter,
    )]
    pub arbiter: Signer<'info>,

    /// The buyer account receiving rent reclaimed from closing the escrow PDA and vault ATA.
    /// CHECK: Validated against escrow.buyer constraint.
    #[account(
        mut,
        constraint = buyer.key() == escrow.buyer @ TradeBridgeError::UnauthorizedBuyer,
    )]
    pub buyer: AccountInfo<'info>,

    /// The Escrow state PDA, closed and rent returned to the buyer upon resolution.
    #[account(
        mut,
        close = buyer,
        seeds = [b"escrow", escrow.buyer.as_ref(), escrow.seller.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, TradeEscrow>,

    /// Token mint of the held assets.
    #[account(
        constraint = mint.key() == escrow.mint @ TradeBridgeError::InvalidTokenMint,
    )]
    pub mint: Account<'info, Mint>,

    /// The escrow PDA's token vault holding the tokens.
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// The buyer's token account receiving refunded funds if released to buyer.
    #[account(
        mut,
        constraint = buyer_token_account.owner == escrow.buyer @ TradeBridgeError::InvalidBuyerTokenAccount,
        constraint = buyer_token_account.mint == mint.key() @ TradeBridgeError::InvalidTokenMint,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// The seller's token account receiving funds if released to seller.
    #[account(
        mut,
        constraint = seller_token_account.owner == escrow.seller @ TradeBridgeError::InvalidSellerTokenAccount,
        constraint = seller_token_account.mint == mint.key() @ TradeBridgeError::InvalidTokenMint,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ==============================================================================
// STATE ACCOUNT, EVENTS, AND ENUMS
// ==============================================================================

/// TradeEscrow PDA Account data structure.
/// Holds the parties, agreed amount, deadline, status, and shipping info.
#[account]
#[derive(InitSpace)]
pub struct TradeEscrow {
    /// Public key of the buyer
    pub buyer: Pubkey,
    /// Public key of the seller
    pub seller: Pubkey,
    /// Token mint of the escrowed funds
    pub mint: Pubkey,
    /// Escrowed amount in token base units
    pub amount: u64,
    /// Unix timestamp expiration deadline
    pub deadline: i64,
    /// Current status in the escrow workflow
    pub status: EscrowStatus,
    /// Shipping tracking reference string (max 100 chars)
    #[max_len(100)]
    pub tracking_ref: String,
    /// PDA bump seed stored at creation to avoid re-deriving
    pub bump: u8,
}

/// Lifecycle states of a TradeEscrow.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum EscrowStatus {
    /// Initialized with tokens locked in escrow ATA
    Created,
    /// Seller submitted shipping tracking reference
    ShipmentConfirmed,
    /// Buyer accepted goods and released funds to seller
    Released,
    /// Deadline passed without shipment; funds refunded to buyer
    Refunded,
    /// Dispute raised by buyer or seller; escrow frozen pending resolution
    Disputed,
}

/// Event emitted when a dispute is raised for an escrow.
#[event]
pub struct DisputeRaised {
    pub escrow: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount: u64,
}

/// Event emitted when a dispute is resolved by the arbiter.
#[event]
pub struct DisputeResolved {
    pub escrow: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount: u64,
    pub released_to_seller: bool,
}

// ==============================================================================
// CUSTOM ERROR CODES
// ==============================================================================

#[error_code]
pub enum TradeBridgeError {
    #[msg("Escrow deposit amount must be greater than zero.")]
    InvalidAmount,

    #[msg("The escrow deadline must be in the future.")]
    DeadlineInPast,

    #[msg("Signer is not authorized: only the designated seller can confirm shipment.")]
    UnauthorizedSeller,

    #[msg("Signer is not authorized: only the designated buyer can execute this action.")]
    UnauthorizedBuyer,

    #[msg("Shipment can only be confirmed when escrow status is Created.")]
    InvalidStatusForShipment,

    #[msg("Tracking reference must not exceed 100 characters.")]
    TrackingRefTooLong,

    #[msg("Tracking reference cannot be empty.")]
    EmptyTrackingRef,

    #[msg("Funds cannot be released until the seller has confirmed shipment.")]
    ShipmentNotConfirmed,

    #[msg("Refund is not allowed: shipment has already been confirmed or trade is already finalized.")]
    InvalidStatusForRefund,

    #[msg("The escrow deadline has not yet passed; refund is not yet available.")]
    DeadlineNotPassed,

    #[msg("The provided token account does not belong to the buyer.")]
    InvalidBuyerTokenAccount,

    #[msg("The provided token account does not belong to the seller.")]
    InvalidSellerTokenAccount,

    #[msg("The token account mint does not match the escrow token mint.")]
    InvalidTokenMint,

    #[msg("Signer is not authorized: must be either the buyer or the seller.")]
    UnauthorizedParty,

    #[msg("A dispute has already been raised for this escrow.")]
    DisputeAlreadyRaised,

    #[msg("Disputes can only be raised after shipment has been confirmed and before funds are released.")]
    InvalidStatusForDispute,

    #[msg("Escrow is disputed and all funds actions are frozen pending resolution.")]
    EscrowDisputed,

    #[msg("Signer is not authorized: only the designated arbiter can resolve disputes.")]
    UnauthorizedArbiter,

    #[msg("Escrow must be in Disputed status to be resolved.")]
    InvalidStatusForResolution,
}
