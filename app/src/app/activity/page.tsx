"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { WalletDevnetNotice } from "../components";
import { useActivity, type ActivityType } from "../activity-context";
import { BrandIcon, ThemeToggle } from "../components";

export default function ActivityPage() {
  const { activityFeed, clearLogs } = useActivity();
  const [walletUiMounted, setWalletUiMounted] = useState(false);
  const [filter, setFilter] = useState<"all" | ActivityType>("all");

  useEffect(() => {
    setWalletUiMounted(true);
  }, []);

  const filteredFeed = activityFeed.filter((item) => {
    if (filter === "all") return true;
    return item.type === filter;
  });

  const txCount = activityFeed.filter((item) => Boolean(item.signature)).length;

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-900 dark:bg-[#0a0d16] dark:text-[#f1f3f7]">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-[#363844]/70 dark:bg-[#0a0d16]/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:flex-nowrap sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <BrandIcon linkHome />
            <span className="inline-flex shrink-0 rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 font-mono text-[10px] text-blue-600 dark:text-blue-300">
              DEVNET
            </span>
          </div>

          <div className="ml-auto flex w-full items-center justify-end gap-2 sm:ml-0 sm:w-auto">
            <Link
              href="/"
              id="header-back-btn"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#363844] dark:bg-[#1b1e27] dark:text-slate-200 dark:hover:bg-[#252836] transition-colors"
            >
              <span>← Back to Dashboard</span>
            </Link>
            <ThemeToggle />
            <div className="relative">
              {walletUiMounted ? (
                <WalletMultiButton className="!h-11 !max-w-[152px] !overflow-hidden !rounded-xl !bg-[#3b82f6] !font-semibold sm:!max-w-none" />
              ) : (
                <div
                  aria-hidden="true"
                  className="h-11 w-[152px] rounded-xl bg-slate-200/70 dark:bg-[#1b1e27]"
                />
              )}
              <WalletDevnetNotice />
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {/* Navigation Breadcrumb & Page Title */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-[#9ba1b0]">
              <Link href="/" className="hover:underline hover:text-blue-500">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                Activity Feed
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              On-chain Activity Feed
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#9ba1b0]">
              Full chronological audit log of Solana Devnet escrow events, PDA queries, and verified transaction proofs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              id="back-to-dashboard-btn"
              className="tb-button bg-[#3b82f6] text-white hover:bg-blue-600 shadow-sm transition"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Bar */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="tb-panel p-5">
            <span className="tb-label">Total Events</span>
            <div className="mt-2 text-2xl font-semibold font-mono">{activityFeed.length}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-[#9ba1b0]">
              Session log entries recorded
            </div>
          </div>
          <div className="tb-panel p-5">
            <span className="tb-label">On-chain Transactions</span>
            <div className="mt-2 text-2xl font-semibold font-mono text-[#35a66f]">{txCount}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-[#9ba1b0]">
              Verified signatures on Explorer
            </div>
          </div>
          <div className="tb-panel p-5">
            <span className="tb-label">Target Network</span>
            <div className="mt-2 text-2xl font-semibold">Devnet</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-[#9ba1b0]">
              api.devnet.solana.com
            </div>
          </div>
        </section>

        {/* Activity Feed Table Panel */}
        <section className="tb-panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 p-5 dark:border-[#363844]/70">
            <div>
              <div className="tb-label">Audit Log</div>
              <h2 className="mt-1 text-lg font-semibold">Activity Records</h2>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "info", "success", "warn", "error"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                    filter === t
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#212430] dark:text-[#9ba1b0] dark:hover:bg-[#2c3040]"
                  }`}
                >
                  {t}
                </button>
              ))}

              {activityFeed.length > 0 && (
                <button
                  onClick={clearLogs}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 dark:border-[#363844] dark:hover:bg-red-500/10 dark:hover:text-red-400 transition"
                  title="Clear session activity log"
                >
                  Clear log
                </button>
              )}
            </div>
          </div>

          {/* Activity items list */}
          <div className="divide-y divide-slate-200/70 font-mono text-xs dark:divide-[#363844]/50">
            {filteredFeed.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-[#9ba1b0]">
                No activity entries found matching filter.
              </div>
            ) : (
              filteredFeed.map((item, index) => (
                <div
                  key={item.timestamp + index}
                  className="flex flex-col gap-2 p-4 transition-colors hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-[#212430]/40"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="shrink-0 text-slate-400 dark:text-slate-500">
                      [{item.timestamp}]
                    </span>
                    <span
                      className={`inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider ${
                        item.type === "error"
                          ? "bg-red-500/15 text-[#c85c5c]"
                          : item.type === "success"
                          ? "bg-emerald-500/15 text-[#35a66f]"
                          : item.type === "warn"
                          ? "bg-amber-500/15 text-[#c88a2d]"
                          : "bg-blue-500/10 text-blue-500 dark:text-blue-400"
                      }`}
                    >
                      {item.type}
                    </span>
                    <span
                      className={`break-words text-sm sm:text-xs ${
                        item.type === "error"
                          ? "text-[#c85c5c]"
                          : item.type === "success"
                          ? "text-[#35a66f]"
                          : item.type === "warn"
                          ? "text-[#c88a2d]"
                          : "text-slate-700 dark:text-[#d0d5dd]"
                      }`}
                    >
                      {item.message}
                    </span>
                  </div>

                  {item.signature && (
                    <div className="shrink-0 pt-1 sm:pt-0">
                      <a
                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition"
                        href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>Explorer</span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Bottom Back Button */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/"
            className="tb-button border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#363844] dark:bg-[#1b1e27] dark:text-slate-200 dark:hover:bg-[#252836] transition"
          >
            ← Return to Main Dashboard
          </Link>
          <span className="text-xs text-slate-400">TradeBridge Solana Devnet Escrow</span>
        </div>
      </main>
    </div>
  );
}
