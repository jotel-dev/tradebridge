import React from "react";
import { Sequence, staticFile, Audio } from "remotion";
import { IntroScene } from "./components/IntroScene";
import { TradeBridgeIntroScene } from "./components/TradeBridgeIntroScene";
import { EscrowScene } from "./components/EscrowScene";
import { ShipmentScene } from "./components/ShipmentScene";
import { SettlementScene } from "./components/SettlementScene";
import { ArchitectureScene } from "./components/ArchitectureScene";
import { ClosingScene } from "./components/ClosingScene";
import { Captions } from "./components/Captions";

export const TradeBridgeDemo: React.FC = () => {
  return (
    <div style={{ width: 1920, height: 1080, backgroundColor: "#0a0d16", position: "relative" }}>
      {/* Background Music */}
      <Audio src={staticFile("audio/ambient_bgm.wav")} volume={0.16} />

      {/* Voiceover Tracks Synchronized to Scenes */}
      <Sequence from={15} durationInFrames={195}>
        <Audio src={staticFile("audio/scene1_problem.wav")} volume={1.0} />
      </Sequence>

      <Sequence from={220} durationInFrames={170}>
        <Audio src={staticFile("audio/scene2_intro.wav")} volume={1.0} />
      </Sequence>

      <Sequence from={400} durationInFrames={290}>
        <Audio src={staticFile("audio/scene3_escrow.wav")} volume={1.0} />
      </Sequence>

      <Sequence from={700} durationInFrames={290}>
        <Audio src={staticFile("audio/scene4_shipment.wav")} volume={1.0} />
      </Sequence>

      <Sequence from={1000} durationInFrames={350}>
        <Audio src={staticFile("audio/scene5_settlement.wav")} volume={1.0} />
      </Sequence>

      <Sequence from={1360} durationInFrames={230}>
        <Audio src={staticFile("audio/scene6_architecture.wav")} volume={1.0} />
      </Sequence>

      <Sequence from={1600} durationInFrames={260}>
        <Audio src={staticFile("audio/scene7_closing.wav")} volume={1.0} />
      </Sequence>

      {/* Sound Effects timed to UI events */}
      <Sequence from={225} durationInFrames={30}>
        <Audio src={staticFile("audio/confirm.wav")} volume={0.4} />
      </Sequence>

      <Sequence from={505} durationInFrames={20}>
        <Audio src={staticFile("audio/click.wav")} volume={0.3} />
      </Sequence>
      <Sequence from={540} durationInFrames={30}>
        <Audio src={staticFile("audio/confirm.wav")} volume={0.45} />
      </Sequence>

      <Sequence from={805} durationInFrames={20}>
        <Audio src={staticFile("audio/click.wav")} volume={0.3} />
      </Sequence>
      <Sequence from={820} durationInFrames={30}>
        <Audio src={staticFile("audio/confirm.wav")} volume={0.45} />
      </Sequence>

      <Sequence from={1065} durationInFrames={20}>
        <Audio src={staticFile("audio/click.wav")} volume={0.3} />
      </Sequence>
      <Sequence from={1080} durationInFrames={40}>
        <Audio src={staticFile("audio/success.wav")} volume={0.5} />
      </Sequence>

      <Sequence from={1610} durationInFrames={40}>
        <Audio src={staticFile("audio/success.wav")} volume={0.5} />
      </Sequence>

      {/* Visual Scenes (Total: 1860 frames = 62.0s) */}
      <Sequence from={0} durationInFrames={210}>
        <IntroScene />
      </Sequence>

      <Sequence from={210} durationInFrames={180}>
        <TradeBridgeIntroScene />
      </Sequence>

      <Sequence from={390} durationInFrames={300}>
        <EscrowScene />
      </Sequence>

      <Sequence from={690} durationInFrames={300}>
        <ShipmentScene />
      </Sequence>

      <Sequence from={990} durationInFrames={360}>
        <SettlementScene />
      </Sequence>

      <Sequence from={1350} durationInFrames={240}>
        <ArchitectureScene />
      </Sequence>

      <Sequence from={1590} durationInFrames={270}>
        <ClosingScene />
      </Sequence>

      {/* Global Captions Layer */}
      <Captions />

      {/* Subtle Cinematic Vignette */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          boxShadow: "inset 0 0 100px rgba(0,0,0,0.6)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
