"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import idl from "@/idl/tradebridge.json";
import { useActivity } from "./activity-context";
import {
  BrandIcon,
  ThemeToggle,
  RotatingLogoSpinner,
  EscrowLookupLoadingCard,
} from "./components";

function parsePublicKey(value: string | undefined, fallback: string, varName: string): PublicKey {
  const raw = value ? value.trim().replace(/^[\uFEFF\u200B]+/, "") : "";
  const keyStr = raw || fallback;
  try {
    return new PublicKey(keyStr);
  } catch (err) {
    throw new Error(
      `Invalid PublicKey configured for ${varName}: "${keyStr}". Please ensure it is a valid 32-byte base58 string.`
    );
  }
}

const PROGRAM_ID = parsePublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID,
  "3dmv4RrSanjP9Qdaj4E3D9ra9YNJrDg4QZP9sCmaK81v",
  "NEXT_PUBLIC_PROGRAM_ID"
);
const DEFAULT_USDC_MINT = parsePublicKey(
  process.env.NEXT_PUBLIC_DEFAULT_USDC_MINT,
  "2Rehr4QfS9xpo6x8t9FptPneocaaYK5VyUiTaihnouzT",
  "NEXT_PUBLIC_DEFAULT_USDC_MINT"
);

export type EscrowStatusType =
  | "Created"
  | "ShipmentConfirmed"
  | "Released"
  | "Refunded"
  | "Disputed";

export interface EscrowAccountData {
  pda: PublicKey;
  buyer: PublicKey;
  seller: PublicKey;
  mint: PublicKey;
  amount: BN;
  deadline: BN;
  status: EscrowStatusType;
  trackingRef: string;
  bump: number;
}

// Safe helpers to prevent BigInt / 53-bit overflow errors on arbitrary Solana token amounts
function formatEscrowAmount(amountBn?: BN | null): string {
  if (!amountBn) return "0.00";
  try {
    const str = amountBn.toString();
    const bi = BigInt(str);
    const whole = bi / BigInt(1000000);
    const fraction = (bi % BigInt(1000000)).toString().padStart(6, "0").slice(0, 2);
    return `${whole.toLocaleString()}.${fraction}`;
  } catch {
    return "0.00";
  }
}

function safeBnToNumber(bn?: BN | null): number {
  if (!bn) return 0;
  try {
    const num = Number(bn.toString());
    return Number.isFinite(num) ? num : 0;
  } catch {
    return 0;
  }
}

