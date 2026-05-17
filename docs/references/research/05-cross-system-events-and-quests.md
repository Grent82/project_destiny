# Cross-System Events and Quests Audit
**Date:** 2026-05-16  
**Status:** First pass — findings only, no fixes applied  
**Scope:** Event authoring, quest lifecycle, trigger coverage, cross-reference integrity, player visibility

---

## What this looks at

Events and quests are the primary content delivery mechanism. Events fire from conditions and deliver outcomes; quests are contracts with time limits, rewards, and consequences. This audit checks whether the two systems are internally consistent, whether authored content references valid IDs, and where the player experience has gaps.

---

## System anatomy

**Events** are authored in `data/definitions/events.json` (~335 entries). Each has trigger conditions (day ranges, quest state, NPC presence, city dial thresholds), a list of player-facing choices, and outcome payloads per choice. Outcomes can: add credits, adjust city dials, adjust faction standing, adjust NPC relationship axes, add an NPC to roster, create a quest lead, set corridor status, or unlock an NPC.

Events are evaluated each day by `evaluateEvents.ts`, which checks conditions and pushes matching events into `state.pendingEvents`. Pending events are resolved in `gameSlice.ts` via player choice, which calls `applyEventOutcome.ts`.

**Deduplication:** Non-repeatable events are blocked forever after first fire via `state.firedEvents` (a `lastFiredDay` map). Repeatable events enforce a cooldown window (default 7 days). This is correctly implemented.

**Quests** are authored in `data/definitions/quests.json` (24 entries). They have time limits, NPC assignments, reward structures (money, items, debt reduction, relationship deltas), and optional successor quests on success or failure. Quests enter play via quest leads (`state.availableQuestLeads`) and become active when a player accepts them (`state.activeQuests`). Resolution is handled by `questSettlement.ts`.

---

## Critical findings

### C1 — Event references a quest that does not exist

`events.json` contains an event (`event-gilded-court-approach`) with an outcome that sets `questId: "quest-gilded-court-favor"`. This quest does not exist in `quests.json`.

When this event fires and the player selects the "accept the meeting" choice, `addQuestLeadIfNew()` in `applyEventOutcome.ts:98` performs a catalog lookup that returns null. The quest lead is silently not created. The player receives no feedback.

**Fix:** Add the missing quest definition to `quests.json`, or remove the `questId` reference from the event outcome.

---

### C2 — Days-remaining calculation duplicated between UI and quest lifecycle

`ContractBoardScreen.tsx:86–88` computes days remaining inline:
```ts
Math.max(runtime.acceptedOnDay + template.timeLimitDays - currentDay, 0)
```

`questLifecycle.ts:68` has equivalent expiry logic. The two are currently consistent but share no code. If the deadline formula changes in one place, the UI will show a different number than the system actually uses for expiration.

**Fix:** Extract to a shared pure function `getQuestDaysRemaining(runtime, template, currentDay): number` and use it in both locations. This is also the fix identified in the clean-architecture audit (C1 in that file).

---

## Medium findings

### M1 — Event outcomes are not validated against catalog at runtime

`applyEventOutcome.ts` processes outcome arrays but does not verify that referenced IDs exist before applying them:

- **NPC ID** (line ~150): `contentCatalog.npcsById.get(outcome.npcId)` returns undefined silently if the NPC definition was removed or renamed. The NPC is not added to the roster; no log entry is written.
- **Quest ID** (line ~98): `addQuestLeadIfNew()` receives a questId that may not resolve. Silent failure (see C1).
- **Arc ID** (line ~154): `outcome.arcId` is passed to an NPC state update without checking if the arc exists in the catalog.

Any mismatch between authored event content and the catalog causes partial state updates with no diagnostic output.

**Fix:** Add a validation pass in `applyEventOutcome.ts` that logs warnings for unresolvable IDs before applying outcomes. Optionally, run the same validation at catalog build time in `contentCatalog.ts`.

---

### M2 — Quest definitions lack cross-reference validation at load time

`contentCatalog.ts:73–74` parses quest templates with `questTemplateSchema.array().parse(questsData)` but the schema does not validate referential integrity. Quest fields that reference other entities are unchecked:

- `successorQuestId`, `successorOnFailQuestId` — no check that the referenced quest exists
- `prerequisiteQuestId` — no check
- `enemyNpcId` — no check against NPC definitions
- `rewardItemIds[]` — no check against item catalog
- `rewardRelationshipDeltas[].npcId` — no check against NPC definitions

All current quests pass because the content is hand-checked. But there is no guardrail for future additions.

**Fix:** Add a post-parse integrity check in `contentCatalog.ts` that cross-references all quest fields against their respective catalogs and throws (or warns) on mismatch.

---

### M3 — Events cannot apply multi-NPC relationship changes

