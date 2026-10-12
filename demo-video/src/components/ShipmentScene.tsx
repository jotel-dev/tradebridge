import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { colors, fonts } from "../styles/theme";

export const ShipmentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 15 } });
  const typingFrame = 40;
  const fullText = "DHL-EXP-940285172-NG";
  const typedLength = Math.min(
    fullText.length,
    Math.floor(interpolate(frame, [typingFrame, typingFrame + 40], [0, fullText.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))
  );
  const currentTrackingText = fullText.slice(0, typedLength);

  const confirmFrame = 120;
  const isConfirmed = frame >= confirmFrame;

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
      {/* Background cyan radial glow */}
      <div
        style={{
          position: "absolute",
          top: 100,
          width: 800,
          height: 500,
          background: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)",
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
            background: "rgba(6, 182, 212, 0.12)",
            border: "1px solid rgba(6, 182, 212, 0.35)",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.cyanLight, fontWeight: 700 }}>
            PHASE 2: FULFILLMENT & TRACKING
          </span>
        </div>
        <h2 style={{ fontSize: 52, fontWeight: 800, color: colors.textPrimary, margin: 0, letterSpacing: "-0.02em" }}>
          The seller submits shipment details.
        </h2>
        <p style={{ fontSize: 22, color: colors.textSecondary, marginTop: 10, margin: "10px 0 0 0" }}>
          Shipment confirmation advances the escrow workflow on-chain.
        </p>
      </div>

      {/* Main Container */}
      <div
        style={{
          display: "flex",
          gap: 40,
          alignItems: "flex-start",
          transform: `scale(${interpolate(entrance, [0, 1], [0.95, 1])})`,
          opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {/* Seller Action Card */}
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
            gap: 22,
          }}
        >
          {/* Top Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(54, 56, 68, 0.5)", paddingBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: colors.cyanLight }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>
                Seller Dashboard • Agreement Action
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 8, background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.emerald }} />
              <span style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.cyanLight, fontWeight: 600 }}>
                Seller (Solflare Devnet)
              </span>
            </div>
          </div>

          {/* Active Escrow Summary */}
          <div style={{ padding: "16px 20px", borderRadius: 16, background: "rgba(10, 13, 22, 0.7)", border: "1px solid rgba(54, 56, 68, 0.6)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>LOCKED ESCROW AMOUNT</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary, fontFamily: fonts.mono, marginTop: 4 }}>
                $250.00 USDC
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>DEADLINE</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.amber, marginTop: 4 }}>
                6 Days, 23 Hours Left
              </div>
            </div>
          </div>

          {/* Tracking Input Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 12, fontFamily: fonts.mono, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
              Carrier Tracking / Bill of Lading Reference
            </span>
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                background: "rgba(10, 13, 22, 0.9)",
                border: "1px solid rgba(56, 189, 248, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: fonts.mono,
                fontSize: 16,
                color: colors.cyanLight,
              }}
            >
              <span>{currentTrackingText}</span>
              {frame < confirmFrame && (
                <span style={{ opacity: Math.sin(frame * 0.2) > 0 ? 1 : 0, color: colors.cyanLight }}>|</span>
              )}
            </div>
            <span style={{ fontSize: 11, color: colors.textMuted }}>
              Stored directly on the Solana TradeEscrow account (max 100 characters).
            </span>
          </div>

          {/* Submit Action */}
          <div
            style={{
              padding: "16px",
              borderRadius: 14,
              background: isConfirmed
                ? "linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                : "linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 700,
              boxShadow: isConfirmed
                ? "0 0 30px rgba(13, 148, 136, 0.5)"
                : "0 0 30px rgba(6, 182, 212, 0.4)",
            }}
          >
            {isConfirmed ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>Shipment Confirmed On-Chain</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span>Confirm Shipment (Record Tracking Ref)</span>
              </>
            )}
          </div>
        </div>

        {/* State Transition & Security Card */}
        <div
          style={{
            width: 480,
            padding: "36px 30px",
            borderRadius: 24,
            background: "rgba(22, 25, 37, 0.9)",
            backdropFilter: "blur(16px)",
            border: isConfirmed ? "1px solid rgba(13, 148, 136, 0.7)" : "1px solid rgba(54, 56, 68, 0.8)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontFamily: fonts.mono, color: colors.textMuted, fontWeight: 700 }}>
              LIFECYCLE TRANSITION
            </span>
          </div>

          {/* State Transition Flow */}
          <div style={{ padding: "18px", borderRadius: 16, background: "rgba(10, 13, 22, 0.8)", border: "1px solid rgba(54, 56, 68, 0.6)", display: "flex", alignItems: "center", justifyContent: "space-around" }}>
            <div style={{ textAlign: "center", opacity: isConfirmed ? 0.4 : 1 }}>
              <div style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>STATE 1</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: colors.blueLight, marginTop: 4 }}>Created</div>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.cyanLight} strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <div style={{ textAlign: "center", opacity: isConfirmed ? 1 : 0.4 }}>
              <div style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>STATE 2</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: colors.emerald, marginTop: 4 }}>Shipment Confirmed</div>
            </div>
          </div>

          {/* Protection Safeguards */}
          <div style={{ padding: "18px", borderRadius: 16, background: "rgba(10, 13, 22, 0.8)", border: "1px solid rgba(54, 56, 68, 0.6)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 12, fontFamily: fonts.mono, fontWeight: 700, color: colors.cyanLight }}>
              PROTOCOL SAFEGUARD ENFORCED:
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.emerald} strokeWidth="3" style={{ marginTop: 2, flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.4 }}>
                Buyer can no longer unilaterally refund via timeout.
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.emerald} strokeWidth="3" style={{ marginTop: 2, flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.4 }}>
                Funds remain locked in vault pending buyer verification.
              </span>
            </div>
          </div>

          {/* Scope Note */}
          <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
            <span style={{ fontSize: 11, color: colors.amber, lineHeight: 1.4, display: "block" }}>
              TradeBridge v1 uses seller-submitted tracking and manual buyer release. (Carrier oracle planned for v2).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
