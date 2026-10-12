import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { colors, fonts } from "../styles/theme";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 15 } });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const cardsEntrance = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const cardsOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });
  const deadlockPulse = (Math.sin(frame * 0.12) + 1) / 2;
  const bridgeReveal = interpolate(frame, [130, 170], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [195, 210], [1, 0], { extrapolateRight: "clamp" });

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
          top: -200,
          left: 200,
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(10,13,22,0) 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -200,
          right: 200,
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(10,13,22,0) 70%)",
          filter: "blur(60px)",
        }}
      />

      <div
        style={{
          textAlign: "center",
          marginBottom: 44,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
          opacity: titleOpacity,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 18px",
            borderRadius: 30,
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            marginBottom: 18,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors.rose }} />
          <span
            style={{
              fontSize: 13,
              fontFamily: fonts.mono,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#fb7185",
              textTransform: "uppercase",
            }}
          >
            The B2B Cross-Border Dilemma
          </span>
        </div>

        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: colors.textPrimary,
            margin: 0,
            letterSpacing: "-0.03em",
          }}
        >
          Ready to trade. <span style={{ color: "#fb7185" }}>Afraid to trust.</span>
        </h1>
        <p
          style={{
            fontSize: 24,
            color: colors.textSecondary,
            marginTop: 14,
            fontWeight: 400,
            letterSpacing: "-0.01em",
          }}
        >
          Cross-border physical trade shouldn't depend on blind upfront trust.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 50,
          opacity: cardsOpacity,
          transform: `scale(${interpolate(cardsEntrance, [0, 1], [0.94, 1])})`,
        }}
      >
        {/* Nigerian SME Exporter Card */}
        <div
          style={{
            width: 480,
            padding: "36px 32px",
            borderRadius: 24,
            background: "rgba(22, 25, 37, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(54, 56, 68, 0.8)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: "rgba(37, 99, 235, 0.15)",
                  border: "1px solid rgba(37, 99, 235, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Nigeria Flag SVG */}
                <svg width="28" height="20" viewBox="0 0 28 20" fill="none" style={{ borderRadius: 3, overflow: "hidden" }}>
                  <rect width="9.33" height="20" fill="#008751" />
                  <rect x="9.33" width="9.34" height="20" fill="#ffffff" />
                  <rect x="18.67" width="9.33" height="20" fill="#008751" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.textPrimary }}>
                  Nigerian SME Exporter
                </h3>
                <span style={{ fontSize: 13, color: colors.textMuted, fontFamily: fonts.mono }}>
                  Lagos, Nigeria • Agro Commodities
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: fonts.mono,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 6,
                background: "rgba(37, 99, 235, 0.12)",
                color: colors.cyanLight,
              }}
            >
              SELLER
            </span>
          </div>

          <div
            style={{
              padding: "16px 20px",
              borderRadius: 16,
              background: "rgba(10, 13, 22, 0.6)",
              border: "1px solid rgba(244, 63, 94, 0.25)",
            }}
          >
            <div style={{ fontSize: 12, fontFamily: fonts.mono, color: "#fb7185", fontWeight: 700 }}>
              SUPPLIER RISK
            </div>
            <div style={{ fontSize: 16, color: "#e2e8f0", marginTop: 6, lineHeight: 1.4 }}>
              "I cannot ship 20 tons of cargo overseas without payment security."
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: 11, color: colors.textMuted }}>TRADITIONAL ROUTE</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.textSecondary, marginTop: 4 }}>
                Bank Letter of Credit
              </div>
            </div>
            <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: 11, color: colors.textMuted }}>SETTLEMENT SPEED</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fb7185", marginTop: 4 }}>
                14–30 Days • High Fees
              </div>
            </div>
          </div>
        </div>

        {/* Lock Deadlock Indicator */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 140,
            gap: 12,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: `rgba(244, 63, 94, ${0.15 + deadlockPulse * 0.15})`,
              border: "2px solid rgba(244, 63, 94, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 ${20 + deadlockPulse * 15}px rgba(244, 63, 94, 0.4)`,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 12,
              fontFamily: fonts.mono,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#fb7185",
              textTransform: "uppercase",
            }}
          >
            Trust Deadlock
          </span>
          <div
            style={{
              width: 2,
              height: 40,
              background: "linear-gradient(to bottom, #fb7185, transparent)",
            }}
          />
        </div>

        {/* International Buyer Card */}
        <div
          style={{
            width: 480,
            padding: "36px 32px",
            borderRadius: 24,
            background: "rgba(22, 25, 37, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(54, 56, 68, 0.8)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: "rgba(6, 182, 212, 0.15)",
                  border: "1px solid rgba(6, 182, 212, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Globe SVG */}
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.textPrimary }}>
                  International Buyer
                </h3>
                <span style={{ fontSize: 13, color: colors.textMuted, fontFamily: fonts.mono }}>
                  Global Importer • B2B Procurement
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: fonts.mono,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 6,
                background: "rgba(6, 182, 212, 0.12)",
                color: colors.cyanLight,
              }}
            >
              BUYER
            </span>
          </div>

          <div
            style={{
              padding: "16px 20px",
              borderRadius: 16,
              background: "rgba(10, 13, 22, 0.6)",
              border: "1px solid rgba(244, 63, 94, 0.25)",
            }}
          >
            <div style={{ fontSize: 12, fontFamily: fonts.mono, color: "#fb7185", fontWeight: 700 }}>
              IMPORTER RISK
            </div>
            <div style={{ fontSize: 16, color: "#e2e8f0", marginTop: 6, lineHeight: 1.4 }}>
              "I cannot wire funds upfront without knowing the shipment is verified."
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: 11, color: colors.textMuted }}>BANK WIRE COST</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.textSecondary, marginTop: 4 }}>
                $40–$75 Wire Fee + FX
              </div>
            </div>
            <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: 11, color: colors.textMuted }}>ACCESSIBILITY</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fb7185", marginTop: 4 }}>
                Restricted for SMEs
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 48,
          opacity: bridgeReveal,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 28px",
          borderRadius: 20,
          background: "rgba(37, 99, 235, 0.1)",
          border: "1px solid rgba(37, 99, 235, 0.3)",
        }}
      >
        <span style={{ fontSize: 15, color: colors.cyanLight, fontWeight: 600 }}>
          The Solution: Non-Custodial Smart Contract Escrow
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.cyanLight} strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};