The `EventOutcome` schema supports `adjustNpcRelationship` for a single NPC per outcome entry. Quests use `rewardRelationshipDeltas[]` — a structured array allowing multiple NPC relationship changes in one resolution. Events have no equivalent.

If an event should shift relationships with several NPCs simultaneously (e.g., a rumor spreading to three factions), it requires multiple separate outcome entries — one per NPC — which is verbose and error-prone.

**Fix:** Add `adjustNpcRelationshipDeltas: { npcId, affinity?, trust?, loyalty?, fear? }[]` to `EventOutcome`, mirroring the quest pattern.

---

### M4 — Expired quest leads are never removed from state

`state.availableQuestLeads` accumulates over time. Expiry is enforced only in `selectAvailableQuests()` (the selector filters out expired leads at display time). Expired leads are never removed from the array itself.

If any code path accesses `state.game.availableQuestLeads` directly rather than through the selector, it sees stale leads. State grows unboundedly.

**Fix:** Either prune expired leads in the `endDay` pipeline, or add a state invariant test that asserts expired leads do not persist past a fixed window.

---

## Low findings

### L1 — All events and quests are fully authored; no procedural generation

335 event definitions and 24 quest definitions are all hand-authored. Procedural variation exists only for hire offers (`generateHireOffers.ts`) and successor quest chains. There is no system for world-state-driven quest generation (e.g., "a quest appears because this district has high tension and a matching NPC is present").

This is a valid design choice — authored content gives precise narrative control. Noting it here because the original research list asked about "automatically created on player or NPC world progress." The answer is: not currently. Quest leads are triggered by events, which are authored with conditions, not generated.

**Fix** Define procedural generation mechanism.

---

### L2 — No "all quests complete" event trigger

Event conditions can check `completedQuestCountMin` but no authored event fires when all available quests are finished. A player who completes every quest has no narrative acknowledgment of that state. Quest generation relies on the world progressing (city dials, days, NPC arcs) to unlock new events — but there is no milestone marker.

**Fix (optional):** Author a milestone event with condition `completedQuestCountMin >= N` that acknowledges the player's cleared board and signals what comes next.

---

### L3 — Event instance and pending event arrays can drift out of sync

`state.pendingEvents` holds minimal records (`{ eventId, firedOnDay }`). `state.eventInstances` holds full resolution history (`{ instanceId, eventId, firedOnDay, resolvedOnDay, chosenOptionId, ... }`). When resolving an event in `gameSlice.ts:303–320`, both are updated — pending is removed, instance is marked resolved. But there is no enforced 1:1 relationship. A pending event can exist without a matching instance, or vice versa.

**Fix:** At event fire time, always create the instance atomically with the pending event. Consider deriving `pendingEvents` from `eventInstances` (filter for unresolved) to eliminate the redundant array.

---

### L4 — Quest time limit expiry has no authored consequence

When a quest's `timeLimitDays` is exceeded, `questLifecycle.ts` marks it expired. But the only visible consequence is the quest leaving the active list. There is no:
- Activity log entry explaining the failure
- Faction standing penalty for the failed contract
- Authored "on-fail" narrative event

The `successorOnFailQuestId` field exists on the schema, but most authored quests do not populate it.

**Fix:** Add a default expiry log entry in `questLifecycle.ts`. For authored quests with faction relationships, consider adding a light faction standing penalty on expiry.

---

## Events and quests health summary

| Area | Status |
|------|--------|
| Event deduplication / cooldown | ✓ Correctly implemented |
| Event outcome ID validation | ✗ No runtime validation — silent failures |
| Quest cross-reference validation at load | ✗ No catalog integrity check |
| Missing quest referenced by event | ✗ `quest-gilded-court-favor` is missing |
| Days remaining calculation | ✗ Duplicated between UI and quest lifecycle |
| Multi-NPC relationship events | ⚠ Not supported; quests support it but events don't |
| Expired quest lead cleanup | ⚠ Never removed from state — only filtered at selector |
| Quest expiry consequences | ⚠ No log entry, no faction penalty, no authored on-fail events |
| Procedural content generation | ✗ Absent — all content is authored |
| "All quests complete" milestone | ⚠ No authored trigger exists |

---

## Recommended fix order

1. **Critical — Add missing `quest-gilded-court-favor`** or remove the dead reference from the event.
2. **Critical — Extract `getQuestDaysRemaining`** to a shared utility (also closes clean-arch violation).
3. **Medium — Add outcome ID validation** in `applyEventOutcome.ts` to surface bad references.
4. **Medium — Add quest cross-reference check** in `contentCatalog.ts` post-parse.
5. **Medium — Prune expired quest leads** in the `endDay` pipeline.
6. **Low — Add a default expiry log entry** in `questLifecycle.ts` so players know why a quest disappeared.
7. **Low — Author on-fail successors** for the highest-stakes quests (debt-critical contracts).
