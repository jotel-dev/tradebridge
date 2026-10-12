import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../styles/theme";

interface CaptionItem {
  start: number;
  end: number;
  text: string;
  tag?: string;
}

const captions: CaptionItem[] = [
  {
    start: 15,
    end: 200,
    tag: "PROBLEM",
    text: "Cross-border trade creates a difficult choice. Buyers don't want to pay before goods are shipped, and sellers don't want to ship without payment security.",
  },
  {
    start: 225,
    end: 375,
    tag: "SOLUTION",
    text: "Meet TradeBridge, an escrow-backed settlement protocol built on Solana.",
  },
  {
    start: 405,
    end: 670,
    tag: "ESCROW",
    text: "The buyer deposits funds into a program-controlled escrow vault.",
  },
  {
    start: 705,
    end: 970,
    tag: "LOGISTICS",
    text: "The seller submits a shipment reference, advancing the escrow lifecycle on-chain.",
  },
  {
    start: 1005,
    end: 1330,
    tag: "SETTLEMENT",
    text: "The buyer releases funds upon verification. If the seller never ships, the buyer can reclaim the deposit. If disputes arise, funds are frozen.",
  },
  {
    start: 1365,
    end: 1575,
    tag: "ARCHITECTURE",
    text: "TradeBridge replaces intermediaries with transparent, contract-enforced settlement rules on Solana.",
  },
  {
    start: 1605,
    end: 1845,
    tag: "DEVNET DEMO",
    text: "Trade globally. Settle with confidence. Explore TradeBridge on Solana Devnet.",
  },
];

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();

  const activeCaption = captions.find(
    (c) => frame >= c.start && frame <= c.end
  );

  if (!activeCaption) return null;

  const fadeIn = interpolate(
    frame,
    [activeCaption.start, activeCaption.start + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const fadeOut = interpolate(
    frame,
    [activeCaption.end - 10, activeCaption.end],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 44,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 50,
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          background: "rgba(10, 13, 22, 0.88)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(56, 189, 248, 0.35)",
          borderRadius: 24,
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(14, 165, 233, 0.15)",
        }}
      >
        {activeCaption.tag && (
          <span
            style={{
              fontSize: 11,
              fontFamily: fonts.mono,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: colors.cyanLight,
              background: "rgba(56, 189, 248, 0.12)",
              padding: "4px 10px",
              borderRadius: 8,
              border: "1px solid rgba(56, 189, 248, 0.25)",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            {activeCaption.tag}
          </span>
        )}
        <span
          style={{
            fontSize: 20,
            fontFamily: fonts.main,
            fontWeight: 500,
            color: "#f8fafc",
            lineHeight: 1.45,
            letterSpacing: "-0.01em",
          }}
        >
          {activeCaption.text}
        </span>
      </div>
    </div>
  );
};