import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { colors, fonts } from "../styles/theme";

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 14 } });
  const glow = (Math.sin(frame * 0.08) + 1) / 2;

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
      }}
    >
      {/* Background Radiance */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 1100,
          height: 700,
          background: `radial-gradient(circle, rgba(37,99,235,${0.25 + glow * 0.1}) 0%, rgba(6,182,212,${0.15 + glow * 0.08}) 45%, transparent 70%)`,
          filter: "blur(75px)",
        }}
      />

      {/* Main Logo & Headline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${interpolate(entrance, [0, 1], [0.9, 1])})`,
          marginBottom: 30,
        }}
      >
        <Img
          src={staticFile("images/logo.png")}
          alt="TradeBridge Logo"
          style={{
            height: 110,
            width: "auto",
            filter: `drop-shadow(0 0 ${24 + glow * 16}px rgba(56,189,248,0.45))`,
            marginBottom: 20,
          }}
        />

        <h1
          style={{
            fontSize: 54,
            fontWeight: 800,
            color: colors.textPrimary,
            margin: "0 0 10px 0",
            letterSpacing: "-0.03em",
          }}
        >
          Trade globally. <span style={{ color: colors.cyanLight }}>Settle with confidence.</span>
        </h1>
        <p style={{ fontSize: 22, color: colors.textSecondary, margin: 0, fontWeight: 400 }}>
          Escrow-backed cross-border physical trade on Solana.
        </p>
      </div>

      {/* Verifiable Credentials Panel */}
      <div
        style={{
          width: 960,
          padding: "30px 36px",
          borderRadius: 24,
          background: "rgba(22, 25, 37, 0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(56, 189, 248, 0.35)",
          boxShadow: "0 20px 48px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(54, 56, 68, 0.6)", paddingBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors.emerald, boxShadow: "0 0 10px #10b981" }} />
            <span style={{ fontSize: 13, fontFamily: fonts.mono, fontWeight: 700, color: colors.cyanLight }}>
              LIVE ON SOLANA DEVNET
            </span>
          </div>
          <span style={{ fontSize: 12, color: colors.textMuted }}>
            Colosseum Crypto World's Fair • Superteam Nigeria
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>LIVE WEB APPLICATION</span>
            <span style={{ fontSize: 14, fontFamily: fonts.mono, color: "#ffffff", fontWeight: 600 }}>
              https://tradebridge-app.vercel.app
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>SOLANA PROGRAM ID</span>
            <span style={{ fontSize: 13, fontFamily: fonts.mono, color: colors.cyanLight, fontWeight: 600 }}>
              3dmv4RrSanjP9Qdaj4E3D9ra9YNJrDg4QZP9sCmaK81v
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>TEST USDC MINT (DEVNET)</span>
            <span style={{ fontSize: 13, fontFamily: fonts.mono, color: "#94a3b8" }}>
              2Rehr4QfS9xpo6x8t9FptPneocaaYK5VyUiTaihnouzT
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted }}>DEVNET EXPLORER</span>
            <span style={{ fontSize: 13, fontFamily: fonts.mono, color: "#94a3b8" }}>
              explorer.solana.com (cluster=devnet)
            </span>
          </div>
        </div>
      </div>

      {/* Call To Action Button */}
      <div
        style={{
          marginTop: 34,
          padding: "16px 40px",
          borderRadius: 30,
          background: "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)",
          color: "#ffffff",
          fontSize: 18,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 0 32px rgba(37, 99, 235, 0.5), 0 10px 24px rgba(0,0,0,0.3)",
          letterSpacing: "-0.01em",
        }}
      >
        <span>Explore the Live Devnet Demo</span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};
