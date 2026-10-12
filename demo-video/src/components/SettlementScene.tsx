import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { colors, fonts } from "../styles/theme";

export const SettlementScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 15 } });
  
  // Highlighting flow paths over time:
  const activeSection = frame < 150 ? 1 : frame < 260 ? 2 : 3;

  const releaseClick = frame >= 80;
  const exitOpacity = interpolate(frame, [345, 360], [1, 0], { extrapolateRight: "clamp" });

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
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: 150,
          width: 900,
          height: 600,
          background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 36,
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
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.emerald, fontWeight: 700 }}>
            PHASE 3: CONTRACT ENFORCEMENT & SETTLEMENT
          </span>
        </div>
        <h2 style={{ fontSize: 52, fontWeight: 800, color: colors.textPrimary, margin: 0, letterSpacing: "-0.02em" }}>
          Funds move only through permitted contract actions.
        </h2>
        <p style={{ fontSize: 22, color: colors.textSecondary, marginTop: 10, margin: "10px 0 0 0" }}>
          Deterministic release, deadline refund, and dispute freezing enforced by Rust code.
        </p>
      </div>

      {/* 3 Outcome Matrix */}
      <div
        style={{
          display: "flex",
          gap: 30,
          alignItems: "stretch",
          maxWidth: 1400,
          transform: `scale(${interpolate(entrance, [0, 1], [0.95, 1])})`,
          opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {/* Path 1: Happy Path Release */}
        <div
          style={{
            flex: 1,
            padding: "32px 28px",
            borderRadius: 24,
            background: activeSection === 1 ? "rgba(22, 25, 37, 0.95)" : "rgba(22, 25, 37, 0.5)",
            backdropFilter: "blur(16px)",
            border: activeSection === 1 ? "2px solid #10b981" : "1px solid rgba(54, 56, 68, 0.6)",
            boxShadow: activeSection === 1 ? "0 20px 40px rgba(16, 185, 129, 0.2)" : "none",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontFamily: fonts.mono, fontWeight: 700, color: colors.emerald }}>
              PRIMARY WORKFLOW
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.emerald} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>

          <h3 style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
            Buyer Confirms & Releases
          </h3>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0, lineHeight: 1.45 }}>
            Buyer inspects cargo, verifies shipment, and signs the release transaction.
          </p>

          <div style={{ padding: "14px", borderRadius: 12, background: "rgba(10, 13, 22, 0.7)", border: "1px solid rgba(54, 56, 68, 0.6)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>INSTRUCTION: release_funds</div>
            <div style={{ fontSize: 13, color: colors.emerald, fontWeight: 600 }}>PDA Signs SPL Transfer → Seller ATA</div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>Escrow PDA closed, rent SOL returned to buyer.</div>
          </div>

          <div
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: 12,
              background: releaseClick ? "rgba(16, 185, 129, 0.2)" : "rgba(37, 99, 235, 0.2)",
              border: releaseClick ? "1px solid #10b981" : "1px solid #2563eb",
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
              color: releaseClick ? colors.emerald : colors.cyanLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {releaseClick ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>250 USDC Settled to Seller</span>
              </>
            ) : (
              <span>Action: Release Funds</span>
            )}
          </div>
        </div>

        {/* Path 2: Expiration Refund */}
        <div
          style={{
            flex: 1,
            padding: "32px 28px",
            borderRadius: 24,
            background: activeSection === 2 ? "rgba(22, 25, 37, 0.95)" : "rgba(22, 25, 37, 0.5)",
            backdropFilter: "blur(16px)",
            border: activeSection === 2 ? "2px solid #f59e0b" : "1px solid rgba(54, 56, 68, 0.6)",
            boxShadow: activeSection === 2 ? "0 20px 40px rgba(245, 158, 11, 0.2)" : "none",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontFamily: fonts.mono, fontWeight: 700, color: colors.amber }}>
              TIMEOUT PROTECTION
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.amber} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>

          <h3 style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
            Deadline-Based Refund
          </h3>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0, lineHeight: 1.45 }}>
            If the seller fails to confirm shipment before the deadline, buyer reclaims 100% of funds.
          </p>

          <div style={{ padding: "14px", borderRadius: 12, background: "rgba(10, 13, 22, 0.7)", border: "1px solid rgba(54, 56, 68, 0.6)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>INSTRUCTION: refund_if_expired</div>
            <div style={{ fontSize: 13, color: colors.amber, fontWeight: 600 }}>clock.unix_timestamp &gt; deadline</div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>Only callable while in Created state.</div>
          </div>

          <div
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: 12,
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
              color: colors.amber,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.amber} strokeWidth="2.5">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Buyer Reclaims 100% Deposit</span>
          </div>
        </div>

        {/* Path 3: Dispute Freezing */}
        <div
          style={{
            flex: 1,
            padding: "32px 28px",
            borderRadius: 24,
            background: activeSection === 3 ? "rgba(22, 25, 37, 0.95)" : "rgba(22, 25, 37, 0.5)",
            backdropFilter: "blur(16px)",
            border: activeSection === 3 ? "2px solid #fb7185" : "1px solid rgba(54, 56, 68, 0.6)",
            boxShadow: activeSection === 3 ? "0 20px 40px rgba(244, 63, 94, 0.2)" : "none",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontFamily: fonts.mono, fontWeight: 700, color: "#fb7185" }}>
              DISPUTE FREEZE
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(244,63,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18" />
                <path d="M6 8l6-3 6 3" />
                <path d="M6 8l-3 7a3 3 0 0 0 6 0L6 8z" />
                <path d="M18 8l-3 7a3 3 0 0 0 6 0L18 8z" />
                <line x1="4" y1="21" x2="20" y2="21" />
              </svg>
            </div>
          </div>

          <h3 style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
            Dispute Freeze & Resolution
          </h3>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0, lineHeight: 1.45 }}>
            Either party can raise a dispute if cargo is damaged or missing, freezing all fund movement.
          </p>

          <div style={{ padding: "14px", borderRadius: 12, background: "rgba(10, 13, 22, 0.7)", border: "1px solid rgba(54, 56, 68, 0.6)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>INSTRUCTION: raise_dispute</div>
            <div style={{ fontSize: 13, color: "#fb7185", fontWeight: 600 }}>Freezes Unilateral Actions</div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>Designated Arbiter resolves to Buyer or Seller.</div>
          </div>

          <div
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: 12,
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#fb7185",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Escrow Frozen Pending Arbitration</span>
          </div>
        </div>
      </div>
    </div>
  );
};
