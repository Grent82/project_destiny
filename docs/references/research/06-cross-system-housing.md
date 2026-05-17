# Cross-System Housing Audit
**Date:** 2026-05-16  
**Status:** First pass — findings only, no fixes applied  
**Scope:** House state, rooms, wards/heirs, policy, prestige, roster capacity, economics

---

## What this looks at

The house is the player's primary base and hub. It has rooms with mechanical effects, capacity limits that gate the roster, a prestige score that unlocks content, heirs that carry political weight, and policies that govern NPC behavior. This audit checks whether all those systems are wired together consistently and where the player experience has gaps.

Not: not only for the player also for the NPCs!

---

## House state anatomy

`houseStateSchema` (defined in `src/domain/game/contracts.ts:142–151`) contains:

- `rooms[]` — array of 11 room entries, each with state and optional function
- `vaultUnlocked: boolean`
- `rosterBonus: number` — extra capacity granted by repaired rooms
- `exteriorState` — `'ruined' | 'patched' | 'maintained' | 'restored' | 'grand'`
- `fortificationLevel: 0–5`
- `houseHeirs[]` — max 2 succession heirs (stages: child → ward → apprentice → adult)
- `npcPairingPolicy: 'open' | 'discouraged' | 'forbidden'`

Ward NPCs born during play are stored separately in `state.wards` (not inside `state.house`).

---

## Critical findings

### C1 — House heirs are invisible to the player

`state.house.houseHeirs` stores up to two succession heirs. These are tracked, carry political legitimacy weight, and can be formalized to the roster. But:

- `HouseScreen.tsx` displays `state.wards` (the NPC-born ward array) — not `state.house.houseHeirs`
- No selector exists that exposes `houseHeirs` to any UI component
- The only places `houseHeirs` surface are: the prestige weight selector, the `recognizeHeir` and `formalizeHeir` commands, and tests

A player can have a named heir in the house (placed there by an authored event) and never see them on the house screen. The only way to discover them is through an event that explicitly mentions them.

**Fix:** Add `selectHouseHeirs` selector. Surface heirs in `HouseScreen` alongside wards, clearly labeled as succession heirs vs. born wards.

---

### C2 — Roster capacity is not enforced at the command level

`selectRosterCapacity()` (in `selectors/household.ts`) and `selectCrewCapacity()` (in `selectors/house.ts`) both compute an `isFull` flag. But:

- `formalizeHeir()` does not check capacity before adding an NPC to the roster
- `promoteWardToRoster()` does not check capacity before adding an NPC to the roster
- Only the hire flow (UI-driven) checks capacity via the selector before dispatching

A player with a full roster who triggers an heir formalization or ward promotion will silently exceed the stated capacity limit.

**Fix:** Add a capacity check inside `formalizeHeir` and `promoteWardToRoster`. Return state unchanged (and log a warning entry) if `roster.length >= capacity`.

---

### C3 — Exterior tier can be computed but never committed

`selectComputedExteriorTier()` (`selectors/house.ts:60`) derives what the exterior tier *should* be based on intact room count and function assignments. `selectExteriorTierAdvanceable()` detects when the computed tier exceeds the committed value. But:

- No command or reducer updates `state.house.exteriorState` based on room repairs
- The committed exterior state (`exteriorState`) only changes if an explicit action is dispatched — and no such action is wired in the current flow
- A player who repairs all rooms will have a computed tier of 'grand' while `exteriorState` stays 'ruined'

**Fix:** Add a `commitExteriorTier` command that sets `exteriorState` to the computed tier. Call it from the `repairRoom` reducer, or expose it as a player-triggered action guarded by `selectExteriorTierAdvanceable`.

---

## Medium findings

### M1 — Two roster capacity selectors that diverge

`selectRosterCapacity()` (`selectors/household.ts:17`) reads `game.house.rosterBonus` directly. `selectCrewCapacity()` (`selectors/house.ts:29–32`) recomputes capacity from room function bonuses. These are two independent calculations that can produce different numbers.

If `rosterBonus` is out of sync with the actual room states (e.g., after a state migration), the two selectors disagree on how many NPCs the player can have.

**Fix:** Remove one. Pick `selectRosterCapacity` as canonical (reads the stored bonus) or `selectCrewCapacity` (derives from rooms). The other should import and delegate to it.

---

### M2 — Room function assignments have incomplete effects

`ROOM_FUNCTION_CAPACITY_BONUS` in `assignRoomFunction.ts` gives bonuses only for `'quarters'` and `'barracks'`. The schema allows these additional function types: `'workshop'`, `'archive'`, `'infirmary'`, `'reception'` — but none of them have any mechanical effect.

Assigning a room to `'archive'` produces no gameplay change. The assignment persists in state but does nothing.

**Fix:** Either implement effects for the remaining function types, or remove them from the schema until they are designed. Empty function types in the schema invite confusion when authoring events that check room functions.

---

### M3 — No room degradation or damage events

