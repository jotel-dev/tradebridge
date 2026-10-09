import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
} from "@solana/spl-token";

// In-memory per-address cooldown map (best-effort)
const cooldownMap = new Map<string, number>();
const COOLDOWN_MS = 60 * 1000; // 60 seconds

function cleanString(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/^[\uFEFF\u200B]+/, "");
}

function getFaucetKeypair(): Keypair {
  const rawSecret = process.env.FAUCET_SECRET_KEY;
  if (!rawSecret) {
    throw new Error("FAUCET_SECRET_KEY is not configured on the server.");
  }
  const clean = cleanString(rawSecret);
  try {
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) {
      throw new Error("Secret key is not a JSON array.");
    }
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch (err: any) {
    throw new Error(`Failed to parse FAUCET_SECRET_KEY: ${err?.message || "Invalid format"}`);
  }
}

export async function GET() {
  return NextResponse.json({
    name: "TradeBridge Test USDC Faucet",
    network: "devnet",
    amountPerRequest: 100,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawAddress = body?.address;

    if (!rawAddress || typeof rawAddress !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'address' parameter." },
        { status: 400 }
      );
    }

    const cleanAddress = cleanString(rawAddress);
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(cleanAddress);
      if (!PublicKey.isOnCurve(recipientPubkey.toBytes())) {
        return NextResponse.json(
          { error: "Invalid Solana address: address is not on curve." },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid Solana public key format." },
        { status: 400 }
      );
    }

    // Cooldown check
    const now = Date.now();
    const lastRequest = cooldownMap.get(cleanAddress);
    if (lastRequest && now - lastRequest < COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COOLDOWN_MS - (now - lastRequest)) / 1000);
      return NextResponse.json(
        {
          error: `Rate limit: Please wait ${waitSeconds}s before requesting test USDC again for this address.`,
        },
        { status: 429 }
      );
    }

    let faucetKeypair: Keypair;
    try {
      faucetKeypair = getFaucetKeypair();
    } catch (err: any) {
      console.error("Faucet credentials error:", err);
      return NextResponse.json(
        { error: "Faucet service unavailable: missing server credentials." },
        { status: 500 }
      );
    }

    const rpcUrl =
      cleanString(process.env.NEXT_PUBLIC_SOLANA_RPC_URL) ||
      "https://api.devnet.solana.com";
    const defaultMintStr =
      cleanString(process.env.NEXT_PUBLIC_DEFAULT_USDC_MINT) ||
      "2Rehr4QfS9xpo6x8t9FptPneocaaYK5VyUiTaihnouzT";
    const mintPubkey = new PublicKey(defaultMintStr);

    const connection = new Connection(rpcUrl, "confirmed");

    const faucetAta = getAssociatedTokenAddressSync(
      mintPubkey,
      faucetKeypair.publicKey
    );
    const recipientAta = getAssociatedTokenAddressSync(
      mintPubkey,
      recipientPubkey
    );

    // Test USDC has 6 decimals -> 100 USDC = 100_000_000 raw units
    const AMOUNT_USDC_RAW = BigInt(100_000_000);

    const tx = new Transaction();

    // 1. Idempotently create recipient ATA if missing (faucet pays rent)
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        faucetKeypair.publicKey,
        recipientAta,
        recipientPubkey,
        mintPubkey
      )
    );

    // 2. Transfer 100 test USDC from faucet to recipient
    tx.add(
      createTransferInstruction(
        faucetAta,
        recipientAta,
        faucetKeypair.publicKey,
        AMOUNT_USDC_RAW
      )
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = faucetKeypair.publicKey;

    tx.sign(faucetKeypair);

    const rawTx = tx.serialize();
    const signature = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed"
    );

    if (confirmation.value.err) {
      console.error("Faucet transfer transaction failed on-chain:", confirmation.value.err);
      return NextResponse.json(
        { error: `Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}` },
        { status: 500 }
      );
    }

    // Set cooldown timestamp
    cooldownMap.set(cleanAddress, Date.now());

    return NextResponse.json({
      success: true,
      signature,
      amount: 100,
      recipient: cleanAddress,
    });
  } catch (error: any) {
    console.error("Faucet request error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error processing faucet transfer." },
      { status: 500 }
    );
  }
}
