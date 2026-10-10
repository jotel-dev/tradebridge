"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "./theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="rounded-xl border border-slate-200 bg-white p-2.5 hover:bg-slate-50 dark:border-[#363844] dark:bg-[#1b1e27] dark:hover:bg-[#252836] transition-colors"
    >
      <span className="inline-block h-5 w-5 leading-5 text-center" aria-hidden="true">
        {mounted ? (theme === "dark" ? "☼" : "◐") : null}
      </span>
    </button>
  );
}

export function BrandIcon({ linkHome = false }: { linkHome?: boolean }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const icon = (
    <img
      src="/logo-icon.png"
      alt="TradeBridge"
      className="h-10 w-auto max-w-none object-contain sm:h-12 transition-transform hover:scale-105"
    />
  );

  const content = mounted && theme === "light" ? (
    <div className="rounded-xl bg-[#0A0D16] p-1.5 shadow-sm">{icon}</div>
  ) : (
    icon
  );

  if (linkHome) {
    return (
      <Link href="/" className="flex items-center gap-2" title="TradeBridge Home">
        {content}
      </Link>
    );
  }

  return content;
}

export function RotatingLogoSpinner({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/logo-icon.png"
      alt="Loading..."
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`animate-spin object-contain inline-block shrink-0 ${className}`}
    />
  );
}

export function EscrowLookupLoadingCard({
  message = "Searching for escrow agreement...",
  submessage = "Checking Escrow PDA on Devnet...",
}: {
  message?: string;
  submessage?: string;
}) {
  return (
    <section className="tb-panel flex min-h-[280px] flex-col items-center justify-center p-8 text-center sm:p-12 animate-fadeIn">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/10 p-3 ring-1 ring-blue-500/20 dark:bg-blue-500/15">
        <RotatingLogoSpinner size={52} />
      </div>
      <h3 className="mt-5 text-base font-semibold text-slate-800 dark:text-slate-100">
        {message}
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-[#9ba1b0]">
        {submessage}
      </p>
    </section>
  );
}

export function WalletLoadingIndicator({
  message = "Connecting wallet...",
  submessage = "Checking for existing milestone escrows on Solana Devnet...",
}: {
  message?: string;
  submessage?: string;
}) {
  return (
    <div className="tb-panel flex min-h-[240px] flex-col items-center justify-center p-8 text-center sm:p-12 my-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 p-3 ring-1 ring-blue-500/20 dark:bg-blue-500/15">
        <RotatingLogoSpinner size={36} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">
        {message}
      </h3>
      {submessage && (
        <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-[#9ba1b0]">
          {submessage}
        </p>
      )}
    </div>
  );
}

export function WalletDevnetNotice({ className = "" }: { className?: string }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const isDismissed = localStorage.getItem("tradebridge_wallet_notice_dismissed") === "true";
    setDismissed(isDismissed);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("tradebridge_wallet_notice_dismissed", "true");
    } catch {
      // ignore storage error if cookies/storage disabled
    }
  };

  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute right-0 top-[calc(100%+8px)] z-30 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-amber-500/30 bg-amber-50/95 p-3 text-xs text-amber-950 shadow-xl backdrop-blur-md dark:border-amber-400/25 dark:bg-[#1a1712]/95 dark:text-amber-200 transition-all ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-amber-600 dark:text-amber-400 text-sm shrink-0" aria-hidden="true">
          ⚠️
        </span>
        <div className="flex-1 text-[11px] leading-relaxed">
          Use Phantom or Solflare set to Solana Devnet. Other wallets may default to Mainnet and will not work with this demo.
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notice"
          className="shrink-0 -mr-1 -mt-1 rounded-md p-1 text-amber-700/70 hover:bg-amber-200/50 hover:text-amber-900 dark:text-amber-400/70 dark:hover:bg-amber-800/30 dark:hover:text-amber-200 transition-colors"
          title="Dismiss notice"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
