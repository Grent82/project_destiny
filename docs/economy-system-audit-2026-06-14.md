# Economy System Audit — 2026-06-14

**Purpose.** Ground-truth inventory of the existing in-game economy *before* designing a
combined "living, multi-actor economy" vision. Establishes what logic exists, how deeply it
is wired (domain → reducer → UI → on-screen display), and where the real gaps are — so the
phased design is built on facts, not assumptions.

**Method.** For each subsystem we checked four wiring layers:

1. **Logic** — pure command/domain code exists (`src/domain`, `src/application/commands`).
2. **Reducer** — exposed as a Redux action (`src/application/store/slices/*`).
3. **UI entry** — actually dispatched from a screen (`grep gameActions.<x>` in `src/ui/**/*.tsx`).
4. **Display** — the value/state is rendered anywhere in the UI.

A subsystem can be fully implemented at layers 1–2 and still be **dead** (no layer 3/4). The
audit's main finding is that several subsystems are exactly that.

---

## Traffic-light overview

Legend: 🟢 wired end-to-end · 🟡 partial / abstract · 🔴 built but dead / missing.

| Subsystem | Logic | Reducer | UI entry | Display | Status |
|---|---|---|---|---|---|
| Treasury (`money`) flow | ✅ | ✅ | ✅ | ✅ (Ledger, 3 files) | 🟢 |
| Wages + arrears spiral | ✅ | via `endDay` | n/a (tick) | 🟡 `wagesOwedDays` 1 file | 🟢 logic / 🟡 surfaced |
| Title income (Steward/QM/Fence) | ✅ | via `endDay` | n/a (tick) | 🟡 Ledger estimate only | 🟢 logic / 🟡 surfaced |
| Quest rewards (+ corruption skim) | ✅ | ✅ | ✅ | ✅ activity log | 🟢 |
| Shops buy/sell | ✅ | ✅ `purchaseItemFromShop`/`sellItem` | ✅ ShopsScreen | ✅ | 🟢 |
| Market pricing (`marketPressure`) | ✅ | drift via events | n/a | 🟡 1 file | 🟢 logic / 🟡 surfaced |
| Equipment durability + repair | ✅ | ✅ `repairItem`/`repairRoom` | ✅ | 🟡 durability 2 files | 🟢 |
| Debt engine (interest, crisis) | ✅ | ✅ `payDebt` | ✅ Ledger | ✅ `debtAmount` 3 files | 🟢 |
| Expedition economy | ✅ | ✅ | ✅ | ✅ | 🟢 |
| City resources (food/water/material/corridor) | ✅ | `setCorridorStatus` 🔴 | 🔴 corridor not set from UI | 🟡 displayed 1–2 files | 🟡 |
| NPC needs (hunger/fatigue/hygiene/…) | ✅ decay | via `endDay` | n/a | 🔴 hygiene 0, hunger/fatigue 1 file | 🟡 simulated, barely shown |
| **Bond economy** (sell/transfer/free/rescue) | ✅ full | ✅ all 6 reducers | 🔴 **none** | 🔴 `bondStatus` **0 files** | 🔴 **built but dead** |
| **Captivity** (hold/condition/site) | ✅ abstract sim | ✅ `setNpcCaptivityState` | 🔴 none | 🔴 `captivityState` **0 files** | 🔴 **no place, invisible** |
| **NPC money / personal inventory** | 🔴 **does not exist** | — | — | — | 🔴 **absent by design** |
| Production / supply chains | 🔴 **does not exist** | — | — | — | 🔴 **absent** |

---

## The three structural gaps

### Gap 1 — Built but dead (no UI door)

The following economy-relevant reducers exist and are tested, but are **never dispatched from
any screen** (confirmed by cross-referencing `gameActions.*` usage in `src/ui/**/*.tsx`):

```
freeNpc                       rescueBondedNpcLegal
transferBondedNpc             rescueBondedNpcExtraction
setBondForSale                rescueBondedNpcForce
setNpcCaptivityState          rescueNpc
setCorridorStatus             unlockVault
upgradeFortification          dismissNpc
```

