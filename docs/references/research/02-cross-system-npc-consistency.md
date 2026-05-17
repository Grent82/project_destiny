# Cross-System NPC Consistency Audit
**Date:** 2026-05-16  
**Status:** First pass — findings only, no fixes applied  
**Scope:** NPC data model across roster, wards/heirs, world NPCs, bonds, relationships, combat, dialogue

---

## What this looks at

NPCs appear in many systems: they are defined in content, hired to a roster, tracked via relationship axes, bonded to the player, placed in districts, encountered in combat, and spoken to in dialogue. This audit asks whether the data model is consistent across all those surfaces — or whether the same concept is represented differently in different places.

---

## Critical findings

### C1 — Dual ward systems running in parallel

Two separate systems track wards and heirs simultaneously with no collision prevention:

**System A — `Heir` / `state.house.houseHeirs`** (defined in `src/domain/game/contracts.ts`):
- Stages: `child → ward → apprentice → adult`
- Arrival tracked by `arrivalDay`
- Advancement triggered by `advanceWardStage` / `tickWardStages` in `houseWard.ts`
- Graduation via `formalizeHeir.ts` or `formalizeAdultWard` in `houseWard.ts`

**System B — `Ward` / `state.wards`** (defined in `src/domain/game/contracts.ts`):
- Stages: `infant → child → teenager → young_adult`
- Arrival tracked by `arrivedOnDay`
- Advancement triggered by `applyWardAgeMilestones.ts`
- Graduation via `promoteWardToRoster.ts` (must be called explicitly)

Both systems exist and both are called from `endDay`. There is no guard preventing a ward from appearing in both. No code cross-references them. A ward born via `tickPregnancyProgress` lands in `state.house.houseHeirs` (System A). A ward accepted via authored events could land in either depending on the event handler.

**Fix:** Decide which system is canonical and migrate all entry points to it. System B (Ward/wards) has the more realistic stage model and explicit promotion. System A is older and more wired into the UI. Merge into one, or document explicit ownership boundaries.

---

### C2 — Three bond concepts using the same word

"Bond" means three different things in the codebase:

| Usage | Location | What it means |
|-------|----------|----------------|
| Lore/character bonds | `NpcDefinition.bonds` in content JSON | Authored personality notes about this NPC's loyalties and fears |
| Relationship axes | `state.relationships` + `RelationshipEdge` | Runtime affinity/trust/loyalty/fear numeric scores between two entities |
| Labor bond contracts | `state.activeContracts` | Formal employment agreements with wage terms |

There is no shared type or terminology. A screen that "shows bonds" might mean any of the three. Code searching for "bond" returns all three contexts.

**Fix:** Rename one or two. Lore bonds → `loyalties` or `characterNotes`. Labor bonds are already `contracts`. Reserve "bond" or "relationship" for the runtime axis system.

---

### C3 — NPC state fragmented across seven locations

A roster NPC's complete runtime state is spread across:

1. `state.roster[]` — `NpcRuntimeState` (name, status, traits, skills, relationships, wages, pregnancyState)
2. `state.relationships{}` — keyed edges per NPC pair (affinity, trust, loyalty, fear, intimacyStage)
3. `state.house.houseHeirs[]` — if the NPC originated as a ward (retained post-promotion? unclear)
4. `state.house.wards[]` — while in ward lifecycle
5. `state.combat.combatants[]` — during combat (separate combatant model, not linked by id back to roster)
6. `contentCatalog.npcsById` — the NPC's definition (personality, lore bonds, arcs, starting stats)
7. `contentCatalog.dialogueTreesById` — dialogue state is external to NPC runtime state

To reconstruct one NPC's full picture, a selector must merge all seven. `selectNpcDetail` in `selectors/npc.ts` attempts this but may miss some sources.

**Fix:** Document which slice owns which aspect. Consider a single `selectFullNpcProfile(npcId)` that is the canonical merge point for all NPC data, so UI never has to do partial assembly.

---

### C4 — Adult ward promotion gap

`applyWardAgeMilestones` (System B) sets `ward.promotedToNpcId` when a ward reaches `young_adult`, but **does not call `promoteWardToRoster`**. The ward stays in `state.wards` indefinitely unless some other code path explicitly calls promotion. There is no hook in `endDay` that checks for wards with `promotedToNpcId` set and auto-promotes them.

A ward can be permanently stranded: stage shows `young_adult`, milestone events have fired, but they never appear on the roster.

**Fix:** Either auto-promote in `applyWardAgeMilestones` after setting the flag, or add an explicit daily sweep in `endDay` that calls `promoteWardToRoster` for any ward where `stage === 'young_adult'` and `promotedToNpcId` is set.

---

## Medium findings

### M1 — NPC `status` field duplicated between roster and definition

`NpcRuntimeState.status` (runtime: `'active' | 'captured' | 'dead' | 'dismissed' | 'family'`) and `NpcDefinition.startingStatus` (content: potentially different values) represent overlapping concepts. If a definition sets `startingStatus: 'active'` and runtime later marks `status: 'dead'`, the definition value is ignored — but it's not obvious which is authoritative at initialization.

