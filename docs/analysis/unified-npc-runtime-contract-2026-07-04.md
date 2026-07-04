# Unified NPC Runtime Contract (Option B)

**Status:** Design decision — canonical source of truth for the "unify NPC runtime" sub-epic under
`destiny-j1dl`.
**Date:** 2026-07-04
**Decision owner:** André Dittrich (chose Option B: unify runtime state onto one general list).

This document is the single reference every child ticket points to. A ticket that contradicts this
document is wrong — fix the ticket. If reality contradicts this document, update the document first,
then the tickets.

---

## 1. Problem being solved

Today a "person in the game" can live in **four different runtime shapes**, and only one of them can
have goals:

| Collection | Location (contracts.ts) | Element type | Has `currentIntention`? | Driven by |
|---|---|---|---|---|
| `roster` | :302 | `NpcRuntimeState` (full) | ✅ | Intention system |
| `worldNpcStates` | :537 | `WorldNpcRuntimeState` (thin) | ❌ | `applyWorldNpcSocialSimulation` blanket sweep |
| `npcCaptivityStates` | :539 | `CaptivityState` (record by id) | ❌ | custody simulation |
| `availableForHire` | :339 | `HireOffer` (offer, not a person) | ❌ (n/a) | nothing — TTL offers |

`currentIntention` exists **only** on `npcRuntimeStateSchema` (npc/contracts.ts:812). The intention
pipeline iterates **only** `state.roster` (intentions.ts:329, 472, 497). Therefore the intention
system structurally cannot reach world or captive NPCs. This is the "existence ≠ reachability" gap:
the world simulation for non-roster NPCs is a thinner, non-personality-driven parallel rail.

## 2. Target model (the decision)

**One general runtime list of persons. Role and status gate capability, not storage shape.**

- `GameState.npcRuntimeStates: NpcRuntimeState[]` — the single list of **all** persons at runtime
  (recruited operatives, world NPCs, story NPCs, captives). Neutral name — **not** `roster`.
- `worldNpcStates` and `npcCaptivityStates` are **removed**. Their data folds into
  `npcRuntimeStates`.
- `availableForHire` is **unchanged** and **out of scope** — these are pre-recruitment *offers*, not
  persons. A `HireOffer` only becomes a person (an `npcRuntimeStates` entry) when accepted. See §8.
- `roster` survives **only as a derived selector** `selectRoster(state)` = entries with
  `npcType === 'roster'`. UI/domain code that means "the player's recruited team" uses the selector,
  not the raw list.

### 2.1 What distinguishes a person now

- `npcType: 'roster' | 'world' | 'story' | 'enemy'` (already on the *definition*, npc/contracts.ts:297).
  Mirror it onto the runtime state (new field, see §4).
- `captivityState?: CaptivityState` (already an optional field on `NpcRuntimeState`, :805). A captive
  is any runtime NPC whose `captivityState.status === 'captive'`. This becomes the **single** home
  for captivity data; the `npcCaptivityStates` record is folded in and deleted.

### 2.2 Capability gating (captives stay captive)

Capability is decided by a single pure predicate, extending the existing gate:

- `isNpcBlockedFromIntention(npc)` (intentions.ts:47) is already the captive türsteher. Keep it as the
  hard block for captives — they may take only the restricted set (no leave-the-house, no aggression
  against the holder, etc. — the current unconditional captive block stays; escape-attempt remains
  the only captive-eligible "agency" and is handled by its own bead `destiny-ap3s`).
- Add `intentionTypesForNpc(npc): Set<NpcIntentionType>` — returns the eligible subset by
  `npcType` **and** status. See §6 for the table. This composes with `WIRED_INTENTION_TYPES`
  (the global allowlist) — an intention fires only if it is BOTH globally wired AND eligible for that
  npc's type/status.

## 3. Non-goals (explicit)

- **`availableForHire` is not touched.** No agency for offers. (§8)
- **Enemy combat NPCs (`enemy-npcs.json` / `enemyNpcDefinitionSchema`) are not merged.** They remain
  a separate combat catalog. `npcType:'enemy'` runtime persons (if any) get no combat rework here.
- **No new intention *types*** are invented. This epic makes existing types reachable for more
  populations; it does not add mechanics.
- **No relationship-graph redesign.** `buildRelationshipKey` etc. are untouched.

## 4. Schema changes (`src/domain/npc/contracts.ts`)

Add to `npcRuntimeStateSchema` (all optional/defaulted so existing roster entries stay valid):

```ts
npcType: npcTypeSchema.default('roster'),          // role, mirrors the definition
// world-only ambient fields (null/absent for roster persons):
worldDisposition: worldNpcDispositionSchema.nullable().default(null),
lastContactDay: z.number().int().nonnegative().nullable().default(null),
locationOverride: z.string().nullable().default(null),
```

`npcTypeSchema` must be extracted as a named export (currently inline at :297 as
`z.enum(['roster','story','world','enemy'])`).

`captivityState` (:805) stays as-is — it becomes the sole home for captivity.

`worldNpcRuntimeStateSchema` and its type are **deleted** after the migration lands.
`GameState`: replace `roster` field name with `npcRuntimeStates`; delete `worldNpcStates` and
`npcCaptivityStates`.

### 4.1 Field map: `WorldNpcRuntimeState` → `NpcRuntimeState`

