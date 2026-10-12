# TradeBridge Product Demo Video (Remotion)

A cinematic, technically accurate product demonstration video for **TradeBridge** — a non-custodial, escrow-backed B2B cross-border settlement protocol built on Solana.

Built for the **Colosseum Crypto World's Fair Hackathon** & **Superteam Nigeria Track**.

---

## 🎬 Video Specifications

| Metric | Specification |
|---|---|
| **Duration** | 62 seconds (1,860 frames) |
| **Framerate** | 30 FPS |
| **Resolution** | 1920 × 1080 (16:9 Full HD) |
| **Audio** | Multi-track Voiceover Narration + Ambient Fintech Synth BGM + UI SFX |
| **Framework** | Remotion 4.0 + React 18 + TypeScript |
| **Target Network** | Solana Devnet |
| **Entrypoint** | `src/index.ts` (Composition: `TradeBridgeDemo`) |

---

## 🏗️ Storyboard & Narrative Breakdown

1. **Scene 1 — The Cross-Border Trade Problem (00:00 – 00:07 | Frames 0–210)**
   - *Visual*: Nigerian SME exporter (Lagos agro-commodities) vs. International Buyer. Highlights the bilateral trust deadlock where the seller fears shipping without payment and the buyer fears wiring upfront.
   - *Narration*: *"Cross-border trade creates a difficult choice. Buyers don't want to pay before goods are shipped, and sellers don't want to ship without payment security."*

2. **Scene 2 — Meet TradeBridge (00:07 – 00:13 | Frames 210–390)**
   - *Visual*: Polished TradeBridge logo presentation with Solana Devnet badge, headline, and the 3 value pillars: *Lock Funds*, *Confirm Shipment*, *Release Securely*.
   - *Narration*: *"Meet TradeBridge, an escrow-backed settlement protocol built on Solana."*

3. **Scene 3 — Phase 1: Escrow Initialization & Deposit (00:13 – 00:23 | Frames 390–690)**
   - *Visual*: Phantom wallet interface connecting on Devnet; buyer creates a trade escrow depositing 250 USDC with a 7-day shipment deadline. Real-time token flow into program-derived address (PDA) vault.
   - *Narration*: *"The buyer deposits funds into a program-controlled escrow vault."*

4. **Scene 4 — Phase 2: Shipment Confirmation & Tracking (00:23 – 00:33 | Frames 690–990)**
   - *Visual*: Seller dashboard (Solflare Devnet); seller submits DHL tracking reference (`DHL-EXP-940285172-NG`). Account transitions from `Created` to `Shipment Confirmed`, revoking buyer's unilateral timeout refund.
   - *Narration*: *"The seller submits a shipment reference, and the buyer reviews the details before releasing payment."*

5. **Scene 5 — Phase 3: Contract Enforcement & Settlement (00:33 – 00:45 | Frames 990–1350)**
   - *Visual*: 3-part matrix demonstrating the state machine:
     - **Primary Release**: Buyer approves; 250 USDC settles to seller, escrow account closes.
     - **Timeout Protection**: If seller fails to ship before deadline, buyer reclaims 100% of deposit.
     - **Dispute Freeze**: Either party can freeze the contract for designated arbiter resolution.
   - *Narration*: *"If shipment doesn't happen before the deadline, the buyer can reclaim the deposit. If a dispute arises, fund movements can be frozen for resolution."*

6. **Scene 6 — Protocol Architecture (00:45 – 00:53 | Frames 1350–1590)**
   - *Visual*: Clean architectural pipeline: Bilateral Wallets → Next.js 14 Zero-Custody Client → Anchor / Rust Program → Escrow PDA Vault ATA.
   - *Narration*: *"TradeBridge brings buyers and sellers together through transparent, contract-enforced settlement rules."*

7. **Scene 7 — Closing & Verifiable Devnet Deployment (00:53 – 01:02 | Frames 1590–1860)**
   - *Visual*: TradeBridge branding, call-to-action, live application URL, verified Devnet Program ID, and Explorer reference.
   - *Narration*: *"Trade globally. Settle with confidence. Explore TradeBridge on Solana Devnet."*

---

## 🔒 Verifiable Deployment Reference

