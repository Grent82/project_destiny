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
  `playerRosterMember === true`. UI/domain code that means "the player's recruited team" uses the
  selector, not the raw list.

### 2.1 What distinguishes a person now — TWO independent discriminators

**CRITICAL (owner directive 2026-07-04): do NOT conflate "kind of NPC" with "works for the player".**
Verified in code: today "on the player roster" is defined *solely* by membership in the `state.roster`
array — there is no field for it, and `recruitNpc` does not copy `npcType` onto the runtime entry (the
runtime state has no `npcType` at all today). `npcType` is read at runtime only on *definitions*
(`contentCatalog`), and `generateHireOffers` gates offers to `npcType==='roster'`, which is *why*
"npcType roster" and "recruited" happen to coincide today. They must be split explicitly, or the merge
mixes world NPCs into the player roster.

- `npcType: 'roster' | 'world' | 'story' | 'enemy'` — the **content kind**, from the definition
  (npc/contracts.ts:297). Stored on runtime state (new field, §4) so the heterogeneous list can be
  filtered/iterated by kind (generation, decay, district/world selectors). Set once at
  hydration/recruitment from the def; never mutated casually.
- `playerRosterMember: boolean` — the **runtime relationship**: does this person work for the player?
  This is the *sole* replacement for the old "is in the `roster` array" signal. `recruitNpc` sets it
  `true`; leaving the player's service sets it `false` (and the person becomes an ordinary world NPC,
  it does not vanish). `selectRoster` and roster-slot capacity logic key on THIS, never on `npcType`.
- `captivityState?: CaptivityState` (already an optional field on `NpcRuntimeState`, :805). A captive
  is any runtime NPC whose `captivityState.status === 'captive'`. This becomes the **single** home
  for captivity data; the `npcCaptivityStates` record is folded in and deleted.

A recruited person is `playerRosterMember:true` regardless of `npcType` — so a world NPC can be hired
and correctly counts as roster, and an NPC dismissed from service correctly stops counting while
keeping their `npcType`.

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
npcType: npcTypeSchema.default('roster'),          // content kind, mirrors the definition
playerRosterMember: z.boolean().default(true),     // runtime relationship: works for the player.
                                                   // default true = backward-compatible: today every
                                                   // runtime person is a player-roster member (they
                                                   // live in state.roster). Factory/migration/recruit
                                                   // set it explicitly; world/captive hydration = false.
// world-only ambient fields (null/absent for roster persons):
worldDisposition: worldNpcDispositionSchema.nullable().default(null),
lastContactDay: z.number().int().nonnegative().nullable().default(null),
locationOverride: z.string().nullable().default(null),
```

`selectRoster` = `npcRuntimeStates.filter(n => n.playerRosterMember)`. Roster-slot capacity
(`renownLevel.rosterSlots` vs. `state.roster.length`, recruitment.ts:139) must count
`playerRosterMember === true`, NOT the whole list — fix in the consumer-migration/rename phase.

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

## 9. Migration mechanics (REVISED 2026-07-04 after consumer analysis)

**Finding (verified):** there are ~406 non-test `.roster` accesses in `src/application/commands`
alone (139 `state.roster.find(n => n.npcId === X)`, 104 `state.roster.map(n => n.npcId === X ? … : n)`,
85 iteration/`.length`/`.filter`). Sampling confirmed:

- **find/map by `npcId` are rename-safe.** They target one person by id; having extra (world/captive)
  persons in the same list does not affect a roster operation aimed at a specific id. These need only
  the mechanical field rename — **no** semantic change.
- The real semantics live in the **iteration / `.length` / bulk-`.map` / `.filter`** sites: some mean
  "every person" (leave as the full list) and some mean "the player's team" (must filter
  `playerRosterMember`, e.g. `state.roster.length >= rosterCapacity`).

**Therefore the wholesale "migrate every consumer to `findNpc`/`updateNpc`" step (old C0) is dropped**
— it would be ~350 churn edits on rename-safe sites. Owner decision (2026-07-04): the leaner path.

Revised sequence (each step green):

1. **C1 (rama.7) — mechanical rename.** Rename the GameState field `roster` → `npcRuntimeStates`
   everywhere (compiler-driven: rename the field, fix every `state.roster` read/write the type checker
   flags — exhaustive and safe; it catches both missing reads and excess-key writes). Add
   save-migration v6→v7 step 1. Make `selectRoster`/`selectRosterNpcs` filter `playerRosterMember`.
   After C1 the field holds only roster persons still, so all iteration sites remain correct.
2. **C0′ (rama.6, repurposed) — targeted semantic audit.** Before world/captive persons join the list,
   audit the ~85 iteration/`.length`/bulk-`.map`/`.filter` sites and switch the "player's team" ones to
   `selectRosterNpcs` / a `playerRosterMember` filter. find/map-by-id sites are already correct from the
   rename and are left alone. This MUST complete before C2 folds non-roster persons in.
3. **C2/C3 — fold** world + captive persons into the list. Now the semantic audit pays off: iteration
   sites that must stay player-team already filter; sites that mean "everyone" now correctly see the
   whole population.

The `findNpc`/`updateNpc`/`selectAllNpcs`/`selectRosterNpcs` bridge helpers (rama.4) remain the
accessors D1/D2/D3 use for the intention/decay loops over the whole population; they are not forced
onto the ~350 rename-safe id-scoped sites.

## 10. Known adjacent finding (separate bead)

`npcs.json` contains 6 `npcType:"enemy"` entries **and** `enemy-npcs.json` is a separate enemy
catalog with its own schema. Potential source-of-truth drift for enemies. Not part of this epic —
file as its own bug bead and cross-link.
