import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { colors, fonts } from "../styles/theme";

export const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 15 } });
  const pulse = (Math.sin(frame * 0.1) + 1) / 2;
  const exitOpacity = interpolate(frame, [225, 240], [1, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: colors.bg,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fonts.main,
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 1000,
          height: 600,
          background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(6,182,212,0.1) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 44,
          transform: `translateY(${interpolate(entrance, [0, 1], [30, 0])}px)`,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 18px",
            borderRadius: 30,
            background: "rgba(37, 99, 235, 0.12)",
            border: "1px solid rgba(37, 99, 235, 0.35)",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.cyanLight, fontWeight: 700 }}>
            UNDER THE HOOD
          </span>
        </div>
        <h2 style={{ fontSize: 52, fontWeight: 800, color: colors.textPrimary, margin: 0, letterSpacing: "-0.02em" }}>
          The Technology Behind TradeBridge
        </h2>
        <p style={{ fontSize: 22, color: colors.textSecondary, marginTop: 10, margin: "10px 0 0 0" }}>
          Non-custodial, program-derived escrow architecture on Solana Devnet.
        </p>
      </div>

      {/* Architecture Flow Diagram */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          transform: `scale(${interpolate(entrance, [0, 1], [0.95, 1])})`,
          opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {/* Node 1: Wallets */}
        <div
          style={{
            width: 260,
            padding: "28px 22px",
            borderRadius: 20,
            background: "rgba(22, 25, 37, 0.9)",
            border: "1px solid rgba(54, 56, 68, 0.8)",
            boxShadow: "0 16px 36px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            textAlign: "center",
            alignItems: "center",
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(56, 189, 248, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7h-7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
              <path d="M16 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
              <path d="M4 17V5a2 2 0 0 1 2-2h12" />
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: colors.textPrimary }}>Bilateral Wallets</div>
          <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.4 }}>
            Buyer & Seller (Phantom / Solflare on Devnet)
          </div>
          <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", fontSize: 11, fontFamily: fonts.mono, color: colors.cyanLight }}>
            Ed25519 Signatures
          </div>
        </div>

        <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
          <path d="M0 12h32M24 4l8 8-8 8" stroke={colors.cyanLight} strokeWidth="2.5" />
        </svg>

        {/* Node 2: Web3 App */}
        <div
          style={{
            width: 270,
            padding: "28px 22px",
            borderRadius: 20,
            background: "rgba(22, 25, 37, 0.9)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            boxShadow: "0 16px 36px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            textAlign: "center",
            alignItems: "center",
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(56, 189, 248, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <path d="M6 8h.01M9 8h.01M12 8h.01" />
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: colors.textPrimary }}>Next.js 14 App</div>
          <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.4 }}>
            TradeBridge Web Client (@solana/web3.js & Anchor)
          </div>
          <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(56,189,248,0.1)", fontSize: 11, fontFamily: fonts.mono, color: "#38bdf8" }}>
            Zero Custody Frontend
          </div>
        </div>

        <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
          <path d="M0 12h32M24 4l8 8-8 8" stroke={colors.cyanLight} strokeWidth="2.5" />
        </svg>

        {/* Node 3: Anchor Program */}
        <div
          style={{
            width: 300,
            padding: "28px 22px",
            borderRadius: 20,
            background: "rgba(22, 25, 37, 0.95)",
            border: "2px solid #2563eb",
            boxShadow: `0 0 ${20 + pulse * 15}px rgba(37,99,235,0.4)`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            textAlign: "center",
            alignItems: "center",
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(37, 99, 235, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: colors.textPrimary }}>Anchor Program</div>
          <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.4 }}>
            Deterministic Rust State Machine
          </div>
          <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(37,99,235,0.2)", fontSize: 11, fontFamily: fonts.mono, color: colors.cyanLight }}>
            Program ID: 3dmv4R...81v
          </div>
        </div>

        <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
          <path d="M0 12h32M24 4l8 8-8 8" stroke={colors.cyanLight} strokeWidth="2.5" />
        </svg>

        {/* Node 4: Escrow PDA Vault */}
        <div
          style={{
            width: 290,
            padding: "28px 22px",
            borderRadius: 20,
            background: "rgba(22, 25, 37, 0.9)",
            border: "1px solid rgba(16, 185, 129, 0.5)",
            boxShadow: "0 16px 36px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            textAlign: "center",
            alignItems: "center",
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="21" x2="21" y2="21" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <polyline points="5 6 12 3 19 6" />
              <line x1="4" y1="10" x2="4" y2="21" />
              <line x1="20" y1="10" x2="20" y2="21" />
              <line x1="8" y1="14" x2="8" y2="17" />
              <line x1="12" y1="14" x2="12" y2="17" />
              <line x1="16" y1="14" x2="16" y2="17" />
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: colors.textPrimary }}>Escrow PDA Vault</div>
          <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.4 }}>
            Associated Token Account owned by PDA
          </div>
          <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(16,185,129,0.15)", fontSize: 11, fontFamily: fonts.mono, color: colors.emerald }}>
            Test USDC (SPL Token)
          </div>
        </div>
      </div>

      {/* Architecture Highlights Footer */}
      <div
        style={{
          marginTop: 46,
          display: "flex",
          gap: 20,
        }}
      >
        {[
          "100% Non-Custodial",
          "Program Derived Address (PDA) Vault",
          "Clock-Enforced Expiration",
          "Rent Returned on Account Close",
        ].map((tag, i) => (
          <div
            key={i}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              background: "rgba(10, 13, 22, 0.7)",
              border: "1px solid rgba(54, 56, 68, 0.8)",
              fontSize: 13,
              fontWeight: 600,
              color: colors.textSecondary,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.cyanLight} strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
