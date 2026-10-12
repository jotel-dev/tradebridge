import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { colors, fonts } from "../styles/theme";

export const EscrowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 15 } });
  const buttonClickFrame = 120;
  const isClicked = frame >= buttonClickFrame;
  const buttonScale = isClicked
    ? interpolate(frame, [buttonClickFrame, buttonClickFrame + 6, buttonClickFrame + 12], [1, 0.94, 1], { extrapolateRight: "clamp" })
    : 1;

  const tokenTransferProgress = interpolate(frame, [buttonClickFrame + 10, buttonClickFrame + 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stateCreated = frame >= buttonClickFrame + 50;
  const exitOpacity = interpolate(frame, [285, 300], [1, 0], { extrapolateRight: "clamp" });

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
          top: 100,
          width: 800,
          height: 500,
          background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Scene Header */}
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
            background: "rgba(37, 99, 235, 0.12)",
            border: "1px solid rgba(37, 99, 235, 0.35)",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.cyanLight, fontWeight: 700 }}>
            PHASE 1: INITIALIZATION
          </span>
        </div>
        <h2 style={{ fontSize: 52, fontWeight: 800, color: colors.textPrimary, margin: 0, letterSpacing: "-0.02em" }}>
          The buyer deposits. <span style={{ color: colors.cyanLight }}>Funds are secured by escrow.</span>
        </h2>
        <p style={{ fontSize: 22, color: colors.textSecondary, marginTop: 10, margin: "10px 0 0 0" }}>
          Program-controlled PDA vault. Defined on-chain release conditions.
        </p>
      </div>

      {/* Main UI Mockup Container */}
      <div
        style={{
          display: "flex",
          gap: 40,
          alignItems: "flex-start",
          transform: `scale(${interpolate(entrance, [0, 1], [0.95, 1])})`,
          opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {/* Form Panel */}
        <div
          style={{
            width: 620,
            padding: "36px",
            borderRadius: 24,
            background: "rgba(22, 25, 37, 0.9)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(54, 56, 68, 0.8)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Top Panel Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(54, 56, 68, 0.5)", paddingBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: colors.blueLight }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>
                Initialize New Trade Escrow
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 8, background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.emerald }} />
              <span style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.cyanLight, fontWeight: 600 }}>
                Phantom (Devnet)
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontFamily: fonts.mono, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
              Buyer (Depositor)
            </span>
            <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(10, 13, 22, 0.7)", border: "1px solid rgba(54, 56, 68, 0.6)", fontFamily: fonts.mono, fontSize: 13, color: colors.cyanLight }}>
              4WRC4qzzLrgH8Hzc9z4KJdgrCxR33Phbi8AhsauToXNs
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontFamily: fonts.mono, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
              Seller (Beneficiary)
            </span>
            <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(10, 13, 22, 0.7)", border: "1px solid rgba(54, 56, 68, 0.6)", fontFamily: fonts.mono, fontSize: 13, color: "#e2e8f0" }}>
              7xKqM9uDqT5vBvY1X8bW3gH7aP2kL4nZ6jQ9sR1mV5eD
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, fontFamily: fonts.mono, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                Escrow Deposit
              </span>
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(10, 13, 22, 0.7)", border: "1px solid rgba(37, 99, 235, 0.4)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary, fontFamily: fonts.mono }}>
                  250.00
                </span>
                <span style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.cyanLight, fontWeight: 700 }}>
                  USDC
                </span>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, fontFamily: fonts.mono, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                Shipment Deadline
              </span>
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(10, 13, 22, 0.7)", border: "1px solid rgba(54, 56, 68, 0.6)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary, fontFamily: fonts.mono }}>
                  7
                </span>
                <span style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.textMuted }}>
                  DAYS
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div
            style={{
              marginTop: 10,
              padding: "16px",
              borderRadius: 14,
              background: stateCreated
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              transform: `scale(${buttonScale})`,
              boxShadow: stateCreated
                ? "0 0 30px rgba(16, 185, 129, 0.5)"
                : "0 0 30px rgba(37, 99, 235, 0.5)",
            }}
          >
            {stateCreated ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>Escrow Created on Devnet</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Create Escrow Vault (Deposit 250 USDC)</span>
              </>
            )}
          </div>
        </div>

        {/* Live On-Chain State Card */}
        <div
          style={{
            width: 480,
            padding: "36px 30px",
            borderRadius: 24,
            background: "rgba(22, 25, 37, 0.9)",
            backdropFilter: "blur(16px)",
            border: stateCreated ? "1px solid rgba(56, 189, 248, 0.7)" : "1px solid rgba(54, 56, 68, 0.8)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontFamily: fonts.mono, color: colors.textMuted, fontWeight: 700 }}>
              ON-CHAIN ESCROW ACCOUNT
            </span>
            <div
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                background: stateCreated ? "rgba(37, 99, 235, 0.2)" : "rgba(100, 116, 139, 0.2)",
                border: stateCreated ? "1px solid rgba(56, 189, 248, 0.5)" : "1px solid rgba(100, 116, 139, 0.4)",
                color: stateCreated ? colors.cyanLight : colors.textMuted,
                fontSize: 12,
                fontFamily: fonts.mono,
                fontWeight: 700,
              }}
            >
              {stateCreated ? "STATUS: CREATED" : "STATUS: UNINITIALIZED"}
            </div>
          </div>

          {/* PDA Seeds Info */}
          <div style={{ padding: "16px", borderRadius: 14, background: "rgba(10, 13, 22, 0.7)", border: "1px solid rgba(54, 56, 68, 0.6)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>
              DERIVED PDA SEEDS
            </div>
            <div style={{ fontSize: 12, fontFamily: fonts.mono, color: "#38bdf8" }}>
              [b"escrow", buyer_pubkey, seller_pubkey]
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
              Vault ATA Owner: Program Derived Address (Non-custodial)
            </div>
          </div>

          {/* Token Flow Visualization */}
          <div style={{ padding: "20px 16px", borderRadius: 14, background: "rgba(10, 13, 22, 0.7)", border: "1px solid rgba(54, 56, 68, 0.6)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: colors.textSecondary }}>Buyer SPL Account</span>
              <span style={{ fontSize: 12, color: colors.textSecondary }}>Escrow PDA Vault</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(54, 56, 68, 0.5)", overflow: "hidden", position: "relative" }}>
              <div
                style={{
                  height: "100%",
                  width: `${tokenTransferProgress * 100}%`,
                  background: "linear-gradient(90deg, #2563eb, #38bdf8)",
                  boxShadow: "0 0 12px #38bdf8",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>
              <span>250.00 USDC</span>
              <span style={{ color: colors.cyanLight }}>
                {stateCreated ? "LOCKED IN VAULT" : "TRANSFERRING..."}
              </span>
            </div>
          </div>

          {/* Verifiable Program ID */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10, fontFamily: fonts.mono, color: colors.textMuted }}>
              DEPLOYED ANCHOR PROGRAM ID
            </span>
            <span style={{ fontSize: 11, fontFamily: fonts.mono, color: "#94a3b8" }}>
              3dmv4RrSanjP9Qdaj4E3D9ra9YNJrDg4QZP9sCmaK81v
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
