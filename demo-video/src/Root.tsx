import React from "react";
import { Composition } from "remotion";
import { TradeBridgeDemo } from "./TradeBridgeDemo";

export const TestRender: React.FC = () => {
  return (
    <div
      style={{
        flex: 1,
        width: 1920,
        height: 1080,
        backgroundColor: "#0a0d16",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: 60, color: "#38bdf8" }}>TradeBridge Pipeline Verified</h1>
      <p style={{ fontSize: 28, color: "#94a3b8" }}>Solana Devnet B2B Escrow Protocol</p>
    </div>
  );
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="TradeBridgeDemo"
        component={TradeBridgeDemo}
        durationInFrames={1860}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="TestRender"
        component={TestRender}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