Rooms start in defined states (intact, damaged, stripped, collapsed) and can only be repaired — they never degrade during play. No event, no command, and no end-of-day process makes a room worse over time. There is no concept of a siege damaging barracks or a fire destroying the kitchen.

**Fix (optional):** Author events that set `room.state = 'damaged'` as an outcome. The `applyEventOutcome` handler already supports arbitrary state mutations via the event payload — this requires only authored content, not new code.

---

### M4 — npcPairingPolicy has no UI

`setNpcPairingPolicy()` (`setHousePolicy.ts:11`) exists and is enforced in `applyNpcPairing`. But there is no UI component that lets the player view or change it. The policy defaults to `'open'` and stays there unless a future event or command changes it.

**Fix:** Add a policy section to the house screen (or a dedicated policy panel) that shows current policy and lets the player change it via a dispatched action.

---

### M5 — Fortification upgrade cost has no canonical definition

`upgradeFortification()` reducer takes `{ cost: number }` from the action payload. Tests use `{ cost: 50 }` but there is no constant or catalog entry that defines what fortification upgrades cost per level. Each UI element must supply the correct cost independently.

**Fix:** Define `FORTIFICATION_UPGRADE_COSTS: Record<number, number>` (cost per level 0→1, 1→2, etc.) as a constant in a domain or command file. The UI reads from it.

---

## Low findings

### L1 — Only one house policy type exists

The schema has `npcPairingPolicy` as the only house-level policy. The research list mentioned policies more broadly — harvest policy, heir recognition policy, house secrecy, etc. None of these exist.

**Note:** This is a feature gap, not a bug. Documenting as a future design space.

---

### L2 — No collective house wellbeing concept

Individual NPC morale exists (tracked per NPC in roster state). But there is no house-level morale or collective wellbeing metric. Events can fire on individual NPC traits but not on collective house sentiment. A house full of unhappy NPCs and a house full of content NPCs look identical from the house screen.

**Note:** Intentional design omission for now. Noting as a potential future mechanic (aggregate morale affecting hire quality or event pools).

---

### L3 — Ward system split is unresolved

The NPC consistency audit (02) documented two parallel ward systems: `Heir`/`houseHeirs` (System A) and `Ward`/`state.wards` (System B). This housing audit confirms:

- `HouseScreen` shows only System B (state.wards)
- System A (houseHeirs) is entirely hidden from the player UI
- Both systems run in `endDay` without collision checks

This is re-listed here as a low finding since the fix is architectural (merge systems or clearly separate UIs for each). The root finding belongs to audit 02.

---

## Room mechanics reference

| Room | Initial state | Function | Mechanical effect |
|------|---------------|----------|-------------------|
| Entrance Hall | Intact | — | Narrative only |
| Marion's Quarters | Intact | — | Narrative only |
| Bureau | Damaged (15 Mk) | Assignable | UI nav shortcut when intact |
| Kitchen | Damaged (20 Mk) | `kitchen` | −1 Mk/NPC/day wage when intact |
| Study | Stripped (35 Mk) | `study` | +25% skill gain; −1 stress while resting |
| Barracks | Stripped (80 Mk) | `barracks` | −2 fatigue/day when idle |
| Vault | Locked | — | Unlocks via clue items; quest progress |
| Master's Chamber | Stripped (45 Mk) | — | Faction relations (narrative) |
| Servant Quarters | Collapsed (60 Mk) | — | +1 roster capacity when repaired |
| East Wing | Destroyed (200 Mk) | — | +2 roster capacity when repaired |
| Garret | Collapsed (130 Mk) | — | District surveillance (narrative) |

---

## Housing health summary

| Area | Status |
|------|--------|
| House state definition | ✓ Clear schema, well-structured |
| Room repair mechanics | ✓ Costs defined, correctly applied |
| Kitchen wage discount | ✓ Applied in applyWages |
| Heir visibility in UI | ✗ houseHeirs never shown to player |
| Roster capacity enforcement | ✗ Not checked at formalization or promotion |
| Exterior tier commitment | ✗ Computed but never persisted |
| Dual capacity selectors | ⚠ Two independent calculations can diverge |
| Room function effects | ⚠ Most function types have no effect |
| Pairing policy UI | ⚠ Policy enforced but not visible or changeable |
| Ward system split | ⚠ Architecture issue — see audit 02 |

---

## Recommended fix order

1. **Critical — Surface houseHeirs in UI.** Players should see their succession heirs. Add `selectHouseHeirs` and a UI section.
2. **Critical — Enforce capacity in `formalizeHeir` and `promoteWardToRoster`.** Return early with a log entry if roster is full.
3. **Critical — Wire exterior tier commitment.** Call `commitExteriorTier` (new command) from the `repairRoom` reducer.
4. **Medium — Unify the two capacity selectors.** One canonical selector, one source of truth.
5. **Medium — Add pairing policy UI** on the house screen.
6. **Medium — Implement or remove unused room function types** (`workshop`, `archive`, `infirmary`, `reception`).
7. **Low — Define `FORTIFICATION_UPGRADE_COSTS`** as a constant.
