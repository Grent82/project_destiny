# Cross-System Economics Audit
**Date:** 2026-05-16  
**Status:** First pass — findings only, no fixes applied  
**Scope:** Money, wages, debt, shops, repair, quest rewards, contracts, treasury

---

## What this looks at

Money flows through seven or more systems: wages paid to roster NPCs, debt obligations to creditors, shop transactions, item repair, quest rewards, title-based income, and bond contracts. This audit checks whether the economics are consistent, where business logic lives, and what gaps or exploits exist.

---

## Critical findings

### C1 — Wage debt has no departure consequence

`applyWages.ts` tracks `NpcRuntimeState.wagesOwedDays` and applies loyalty decay at two days of arrears. But there is no automatic NPC departure at any threshold. NPCs can be permanently unpaid without leaving the house.

Contrast: debt has an automatic crisis at day 30 (`applyPolitics.ts:157–184`). Wage debt has no equivalent enforcement. This is an exploit: once hired, an NPC can never leave unless the player explicitly dismisses them.

**Where:** `src/application/commands/applyWages.ts:70–94`

**Fix:** Add a departure trigger at `wagesOwedDays >= 14`. Mirror the debt crisis pattern — log a warning at 7 days, fire departure at 14.

---

### C2 — Wage rate disconnected from hire rate

`wageForStatus()` in `applyWages.ts` returns fixed wages by NPC status (retainer: 4 Mk/day, mercenary: 8 Mk/day, noble: 14 Mk/day). But `generateHireOffers.ts:66` computes hire wages from skill: `wagePerDay = Math.max(3, Math.min(20, Math.floor(primarySkillAvg / 5)))`.

A high-skill mercenary is hired at a skill-derived rate, but once on the roster, always costs exactly 8 Mk/day regardless of skill level. The two calculations share no code and can produce contradictory values.

**Where:**
- `src/application/commands/applyWages.ts:5–28`
- `src/application/commands/generateHireOffers.ts:66`

**Fix:** Store `contractWagePerDay` on `NpcRuntimeState` at hire time and use that field in `applyWages` instead of the status lookup. Status lookup becomes a fallback only.

---

### C3 — Shop price modifier logic duplicated across selector and component

Shop pricing applies three modifiers (corridor × faction × market pressure). The modifier computation lives in `selectors/shops.ts:7–20`, which is correct — but `ShopsScreen.tsx` formats the price result with inline label strings (`"${Math.round((1 - shop.marketPressureMod) * 100)}% low-demand discount"`) rather than reading a formatted label from the selector.

Additionally, the repair cost's quartermaster discount (20%) is applied in two places:
- `ShopsScreen.tsx:322` — selector-side check
- `gameSlice.ts:544` — reducer-side check

If one is updated without the other, displayed and actual prices diverge.

**Where:**
- `src/application/selectors/shops.ts:37–153`
- `src/ui/screens/ShopsScreen.tsx:152–198, 322`
- `src/application/store/gameSlice.ts:544`

**Fix:** Move the discount logic into a pure function in `equipmentCatalog.ts`. The selector returns a `pricingBreakdown` object with labels. The component renders labels, never computes them.

---

### C4 — Debt interest is a flat rate regardless of amount or standing

Debt interest accrues at +10 Marks per day after day 15 (`applyPolitics.ts:129–136`). The rate is hardcoded with no configuration. A 50-Mark debt and an 800-Mark debt both accrue +10/day — the same absolute amount regardless of scale.

**Where:** `src/application/commands/applyPolitics.ts:129–136`

**Fix:** Compute interest proportionally: `Math.max(5, Math.floor(debt * 0.015))`. Optionally scale by faction standing with the creditor.


---

## Medium findings

### M1 — Quest reward debt reduction is undiscoverable

`questSettlement.ts:264–272` reduces debt based on `template.rewardDebtReduction`, but:
- This field is not visible in the quest template schema documentation
- The UI shows no indication that a quest will reduce debt
- If the field is absent or zero, debt never decreases except via the negotiator title effect

**Fix:** Document `rewardDebtReduction` in the quest schema. Add a UI indicator on quest cards: "Resolves debt by X Marks."

---

### M2 — Income sources scattered, no unified view

Money flows in from at least seven sources:
1. Quest rewards — `questSettlement.ts:226`
2. Title effects (steward, quartermaster, fence, and others) — `applyTitleEffects.ts:61, 126, 162, 353, 365, 380, 392`
3. NPC agency rare action — `applyNpcAgency.ts:223`
4. House search — `houseSearch.ts:70`
5. Item sales — `sellItem.ts:37`
6. Event outcomes — `applyEventOutcome.ts:57`
7. Faction affinity grants — `applyTitleEffects.ts:392`

The ledger selector (`selectors/ledger.ts`) comments "no passive income yet tracked here" — but passive income does exist via titles. Runway projection is therefore always pessimistic.

**Fix:** Create `selectIncomeSources(state)` that returns a typed list of `{ source, amountPerDay, type: 'daily'|'event'|'oneTime' }`. Update `selectLedgerSummary` to include passive income in the burn rate projection.

---

### M3 — No passive durability maintenance cost

Durability degrades in combat, and repair costs money. But there is no passive maintenance fee — items that sit worn/damaged cost nothing to hold. There is no incentive to repair promptly beyond combat readiness.