**Fix:** Remove `startingStatus` from definitions if it's always overridden at runtime, or document the initialization contract explicitly.

---

### M2 — World NPC location override is a single string

`WorldNpcState.locationOverride: string | null` stores a district ID. There is no validation that the string is a real district ID, no type for district IDs, and no check that the NPC is in the right district when queried. If a district is renamed or removed, orphaned overrides silently persist.

**Fix:** Define a `DistrictId` branded type and validate overrides against `contentCatalog.districts` on load.

---

### M3 — Intimacy stage not formally linked to relationship axes

`RelationshipEdge.intimacyStage` progresses independently of the affinity/trust/loyalty numbers. `applyNpcPairing` gates stage transitions on axis thresholds, but nothing prevents a reducer from setting `intimacyStage: 'committed'` on an edge with affinity=5. The stage and the axes can be inconsistent.

**Fix:** Either enforce consistency through a domain validator, or compute `intimacyStage` as a selector from the axes (making it derived rather than stored).

---

### M4 — Parent refs not validated at birth

When `tickPregnancyProgress` creates an heir, it sets `parentRefs: [npc.npcId, otherParent]`. `otherParent` defaults to `PLAYER_ID` if `partnerNpcId` is null. No check verifies that the referenced NPC IDs exist in the roster or definitions. An heir can have a parentRef pointing to a deleted or never-existing NPC.

**Fix:** Validate parentRefs at heir creation. At minimum, log a warning if a referenced NPC is not found.

---

### M5 — World NPC state initialization gap

`contentCatalog.npcsById` holds NPC definitions that may have `worldPresence` fields, but `state.worldNpcs` (runtime world state) is not auto-populated from definitions. If an NPC definition specifies a home district, that information does not automatically appear in `state.worldNpcs`. The connection must be set up via event handlers at game start.

If a game-start event handler is missing or fails silently, world NPCs are simply absent from the district map without any error.

**Fix:** Add an initialization sweep in `initialGameState` that seeds `worldNpcs` from any NPC definition with a `homeDistrict` field.

---

## Low findings

### L1 — NPC definition fields require dual lookup

To show an NPC's dialogue options, a selector must look up the NPC in `contentCatalog.npcsById`, then look up each arc in `contentCatalog.dialogueTreesById`. Two separate catalog lookups with no shared key type means either can silently fail (returns undefined) if an ID is misspelled in a JSON file.

**Fix:** Validate cross-references at catalog build time. Log warnings for any NPC whose arc IDs don't resolve.

---

### L2 — Enemy NPC schema diverges from roster NPC

Combat enemies use `CombatantState` with a subset of NPC fields (no traits, no relationship axes). When a roster NPC enters combat, they are translated into a `CombatantState` that drops most of their character data. Post-combat, there is no path to carry wounds or status effects back from combatant to roster NPC.

**Fix:** Either enrich `CombatantState` with a reference to the source NPC ID and a post-combat resolution step, or document that combat is intentionally stateless with respect to roster NPCs.

---

### L3 — Arc definitions not validated against NPC presence

`contentCatalog.arcsById` (if it exists) can reference NPCs by ID. If the NPC definition is deleted or renamed, the arc's NPC reference becomes a dangling pointer with no validation.

**Fix:** Add a catalog integrity check that verifies all NPC references in arcs resolve to known NPC definitions.

---

## NPC data model summary

| Area | Status |
|------|--------|
| Single canonical ward system | ✗ Two parallel systems, no collision guard |
| Bond terminology consistency | ✗ Three distinct concepts share the word |
| NPC state co-location | ⚠ Fragmented across 7 locations, partial merge in selectors |
| Ward-to-roster promotion pipeline | ✗ Promotion gap — wards can stall at young_adult |
| Status field ownership | ⚠ Duplicated between runtime and definition |
| Location type safety | ⚠ Unvalidated string IDs |
| Intimacy / axis consistency | ⚠ Stage and axes can diverge |
| Parent ref integrity | ⚠ No validation at birth |
| World NPC initialization | ⚠ No auto-seed from definitions |
| Catalog cross-reference integrity | ⚠ No build-time validation |

---

## Recommended fix order

1. **Critical — Merge dual ward systems.** Stalled wards and parallel state lead to bugs that are hard to diagnose. Pick one system, migrate all entry points.
2. **Critical — Close the ward promotion gap.** Add an `endDay` sweep or auto-promote in `applyWardAgeMilestones` so no ward is stranded.
3. **Critical — Rename bond terminology.** Before more screens or commands are written, clarify which "bond" means what.
4. **Medium — Document NPC state locations** and create a canonical `selectFullNpcProfile` selector.
5. **Medium — Validate world NPC location IDs** with a branded type.
6. **Low — Add catalog integrity checks** at startup to catch dangling NPC references in arcs and dialogue.