TradeBridge v1 is live and verifiable on **Solana Devnet**:
- **Solana Program ID**: `3dmv4RrSanjP9Qdaj4E3D9ra9YNJrDg4QZP9sCmaK81v`
- **Test USDC Mint (Devnet)**: `2Rehr4QfS9xpo6x8t9FptPneocaaYK5VyUiTaihnouzT`
- **Live Web Application**: [https://tradebridge-app.vercel.app](https://tradebridge-app.vercel.app)
- **Solana Explorer**: [View on Solana Explorer (Devnet)](https://explorer.solana.com/address/3dmv4RrSanjP9Qdaj4E3D9ra9YNJrDg4QZP9sCmaK81v?cluster=devnet)

---

## 📁 Project Structure

```
demo-video/
├── package.json
├── remotion.config.ts
├── tsconfig.json
├── narration.md                # Complete voiceover transcript & timing cues
├── README.md                   # This documentation
├── public/
│   ├── audio/
│   │   ├── ambient_bgm.wav     # 65s custom fintech background synthesizer track
│   │   ├── scene1_problem.wav  # TTS voiceover scene 1
│   │   ├── scene2_intro.wav    # TTS voiceover scene 2
│   │   ├── scene3_escrow.wav   # TTS voiceover scene 3
│   │   ├── scene4_shipment.wav # TTS voiceover scene 4
│   │   ├── scene5_settlement.wav# TTS voiceover scene 5
│   │   ├── scene6_architecture.wav# TTS voiceover scene 6
│   │   ├── scene7_closing.wav  # TTS voiceover scene 7
│   │   ├── click.wav           # UI button interaction SFX
│   │   ├── confirm.wav         # Transaction submission SFX
│   │   └── success.wav         # Vault settlement & release SFX
│   └── images/
│       ├── logo.png            # Official TradeBridge logo asset
│       └── logo-icon.png       # TradeBridge mark
├── renders/
│   ├── test-render.mp4         # 5-second pipeline test render
│   ├── tradebridge-demo-preview.mp4 # 540p fast review export
│   └── tradebridge-demo-1080p.mp4   # Final 1080p Full HD master video
└── src/
    ├── index.ts                # Remotion entrypoint
    ├── Root.tsx                # Compositions registration
    ├── TradeBridgeDemo.tsx     # Master timeline sequence orchestration
    ├── styles/
    │   └── theme.ts            # Design tokens & color palette
    └── components/
        ├── Captions.tsx        # Dynamic synchronized subtitle overlays
        ├── IntroScene.tsx      # Scene 1: Trade Dilemma
        ├── TradeBridgeIntroScene.tsx # Scene 2: Protocol Introduction
        ├── EscrowScene.tsx     # Scene 3: Escrow Deposit Flow
        ├── ShipmentScene.tsx   # Scene 4: Tracking Reference Submission
        ├── SettlementScene.tsx # Scene 5: Enforcement Matrix
        ├── ArchitectureScene.tsx # Scene 6: Anchor Architecture
        └── ClosingScene.tsx    # Scene 7: Devnet Credentials & CTA
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18.0.0
- Linux / WSL Ubuntu-22.04 with Chromium dependencies:
  ```bash
  sudo apt-get update && sudo apt-get install -y ffmpeg libnspr4 libnss3 libasound2
  ```

### 2. Installation
```bash
cd demo-video
npm install
```

### 3. Interactive Preview (Remotion Studio)
Launch Remotion Studio in your browser to inspect or scrub the timeline:
```bash
npm run preview
# Or:
npx remotion preview src/index.ts
```
Visit `http://localhost:3000` to interactively preview scenes, toggle audio tracks, or test timing.

### 4. Rendering

- **5-Second Verification Render**:
  ```bash
  npm run render:test
  # Output: renders/test-render.mp4
  ```

- **Low-Resolution Preview (960×540, fast preview)**:
  ```bash
  npm run render:preview
  # Output: renders/tradebridge-demo-preview.mp4
  ```

- **Master 1080p Full HD Export**:
  ```bash
  npm run render:final
  # Output: renders/tradebridge-demo-1080p.mp4
  ```

*Note: Rendering concurrency is configured to `--concurrency=2` to ensure stability on all hardware platforms.*

---

## 🛠️ Technical Implementation Notes

- **Zero Unicode Fallback Issues**: All flags, locks, parcel boxes, gears, and settlement icons are bespoke inline SVG elements for 100% vector fidelity across headless Linux rendering environments.
- **Audio Synchronization**: Audio files are precisely sequenced using Remotion `<Sequence>` boundaries with micro-delays for voiceover pacing and timed SFX for button presses and on-chain confirmations.
- **Strict Devnet Truth**: All visual flows accurately represent TradeBridge v1's verified on-chain Anchor program (`create_trade_escrow`, `confirm_shipment`, `release_funds`, `refund_if_expired`, `raise_dispute`). Carrier tracking is correctly identified as seller-submitted reference data, noting carrier API oracles as planned for v2.