**Where:** `src/application/commands/durability.ts` (has getters/setters, no cost logic)

**Fix:** Add `applyDurabilityMaintenance()` to the end-of-day pipeline: charge a small fee (1–2 Marks) per worn/damaged item. Exempt items in `usable` condition.

---

### M4 — Room effects hardcoded, not data-driven

Kitchen intact → 1 Mk reduction per NPC per day (`applyWages.ts:34–36`). This is the only room with an economic effect. Other rooms (barracks, quarters) affect capacity but not costs. The effect is a magic number with no central config.

If design wants a training room or a vault room, the pattern requires editing the command directly rather than adding a row to a table.

**Fix:** Define `ROOM_ECONOMIC_EFFECTS: Record<RoomFunction, { wageDiscount?: number }>` in a constants file. `applyWages` reads from the table.

---

### M5 — Bond service has morale costs but no Marks cost

`bondService.ts:104–162` applies empathy penalties and faction standing costs for holding bonded NPCs but charges no Marks. A bonded NPC generates labor but costs nothing in operational terms (food, housing).

**Fix:** Add a small daily operational cost (`BOND_OPERATIONAL_COST = 2` Marks/day per bonded NPC) applied in `applyWages` or a dedicated `applyBondCosts` step.

---

### M6 — Corruption effect on quest rewards is invisible to player

High corruption (≥70) reduces quest rewards by 10% (`questSettlement.ts:221–227`). No activity log entry explains the reduction. The player sees a lower payout than the contract template shows, with no explanation.

**Fix:** Log: `"Corruption shaves ${reducedAmount} from the payout."` when the modifier applies.

---

## Low findings

### L1 — Failed purchases log nothing

`purchase.ts:23–24` silently returns state unchanged when the player cannot afford an item. No activity log entry, no UI feedback from the command layer. The UI handles it via disabled buttons, but the command-layer rejection is silent.

**Fix:** `appendActivityLogEntry(state, 'system', 'Insufficient funds.')` on purchase failure.

---

### L2 — Signing bonus is a magic number

`generateHireOffers.ts:67` sets `signingBonus = wagePerDay * 3`. No comment, no justification, no scaling by NPC rarity or prestige.

**Fix:** Add a comment: `// Three weeks of wages — recruitment insurance`. Or derive from NPC skill tier.

---

### L3 — Market pressure range is narrow

`computeMarketPressureMod()` (`selectors/shops.ts:15–20`) produces a 0.92× discount at minimum pressure and a 1.15× surcharge at maximum. The swing is only 23 percentage points, making market pressure feel like noise rather than a meaningful mechanic.

**Fix:** Broaden the range (e.g., 0.75× to 1.35×) to make market conditions feel impactful.

---

### L4 — Debt due day is fixed at game start

`GameState.debtDueDay` defaults to 30 and is never modified. There is no refinancing option, no dialogue to extend the deadline, no mechanic to change it even with a negotiator on the roster. The negotiator title reduces amount, not timeline.

**Fix:** Allow the negotiator to extend `debtDueDay` by 7 days as a dialogue outcome (at a cost: additional 50 Marks interest).

---

### L5 — Faction income grants are buried in title effects

`applyTitleEffects.ts:386–392` grants faction-based passive income bonuses when standing exceeds 30. This logic is inside title effects, not obviously connected to factions. A player researching income sources would not find it.

**Fix:** Move the faction income logic to a clearly labeled section or a separate `applyFactionIncomeGrants()` step.

---

### L6 — Sell price ignores quantity

`sellItem.ts` handles single-item sales. `ownedItems` has a `quantity` field, but `computeSellPrice()` treats all sales the same regardless of quantity sold. Bulk selling is mechanically identical to single-item selling.

**Fix:** Optionally apply a small bulk discount (or premium for rarity) when selling stacks above a threshold.

---

## Economics health summary

| Area | Status |
|------|--------|
| Treasury location | ✓ Single field, `GameState.money` |
| Wage payment pipeline | ⚠ Pays but no departure consequence for arrears |
| Wage rate consistency | ✗ Hire rate and daily rate use different formulas |
| Debt interest | ⚠ Flat rate, not proportional |
| Shop pricing | ⚠ Modifier duplication across selector and reducer |
| Quest reward debt reduction | ⚠ Undiscoverable from UI |
| Income source visibility | ✗ Scattered, no unified view, ledger projection is wrong |
| Durability maintenance cost | ✗ Absent |
| Room economic effects | ⚠ Magic numbers, not data-driven |
| Bond operational cost | ✗ Absent |

---

## Recommended fix order

1. **Critical — Add wage departure consequence** at 14 unpaid days. Biggest exploit to close.
2. **Critical — Unify wage rate** by storing `contractWagePerDay` on `NpcRuntimeState` at hire.
3. **Critical — Centralize repair discount** into a shared pure function to prevent selector/reducer divergence.
4. **Medium — Create `selectIncomeSources`** and fix the ledger runway projection.
5. **Medium — Add corruption payout log entry** so players understand the deduction.
6. **Medium — Document `rewardDebtReduction`** and surface it in the quest card UI.
7. **Low — Broaden market pressure range** to make the mechanic feel meaningful.
