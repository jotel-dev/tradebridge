# Architecture Decision Record (ADR-001)

## Shipment Verification: Manual Confirmation vs. Oracle / Attestation

### Status
**Accepted (v1 Hackathon Scope) — Forward-Compatible for Production**

---

### Context & Problem Statement
In cross-border B2B commerce, physical goods exchange is decoupled from digital payment settlement. The core challenge in trustless escrow design is verifying real-world logistics events on-chain:
1. Has the seller truly dispatched the agreed cargo?
2. Has the buyer taken delivery in satisfactory condition?
3. What prevents either party from acting dishonestly once funds are committed?

---

### Design Decision
TradeBridge's v1 shipment verification relies on:
1. **The seller submitting an on-chain tracking reference** via [`confirm_shipment`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L69).
2. **The buyer manually confirming receipt** before releasing escrowed funds via [`release_funds`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L108).

We deliberately chose this over two more complex alternatives:
- **Oracle-fed shipment tracking confirmation:** Direct on-chain carrier API status ingest.
- **Neutral third-party attestation:** Cryptographic co-signature from a certified freight forwarder, customs broker, or logistics partner.

> **Key Rationale:**
> Manual confirmation was selected because it is realistically buildable within a solo hackathon timeframe while still proving the core trust mechanism: **escrowed funds that cannot be unilaterally released or refunded once shipment is confirmed.**
>
> **This is a known, intentional v1 limitation, not an oversight.**

---

### Architectural Safeguards in v1
Even with manual confirmation, the on-chain protocol enforces strict non-custodial invariants:

- **Seller Protection:** Once the seller confirms shipment with a valid tracking reference, the buyer is strictly prohibited from claiming a timeout refund via [`refund_if_expired`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L177). The buyer cannot walk away with both the goods and the funds.
- **Buyer Protection:** Funds cannot be released until shipment has been formally confirmed on-chain by the designated seller. If the seller fails to confirm shipment prior to the agreed Unix deadline, the buyer can unilaterally claim an automatic refund.
- **Freeze Mechanism (`raise_dispute`):** Either party can invoke [`raise_dispute`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L252) once shipment is confirmed, permanently freezing fund movements and emitting an indexable event (`DisputeRaised`) until off-chain or arbitration settlement.

---

### Trade-Off Matrix

| Dimension | Option 1: Manual Confirmation (v1 Selected) | Option 2: Carrier Oracle Integration (Option A) | Option 3: Neutral Partner Attestation (Option B) |
| :--- | :--- | :--- | :--- |
| **Implementation Complexity** | Low / Deterministic | High (Oracle network, API rate limits, webhooks) | Moderate to High (Partner PKI, key delegation) |
| **Hackathon Feasibility** | **High (Solo deliverable, testable)** | Low (Fragile mocks or proprietary carrier sandboxes) | Medium (Requires mocking external institutional actors) |
| **Trust Model** | 2-party bilateral escrow with state freeze | Cryptographic feed relying on carrier webhooks | Multilateral m-of-n threshold attestation |
| **External Dependencies** | Zero external dependencies | Carrier APIs (FedEx, DHL, Maersk) + Oracle network | Certified logistics partner private keys |
| **Failure Modes** | Buyer delays confirmation (mitigated by dispute/arbitration) | Carrier API downtime, tracking ID collisions | Partner collusion or lost signer key |
| **Account Compatibility** | Baseline account schema | Fully compatible | Fully compatible |

---

### Forward Compatibility & Upgrade Path

The current on-chain account structure ([`TradeEscrow`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L318)) and state machine are intentionally architected to accommodate production upgrades **without breaking account layouts or requiring PDA migrations**:

```
                              ┌────────────────────────────────────────┐
                              │                Created                 │
                              └───────────────────┬────────────────────┘
                                                  │
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │           ShipmentConfirmed            │
                              │   (Tracking Ref stored in PDA)         │
                              └───────┬──────────────────────┬─────────┘
                                      │                      │
                   v1 Manual / v2 Auto Release        v1/v2 Dispute Freeze
                                      │                      │
                                      ▼                      ▼
                        ┌───────────────────┐      ┌───────────────────┐
                        │     Released      │      │     Disputed      │
                        └───────────────────┘      └───────────────────┘
```

#### Production Upgrade Options:
1. **Option A — Carrier Oracle Integration:**
   - An oracle crank (e.g., via Switchboard or Chainlink Functions) periodically queries carrier tracking endpoints using `TradeEscrow.tracking_ref`.
   - Upon verified `"DELIVERED"` status, the oracle authority invokes an upgraded release instruction or triggers an auto-release countdown.
2. **Option B — Neutral Logistics Partner Attestation:**
   - Require a signature from a whitelisted inspector or logistics partner alongside the buyer before [`release_funds`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L108) succeeds.
   - Eliminates single-party reliance entirely while keeping the underlying PDA seeds `[b"escrow", buyer, seller]` and token vault authority intact.

Both upgrades leverage the existing [`raise_dispute`](file:///Ubuntu-22.04/home/joel/tradebridge/programs/tradebridge/src/lib.rs#L252) safety valve without restructuring state accounts.