The **entire bond market** falls here. The valuation logic (`bondTransfer.ts`,
`bondService.ts`), four buyers with distinct `offerModifier`s (`data/definitions/bond-buyers.json`),
acquisition offers, legal/extraction/force rescue, and the moral-weather costs of holding bonds
are all implemented — and none of it has a player entry point. The only reactive surface is an
`eventInstance` with `presentationText` pushed by `checkBondAcquisitionOffers`, rendered through
the generic event pipeline; there is no option wiring that calls the transfer/sell commands.
`bondStatus` and `captivityState` are rendered in **zero** UI files.

**Implication for the vision:** a meaningful slice of "the economy as narrative" (exploitation,
dependency, moral weight) is already coded. Phase work here is *wiring and surfacing*, not
greenfield building.

### Gap 2 — Abstract without a place

Captivity is a `captivityState` on the NPC pointing at an abstract `siteId`
(POI / world-household / safe-house). Holding is simulated statistically
(`applyAbstractCustodySimulation`, condition decay `healthy→hurt→broken→altered`). There is **no
location the player visits**, no holding screen, and rescue happens only through scripted quests.
City resources (food/water/material/corridor) are likewise pure macro scalars with real tick
consequences (`applyEndOfDayResources`, `applyStateDecay`) but thin on-screen presence and, for
`corridorStatus`, no player-facing control path.

**Implication:** "real places for captivity and trade" (vision strand B) is partly a
*presentation/geography* problem layered on existing simulation, not new economic logic.

### Gap 3 — No actor-level economy at all

There is **no per-NPC money, wallet, or personal inventory** anywhere in the schema
(`src/domain/npc/contracts.ts`). Items are house-owned (`GameState.ownedItems`, `stash`); the only
per-NPC item linkage is an equipment durability number (`equippedItemDurabilities[npcId][slot]`).
NPCs have needs-states (hunger, fatigue, hygiene, intoxication, stress, morale, anger, fear,
health, injury) satisfied by *room/city abstraction*, never by consumption or spending. No actor
produces goods; shop stock is static (`data/definitions/shops.json`), with no restock or
supply/demand simulation. Prices move only via political dials and event-driven `marketPressure`
drift.

**Implication:** vision strands C (NPC agency) and D (production + supply/demand) are genuinely
**greenfield** — they require a new domain concept (the `EconomicAgent`) and a market-clearing
mechanism. This is the paradigm shift; it is not extending existing code, it is adding a new
core to the central `GameState` aggregate (with the attendant determinism + save-migration +
balancing obligations).

---

## What this means for the phasing

The audit reshapes the naive A→B→C→D order:

- **Cheapest, highest narrative value first:** wire up the *already-built* bond/captivity
  economy and give it a place (Gaps 1 + 2). This delivers visible "living world + moral weight"
  with little new logic.
- **Make existing values bite (strand A):** city resources and NPC needs already have tick
  consequences but are weakly surfaced; tightening + showing them is low-risk.
- **Greenfield core last and biggest (strands C + D):** the `EconomicAgent` + market is the
  real epic. It must be designed against determinism (`rngSeed`), a `gameStateSchema` v2→v3
  migration, per-tick performance over all actors, and a balancing/regression harness
  (playthrough scenarios asserting the economy does not diverge).

A "full simulation of all actors" end-state remains the north star; the path is to introduce
**one** `EconomicAgent` abstraction and roll the *real* machinery out to more actor types over
phases — not to keep any actor permanently abstract.

---

## Open questions for the design phase

1. Market mechanism: emergent auction (agents post bids, market clears) vs. stock-and-flow with
   reactive price formulas vs. scripted behavioral transactions. (Trade-off: emergence vs.
   balancing control vs. determinism cost.)
2. Goods model: how many goods, how granular (single "supplies" abstraction → itemized chains)?
3. Tick budget: acceptable per-day compute for an all-actor clearing step.
4. Save migration + back-compat strategy for existing saves.
5. How much of the bond/captivity wiring to pull forward as an independent quick win vs. folding
   into the larger model.
