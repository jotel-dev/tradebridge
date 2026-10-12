# TradeBridge Product Demo Video — Voiceover Narration & Storyboard

**Total Runtime:** ~62 seconds (1,860 frames @ 30 FPS)  
**Resolution:** 1920 ×Ta1080 (16:9)  
**Target Audience:** Hackathon Judges (Colosseum Crypto World's Fair / Superteam Nigeria), Web3 Builders, Nigerian SME Exporters, Global B2B Traders.  
**Tone:** Credible, cinematic fintech demonstration, clear, technically grounded, non-speculative.

---

## Scene Breakdown & Voiceover Synchronization

### Scene 1 — The Cross-Border Trade Problem
- Timeline: 00:00 — 00:07 (Frames 0 — 210 | 7.0s)
- Narration Audio: `public/audio/scene1_problem.wav`
- Spoken Text: "Cross-border trade creates a difficult choice. Buyers don't want to pay before goods are shipped, and sellers don't want to ship without payment security."
- On-Screen Typography:
  * Header: Ready to trade. Afraid to trust.
  * Subheader: Cross-border payments shouldn't depend on blind trust.
- Visual Action:
  * Split-screen comparison: Nigerian SME Exporter (Lagos) vs. International Buyer.
  * Highlights traditional settlement bottlenecks: Bank letters of credit are slow, expensive, and out of reach for small enterprises.
  * Visual deadlock indicator turns into an on-chain escrow transition.

---

### Scene 2 — Meet TradeBridge
- Timeline: 00:07 — 00:13 (Frames 210 — 390 | 6.0s)
- Narration Audio: `public/audio/scene2_intro.wav`
- Spoken Text: "Meet TradeBridge, an escrow-backed settlement protocol built on Solana."
- On-Screen Typography:
  * Header: Meet TradeBridge
  * Headline: Trustless B2B Escrow for Global Trade
  * Value Proposition: Lock funds. Confirm shipment. Release securely.
- Visual Action:
  * Hero animation of the official TradeBridge emblem and wordmark.
  * Live app teaser (tradebridge-app.vercel.app) with dark fintech styling and bilateral lookup card.
  * Verifiable badge: Solana Devnet Protocol.

---

### Scene 3 — Create the Escrow
- Timeline: 00:13 — 00:23 (Frames 390 — 690 | 10.0s)
- Narration Audio: `public/audio/scene3_escrow.wav`
- Spoken Text: "The buyer deposits funds into a program-controlled escrow vault."
- On-Screen Typography:
  * Header: The buyer deposits. Funds secured by escrow.
  * Subheader: Program-controlled vault. Defined release conditions.
- Visual Action:
  * Buyer connects Phantom wallet in Solana Devnet mode.
  * Trade agreement parameters: Buyer pubkey, Seller pubkey, Amount: 250.00 Test USDC, 7-day expiration deadline.
  * Escrow creation action: Funds transfer into program-derived ATA ([b"escrow", buyer, seller]).
  * State card updates to Created. Program ID & Test USDC��Mint clearly identified.

---

### Scene 4 — Shipment Confirmation
- Timeline: 00:23 — 00:33 (Frames 690 — 990 | 10.0s)
- Narration Audio: `public/audio/scene4_shipment.wav`
- Spoken Text: "The seller submits a shipment reference, advancing the escrow lifecycle on-chain."
- On-Screen Typography:
  * Header: The seller submits shipment details.
  * Subheader: Shipment confirmation advances the escrow workflow.
- Visual Action:
  * Seller dashboard view of the active bilateral agreement.
  * Seller inputs courier bill of lading / tracking reference (e.g. DHL-EXP-940285172-NG).
  * On-chain status badge transitions from Created to Shipment Confirmed.
  * Realistic nuance highlighted: Seller-submitted tracking reference; buyer manual verification required.

---

### Scene 5 — Release, Refunds, and Dispute Protection
- Timeline: 00:33 — 00:45 (Frames 990 — 1350 | 12.0s)
- Narration Audio: `public/audio/scene5_settlement.wav`
- Spoken Text: "The buyer releases funds upon verification. If the seller never ships, the buyer can reclaim the deposit. If disputes arise, funds are frozen."
- On-Screen Typography:
  * Header: Funds move only through permitted contract actions.
  * Subheader: Release, refund, and dispute paths are enforced by code.
- Visual Action:
  * Three distinct lifecycle paths visually explained:
    1. Primary Release Path: Buyer inspects goods, clicks Release Funds. PDA signs transfer to seller and closes vault, reclaiming rent. Status: Released.
    2. Timeout Refund Path: If deadline expires with no shipment confirmed, buyer executes refund_if_expired.
    3. Dispute Freeze: In case of cargo issues, either party calls raise_dispute, freezing funds on-chain until the arbiter resolves.

---

### Scene 6 — The Technology Behind TradeBridge
- Timeline: 00:45 — 00:53 (Frames 1350 — 1590 | 8.0s)
- Narration Audio: `public/audio/scene6_architecture.wav`
- Spoken Text: "TradeBridge replaces intermediaries with transparent, contract-enforced settlement rules on Solana."
- On-Screen Typography:
  * Header: Non-Custodial Architecture
  * Flow: Buyer Wallet → Web3 App → Anchor Program → Escrow PDA Vault → Seller Wallet
- Visual Action:
  * Clean animated node diagram showing cryptographic seed derivation, deterministic finite state machine, and zero platform custody.
  * Tech badges: Anchor & Rust, Solana Devnet, SPL Token, Program Derived Addresses (PDAs).

---

### Scene 7 — Closing and Live Demo
- Timeline: 00:53 — 01:02 (Frames 1590 — 1860 | 9.0s)
- Narration Audio: `public/audio/scene7_closing.wav`
- Spoken Text: "Trade globally. Settle with confidence. Explore TradeBridge on Solana Devnet."
- On-Screen Typography:
  * Main Headline: Trade globally. Settle with confidence.
  * Subheadline: Escrow-backed cross-border trade on Solana.
  * Live App: https://tradebridge-app.vercel.app
  * Solana Program ID: 3dmv4RrSanjP9Qdaj4E3D9ra9YNJrDg4QZP9sCmaK81v
  * Test USDC��Mint: 2Rehr4QfS9xpo6x8t9FptPneocaaYK5VyUiTaihnouzT
  * Network: Solana Devnet
  * Event: Colosseum Crypto World's Fair Hackathon & Superteam Nigeria
- Visual Action:
  * Cinematic brand outro with interactive-style Launch App CTA button and Solana Explorer link.
