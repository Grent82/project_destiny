# Clean Architecture Audit
**Date:** 2026-05-16  
**Status:** First pass — findings only, no fixes applied  
**Scope:** `src/` — domain, application, UI, infrastructure layers

---

## What this looks at

The intended architecture is a strict inward dependency flow:

```
UI → Application → Domain
Infrastructure → Application → Domain
```

Domain must not import from Application or UI.  
Application commands must be pure functions (state → state), no side effects.  
UI must not compute game rules — that belongs in selectors.

This audit checks five things:
1. Dependency direction violations
2. Business logic leaking into UI components
3. Commands that break the pure function rule
4. Large files with too many responsibilities
5. Test coverage gaps

---

## Critical findings

### C1 — Business logic computed inline in UI components

Several screens compute game rules directly instead of asking a selector.

**NpcDetailPanel.tsx lines 238–251** — income calculation:
```ts
const income = Math.max(3, Math.min(15, Math.floor(
  Math.max(...(['administration', 'medicine', 'engineering', 'negotiation', 'security', 'crafting', 'academics'] as const)
    .map((s) => detail.skills[s] ?? 0)) / 7
)))
```
This is a game rule (how NPC income is derived from skills). It should be in `selectEstimatedNpcIncome(npcId)`.

**NpcDetailPanel.tsx lines 125–134** — dominant trait sentences:
```ts
function getDominantTraitSentences(traits: Record<string, number>): string[] {
  return Object.entries(traits)
    .filter(([, val]) => val > 65 || val < 35)
    .sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50))
    .slice(0, 2)
    ...
}
```
Thresholds 65/35/50 are game rules. This belongs in `selectNpcCharacterDescription(npcId)`.

**ShopsScreen.tsx lines 127–138** — price modifier formatting:
```ts
? `${Math.round((1 - shop.marketPressureMod) * 100)}% low-demand discount`
: `+${Math.round((shop.marketPressureMod - 1) * 100)}% high-demand surcharge`
```
Should be in `selectShopPricingBreakdown(shopId)`.

**ContractBoardScreen.tsx line 87** — days remaining:
```ts
? Math.max(runtime.acceptedOnDay + template.timeLimitDays - currentDay, 0)
```
Should be in `selectQuestDaysRemaining(questId)`.

**Fix pattern for all of these:** move computation to a selector, pass result as a prop or read via `useAppSelector`. Never compute game rules in a component function body.

---

### C2 — UI imports from command layer (boundary violation)

UI components should only import from selectors and `gameActions`. These three import directly from commands:

| File | Import |
|------|--------|
| `DialogueScreen.tsx:5` | `isDialogueChoiceAvailable` from `commands/dialogue` |
| `InvestigationScreen.tsx:10` | `INVESTIGATION_APPROACHES`, `InvestigationApproach` from `commands/investigation` |
| `ShopsScreen.tsx:7` | `getDurabilityTier` from `commands/durability` |

**Fix:** wrap each in a selector so UI never touches commands directly.

---

### C3 — Void-return mutation functions in adjustRelationship.ts

`applyPassiveDrift(state: GameState): void` and `applyProximityGains(state: GameState, npcIds: string[]): void` mutate `state` in place and return nothing. The pure function pattern means every command should return a new state value, not mutate the input.

These are called from `applyNpcConsequences.ts`. The intent is invisible from the call site — you can't tell that state changed without reading the implementation.

**Fix:** return `GameState` from these functions. `applyNpcConsequences` already reassigns the result — the callers are ready for this.

---

### C4 — Domain re-exports from application (reversed dependency)

`src/domain/npc/checkLineTheyWontCross.ts` re-exports from `src/application/`:
```ts
export { ACTION_CONTEXT_TAGS, checkLineTheyWontCross } from '../../application/npc/checkLineTheyWontCross'
```

Domain pointing at application is the wrong direction. Either the function should live in domain (if it only needs domain types), or the re-export file should be deleted and callers updated to import from application directly.

---

## Medium findings

### M1 — gameSlice.ts is 1,421 lines with ~56 command imports