| old world field | new home | notes |
|---|---|---|
| `npcId` | `npcId` | same |
| `disposition` | `worldDisposition` | renamed to avoid clashing with roster semantics |
| `lastContactDay` | `lastContactDay` | new optional field |
| `locationOverride` | `locationOverride` | new optional field |
| `flags` | *(drop)* | roster has no flags array; migrate into `npcMemory` only if any world flag is read anywhere (grep first — see ticket) |
| `intimacyStage` | relationship axes | intimacy already lives on relationships for roster; world intimacy folds there (verify no data loss) |
| `pregnancyState` | `pregnancyState` | already on runtime state (:806) |
| `health` | `states.health` | |
| `injury` | `states.injury` | |
| `recovering` | `assignment:'recovering'` or `states` | decide in ticket per recovery contract |
| `clothing` | `clothing` | already on runtime state (:801) |
| `armor` | `armor` | already on runtime state (:802) |

All **required, no-default** fields of `NpcRuntimeState` that world objects lack
(`name`, `status`, `assignment`, `attributes`, `skills`, `traits`, `states`, `loadout`, `activeTitle`,
`wagesOwedDays`, `npcArc`) are filled by the factory (§5) from the NPC **definition** in
`contentCatalog`.

### 4.2 Field map: `npcCaptivityStates[id]` → `npcRuntimeStates[].captivityState`

The record value **is** a `CaptivityState` already. For each `[npcId, captivityState]`:
find/create the matching `npcRuntimeStates` entry (hydrate from definition if absent) and set its
`captivityState` field. Delete the record.

## 5. Factory (keystone, zero blast radius)

New pure helper, unit-tested in isolation:

```ts
// src/application/commands/createRuntimeStateFromDefinition.ts
export function createRuntimeStateFromDefinition(
  npcId: string,
  overrides?: Partial<NpcRuntimeState>,
): NpcRuntimeState
```

Reads `contentCatalog.npcsById.get(npcId)` and produces a fully schema-valid `NpcRuntimeState`:
`attributes` from `baseAttributes`, `skills` from `startingSkills`, `traits` from `startingTraits`,
`states` from `statesSchema` defaults, `assignment: 'idle'`, `status` from the definition,
`npcType` from the definition, everything else from schema defaults, then `overrides` applied last.
Throws (or returns a clearly-flagged fallback) if the definition is missing — decide in the ticket.

This is used by the save migration and by initial-state loading. Build it first; it unblocks the
merge.

## 6. Intention eligibility by npcType/status (§2.2 table)

`intentionTypesForNpc(npc)` returns:

| npcType / status | eligible intention families |
|---|---|
| `roster` (idle) | all `WIRED_INTENTION_TYPES` |
| `world` | survival (eat/drink/sleep/rest/groom), social (socialize/gossip/spend-time-with), aggression subset (confront-rival/patrol-district), leadership subset (consolidate-power/mediate-conflict) — **full parity per the decision**, minus player-house-only actions (fortify-position, protect-house, care-for-injured of *player* roster) |
| `story` | same as world unless the story arc restricts it (per-arc, out of scope now → treat as world) |
| any with `captivityState.status==='captive'` | **blocked** by `isNpcBlockedFromIntention` except escape-attempt (`destiny-ap3s`) |
| `enemy` | none (no runtime agency here) |

The exact per-type sets are enumerated in the eligibility ticket; this table is the intent.

## 7. Save migration v6 → v7 (`localSaveSnapshot.ts`)

Current `saveVersion` default is 6 (contracts.ts:521). Add a v6→v7 step that:

1. renames `roster` → `npcRuntimeStates` (stamp `npcType:'roster'` on each existing entry),
2. hydrates each `worldNpcStates` entry into an `npcRuntimeStates` entry via the factory + §4.1 map
   (stamp `npcType:'world'`), then removes `worldNpcStates`,
3. folds each `npcCaptivityStates[id]` into the matching entry's `captivityState` per §4.2 (hydrate
   from definition if the person isn't already present), then removes `npcCaptivityStates`,
4. sets `saveVersion:7`, validates with `gameStateSchema` before returning.

`data/runtime/initial-game-state.json` is updated by hand to the v7 shape (single list) as part of
the schema ticket. Also decide there whether to hydrate the 12 world definitions that currently have
**no** runtime entry (only `npc-dalen-morke`, `npc-enemy-tomas-rell`, `npc-enemy-catrin-hale` exist
today) — recommended: hydrate all ambient world defs so districts actually have people.

## 8. availableForHire (unchanged, documented)

`HireOffer` (contracts.ts:240) = `{ npcId, wagePerDay, signingBonus, turnsAvailable, ... }`. It is a
**contract offer**, not a runtime person. Recruiting resolves the offer into a new
`npcRuntimeStates` entry (via the factory, §5) with `npcType:'roster'`. No agency, no intentions for
offers. This is intentional and stated so no future ticket "unifies" it by mistake.

## 9. Migration is bridge-based (keeps the build green at every step)

Because `roster` has ~251 references (137 non-test + 114 test), the rename is a dedicated scripted
codemod ticket, sequenced so that:

1. `selectRoster` / `selectWorldNpcs` / `findNpc` / `updateNpc` helpers land **first** and read the
   *old* shape (`roster` + `worldNpcStates`). Consumers migrate to helpers while the old fields still
   exist.
2. Only after consumers use helpers do we flip the storage (rename field, fold arrays). The helpers'
   internals change; their call sites don't. This is what makes each ticket independently green.

## 10. Known adjacent finding (separate bead)

`npcs.json` contains 6 `npcType:"enemy"` entries **and** `enemy-npcs.json` is a separate enemy
catalog with its own schema. Potential source-of-truth drift for enemies. Not part of this epic —
file as its own bug bead and cross-link.