export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected, connecting } = wallet;
  const { activityFeed, appendLog } = useActivity();

  // Search & Lookup State
  const [counterpartyInput, setCounterpartyInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeEscrow, setActiveEscrow] = useState<EscrowAccountData | null>(null);
  const [userRole, setUserRole] = useState<"buyer" | "seller" | null>(null);
  const [searchedCounterparty, setSearchedCounterparty] = useState<PublicKey | null>(null);

  // Form Inputs
  const [createAmountUsdc, setCreateAmountUsdc] = useState("250.00");
  const [createDeadlineDays, setCreateDeadlineDays] = useState("7");
  const [trackingRefInput, setTrackingRefInput] = useState("");
  const [walletUiMounted, setWalletUiMounted] = useState(false);

  // Transaction States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Auto escrow check on connect
  const [isCheckingEscrow, setIsCheckingEscrow] = useState(false);
  const prevConnectedKey = useRef<string | null>(null);

  useEffect(() => {
    setWalletUiMounted(true);
  }, []);

  // Anchor Program client
  const program = useMemo(() => {
    try {
      const provider = wallet && wallet.publicKey
        ? new AnchorProvider(connection, wallet as any, { preflightCommitment: "confirmed" })
        : new AnchorProvider(
            connection,
            {
              publicKey: PublicKey.default,
              signTransaction: async (tx: any) => tx,
              signAllTransactions: async (txs: any) => txs,
            } as any,
            { preflightCommitment: "confirmed" }
          );
      return new Program(idl as any, provider);
    } catch (e) {
      return null;
    }
  }, [connection, wallet]);

  // Decode Escrow Status Enum
  const decodeStatus = (statusObj: any): EscrowStatusType => {
    if (!statusObj) return "Created";
    if (statusObj.created !== undefined) return "Created";
    if (statusObj.shipmentConfirmed !== undefined) return "ShipmentConfirmed";
    if (statusObj.released !== undefined) return "Released";
    if (statusObj.refunded !== undefined) return "Refunded";
    if (statusObj.disputed !== undefined) return "Disputed";
    return "Created";
  };

  // Escrow PDA derivation
  const deriveEscrowPda = (buyer: PublicKey, seller: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), buyer.toBuffer(), seller.toBuffer()],
      PROGRAM_ID
    );
  };

  // Helper to parse anchor / RPC errors
  const parseError = (err: any): string => {
    if (err?.error?.errorMessage) return err.error.errorMessage;
    if (err?.message) {
      const match = err.message.match(/Error Message: (.*)/);
      if (match) return match[1];
      return err.message;
    }
    return String(err);
  };

  // Automatic escrow check right after wallet connection
  useEffect(() => {
    if (connected && publicKey && program) {
      const keyStr = publicKey.toBase58();
      if (prevConnectedKey.current !== keyStr) {
        prevConnectedKey.current = keyStr;
        let isCancelled = false;

        const checkExistingEscrows = async () => {
          setIsCheckingEscrow(true);
          appendLog(
            `Wallet connected: ${keyStr.slice(0, 8)}... Checking for existing escrow agreements...`,
            "info"
          );

          try {
            const escrowClient =
              (program.account as any).tradeEscrow || (program.account as any).escrow;
            if (escrowClient) {
              const all = await escrowClient.all();
              if (isCancelled) return;

              const match = all.find(
                (e: any) =>
                  e.account.buyer.equals(publicKey) || e.account.seller.equals(publicKey)
              );

              if (match) {
                const status = decodeStatus(match.account.status);
                const isBuyer = match.account.buyer.equals(publicKey);
                const cparty = isBuyer ? match.account.seller : match.account.buyer;

                setActiveEscrow({
                  pda: match.publicKey,
                  buyer: match.account.buyer,
                  seller: match.account.seller,
                  mint: match.account.mint,
                  amount: match.account.amount,
                  deadline: match.account.deadline,
                  status,
                  trackingRef: match.account.trackingRef || "",
                  bump: match.account.bump,
                });
                setUserRole(isBuyer ? "buyer" : "seller");
                setSearchedCounterparty(cparty);
                setCounterpartyInput(cparty.toBase58());
                appendLog(
                  `Active escrow detected: ${match.publicKey.toBase58().slice(0, 8)}... (${isBuyer ? "Buyer" : "Seller"}, Status: ${status})`,
                  "success"
                );
              } else {
                appendLog(
                  `Wallet connected: ${keyStr.slice(0, 8)}... No existing agreements found. Ready to trade.`,
                  "info"
                );
              }
            }
          } catch (e: any) {
            console.warn("Escrow lookup on connect warning:", e);
          } finally {
            if (!isCancelled) {
              setIsCheckingEscrow(false);
            }
          }
        };

        checkExistingEscrows();

        return () => {
          isCancelled = true;
        };
      }
    } else if (!connected) {
      prevConnectedKey.current = null;
      setIsCheckingEscrow(false);
    }
  }, [connected, publicKey, program, appendLog]);

  // 1. LOOKUP ESCROW
  const handleLookup = async (manualCounterparty?: PublicKey) => {
    setSearchError(null);
    setTxError(null);
    const targetKeyStr = manualCounterparty
      ? manualCounterparty.toBase58()
      : counterpartyInput.trim();

    if (!targetKeyStr) {
      setSearchError("Please enter a counterparty public key or escrow address");
      return;
    }

    let targetKey: PublicKey;
    try {
      targetKey = new PublicKey(targetKeyStr);
    } catch {
      setSearchError("Invalid Solana public key format");
      return;
    }

    if (publicKey && publicKey.equals(targetKey)) {
      setSearchError("Counterparty cannot be your own wallet");
      return;
    }

    if (!program) {
      setSearchError("Solana program connection not initialized");
      return;
    }

    setIsSearching(true);
    setSearchedCounterparty(targetKey);

    const minDelay = new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const escrowClient =
        (program.account as any).tradeEscrow || (program.account as any).escrow;

      // 1. Check if the entered key is directly an Escrow PDA
      try {
        if (escrowClient) {
          const directAcc = await escrowClient.fetch(targetKey);
          if (directAcc) {
            const status = decodeStatus(directAcc.status);
            const role = publicKey
              ? directAcc.buyer.equals(publicKey)
                ? "buyer"
                : directAcc.seller.equals(publicKey)
                ? "seller"
                : null
              : null;

            setActiveEscrow({
              pda: targetKey,
              buyer: directAcc.buyer,
              seller: directAcc.seller,
              mint: directAcc.mint,
              amount: directAcc.amount,
              deadline: directAcc.deadline,
              status,
              trackingRef: directAcc.trackingRef || "",
              bump: directAcc.bump,
            });
            setUserRole(role);
            appendLog(
              `Direct escrow lookup successful: ${targetKey.toBase58().slice(0, 8)}... (Status: ${status})`,
              "success"
            );
            await minDelay;
            return;
          }
        }
      } catch (e) {
        // Not a direct escrow account, continue to counterparty derivations
      }

      if (!publicKey) {
        setSearchError("Connect your wallet to look up agreements by counterparty address");
        await minDelay;
        return;
      }

      // 2. Try with user as Buyer, target as Seller
      const [pdaAsBuyer, bumpBuyer] = deriveEscrowPda(publicKey, targetKey);
      appendLog(`Checking Escrow PDA (as buyer): ${pdaAsBuyer.toBase58()}...`, "info");

      let escrowAcc: any = null;
      try {
        if (escrowClient) {
          escrowAcc = await escrowClient.fetch(pdaAsBuyer);
          if (escrowAcc) {
            const status = decodeStatus(escrowAcc.status);
            setActiveEscrow({
              pda: pdaAsBuyer,
              buyer: escrowAcc.buyer,
              seller: escrowAcc.seller,
              mint: escrowAcc.mint,
              amount: escrowAcc.amount,
              deadline: escrowAcc.deadline,
              status,
              trackingRef: escrowAcc.trackingRef || "",
              bump: escrowAcc.bump ?? bumpBuyer,
            });
            setUserRole("buyer");
            appendLog(`Found existing escrow agreement as Buyer (Status: ${status})`, "success");
            await minDelay;
            return;
          }
        }
      } catch (err: any) {
        // Account does not exist, continue to check reverse role
      }

      // 3. Try with target as Buyer, user as Seller
      const [pdaAsSeller, bumpSeller] = deriveEscrowPda(targetKey, publicKey);
      appendLog(`Checking Escrow PDA (as seller): ${pdaAsSeller.toBase58()}...`, "info");

      try {
        if (escrowClient) {
          escrowAcc = await escrowClient.fetch(pdaAsSeller);
          if (escrowAcc) {
            const status = decodeStatus(escrowAcc.status);
            setActiveEscrow({
              pda: pdaAsSeller,
              buyer: escrowAcc.buyer,
              seller: escrowAcc.seller,
              mint: escrowAcc.mint,
              amount: escrowAcc.amount,
              deadline: escrowAcc.deadline,
              status,
              trackingRef: escrowAcc.trackingRef || "",
              bump: escrowAcc.bump ?? bumpSeller,
            });
            setUserRole("seller");
            appendLog(`Found existing escrow agreement as Seller (Status: ${status})`, "success");
            await minDelay;
            return;
          }
        }
      } catch (err: any) {
        // Account does not exist
      }

      // No active escrow found
      setActiveEscrow(null);
      setUserRole("buyer");
      appendLog(`No existing escrow found. Ready to initialize new trade as Buyer.`, "info");
      await minDelay;
    } catch (err: any) {
      console.error("Lookup error:", err);
      setSearchError(parseError(err));
      appendLog(`Lookup failed: ${parseError(err)}`, "error");
      await minDelay;
    } finally {
      setIsSearching(false);
    }
  };

  // 2. CREATE ESCROW (STATE A)
  const handleCreateEscrow = async () => {
    if (!program || !publicKey || !searchedCounterparty) return;
    setTxError(null);
    setIsSubmitting(true);

    try {
      const amountFloat = parseFloat(createAmountUsdc);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error("Please enter a valid USDC deposit amount");
      }
      const days = parseInt(createDeadlineDays, 10);
      if (isNaN(days) || days <= 0) {
        throw new Error("Please enter a valid deadline in days");
      }

      const amountUnits = new BN(Math.round(amountFloat * 1_000_000));
      const nowSec = Math.floor(Date.now() / 1000);
      const deadlineDuration = new BN(nowSec + days * 86400);

      const [escrowPda] = deriveEscrowPda(publicKey, searchedCounterparty);
      const buyerAta = getAssociatedTokenAddressSync(DEFAULT_USDC_MINT, publicKey);
      const vaultAta = getAssociatedTokenAddressSync(
        DEFAULT_USDC_MINT,
        escrowPda,
        true // allowOwnerOffCurve = true for PDA
      );

      appendLog(`Creating escrow agreement with ${searchedCounterparty.toBase58().slice(0, 8)}...`, "info");

      const txSig = await (program.methods as any)
        .createTradeEscrow(amountUnits, deadlineDuration)
        .accounts({
          buyer: publicKey,
          seller: searchedCounterparty,
          mint: DEFAULT_USDC_MINT,
          escrow: escrowPda,
          buyerTokenAccount: buyerAta,
          escrowTokenAccount: vaultAta,
          vault: vaultAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      appendLog(`Escrow initialized on devnet — tx: ${txSig.slice(0, 8)}...`, "success", txSig);

      // Re-fetch to update view to State C
      await handleLookup(searchedCounterparty);
    } catch (err: any) {
      console.error("Create escrow error:", err);
      const msg = parseError(err);
      setTxError(msg);
      appendLog(`Create failed: ${msg}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. CONFIRM SHIPMENT (STATE B -> STATE D/E)
  const handleConfirmShipment = async () => {
    if (!program || !publicKey || !activeEscrow) return;
    setTxError(null);
    setIsSubmitting(true);

    try {
      if (!trackingRefInput.trim()) {
        throw new Error("Please provide a valid carrier tracking reference");
      }

      appendLog(`Submitting carrier tracking reference: "${trackingRefInput.trim()}"...`, "info");

      const txSig = await (program.methods as any)
        .confirmShipment(trackingRefInput.trim())
        .accounts({
          seller: publicKey,
          escrow: activeEscrow.pda,
        })
        .rpc();

      appendLog(`Shipment confirmed on devnet — tx: ${txSig.slice(0, 8)}...`, "success", txSig);
      setActiveEscrow((prev) =>
        prev
          ? {
              ...prev,
              status: "ShipmentConfirmed",
              trackingRef: trackingRefInput.trim(),
            }
          : null
      );
    } catch (err: any) {
      console.error("Confirm shipment error:", err);
      const msg = parseError(err);
      setTxError(msg);
      appendLog(`Confirm shipment failed: ${msg}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. RELEASE FUNDS (STATE D -> STATE F)
  const handleReleaseFunds = async () => {
    if (!program || !publicKey || !activeEscrow) return;
    setTxError(null);
    setIsSubmitting(true);

    try {
      const sellerAta = getAssociatedTokenAddressSync(
        DEFAULT_USDC_MINT,
        activeEscrow.seller
      );
      const vaultAta = getAssociatedTokenAddressSync(
        DEFAULT_USDC_MINT,
        activeEscrow.pda,
        true
      );

      appendLog(`Releasing funds to seller & closing escrow PDA accounts...`, "info");

      const txSig = await (program.methods as any)
        .releaseFunds()
        .accounts({
          buyer: publicKey,
          seller: activeEscrow.seller,
          mint: DEFAULT_USDC_MINT,
          escrow: activeEscrow.pda,
          escrowTokenAccount: vaultAta,
          vault: vaultAta,
          sellerTokenAccount: sellerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      appendLog(`Funds released & rent reclaimed — tx: ${txSig.slice(0, 8)}...`, "success", txSig);
      setActiveEscrow((prev) => (prev ? { ...prev, status: "Released" } : null));
    } catch (err: any) {
      console.error("Release funds error:", err);
      const msg = parseError(err);
      setTxError(msg);
      appendLog(`Release failed: ${msg}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. CLAIM REFUND (STATE C -> STATE F)
  const handleClaimRefund = async () => {
    if (!program || !publicKey || !activeEscrow) return;
    setTxError(null);
    setIsSubmitting(true);

    try {
      const buyerAta = getAssociatedTokenAddressSync(
        DEFAULT_USDC_MINT,
        publicKey
      );
      const vaultAta = getAssociatedTokenAddressSync(
        DEFAULT_USDC_MINT,
        activeEscrow.pda,
        true
      );

      appendLog(`Claiming expired escrow refund & reclaiming rent lamports...`, "info");

      const txSig = await (program.methods as any)
        .refundIfExpired()
        .accounts({
          buyer: publicKey,
          mint: DEFAULT_USDC_MINT,
          escrow: activeEscrow.pda,
          escrowTokenAccount: vaultAta,
          vault: vaultAta,
          buyerTokenAccount: buyerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      appendLog(`Escrow refunded & rent reclaimed — tx: ${txSig.slice(0, 8)}...`, "success", txSig);
      setActiveEscrow((prev) => (prev ? { ...prev, status: "Refunded" } : null));
    } catch (err: any) {
      console.error("Refund error:", err);
      const msg = parseError(err);
      setTxError(msg);
      appendLog(`Refund failed: ${msg}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. RAISE DISPUTE (ANY ACTIVE STATE -> STATE F DISPUTED)
  const handleRaiseDispute = async () => {
    if (!program || !publicKey || !activeEscrow) return;
    setTxError(null);
    setIsSubmitting(true);

    try {
      appendLog(`Invoking dispute instruction to freeze escrow vault...`, "warn");

      const txSig = await (program.methods as any)
        .raiseDispute()
        .accounts({
          signer: publicKey,
          caller: publicKey,
          escrow: activeEscrow.pda,
        })
        .rpc();

      appendLog(`Escrow flagged as DISPUTED on devnet — tx: ${txSig.slice(0, 8)}...`, "warn", txSig);
      setActiveEscrow((prev) => (prev ? { ...prev, status: "Disputed" } : null));
    } catch (err: any) {
      console.error("Dispute error:", err);
      const msg = parseError(err);
      setTxError(msg);
      appendLog(`Dispute failed: ${msg}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deadlineSec = activeEscrow ? safeBnToNumber(activeEscrow.deadline) : 0;
  const deadlineDate = activeEscrow && deadlineSec > 0 ? new Date(deadlineSec * 1000) : null;
  const isExpired = activeEscrow && deadlineSec > 0 ? Date.now() / 1000 > deadlineSec : false;

  const isLookupLoading = isSearching || isCheckingEscrow;

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-900 dark:bg-[#0a0d16] dark:text-[#f1f3f7]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-[#363844]/70 dark:bg-[#0a0d16]/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:flex-nowrap sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <BrandIcon linkHome />
            <span className="inline-flex shrink-0 rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 font-mono text-[10px] text-blue-600 dark:text-blue-300">
              DEVNET
            </span>
          </div>

          <div className="ml-auto flex w-full items-center justify-end gap-2 sm:ml-0 sm:w-auto">
            {/* View Activity Log Header Button */}
            <Link
              href="/activity"
              id="header-activity-btn"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#363844] dark:bg-[#1b1e27] dark:text-slate-200 dark:hover:bg-[#252836] transition-colors"
            >
              <span>Activity Log</span>
              <span className="rounded-full bg-blue-500/15 px-1.5 py-0.2 text-[10px] font-mono text-blue-600 dark:text-blue-400">
                {activityFeed.length}
              </span>
            </Link>

            <ThemeToggle />
            {walletUiMounted ? (
              <WalletMultiButton className="!h-11 !max-w-[152px] !overflow-hidden !rounded-xl !bg-[#3b82f6] !font-semibold sm:!max-w-none" />
            ) : (
              <div
                aria-hidden="true"
                className="h-11 w-[152px] rounded-xl bg-slate-200/70 dark:bg-[#1b1e27]"
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {/* Top Info Banner with Quick Link to Activity Feed */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-5 py-3.5 dark:border-blue-500/15 dark:bg-blue-500/10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Solana Devnet Escrow Console
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-xs hidden sm:inline">•</span>
            <span className="text-xs text-slate-600 dark:text-[#9ba1b0] hidden sm:inline">
              Secure B2B Milestone Settlement Protocol
            </span>
          </div>
          <Link
            href="/activity"
            id="top-view-activity-btn"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
          >
            <span>View Activity Log ({activityFeed.length})</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Top Stats Panels */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="tb-panel p-5">
            <span className="tb-label">Network</span>
            <div className="mt-4 text-2xl font-semibold">Devnet</div>
            <div className="mt-2 truncate tb-mono text-slate-500 dark:text-[#9ba1b0]">
              api.devnet.solana.com
            </div>
            <div className="mt-4 text-xs text-[#35a66f]">● RPC connected</div>
          </div>

          <div className="tb-panel p-5">
            <div className="flex items-center justify-between">
              <span className="tb-label">Wallet status</span>
              {(connecting || isCheckingEscrow) && <RotatingLogoSpinner size={16} />}
            </div>
            <div className="mt-4 text-2xl font-semibold">
              {connecting
                ? "Connecting..."
                : isCheckingEscrow
                ? "Syncing..."
                : connected
                ? "Connected"
                : "Standby"}
            </div>
            <div className="mt-2 truncate tb-mono text-slate-500 dark:text-[#9ba1b0]">
              {publicKey ? publicKey.toBase58() : "Connect a wallet to continue"}
            </div>
            <div className="mt-4 text-xs text-slate-500 dark:text-[#9ba1b0]">
              {connected ? "Ready for signed actions" : "Phantom or Solflare supported"}
            </div>
          </div>

          <div className="tb-panel p-5">
            <span className="tb-label">Escrow state</span>
            <div className="mt-4 text-2xl font-semibold">
              {activeEscrow ? activeEscrow.status : "Not looked up"}
            </div>
            <div className="mt-2 truncate tb-mono text-slate-500 dark:text-[#9ba1b0]">
              {activeEscrow ? activeEscrow.pda.toBase58() : "Awaiting agreement lookup"}
            </div>
            <div className="mt-4 text-xs text-slate-500 dark:text-[#9ba1b0]">
              {userRole ? "Viewing as " + userRole : "Buyer / seller role detected on lookup"}
            </div>
          </div>
        </section>

        {/* Agreement Lookup Panel */}
        <section id="lookup-panel" className="tb-panel p-5 sm:p-6">
          <div className="mb-5">
            <div className="tb-label">Agreement lookup</div>
            <h1 className="mt-1 text-xl font-semibold">Look up escrow agreement</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#9ba1b0]">
              Enter the other party’s wallet address or paste an Escrow PDA directly to inspect or initialize the trade.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={counterpartyInput}
              onChange={(e) => setCounterpartyInput(e.target.value)}
              placeholder="Counterparty public key or escrow PDA"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none focus:border-blue-500 dark:border-[#363844] dark:bg-[#212121] dark:text-white"
            />
            <button
              onClick={() => handleLookup()}
              disabled={isSearching}
              className="tb-button bg-[#3b82f6] text-white hover:bg-blue-600 transition"
            >
              {isSearching ? "Searching…" : "Search escrow →"}
            </button>
          </div>
          {searchError && <p className="mt-3 text-sm text-[#c85c5c]">{searchError}</p>}
        </section>

        {/* Escrow Agreement Result / Creation Area (Replaced by Dedicated Loading Card during lookup) */}
        {isLookupLoading ? (
          <EscrowLookupLoadingCard
            message="Searching for escrow agreement..."
            submessage="Checking Escrow PDA on Devnet..."
          />
        ) : (
          <section className="tb-panel overflow-hidden">
            {!activeEscrow ? (
              <div className="p-6">
                <div className="tb-label text-[#c88a2d]">State A · no agreement found</div>
                <h2 className="mt-2 text-xl font-semibold">Initialize a new trade escrow</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-[#9ba1b0]">
                  Create the on-chain agreement as the buyer after entering the trade terms.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label>
                    <span className="tb-label">Deposit · USDC</span>
                    <input
                      value={createAmountUsdc}
                      onChange={(e) => setCreateAmountUsdc(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono dark:border-[#363844] dark:bg-[#212121]"
                    />
                  </label>
                  <label>
                    <span className="tb-label">Deadline · days</span>
                    <input
                      value={createDeadlineDays}
                      onChange={(e) => setCreateDeadlineDays(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono dark:border-[#363844] dark:bg-[#212121]"
                    />
                  </label>
                  <button
                    onClick={handleCreateEscrow}
                    disabled={!searchedCounterparty || !connected || isSubmitting}
                    className="tb-button w-full self-stretch bg-[#3b82f6] text-white hover:bg-blue-600 sm:self-end transition"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <RotatingLogoSpinner size={16} />
                        <span>Confirming…</span>
                      </span>
                    ) : (
                      "Create escrow"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="tb-label">
                  Active agreement · State{" "}
                  {activeEscrow.status === "Created" && userRole === "seller"
                    ? "B"
                    : activeEscrow.status === "Created"
                    ? "C"
                    : activeEscrow.status === "ShipmentConfirmed" && userRole === "buyer"
                    ? "D"
                    : activeEscrow.status === "ShipmentConfirmed"
                    ? "E"
                    : "F"}
                </div>
                <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {activeEscrow.status === "Released"
                        ? "Funds released"
                        : activeEscrow.status === "Refunded"
                        ? "Refund completed"
                        : activeEscrow.status === "Disputed"
                        ? "Agreement disputed"
                        : "Trade escrow in progress"}
                    </h2>
                    <div className="mt-2 break-all tb-mono text-slate-500 dark:text-[#9ba1b0]">
                      {activeEscrow.pda.toBase58()}
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs">
                    {activeEscrow.status}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 border-y border-slate-200/70 py-4 text-sm dark:border-[#363844]/70 sm:grid-cols-3">
                  <div>
                    <span className="tb-label">Amount</span>
                    <div className="mt-1 font-mono text-lg">
                      {formatEscrowAmount(activeEscrow.amount)} USDC
                    </div>
                  </div>
                  <div>
                    <span className="tb-label">Tracking</span>
                    <div className="mt-1 font-mono">
                      {activeEscrow.trackingRef || "Not submitted"}
                    </div>
                  </div>
                  <div>
                    <span className="tb-label">Deadline</span>
                    <div className="mt-1 font-mono">
                      {deadlineDate?.toLocaleDateString() || "No deadline"}
                    </div>
                  </div>
                </div>

                {activeEscrow.status === "Created" && userRole === "seller" && (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={trackingRefInput}
                      onChange={(e) => setTrackingRefInput(e.target.value)}
                      placeholder="Carrier tracking reference"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono dark:border-[#363844] dark:bg-[#212121]"
                    />
                    <button
                      onClick={handleConfirmShipment}
                      disabled={isSubmitting}
                      className="tb-button bg-[#3b82f6] text-white hover:bg-blue-600 transition"
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <RotatingLogoSpinner size={16} />
                          <span>Confirming…</span>
                        </span>
                      ) : (
                        "Confirm shipment"
                      )}
                    </button>
                  </div>
                )}

                {activeEscrow.status === "Created" && userRole === "buyer" && (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <p className="flex-1 text-sm text-slate-500 dark:text-[#9ba1b0]">
                      Waiting for seller shipment confirmation.
                    </p>
                    <button
                      onClick={handleClaimRefund}
                      disabled={!isExpired || isSubmitting}
                      className="tb-button bg-amber-500/15 text-[#c88a2d] hover:bg-amber-500/25 transition"
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <RotatingLogoSpinner size={16} />
                          <span>Confirming…</span>
                        </span>
                      ) : (
                        "Claim refund"
                      )}
                    </button>
                    <button
                      onClick={handleRaiseDispute}
                      disabled={isSubmitting}
                      className="tb-button border border-red-400/30 text-[#c85c5c] hover:bg-red-500/10 transition"
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <RotatingLogoSpinner size={16} />
                          <span>Confirming…</span>
                        </span>
                      ) : (
                        "Raise dispute"
                      )}
                    </button>
                  </div>
                )}

                {activeEscrow.status === "ShipmentConfirmed" && userRole === "buyer" && (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <p className="flex-1 text-sm text-slate-500 dark:text-[#9ba1b0]">
                      Review delivery before releasing funds.
                    </p>
                    <button
                      onClick={handleReleaseFunds}
                      disabled={isSubmitting}
                      className="tb-button bg-[#35a66f] text-white hover:bg-emerald-600 transition"
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <RotatingLogoSpinner size={16} />
                          <span>Confirming…</span>
                        </span>
                      ) : (
                        "Release funds"
                      )}
                    </button>
                    <button
                      onClick={handleRaiseDispute}
                      disabled={isSubmitting}
                      className="tb-button border border-red-400/30 text-[#c85c5c] hover:bg-red-500/10 transition"
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <RotatingLogoSpinner size={16} />
                          <span>Confirming…</span>
                        </span>
                      ) : (
                        "Raise dispute"
                      )}
                    </button>
                  </div>
                )}

                {activeEscrow.status === "ShipmentConfirmed" && userRole === "seller" && (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <p className="flex-1 text-sm text-slate-500 dark:text-[#9ba1b0]">
                      Funds await buyer approval.
                    </p>
                    <button
                      onClick={handleRaiseDispute}
                      disabled={isSubmitting}
                      className="tb-button border border-red-400/30 text-[#c85c5c] hover:bg-red-500/10 transition"
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <RotatingLogoSpinner size={16} />
                          <span>Confirming…</span>
                        </span>
                      ) : (
                        "Raise dispute"
                      )}
                    </button>
                  </div>
                )}

                {["Released", "Refunded", "Disputed"].includes(activeEscrow.status) && (
                  <div className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-[#212121] dark:text-[#9ba1b0]">
                    This agreement is terminal and settled.
                  </div>
                )}
              </div>
            )}

            {txError && (
              <div className="border-t border-red-400/20 bg-red-500/5 px-6 py-4 text-sm text-[#c85c5c]">
                {txError}
              </div>
            )}
          </section>
        )}

        {/* Separated Activity Log Action Panel */}
        <section className="tb-panel flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <div className="tb-label">On-chain audit log</div>
            <h2 className="mt-1 text-lg font-semibold">Activity Feed</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-[#9ba1b0]">
              All Solana transactions, PDA lookups, and state changes are recorded on the dedicated activity page.
            </p>
          </div>
          <Link
            href="/activity"
            id="view-activity-log-btn"
            className="tb-button shrink-0 bg-[#3b82f6] text-white hover:bg-blue-600 shadow-sm transition"
          >
            <span>View Activity Log ({activityFeed.length})</span>
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    </div>
  );
}
