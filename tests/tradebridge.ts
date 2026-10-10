import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Tradebridge } from "../target/types/tradebridge";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

describe("tradebridge escrow tests", () => {
  // Configure the Anchor client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Tradebridge as Program<Tradebridge>;
  const payer = (provider.wallet as anchor.Wallet).payer;

  // Load designated arbiter keypair from ~/tradebridge-arbiter.json (if present)
  const arbiterKeyPath = path.join(os.homedir(), "tradebridge-arbiter.json");
  const hasArbiterKey = fs.existsSync(arbiterKeyPath);
  let arbiter: anchor.web3.Keypair;
  if (hasArbiterKey) {
    const arbiterKeyData = JSON.parse(fs.readFileSync(arbiterKeyPath, "utf-8"));
    arbiter = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(arbiterKeyData));
  } else {
    arbiter = anchor.web3.Keypair.generate();
  }

  let arbiterSkipNoticeLogged = false;
  function skipIfNoArbiter(testCtx: Mocha.Context) {
    if (!hasArbiterKey) {
      if (!arbiterSkipNoticeLogged) {
        console.log("Skipping arbiter tests: arbiter keypair not found (devnet-only key, not included in repo)");
        arbiterSkipNoticeLogged = true;
      }
      testCtx.skip();
    }
  }

  let mint: anchor.web3.PublicKey;

  // Helper to wait for given milliseconds
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Helper to fetch current validator on-chain timestamp
  const getOnChainTimestamp = async (): Promise<number> => {
    try {
      const slot = await provider.connection.getSlot();
      const blockTime = await provider.connection.getBlockTime(slot);
      if (blockTime !== null && blockTime !== undefined) {
        return blockTime;
      }
    } catch (e) {}
    return Math.floor(Date.now() / 1000);
  };

  // Helper to derive the Escrow PDA and its ATA
  const getEscrowPdaAndAta = (
    buyer: anchor.web3.PublicKey,
    seller: anchor.web3.PublicKey,
    tokenMint: anchor.web3.PublicKey
  ) => {
    const [escrowPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        buyer.toBuffer(),
        seller.toBuffer(),
      ],
      program.programId
    );

    const escrowAta = getAssociatedTokenAddressSync(
      tokenMint,
      escrowPda,
      true // allowOwnerOffCurve = true because escrowPda is a PDA
    );

    return { escrowPda, escrowAta };
  };

  // Helper to set up a fresh buyer & seller with SOL and test SPL tokens
  const setupBuyerAndSeller = async (initialBuyerTokens = 1000 * 1_000_000) => {
    const buyer = anchor.web3.Keypair.generate();
    const seller = anchor.web3.Keypair.generate();

    // Airdrop SOL to both buyer and seller for transaction fees and rent
    const airdropBuyer = await provider.connection.requestAirdrop(
      buyer.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    const airdropSeller = await provider.connection.requestAirdrop(
      seller.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: airdropBuyer,
      ...latestBlockhash,
    });
    await provider.connection.confirmTransaction({
      signature: airdropSeller,
      ...latestBlockhash,
    });

    // Create Associated Token Accounts for buyer and seller
    const buyerAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      buyer.publicKey
    );

    const sellerAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      seller.publicKey
    );

    // Mint test tokens into the buyer's account
    if (initialBuyerTokens > 0) {
      await mintTo(
        provider.connection,
        payer,
        mint,
        buyerAta,
        payer,
        initialBuyerTokens
      );
    }

    return { buyer, seller, buyerAta, sellerAta };
  };

  before(async () => {
    // Fund arbiter keypair on the test validator if present
    if (hasArbiterKey) {
      const airdropArbiter = await provider.connection.requestAirdrop(
        arbiter.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      const latestBh = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction({
        signature: airdropArbiter,
        ...latestBh,
      });
    }

    // Create test SPL Token Mint (decimals: 6, representing USDC)
    mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      6
    );
  });

  // -------------------------------------------------------------------------
  // TEST 1: Happy Path
  // -------------------------------------------------------------------------
  it("1. Happy path: create escrow -> confirm shipment -> release funds", async () => {
    const { buyer, seller, buyerAta, sellerAta } = await setupBuyerAndSeller();
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const escrowAmount = new anchor.BN(100 * 1_000_000); // 100 tokens
    const now = await getOnChainTimestamp();
    const deadline = new anchor.BN(now + 3600); // 1 hour in future

    // Step A: Buyer creates escrow
    await program.methods
      .createTradeEscrow(escrowAmount, deadline)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // Verify state after creation
    let escrowAccount = await program.account.tradeEscrow.fetch(escrowPda);
    expect(escrowAccount.buyer.toBase58()).to.equal(buyer.publicKey.toBase58());
    expect(escrowAccount.seller.toBase58()).to.equal(seller.publicKey.toBase58());
    expect(escrowAccount.mint.toBase58()).to.equal(mint.toBase58());
    expect(escrowAccount.amount.toNumber()).to.equal(escrowAmount.toNumber());
    expect(escrowAccount.status.created).to.not.be.undefined;

    // Verify token balances: Escrow ATA holds 100 tokens
    let escrowAtaAccount = await getAccount(provider.connection, escrowAta);
    expect(Number(escrowAtaAccount.amount)).to.equal(escrowAmount.toNumber());

    // Step B: Seller confirms shipment with tracking reference
    const trackingRef = "FEDEX-TRACK-998877";
    await program.methods
      .confirmShipment(trackingRef)
      .accountsPartial({
        seller: seller.publicKey,
        escrow: escrowPda,
      })
      .signers([seller])
      .rpc();

    escrowAccount = await program.account.tradeEscrow.fetch(escrowPda);
    expect(escrowAccount.status.shipmentConfirmed).to.not.be.undefined;
    expect(escrowAccount.trackingRef).to.equal(trackingRef);

    // Step C: Buyer releases funds to seller
    await program.methods
      .releaseFunds()
      .accountsPartial({
        buyer: buyer.publicKey,
        escrow: escrowPda,
        mint,
        escrowTokenAccount: escrowAta,
        sellerTokenAccount: sellerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    // Assert: Escrow PDA is closed and rent returned to buyer
    const closedEscrowAccount = await program.account.tradeEscrow.fetchNullable(escrowPda);
    expect(closedEscrowAccount).to.be.null;

    // Assert: Escrow Token Account is closed
    const closedEscrowAtaInfo = await provider.connection.getAccountInfo(escrowAta);
    expect(closedEscrowAtaInfo).to.be.null;

    // Assert: Seller's token balance increased by the escrowed amount
    const sellerAtaAccount = await getAccount(provider.connection, sellerAta);
    expect(Number(sellerAtaAccount.amount)).to.equal(escrowAmount.toNumber());
  });

  // -------------------------------------------------------------------------
  // TEST 2: Refund Path
  // -------------------------------------------------------------------------
  it("2. Refund path: create escrow -> wait for deadline expiry -> refund", async () => {
    const { buyer, seller, buyerAta } = await setupBuyerAndSeller();
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const escrowAmount = new anchor.BN(50 * 1_000_000);
    const initialBuyerBalance = 1000 * 1_000_000;

    // Set deadline 2 seconds in the future relative to the on-chain clock
    const now = await getOnChainTimestamp();
    const deadline = new anchor.BN(now + 2);

    // Buyer creates escrow
    await program.methods
      .createTradeEscrow(escrowAmount, deadline)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // Wait until the on-chain Clock has strictly exceeded the deadline
    while (true) {
      await sleep(1000);
      const currentTime = await getOnChainTimestamp();
      if (currentTime > deadline.toNumber()) {
        break;
      }
    }

    // Buyer calls refund_if_expired
    await program.methods
      .refundIfExpired()
      .accountsPartial({
        buyer: buyer.publicKey,
        escrow: escrowPda,
        mint,
        escrowTokenAccount: escrowAta,
        buyerTokenAccount: buyerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    // Assert: Escrow PDA is closed and rent returned to buyer
    const closedEscrowAccount = await program.account.tradeEscrow.fetchNullable(escrowPda);
    expect(closedEscrowAccount).to.be.null;

    // Assert: Escrow Token Account is closed
    const closedEscrowAtaInfo = await provider.connection.getAccountInfo(escrowAta);
    expect(closedEscrowAtaInfo).to.be.null;

    // Assert: Buyer's token balance is fully restored to 1000 tokens
    const buyerAtaAccount = await getAccount(provider.connection, buyerAta);
    expect(Number(buyerAtaAccount.amount)).to.equal(initialBuyerBalance);
  });

  // -------------------------------------------------------------------------
  // TEST 3: Reject: Wrong Signer Confirms Shipment
  // -------------------------------------------------------------------------
  it("3. Reject: wrong signer confirms shipment (UnauthorizedSeller)", async () => {
    const { buyer, seller, buyerAta } = await setupBuyerAndSeller();
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const escrowAmount = new anchor.BN(10 * 1_000_000);
    const now = await getOnChainTimestamp();
    const deadline = new anchor.BN(now + 3600);

    await program.methods
      .createTradeEscrow(escrowAmount, deadline)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // Generate an attacker keypair who is NOT the designated seller
    const attacker = anchor.web3.Keypair.generate();
    const airdropAttacker = await provider.connection.requestAirdrop(
      attacker.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: airdropAttacker,
      ...latestBlockhash,
    });

    try {
      await program.methods
        .confirmShipment("FAKE-TRACKING-123")
        .accountsPartial({
          seller: attacker.publicKey,
          escrow: escrowPda,
        })
        .signers([attacker])
        .rpc();
      expect.fail("Should have thrown UnauthorizedSeller error");
    } catch (err: any) {
      const errMsg = err.toString();
      expect(
        errMsg.includes("UnauthorizedSeller") || errMsg.includes("6002")
      ).to.be.true;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 4: Reject: Release Before Shipment Confirmed
  // -------------------------------------------------------------------------
  it("4. Reject: release before shipment confirmed (ShipmentNotConfirmed)", async () => {
    const { buyer, seller, buyerAta, sellerAta } = await setupBuyerAndSeller();
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const escrowAmount = new anchor.BN(20 * 1_000_000);
    const now = await getOnChainTimestamp();
    const deadline = new anchor.BN(now + 3600);

    await program.methods
      .createTradeEscrow(escrowAmount, deadline)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // Immediately try to release funds without the seller confirming shipment
    try {
      await program.methods
        .releaseFunds()
        .accountsPartial({
          buyer: buyer.publicKey,
          escrow: escrowPda,
          mint,
          escrowTokenAccount: escrowAta,
          sellerTokenAccount: sellerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();
      expect.fail("Should have thrown ShipmentNotConfirmed error");
    } catch (err: any) {
      expect(err.toString()).to.include("ShipmentNotConfirmed");
    }
  });

  // -------------------------------------------------------------------------
  // TEST 5: Reject: Double Release
  // -------------------------------------------------------------------------
  it("5. Reject: double release (cannot release already released escrow)", async () => {
    const { buyer, seller, buyerAta, sellerAta } = await setupBuyerAndSeller();
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const escrowAmount = new anchor.BN(15 * 1_000_000);
    const now = await getOnChainTimestamp();
    const deadline = new anchor.BN(now + 3600);

    // Create -> Confirm -> Release
    await program.methods
      .createTradeEscrow(escrowAmount, deadline)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    await program.methods
      .confirmShipment("TRACK-DOUBLE-REL")
      .accountsPartial({
        seller: seller.publicKey,
        escrow: escrowPda,
      })
      .signers([seller])
      .rpc();

    await program.methods
      .releaseFunds()
      .accountsPartial({
        buyer: buyer.publicKey,
        escrow: escrowPda,
        mint,
        escrowTokenAccount: escrowAta,
        sellerTokenAccount: sellerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    // Try releasing a second time (fails because escrow account has already been closed)
    try {
      await program.methods
        .releaseFunds()
        .accountsPartial({
          buyer: buyer.publicKey,
          escrow: escrowPda,
          mint,
          escrowTokenAccount: escrowAta,
          sellerTokenAccount: sellerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();
      expect.fail("Should have failed on second release attempt");
    } catch (err: any) {
      const errMsg = err.toString();
      expect(
        errMsg.includes("AccountNotInitialized") ||
        errMsg.includes("3012") ||
        errMsg.includes("ShipmentNotConfirmed")
      ).to.be.true;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 6: Reject: Refund After Shipment Confirmed
  // -------------------------------------------------------------------------
  it("6. Reject: refund after shipment confirmed (InvalidStatusForRefund)", async () => {
    const { buyer, seller, buyerAta } = await setupBuyerAndSeller();
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const escrowAmount = new anchor.BN(25 * 1_000_000);
    const now = await getOnChainTimestamp();
    const deadline = new anchor.BN(now + 2);

    await program.methods
      .createTradeEscrow(escrowAmount, deadline)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // Seller confirms shipment
    await program.methods
      .confirmShipment("CARRIER-EXPRESS-1")
      .accountsPartial({
        seller: seller.publicKey,
        escrow: escrowPda,
      })
      .signers([seller])
      .rpc();

    // Wait until on-chain clock passes the deadline
    while (true) {
      await sleep(1000);
      const currentTime = await getOnChainTimestamp();
      if (currentTime > deadline.toNumber()) {
        break;
      }
    }

    // Buyer attempts to refund even though shipment was confirmed
    try {
      await program.methods
        .refundIfExpired()
        .accountsPartial({
          buyer: buyer.publicKey,
          escrow: escrowPda,
          mint,
          escrowTokenAccount: escrowAta,
          buyerTokenAccount: buyerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();
      expect.fail("Should have failed with InvalidStatusForRefund");
    } catch (err: any) {
      expect(err.toString()).to.include("InvalidStatusForRefund");
    }
  });

  // -------------------------------------------------------------------------
  // TEST 7: Reject: Create With Deadline in the Past
  // -------------------------------------------------------------------------
  it("7. Reject: create with deadline in the past (DeadlineInPast)", async () => {
    const { buyer, seller, buyerAta } = await setupBuyerAndSeller();
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const escrowAmount = new anchor.BN(10 * 1_000_000);
    // Deadline 60 seconds in the past relative to validator on-chain clock
    const now = await getOnChainTimestamp();
    const pastDeadline = new anchor.BN(now - 60);

    try {
      await program.methods
        .createTradeEscrow(escrowAmount, pastDeadline)
        .accountsPartial({
          buyer: buyer.publicKey,
          seller: seller.publicKey,
          mint,
          buyerTokenAccount: buyerAta,
          escrow: escrowPda,
          escrowTokenAccount: escrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
      expect.fail("Should have thrown DeadlineInPast error");
    } catch (err: any) {
      expect(err.toString()).to.include("DeadlineInPast");
    }
  });

  // -------------------------------------------------------------------------
  // TEST 8: Dispute Path
  // -------------------------------------------------------------------------
  it("Dispute path: shipment confirmed, buyer raises dispute, funds frozen", async () => {
    const { buyer, seller, buyerAta, sellerAta } = await setupBuyerAndSeller();
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const escrowAmount = new anchor.BN(30 * 1_000_000);
    const now = await getOnChainTimestamp();
    const deadline = new anchor.BN(now + 2); // 2 second deadline

    // 1. Buyer creates escrow
    await program.methods
      .createTradeEscrow(escrowAmount, deadline)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // 2. Seller confirms shipment
    await program.methods
      .confirmShipment("DISPUTE-TRACK-999")
      .accountsPartial({
        seller: seller.publicKey,
        escrow: escrowPda,
      })
      .signers([seller])
      .rpc();

    // 3. Buyer raises dispute
    await program.methods
      .raiseDispute()
      .accountsPartial({
        signer: buyer.publicKey,
        escrow: escrowPda,
      })
      .signers([buyer])
      .rpc();

    // Verify status is Disputed
    const escrowAccount = await program.account.tradeEscrow.fetch(escrowPda);
    expect(escrowAccount.status.disputed).to.not.be.undefined;

    // 4. Assert release_funds fails (funds frozen)
    try {
      await program.methods
        .releaseFunds()
        .accountsPartial({
          buyer: buyer.publicKey,
          escrow: escrowPda,
          mint,
          escrowTokenAccount: escrowAta,
          sellerTokenAccount: sellerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();
      expect.fail("release_funds should have failed on disputed escrow");
    } catch (err: any) {
      const errMsg = err.toString();
      expect(
        errMsg.includes("EscrowDisputed") || errMsg.includes("ShipmentNotConfirmed")
      ).to.be.true;
    }

    // 5. Wait for deadline to expire, then assert refund_if_expired also fails (funds frozen)
    while (true) {
      await sleep(1000);
      const currentTime = await getOnChainTimestamp();
      if (currentTime > deadline.toNumber()) {
        break;
      }
    }

    try {
      await program.methods
        .refundIfExpired()
        .accountsPartial({
          buyer: buyer.publicKey,
          escrow: escrowPda,
          mint,
          escrowTokenAccount: escrowAta,
          buyerTokenAccount: buyerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();
      expect.fail("refund_if_expired should have failed on disputed escrow");
    } catch (err: any) {
      const errMsg = err.toString();
      expect(
        errMsg.includes("EscrowDisputed") || errMsg.includes("InvalidStatusForRefund")
      ).to.be.true;
    }

    // Verify escrow account and vault remain open and unchanged with funds locked
    const finalEscrow = await program.account.tradeEscrow.fetch(escrowPda);
    expect(finalEscrow.status.disputed).to.not.be.undefined;
    const finalVault = await getAccount(provider.connection, escrowAta);
    expect(Number(finalVault.amount)).to.equal(escrowAmount.toNumber());
  });


  // =========================================================================
  // DISPUTE RESOLUTION TESTS (Step 3 a-e)
  // =========================================================================

  // -------------------------------------------------------------------------
  // TEST 9: Arbiter Resolves Dispute to Seller (3a)
  // -------------------------------------------------------------------------
  it("9. (3a) Arbiter resolves dispute to seller: seller balance +amount, escrow and vault closed", async function () {
    skipIfNoArbiter(this);
    const { buyer, seller, buyerAta, sellerAta } = await setupBuyerAndSeller();
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const escrowAmount = new anchor.BN(40 * 1_000_000);
    const now = await getOnChainTimestamp();
    const deadline = new anchor.BN(now + 3600);

    // Create escrow
    await program.methods
      .createTradeEscrow(escrowAmount, deadline)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // Confirm shipment
    await program.methods
      .confirmShipment("TRACK-ARBITER-SELLER")
      .accountsPartial({
        seller: seller.publicKey,
        escrow: escrowPda,
      })
      .signers([seller])
      .rpc();

    // Raise dispute
    await program.methods
      .raiseDispute()
      .accountsPartial({
        signer: buyer.publicKey,
        escrow: escrowPda,
      })
      .signers([buyer])
      .rpc();

    const initialSellerAccount = await getAccount(provider.connection, sellerAta);
    const initialSellerBalance = Number(initialSellerAccount.amount);

    // Arbiter resolves dispute: release to seller
    await program.methods
      .resolveDispute(true)
      .accountsPartial({
        arbiter: arbiter.publicKey,
        buyer: buyer.publicKey,
        escrow: escrowPda,
        mint,
        escrowTokenAccount: escrowAta,
        buyerTokenAccount: buyerAta,
        sellerTokenAccount: sellerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([arbiter])
      .rpc();

    // Assert: seller balance +amount
    const finalSellerAccount = await getAccount(provider.connection, sellerAta);
    expect(Number(finalSellerAccount.amount)).to.equal(initialSellerBalance + escrowAmount.toNumber());

    // Assert: escrow and vault closed
    const closedEscrow = await program.account.tradeEscrow.fetchNullable(escrowPda);
    expect(closedEscrow).to.be.null;

    const closedVaultInfo = await provider.connection.getAccountInfo(escrowAta);
    expect(closedVaultInfo).to.be.null;
  });

  // -------------------------------------------------------------------------
  // TEST 10: Arbiter Refunds Buyer (3b)
  // -------------------------------------------------------------------------
  it("10. (3b) Arbiter refunds buyer: buyer balance restored, accounts closed", async function () {
    skipIfNoArbiter(this);
    const initialBuyerTokens = 1000 * 1_000_000;
    const { buyer, seller, buyerAta, sellerAta } = await setupBuyerAndSeller(initialBuyerTokens);
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const escrowAmount = new anchor.BN(45 * 1_000_000);
    const now = await getOnChainTimestamp();
    const deadline = new anchor.BN(now + 3600);

    // Create escrow
    await program.methods
      .createTradeEscrow(escrowAmount, deadline)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // Confirm shipment
    await program.methods
      .confirmShipment("TRACK-ARBITER-BUYER")
      .accountsPartial({
        seller: seller.publicKey,
        escrow: escrowPda,
      })
      .signers([seller])
      .rpc();

    // Raise dispute
    await program.methods
      .raiseDispute()
      .accountsPartial({
        signer: seller.publicKey,
        escrow: escrowPda,
      })
      .signers([seller])
      .rpc();

    // Arbiter resolves dispute: refund to buyer (release_to_seller = false)
    await program.methods
      .resolveDispute(false)
      .accountsPartial({
        arbiter: arbiter.publicKey,
        buyer: buyer.publicKey,
        escrow: escrowPda,
        mint,
        escrowTokenAccount: escrowAta,
        buyerTokenAccount: buyerAta,
        sellerTokenAccount: sellerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([arbiter])
      .rpc();

    // Assert: buyer balance restored
    const finalBuyerAccount = await getAccount(provider.connection, buyerAta);
    expect(Number(finalBuyerAccount.amount)).to.equal(initialBuyerTokens);

    // Assert: escrow and vault closed
    const closedEscrow = await program.account.tradeEscrow.fetchNullable(escrowPda);
    expect(closedEscrow).to.be.null;

    const closedVaultInfo = await provider.connection.getAccountInfo(escrowAta);
    expect(closedVaultInfo).to.be.null;
  });

  // -------------------------------------------------------------------------
  // TEST 11: Non-arbiter Signer Fails (3c)
  // -------------------------------------------------------------------------
  it("11. (3c) Non-arbiter signer calling resolve_dispute fails with UnauthorizedArbiter", async function () {
    skipIfNoArbiter(this);
    const { buyer, seller, buyerAta, sellerAta } = await setupBuyerAndSeller();
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const escrowAmount = new anchor.BN(20 * 1_000_000);
    const now = await getOnChainTimestamp();
    const deadline = new anchor.BN(now + 3600);

    await program.methods
      .createTradeEscrow(escrowAmount, deadline)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    await program.methods
      .confirmShipment("TRACK-FAKE-ARBITER")
      .accountsPartial({
        seller: seller.publicKey,
        escrow: escrowPda,
      })
      .signers([seller])
      .rpc();

    await program.methods
      .raiseDispute()
      .accountsPartial({
        signer: buyer.publicKey,
        escrow: escrowPda,
      })
      .signers([buyer])
      .rpc();

    const impostor = anchor.web3.Keypair.generate();
    const airdropImpostor = await provider.connection.requestAirdrop(
      impostor.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    const impostorBh = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: airdropImpostor,
      ...impostorBh,
    });

    try {
      await program.methods
        .resolveDispute(true)
        .accountsPartial({
          arbiter: impostor.publicKey,
          buyer: buyer.publicKey,
          escrow: escrowPda,
          mint,
          escrowTokenAccount: escrowAta,
          buyerTokenAccount: buyerAta,
          sellerTokenAccount: sellerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([impostor])
        .rpc();
      expect.fail("Should have failed with UnauthorizedArbiter");
    } catch (err: any) {
      expect(err.toString()).to.include("UnauthorizedArbiter");
    }
  });

  // -------------------------------------------------------------------------
  // TEST 12: Resolve on Non-disputed Escrow Fails (3d)
  // -------------------------------------------------------------------------
  it("12. (3d) resolve_dispute on a non-disputed escrow fails with InvalidStatusForResolution", async function () {
    skipIfNoArbiter(this);
    const { buyer, seller, buyerAta, sellerAta } = await setupBuyerAndSeller();
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const escrowAmount = new anchor.BN(20 * 1_000_000);
    const now = await getOnChainTimestamp();
    const deadline = new anchor.BN(now + 3600);

    await program.methods
      .createTradeEscrow(escrowAmount, deadline)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // Escrow is in Created status (not Disputed)
    try {
      await program.methods
        .resolveDispute(true)
        .accountsPartial({
          arbiter: arbiter.publicKey,
          buyer: buyer.publicKey,
          escrow: escrowPda,
          mint,
          escrowTokenAccount: escrowAta,
          buyerTokenAccount: buyerAta,
          sellerTokenAccount: sellerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([arbiter])
        .rpc();
      expect.fail("Should have failed with InvalidStatusForResolution");
    } catch (err: any) {
      expect(err.toString()).to.include("InvalidStatusForResolution");
    }

    // Now seller confirms shipment (status ShipmentConfirmed, still not Disputed)
    await program.methods
      .confirmShipment("TRACK-NON-DISPUTED")
      .accountsPartial({
        seller: seller.publicKey,
        escrow: escrowPda,
      })
      .signers([seller])
      .rpc();

    try {
      await program.methods
        .resolveDispute(false)
        .accountsPartial({
          arbiter: arbiter.publicKey,
          buyer: buyer.publicKey,
          escrow: escrowPda,
          mint,
          escrowTokenAccount: escrowAta,
          buyerTokenAccount: buyerAta,
          sellerTokenAccount: sellerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([arbiter])
        .rpc();
      expect.fail("Should have failed with InvalidStatusForResolution");
    } catch (err: any) {
      expect(err.toString()).to.include("InvalidStatusForResolution");
    }
  });

  // -------------------------------------------------------------------------
  // TEST 13: Same Buyer-Seller Pair Can Create New Escrow After Resolution (3e)
  // -------------------------------------------------------------------------
  it("13. (3e) After a resolution, the same buyer-seller pair can create a new escrow", async function () {
    skipIfNoArbiter(this);
    const { buyer, seller, buyerAta, sellerAta } = await setupBuyerAndSeller();
    const { escrowPda, escrowAta } = getEscrowPdaAndAta(buyer.publicKey, seller.publicKey, mint);

    const firstAmount = new anchor.BN(15 * 1_000_000);
    const now1 = await getOnChainTimestamp();
    const deadline1 = new anchor.BN(now1 + 3600);

    // 1. Create first escrow
    await program.methods
      .createTradeEscrow(firstAmount, deadline1)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // 2. Confirm and dispute
    await program.methods
      .confirmShipment("TRACK-PAIR-REUSE-1")
      .accountsPartial({
        seller: seller.publicKey,
        escrow: escrowPda,
      })
      .signers([seller])
      .rpc();

    await program.methods
      .raiseDispute()
      .accountsPartial({
        signer: buyer.publicKey,
        escrow: escrowPda,
      })
      .signers([buyer])
      .rpc();

    // 3. Resolve dispute (release to seller)
    await program.methods
      .resolveDispute(true)
      .accountsPartial({
        arbiter: arbiter.publicKey,
        buyer: buyer.publicKey,
        escrow: escrowPda,
        mint,
        escrowTokenAccount: escrowAta,
        buyerTokenAccount: buyerAta,
        sellerTokenAccount: sellerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([arbiter])
      .rpc();

    // Confirm escrow closed
    let escrowAccount = await program.account.tradeEscrow.fetchNullable(escrowPda);
    expect(escrowAccount).to.be.null;

    // 4. Same buyer-seller pair creates second escrow with same PDA address
    const secondAmount = new anchor.BN(25 * 1_000_000);
    const now2 = await getOnChainTimestamp();
    const deadline2 = new anchor.BN(now2 + 7200);

    await program.methods
      .createTradeEscrow(secondAmount, deadline2)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        mint,
        buyerTokenAccount: buyerAta,
        escrow: escrowPda,
        escrowTokenAccount: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // Assert second escrow exists and has status Created
    escrowAccount = await program.account.tradeEscrow.fetch(escrowPda);
    expect(escrowAccount.buyer.toBase58()).to.equal(buyer.publicKey.toBase58());
    expect(escrowAccount.seller.toBase58()).to.equal(seller.publicKey.toBase58());
    expect(escrowAccount.amount.toNumber()).to.equal(secondAmount.toNumber());
    expect(escrowAccount.status.created).to.not.be.undefined;

    const vaultAccount = await getAccount(provider.connection, escrowAta);
    expect(Number(vaultAccount.amount)).to.equal(secondAmount.toNumber());
  });
});