This file is the single choke point for all game state mutations. It handles:
- House state
- Roster and NPC state
- Debt and money
- Quest lifecycle
- Combat
- Titles and assignments
- Inventory and durability
- Captivity
- Wards and heirs
- Faction standing
- City resources and events

Every new system adds more imports and more reducers to this file. Testing any reducer requires setting up large state. Debugging a state mutation means searching 1,400 lines.

**Fix:** split into domain-focused slice files that each import their own command functions:
- `houseSlice.ts`
- `rosterSlice.ts`
- `resourcesSlice.ts`
- `questSlice.ts`
- `combatSlice.ts`

Each stays under ~200 lines. Root store combines them.

---

### M2 — Game rule constants duplicated across layers

Thresholds, weights, and tier scores appear in multiple files:

- Prestige thresholds in `selectors/house.ts` lines 102–108
- Defense tier scores in `selectors/house.ts` lines 205–210
- Renown thresholds defined in a selector (`selectRenownThresholds`)
- Exterior tier thresholds in `selectors/house.ts` lines 47–53
- Trait display thresholds (65, 35, 50) in `NpcDetailPanel.tsx`

When a designer wants to change "grand tier now requires 6 rooms instead of 7," they must hunt across files. One source of truth is the fix.

**Fix:** `src/domain/game/gameRules.ts` (or per-subsystem `rules.ts`) that exports all threshold constants. Selectors and commands import from there.

---

### M3 — directcontentCatalog calls inside Redux reducers

Several reducers in `gameSlice.ts` call `contentCatalog.eventsById.get(eventId)`, `contentCatalog.npcsById.get(npcId)`, and similar. This makes reducers hard to test (must load full catalog) and ties them to the catalog structure.

**Fix:** pass required content data through the action payload when the reducer needs it, or compose with a command that handles catalog lookup before the action is dispatched.

---

## Low findings

### L1 — 18 command files without test coverage

Files in `src/application/commands/` without a corresponding `.test.ts`:

```
applyEventOutcome.ts      applyFactionActivity.ts    applyPolitics.ts
applyThresholds.ts        applyWages.ts              adjustRelationship.ts
activityLog.ts            combatAI.ts                combatConsts.ts
combatants.ts             combatResolution.ts        formalizeHeir.ts
generateHireOffers.ts     houseWard.ts               inventory.ts
seededRng.ts              setHousePolicy.ts          testFixtures.ts
```

Some (e.g. `adjustRelationship.ts`) are indirectly covered by higher-level tests. Others (e.g. `applyWages.ts`, `combatResolution.ts`) are high-stakes functions with no direct test.

---

### L2 — Tier score table duplicated inside the same selector file

`selectDefenseRating` and `selectHousePrestige` in `selectors/house.ts` both define `HouseExteriorTier → number` mappings independently. Same file, different functions. Extract to a `const TIER_SCORE` at file scope.

---

## Architecture health summary

| Area | Status |
|------|--------|
| Domain layer independence | ✓ Clean (one re-export exception) |
| Seeded RNG (no Math.random in logic) | ✓ Clean |
| Command pure-function pattern | ⚠ Mostly clean — void-mutation exceptions |
| Selector coverage | ⚠ Good but UI bypasses in 3 screens |
| gameSlice.ts size | ✗ Critical — needs splitting |
| Game rule constants | ⚠ Duplicated across layers |
| Test coverage | ⚠ 18 command files untested |

---

## Recommended fix order

1. **High — Split gameSlice.ts** into 5 domain-focused slices. Biggest payoff per effort.
2. **High — Move UI game-rule computations to selectors** (income, trait sentences, pricing, days remaining).
3. **High — Wrap command imports in selectors** (dialogue choices, investigation approaches, durability tier).
4. **Medium — Convert void-mutation functions** in `adjustRelationship.ts` to pure return-state pattern.
5. **Medium — Centralise game rule constants** in `src/domain/game/gameRules.ts`.
6. **Low — Add tests** for untested high-stakes commands (`applyWages`, `combatResolution`, `applyEventOutcome`).
7. **Low — Remove domain re-export** from `checkLineTheyWontCross.ts`.
