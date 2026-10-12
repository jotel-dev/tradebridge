import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { colors, fonts } from "../styles/theme";

export const TradeBridgeIntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame: frame - 5, fps, config: { damping: 14 } });
  const contentFade = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const pillarsEntrance = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  const glow = (Math.sin(frame * 0.08) + 1) / 2;
  const exitOpacity = interpolate(frame, [165, 180], [1, 0], { extrapolateRight: "clamp" });

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
      {/* Glow Backdrops */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 900,
          height: 600,
          background: `radial-gradient(circle, rgba(37,99,235,${0.25 + glow * 0.1}) 0%, rgba(6,182,212,${0.15 + glow * 0.08}) 45%, transparent 70%)`,
          filter: "blur(70px)",
        }}
      />

      {/* Network Badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 20px",
          borderRadius: 30,
          background: "rgba(37, 99, 235, 0.15)",
          border: "1px solid rgba(56, 189, 248, 0.4)",
          marginBottom: 28,
          opacity: contentFade,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors.emerald, boxShadow: "0 0 10px #10b981" }} />
        <span
          style={{
            fontSize: 13,
            fontFamily: fonts.mono,
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: colors.cyanLight,
            textTransform: "uppercase",
          }}
        >
          Solana Devnet • Anchor Protocol
        </span>
      </div>

      {/* Hero Logo Presentation */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${interpolate(logoSpring, [0, 1], [0.85, 1])})`,
          marginBottom: 20,
        }}
      >
        <Img
          src={staticFile("images/logo.png")}
          alt="TradeBridge Logo"
          style={{
            height: 120,
            width: "auto",
            filter: `drop-shadow(0 0 ${24 + glow * 16}px rgba(56,189,248,0.45))`,
          }}
        />
      </div>

      {/* Headline & Subhead */}
      <div
        style={{
          textAlign: "center",
          opacity: contentFade,
          maxWidth: 900,
        }}
      >
        <h2
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: colors.cyanLight,
            margin: "0 0 10px 0",
            letterSpacing: "-0.01em",
          }}
        >
          Trustless B2B Escrow for Global Trade
        </h2>
        <p
          style={{
            fontSize: 20,
            color: colors.textSecondary,
            margin: 0,
            fontWeight: 400,
          }}
        >
          Eliminate intermediary risk with deterministic smart contract settlement on Solana.
        </p>
      </div>

      {/* 3 Value Pillars */}
      <div
        style={{
          display: "flex",
          gap: 28,
          marginTop: 48,
          transform: `translateY(${interpolate(pillarsEntrance, [0, 1], [30, 0])}px)`,
          opacity: contentFade,
        }}
      >
        {[
          {
            step: "01",
            title: "Lock Funds On-Chain",
            desc: "Buyer deposits USDC directly into a program-derived vault PDA.",
            icon: (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ),
          },
          {
            step: "02",
            title: "Confirm Shipment",
            desc: "Seller registers verifiable courier tracking reference.",
            icon: (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            ),
          },
          {
            step: "03",
            title: "Release Securely",
            desc: "Buyer confirms cargo receipt to trigger instant deterministic settlement.",
            icon: (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            ),
          },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              width: 340,
              padding: "26px 24px",
              borderRadius: 20,
              background: "rgba(22, 25, 37, 0.8)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              boxShadow: "0 16px 36px rgba(0,0,0,0.35)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(56, 189, 248, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.icon}
              </div>
              <span style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.cyanLight, fontWeight: 700 }}>
                STEP {item.step}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary }}>
              {item.title}
            </div>
            <div style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.45 }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>

      {/* App URL Badge */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 22px",
          borderRadius: 20,
          background: "rgba(10, 13, 22, 0.7)",
          border: "1px solid rgba(54, 56, 68, 0.8)",
          opacity: contentFade,
        }}
      >
        <span style={{ fontSize: 13, color: colors.textMuted }}>Live Application:</span>
        <span style={{ fontSize: 14, fontFamily: fonts.mono, color: "#ffffff", fontWeight: 600 }}>
          https://tradebridge-app.vercel.app
        </span>
      </div>
    </div>
  );
};
