import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const explorerTxUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
const explorerAccountUrl = (addr: string) => `https://explorer.solana.com/address/${addr}?cluster=devnet`;

async function main() {
  const args = process.argv.slice(2);
  const escrowPdaArg = args[0] || "D6xSHQmxxPYGBGGPtVqBgK7un87Z3buWFinEj4q5MfmB";
  const outcomeArg = (args[1] || "buyer").toLowerCase();

  if (outcomeArg !== "seller" && outcomeArg !== "buyer") {
    console.error(`Invalid outcome: ${outcomeArg}. Must be "seller" or "buyer".`);
    process.exit(1);
  }

  const releaseToSeller = outcomeArg === "seller";

  console.log("================================================================================");
  console.log("                   TRADEBRIDGE: DISPUTE RESOLUTION SCRIPT                       ");
  console.log("================================================================================");
  console.log(`Target Escrow PDA: ${escrowPdaArg}`);
  console.log(`Resolution Outcome: ${releaseToSeller ? "RELEASE TO SELLER" : "REFUND TO BUYER"}`);

  // Load Arbiter Keypair from ~/tradebridge-arbiter.json
  const arbiterKeyPath = path.join(os.homedir(), "tradebridge-arbiter.json");
  if (!fs.existsSync(arbiterKeyPath)) {
    throw new Error(`Arbiter keypair file not found at: ${arbiterKeyPath}`);
  }
  const arbiterKeyData = JSON.parse(fs.readFileSync(arbiterKeyPath, "utf-8"));
  const arbiter = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(arbiterKeyData));
  console.log(`Arbiter Public Key: ${arbiter.publicKey.toBase58()}`);

  // Connection & Provider
  const rpcUrl = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
  const connection = new anchor.web3.Connection(rpcUrl, "confirmed");
  const wallet = new anchor.Wallet(arbiter);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  // Load IDL & Program
  const idlPath = path.resolve(__dirname, "../target/idl/tradebridge.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new Program(idl, provider) as any;

  // Read on-chain escrow account
  const escrowPda = new anchor.web3.PublicKey(escrowPdaArg);
  console.log(`\nFetching on-chain escrow account: ${escrowPda.toBase58()}...`);
  const escrowAccount = await program.account.tradeEscrow.fetch(escrowPda);

  console.log(`• Buyer:    ${escrowAccount.buyer.toBase58()}`);
  console.log(`• Seller:   ${escrowAccount.seller.toBase58()}`);
  console.log(`• Mint:     ${escrowAccount.mint.toBase58()}`);
  console.log(`• Amount:   ${escrowAccount.amount.toString()}`);
  console.log(`• Status:   ${JSON.stringify(escrowAccount.status)}`);

  // Derive Associated Token Accounts
  const escrowAta = getAssociatedTokenAddressSync(
    escrowAccount.mint,
    escrowPda,
    true
  );
  const buyerAta = getAssociatedTokenAddressSync(
    escrowAccount.mint,
    escrowAccount.buyer,
    false
  );
  const sellerAta = getAssociatedTokenAddressSync(
    escrowAccount.mint,
    escrowAccount.seller,
    false
  );

  console.log(`• Escrow Vault ATA: ${escrowAta.toBase58()}`);
  console.log(`• Buyer ATA:        ${buyerAta.toBase58()}`);
  console.log(`• Seller ATA:       ${sellerAta.toBase58()}`);

  // Ensure idempotent ATA creation
  const preInstructions = [
    createAssociatedTokenAccountIdempotentInstruction(
      arbiter.publicKey,
      buyerAta,
      escrowAccount.buyer,
      escrowAccount.mint
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      arbiter.publicKey,
      sellerAta,
      escrowAccount.seller,
      escrowAccount.mint
    ),
  ];

  console.log("\nSending resolve_dispute transaction signed by arbiter...");
  const txSig = await program.methods
    .resolveDispute(releaseToSeller)
    .accountsPartial({
      arbiter: arbiter.publicKey,
      buyer: escrowAccount.buyer,
      escrow: escrowPda,
      mint: escrowAccount.mint,
      escrowTokenAccount: escrowAta,
      buyerTokenAccount: buyerAta,
      sellerTokenAccount: sellerAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions(preInstructions)
    .signers([arbiter])
    .rpc();

  console.log(`\nTransaction Confirmed!`);
  console.log(`Transaction Signature: ${txSig}`);
  console.log(`Explorer Link:         ${explorerTxUrl(txSig)}`);

  // Verify accounts are closed
  console.log("\nVerifying account closures...");
  const closedEscrow = await connection.getAccountInfo(escrowPda);
  const closedVault = await connection.getAccountInfo(escrowAta);

  console.log(`• Escrow PDA closed: ${closedEscrow === null ? "YES (rent refunded to buyer)" : "NO"}`);
  console.log(`• Vault ATA closed:  ${closedVault === null ? "YES (rent refunded to buyer)" : "NO"}`);

  if (closedEscrow === null && closedVault === null) {
    console.log("\nSUCCESS: Dispute resolved and all temporary accounts closed cleanly.");
  } else {
    console.warn("\nWARNING: Some accounts may still exist. Escrow:", closedEscrow, "Vault:", closedVault);
  }
}

main().catch((err) => {
  console.error("Dispute resolution failed:", err);
  process.exit(1);
});
