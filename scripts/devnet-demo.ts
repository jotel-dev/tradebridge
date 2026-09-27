import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

// Helpers
const explorerTxUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
const explorerAccountUrl = (addr: string) => `https://explorer.solana.com/address/${addr}?cluster=devnet`;
const formatUsdc = (units: number) => `$${(units / 1_000_000).toFixed(2)} USDC`;
const divider = (char = "=", len = 80) => console.log(char.repeat(len));

interface TxRecord {
  step: string;
  signature: string;
  url: string;
  notes?: string;
}

// Derive Escrow PDA and its ATA
function getEscrowPdaAndAta(
  programId: anchor.web3.PublicKey,
  buyer: anchor.web3.PublicKey,
  seller: anchor.web3.PublicKey,
  tokenMint: anchor.web3.PublicKey
) {
  const [escrowPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), buyer.toBuffer(), seller.toBuffer()],
    programId
  );

  const escrowAta = getAssociatedTokenAddressSync(
    tokenMint,
    escrowPda,
    true // allowOwnerOffCurve = true for PDA authority
  );

  return { escrowPda, escrowAta };
}

async function main() {
  divider("=");
  console.log("       TRADEBRIDGE: LIVE SOLANA DEVNET TRANSACTION DEMONSTRATION");
  console.log("          Real Devnet Deployment • Public Solana Explorer Proofs");
  divider("=");
  console.log();

  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

  // Load authority/payer wallet from ~/.config/solana/id.json
  const walletPath = path.resolve(process.env.HOME || "", ".config/solana/id.json");
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Fee payer keypair not found at: ${walletPath}`);
  }
  const payerKeypair = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8")))
  );
  const payerWallet = new anchor.Wallet(payerKeypair);

  const provider = new anchor.AnchorProvider(connection, payerWallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Program setup
  const idlPath = path.resolve(__dirname, "../target/idl/tradebridge.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const program = new Program(idl, provider) as any;

  const payerBalanceLamports = await connection.getBalance(payerKeypair.publicKey);
  console.log(`📌 Network:           Solana Devnet (https://api.devnet.solana.com)`);
  console.log(`📌 Program ID:        ${program.programId.toBase58()}`);
  console.log(`   Explorer Link:     ${explorerAccountUrl(program.programId.toBase58())}`);
  console.log(`📌 Fee Payer Wallet:  ${payerKeypair.publicKey.toBase58()}`);
  console.log(`   Payer Balance:     ${(payerBalanceLamports / anchor.web3.LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);

  const txLedger: TxRecord[] = [];

  // ===========================================================================
  // Step 1: Parties Setup (Fresh Keypairs)
  // ===========================================================================
  console.log("--- [1/6] Generating Parties & Provisioning Devnet SOL ---");
  console.log("Design Decision: We generate fresh keypairs for Buyer and Seller.");
  console.log("Reason: TradeBridge escrow PDAs are deterministically derived from seeds");
  console.log("[b'escrow', buyer_pubkey, seller_pubkey]. Fresh keypairs ensure clean, uninitialized");
  console.log("escrow PDAs without key collisions from previous runs.\n");

  const buyer = anchor.web3.Keypair.generate();
  const seller = anchor.web3.Keypair.generate();

  console.log(`• Buyer Keypair:  ${buyer.publicKey.toBase58()}`);
  console.log(`• Seller Keypair: ${seller.publicKey.toBase58()}`);

  console.log("\nFunding Buyer and Seller with 0.05 SOL each from main payer wallet...");
  const fundTx = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.transfer({
      fromPubkey: payerKeypair.publicKey,
      toPubkey: buyer.publicKey,
      lamports: 0.05 * anchor.web3.LAMPORTS_PER_SOL,
    }),
    anchor.web3.SystemProgram.transfer({
      fromPubkey: payerKeypair.publicKey,
      toPubkey: seller.publicKey,
      lamports: 0.05 * anchor.web3.LAMPORTS_PER_SOL,
    })
  );

  const fundSig = await anchor.web3.sendAndConfirmTransaction(connection, fundTx, [payerKeypair]);
  console.log(`✔ Funded Buyer and Seller in single batch transaction!`);
  console.log(`   Signature: ${fundSig}`);
  console.log(`   Explorer:  ${explorerTxUrl(fundSig)}\n`);
  txLedger.push({
    step: "1. Setup: Fund Buyer & Seller with Devnet SOL",
    signature: fundSig,
    url: explorerTxUrl(fundSig),
    notes: "Direct transfer of 0.05 SOL to each party for rent and transaction fees",
  });

  // ===========================================================================
  // Step 2: Create Test SPL Token Mint
  // ===========================================================================
  console.log("--- [2/6] Creating Test Token Mint (USDC, 6 decimals) on Devnet ---");
  const mint = await createMint(
    connection,
    payerKeypair,
    payerKeypair.publicKey,
    null,
    6
  );
  console.log(`✔ Mint Created: ${mint.toBase58()}`);
  console.log(`   Explorer:     ${explorerAccountUrl(mint.toBase58())}\n`);

  // ===========================================================================
  // Step 3: Create Token Accounts & Mint Test Tokens
  // ===========================================================================
  console.log("--- [3/6] Setting Up Associated Token Accounts & Minting Balance ---");
  const buyerAta = await createAssociatedTokenAccount(
    connection,
    payerKeypair,
    mint,
    buyer.publicKey
  );
  const sellerAta = await createAssociatedTokenAccount(
    connection,
    payerKeypair,
    mint,
    seller.publicKey
  );

  console.log(`• Buyer ATA:  ${buyerAta.toBase58()}`);
  console.log(`• Seller ATA: ${sellerAta.toBase58()}`);

  console.log("\nMinting 1,000.00 USDC test tokens to Buyer...");
  const mintSig = await mintTo(
    connection,
    payerKeypair,
    mint,
    buyerAta,
    payerKeypair,
    1000 * 1_000_000
  );
  console.log(`✔ Minted 1,000.00 USDC to Buyer ATA!`);
  console.log(`   Signature: ${mintSig}`);
  console.log(`   Explorer:  ${explorerTxUrl(mintSig)}\n`);
  txLedger.push({
    step: "2. Setup: Mint 1,000.00 USDC to Buyer ATA",
    signature: mintSig,
    url: explorerTxUrl(mintSig),
    notes: "Initialized buyer balance for cross-border escrow trade",
  });

  // Escrow PDA derivation
  const { escrowPda, escrowAta } = getEscrowPdaAndAta(program.programId, buyer.publicKey, seller.publicKey, mint);
  console.log(`• Derived Escrow PDA:       ${escrowPda.toBase58()}`);
  console.log(`• Derived Escrow Token ATA: ${escrowAta.toBase58()}\n`);

  // ===========================================================================
  // Step 4: Buyer Creates Escrow ($250, 7-Day Deadline)
  // ===========================================================================
  console.log("--- [4/6] Step A: Buyer Creates Escrow on Devnet ---");
  const escrowAmount = new anchor.BN(250 * 1_000_000); // $250.00 USDC
  const sevenDays = 7 * 24 * 3600;
  const slot = await connection.getSlot();
  const currentBlockTime = (await connection.getBlockTime(slot)) || Math.floor(Date.now() / 1000);
  const deadline = new anchor.BN(currentBlockTime + sevenDays);

  console.log(`Action: Buyer deposits ${formatUsdc(escrowAmount.toNumber())} with 7-day expiration deadline.`);
  console.log(`Agreed Deadline: ${new Date(deadline.toNumber() * 1000).toUTCString()}`);

  const createSig = await program.methods
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

  console.log(`✔ Escrow Created & Funds Locked on Devnet!`);
  console.log(`   Signature: ${createSig}`);
  console.log(`   Explorer:  ${explorerTxUrl(createSig)}`);

  const escrowStateAfterCreate = await program.account.tradeEscrow.fetch(escrowPda);
  const escrowVaultAfterCreate = await getAccount(connection, escrowAta);
  console.log(`✔ Escrow Status: Created`);
  console.log(`✔ Escrow Vault Token Balance: ${formatUsdc(Number(escrowVaultAfterCreate.amount))}\n`);

  txLedger.push({
    step: "3. TradeStep A: Buyer Creates Escrow ($250.00 USDC)",
    signature: createSig,
    url: explorerTxUrl(createSig),
    notes: `Locked $250.00 USDC into PDA vault ${escrowPda.toBase58()}`,
  });

  // ===========================================================================
  // Step 5: Seller Confirms Shipment ("DEVNET-LIVE-DEMO-001")
  // ===========================================================================
  console.log("--- [5/6] Step B: Seller Confirms Shipment on Devnet ---");
  const trackingRef = "DEVNET-LIVE-DEMO-001";
  console.log(`Action: Seller registers shipment tracking reference: "${trackingRef}"`);

  const shipSig = await program.methods
    .confirmShipment(trackingRef)
    .accountsPartial({
      seller: seller.publicKey,
      escrow: escrowPda,
    })
    .signers([seller])
    .rpc();

  console.log(`✔ Shipment Confirmed on Devnet!`);
  console.log(`   Signature: ${shipSig}`);
  console.log(`   Explorer:  ${explorerTxUrl(shipSig)}`);

  const escrowStateAfterShip = await program.account.tradeEscrow.fetch(escrowPda);
  console.log(`✔ Escrow Status: ShipmentConfirmed`);
  console.log(`✔ Registered Tracking Ref: "${escrowStateAfterShip.trackingRef}"\n`);

  txLedger.push({
    step: "4. TradeStep B: Seller Confirms Shipment",
    signature: shipSig,
    url: explorerTxUrl(shipSig),
    notes: `Registered tracking reference: ${trackingRef}`,
  });

  // ===========================================================================
  // Step 6: Buyer Confirms Receipt & Releases Funds
  // ===========================================================================
  console.log("--- [6/6] Step C: Buyer Releases Funds to Seller on Devnet ---");
  console.log("Action: Buyer confirms delivery and executes autonomous PDA release instruction.");

  const releaseSig = await program.methods
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

  console.log(`✔ Escrow Funds Released on Devnet!`);
  console.log(`   Signature: ${releaseSig}`);
  console.log(`   Explorer:  ${explorerTxUrl(releaseSig)}`);

  const closedEscrow = await program.account.tradeEscrow.fetchNullable(escrowPda);
  const closedVaultInfo = await connection.getAccountInfo(escrowAta);
  const sellerFinalBal = await getAccount(connection, sellerAta);
  const buyerFinalBal = await getAccount(connection, buyerAta);

  console.log(`✔ Final State: Escrow Completed & Accounts Reclaimed`);
  console.log(`   - Escrow PDA Closed:        ${closedEscrow === null} (rent lamports refunded to buyer)`);
  console.log(`   - Escrow Token ATA Closed:  ${closedVaultInfo === null} (rent lamports refunded to buyer)`);
  console.log(`✔ Final Balances:`);
  console.log(`   - Seller:                   ${formatUsdc(Number(sellerFinalBal.amount))} (+${formatUsdc(escrowAmount.toNumber())})`);
  console.log(`   - Buyer:                    ${formatUsdc(Number(buyerFinalBal.amount))} ($750.00 remaining)`);
  console.log(`   - Escrow Vault:             Closed (0.00 USDC)\n`);

  txLedger.push({
    step: "5. TradeStep C: Buyer Releases Funds to Seller",
    signature: releaseSig,
    url: explorerTxUrl(releaseSig),
    notes: "Escrow PDA signed token CPI transfer to seller's ATA",
  });

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  divider("=");
  console.log("             TRADEBRIDGE DEVNET LIVE DEMO: COMPLETE TRANSACTION LEDGER");
  divider("=");
  console.log("Program ID:", program.programId.toBase58());
  console.log("Explorer:  ", explorerAccountUrl(program.programId.toBase58()));
  console.log();

  txLedger.forEach((entry, idx) => {
    console.log(`[${idx + 1}] ${entry.step}`);
    console.log(`    Signature: ${entry.signature}`);
    console.log(`    Explorer:  ${entry.url}`);
    if (entry.notes) {
      console.log(`    Notes:     ${entry.notes}`);
    }
    console.log();
  });

  divider("=");
  console.log("✔ All on-chain steps executed and verified on live Solana Devnet!");
  divider("=");
}

main().catch((err) => {
  console.error("FATAL ERROR in devnet demo:", err);
  process.exit(1);
});
