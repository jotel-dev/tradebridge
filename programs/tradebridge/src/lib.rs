use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("3dmv4RrSanjP9Qdaj4E3D9ra9YNJrDg4QZP9sCmaK81v");

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
    ///    - Status must be `ShipmentConfirmed`.
    ///    - Transfers the escrowed tokens to the seller's token account using the PDA's seeds to sign.
    pub fn release_funds(ctx: Context<ReleaseFunds>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

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
            escrow.amount,
        )?;

        // Update status to Released.
        escrow.status = EscrowStatus::Released;

        msg!(
            "Funds released to seller {}. Amount = {}",
            escrow.seller,
            escrow.amount
        );

        Ok(())
    }

    /// 4. refund_if_expired:
    ///    - Called by the buyer if the deadline passed without shipment confirmation.
    ///    - Status MUST be `Created` (if shipment was confirmed, buyer cannot refund).
    ///    - Current on-chain timestamp must be strictly greater than the deadline.
    pub fn refund_if_expired(ctx: Context<RefundIfExpired>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

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
            escrow.amount,
        )?;

        // Update status to Refunded.
        escrow.status = EscrowStatus::Refunded;

        msg!(
            "Escrow refunded to buyer {}. Amount = {}",
            escrow.buyer,
            escrow.amount
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
    pub buyer: Signer<'info>,

    /// The Escrow state PDA.
    #[account(
        mut,
        has_one = buyer @ TradeBridgeError::UnauthorizedBuyer,
        seeds = [b"escrow", escrow.buyer.as_ref(), escrow.seller.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, TradeEscrow>,

    /// Token mint of the held assets.
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
    pub buyer: Signer<'info>,

    /// The Escrow state PDA.
    #[account(
        mut,
        has_one = buyer @ TradeBridgeError::UnauthorizedBuyer,
        seeds = [b"escrow", escrow.buyer.as_ref(), escrow.seller.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, TradeEscrow>,

    /// Token mint of the held assets.
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

// ==============================================================================
// STATE ACCOUNT AND ENUMS
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
}
