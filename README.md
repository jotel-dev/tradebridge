<p align="center">
  <img src="app/public/logo.png" alt="TradeBridge Logo" width="280" />
</p>

# TradeBridge: Trustless B2B Escrow Protocol on Solana

TradeBridge is a non-custodial, escrow-backed cross-border settlement protocol built on Solana. It eliminates intermediary risk, high wire fees, and slow settlement in global physical trade by locking funds in Program Derived Address (PDA) vaults and releasing them deterministically upon verified shipment confirmation.

---

## Architecture & Lifecycle

TradeBridge models the bilateral physical trade lifecycle as a deterministic on-chain finite state machine:

```
                            [ Buyer deposits funds ]
                                       │
                                       ▼
                             ┌──────────────────┐
                             │     Created      │
                             └─────────┬────────┘
                                       │
                     ┌─────────────────┴─────────────────┐
    [ Deadline passed without shipment ]    [ Seller submits tracking ref ]
                     │                                   │
                     ▼                                   ▼
           ┌──────────────────┐                ┌──────────────────┐
           │     Refunded     │                │ ShipmentConfirmed│
           └──────────────────┘                └─────────┬────────┘
                                                         │
                                        ┌────────────────┴────────────────┐
                       [ Buyer confirms receipt ]               [ Buyer/Seller raises dispute ]
                                        │                                         │
                                        ▼                                         ▼
                              ┌──────────────────┐                      ┌──────────────────┐
                              │     Released     │                      │     Disputed     │
                              └──────────────────┘                      │  (Funds frozen)  │
                                                                        └──────────────────┘
```

---

## Key Design Decisions & Trade-Offs

### Shipment Verification: Manual Confirmation vs. Oracle / Attestation

TradeBridge's v1 shipment verification relies on the **seller submitting an on-chain tracking reference** and the **buyer manually confirming receipt** before releasing escrowed funds.

> **Intentional v1 Scope, Not an Oversight:**
> We deliberately chose this mechanism over two more complex alternatives — an oracle-fed shipment tracking feed or a neutral third-party (e.g., freight forwarder/customs partner) attestation — because manual confirmation is realistically buildable within a solo hackathon timeframe while still rigorously proving the core trust mechanism: **escrowed funds that cannot be unilaterally released or refunded once shipment is confirmed.**

#### Built-In Safeguards in v1:
- **Seller Protection:** Once the seller confirms shipment with a valid tracking reference, the buyer is strictly prevented from triggering a timeout refund (`refund_if_expired`). The buyer cannot take delivery and walk away with the funds.
- **Buyer Protection:** Funds cannot be released until the seller has confirmed shipment on-chain. If the seller defaults and never ships before the Unix deadline, the buyer can reclaim 100% of their deposit.
- **Freeze Mechanism (`raise_dispute`):** If goods are damaged, missing, or fraudulent, either party can invoke `raise_dispute` to permanently freeze fund movements on-chain and emit a `DisputeRaised` event for off-chain or arbitration resolution.

#### Production Upgrade Roadmap:
The existing [`TradeEscrow`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L318) account layout is designed to support production upgrades **without breaking account structures or migrating PDAs**:
1. **Option A (Carrier Oracle Integration):** Connect an oracle crank (e.g., Switchboard or Chainlink Functions) that polls carrier APIs using the stored `tracking_ref` and automatically triggers `release_funds` upon verified carrier `"DELIVERED"` status.
2. **Option B (Neutral Logistics Attestation):** Require a cryptographic co-signature from an authorized logistics partner or inspection agent alongside the buyer's approval, removing single-party reliance entirely.

For the full architectural analysis and trade-off matrix, see [design/DESIGN_DECISIONS.md](file:///Ubuntu-22.04/home/joel/tradebridge/design/DESIGN_DECISIONS.md).

---

## On-Chain Program (Anchor)

- **Program ID:** `3dmv4RrSanjP9Qdaj4E3D9ra9YNJrDg4QZP9sCmaK81v`
- **Network:** Solana Devnet
- **Framework:** Anchor (Rust)

### Core Instructions

| Instruction | Signer | State Required | Description |
| :--- | :--- | :--- | :--- |
| [`create_trade_escrow`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L15) | Buyer | *None (Initializes)* | Transfers tokens from buyer into escrow PDA vault; sets deadline and amount. |
| [`confirm_shipment`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L69) | Seller | `Created` | Stores courier tracking reference (up to 100 chars); advances status to `ShipmentConfirmed`. |
| [`release_funds`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L108) | Buyer | `ShipmentConfirmed` | Releases vault tokens to seller token account using PDA signer seeds; reclaims rent. |
| [`refund_if_expired`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L177) | Buyer | `Created` (Post-deadline) | Returns locked tokens to buyer if seller failed to ship before deadline; reclaims rent. |
| [`raise_dispute`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L252) | Buyer or Seller | `ShipmentConfirmed` | Transitions status to `Disputed`, freezing all token transfers and emitting an event. |

---

## Project Structure

```
tradebridge/
├── programs/
│   └── tradebridge/
│       └── src/
│           └── lib.rs             # Anchor program source code
├── tests/
│   └── tradebridge.ts            # Integration test suite (8 tests)
├── scripts/
│   ├── scenario-runner.ts        # 4 narrated B2B trade simulation scenarios
│   └── devnet-demo.ts            # Live Devnet deployment & execution demo
├── app/                          # Next.js 14 frontend web application
│   ├── src/app/                  # App Router pages and components
│   └── public/                   # Static branding & assets
└── design/
    ├── DESIGN_DECISIONS.md       # ADR-001: Manual vs. Oracle / Attestation analysis
    └── LOGO_PROMPT.md            # Brand identity design prompt
```

---

## Getting Started

### Prerequisites
- Node.js 18+ and Yarn
- Rust & Cargo
- Solana CLI (`solana-cli 1.18+`)
- Anchor CLI (`avm install 0.30.1`)

### 1. Build and Run Tests
```bash
# Install root dependencies
yarn install

# Run the Anchor integration test suite
anchor test
```

### 2. Run Narrated Trade Scenarios
```bash
# Runs 4 automated scenarios (Happy path, No-ship refund, Impersonation attack, Dispute freeze)
yarn ts-node scripts/scenario-runner.ts
```

### 3. Launch Frontend Web Application
```bash
cd app
yarn install
yarn dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
