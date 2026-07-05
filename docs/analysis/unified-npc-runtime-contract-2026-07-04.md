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
| `flags` | new `flags?: string[]` field on `NpcRuntimeState` | **grepped, actively read/written** by `selectors/mira.ts` (custody handler/guard tags), `applyWorldNpcSocialSimulation.ts` (patron-of/protecting/feud-with tags) and `rosterReducers.ts` — could not be dropped. Added as `.optional()` (no `.default()`), matching the `captivityState`/`pregnancyState` convention, specifically so existing fixtures/objects that never mention it stay schema-valid (a `.default([])` would have forced `flags: []` onto ~20 unrelated NpcRuntimeState literals across the codebase for no benefit). Readers use `npc.flags ?? []`. |
| `intimacyStage` | *(dropped, verified dead)* | grepped: never read anywhere except at construction (always defaulted to `'none'`, never queried) — real intimacy already lives on `state.relationships` (pair-keyed) for every population. Confirmed no data loss. |
| `pregnancyState` | `pregnancyState` | already on runtime state (:806); **note the nullability differs** — the old field was `.nullable()`, the new one is `.optional()` (no `null`). Migration code must omit the key entirely for an absent pregnancy, not pass `null`. |
| `health` | `states.health` | |
| `injury` | `states.injury` | |
| `recovering` | `assignment:'recovering'` | **decided**: folding the separate world-recovery loop (Step 2b' in `applyStateDecay.ts`) into the existing roster recovery loop (Step 2b), since both now key off the same `assignment === 'recovering'` gate on the same unified list — keeping them as two separate loops would double-process any world person with that assignment (double health gain per day). |
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

**Implemented (destiny-rama.9):** `captivityRegistry.ts`'s three functions
(`getNpcCaptivityState`/`getAllNpcCaptivityStates`/`setNpcCaptivityState`) already merged registry +
runtime reads before this ticket (the registry was always a *fallback* for persons without a runtime
entry) — they were simplified to read/write `npcRuntimeStates` exclusively.
`setNpcCaptivityState(state, npcId, captivityState)` now hydrates a brand-new runtime entry via
`createRuntimeStateFromDefinition` (npcType from definition, `playerRosterMember:false`) when the
target has no existing entry, instead of silently falling back to the (now-deleted) registry — this
is the exact scenario the registry existed to handle, so it had to move into the live function, not
just the one-time migration. Mira is hydrated into `data/runtime/initial-game-state.json` directly
(npcType `'story'`, `playerRosterMember:false`, `captivityState.status:'captive'`).

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

**Implemented (destiny-rama.10):** `processAllowlistedNpcIntentions` (intentions.ts) already iterated
`state.npcRuntimeStates` — the C1 rename made that automatic — but only ever checked
`WIRED_INTENTION_TYPES`; `intentionTypesForNpc` (built in rama.5) was never actually called at the
generation site, so npcType-based eligibility was inert. Fixed by intersecting both gates:
`WIRED_INTENTION_TYPES.has(type) && intentionTypesForNpc(npc).has(type)`. Also found (and left alone,
out of scope): `processNpcIntentions` — an older, unwired sibling of `processAllowlistedNpcIntentions`
that is not called from anywhere in production (only its own tests), i.e. genuinely dead code;
candidate for a future cleanup bead, not touched here.
The exact per-type sets are enumerated in the eligibility ticket; this table is the intent.

**Implemented (destiny-rama.11):** `executeAllowlistedNpcIntentions` already iterated the unified
list (same C1-rename effect as generation). The real work was auditing every handler's own
actor/target resolution in `npcSurvivalActions.ts`/`npcAggressionActions.ts`/`npcSpecialActions.ts`/
`npcLeadershipActions.ts`/`npcIntellectActions.ts`/`npcNpcRomance.ts` for population-agnostic
correctness (self-scoped and id-by-content-data lookups were already fine; population-scan target
selection needed per-function judgment):
- `npcSpyOn` (spy-on) — target selection is now deliberately population-agnostic (per this doc's own
  §6 note that "roster-coupled intrigue" mechanics needed D2 to generalize their target selection
  before they could ever be widened to world eligibility), but excludes captives/wards.
- `npcSocialize`/`npcGossip` — already population-agnostic by design (destiny-rama.8/9), but were
  missing a captive/ward exclusion entirely; a roster or world NPC's daily socializing could target
  captive Mira. Fixed.
- `npcMediateConflict` — refined from "always roster-only" (destiny-rama.8's regression fix) to
  "same population bucket as the acting NPC" — necessary because `mediate-conflict` **is**
  `WORLD_ELIGIBLE`, so a World NPC can already be assigned it as their own intention; without this
  refinement a World mediator would search the roster pool and almost always find no eligible pair.
- `npcAssertDominance`/`npcCareForInjured`/`npcHostGathering` — left as `playerRosterMember`-only
  (destiny-rama.8/9's fix already correct here): none of `assert-dominance`/`care-for-injured`/
  `host-gathering` are in `WORLD_ELIGIBLE_INTENTION_TYPES`, so their actor can only ever be roster
  today; no change needed.
- `npcGatherLeverage`/`npcInterceptCommunication` — target resolution is driven by
  `state.privateCorrespondence` message participants, not an `npcRuntimeStates` population scan; no
  fix needed (out of this bug class entirely).

**Implemented (destiny-rama.12 — full needs-decay parity):** `applyStateDecay.ts`'s Step 1
(hunger/fatigue/stress/morale/anger/hygiene/intoxication) already ran unconditionally over the
whole `npcRuntimeStates` list — the fold itself already delivered "full parity" for world/story
persons with zero extra code. The only gap: `npcType:'enemy'` persons were getting this decay too
(no runtime agency, belongs to the combat system) — both Step 1 and Step 2b (recovering-NPC health
regen) now skip them explicitly. Captives are deliberately NOT excluded — they still accumulate
survival needs like anyone else, layered with (not replacing) their separate custody-state handling
in the dedicated custody commands.

`src/application/commands/npcAgency/*` (the district-work side-effect modules: bond/contact/
faction/incident/initiative/movement/rumor/spending agency) all key off `assignment==='working'`,
which is currently reachable only by roster members in practice (the work-assignment UI
(`setNpcAssignment`) is only ever dispatched from `RosterScreen`/`NpcDetailPanel`, both scoped to
`selectRosterEntries`). Made this explicit with a `playerRosterMember` filter in all 8 modules
(previously implicit/coincidental) since several have real player-house economic effects (spending
deducts house money, initiative-agency's `resource_move` adds house money) that must never apply to
a non-roster person. Also found and fixed two "pick a random OTHER npc" target selections
(`bondAgency.ts`'s loyalty-building partner, `initiativeAgency.ts`'s `npc_approach` action) that had
**no population filter at all** — a working roster NPC could randomly "grow closer" (gain loyalty)
with captive Mira or an enemy-typed guard. Both now exclude captives/wards (bondAgency additionally
requires `playerRosterMember`, matching its "fellow roster members" doc comment; initiativeAgency's
own population is already roster-gated at the `arc-initiator` filter).

## 7. Save migration v6 → v7 (`localSaveSnapshot.ts`)

Current `saveVersion` default is 6 (contracts.ts:521). Add a v6→v7 step that:

1. renames `roster` → `npcRuntimeStates` (stamp `npcType:'roster'` on each existing entry),
2. hydrates each `worldNpcStates` entry into an `npcRuntimeStates` entry via the factory + §4.1 map,
   then removes `worldNpcStates`,
3. folds each `npcCaptivityStates[id]` into the matching entry's `captivityState` per §4.2 (hydrate
   from definition if the person isn't already present), then removes `npcCaptivityStates`,
4. sets `saveVersion:7`, validates with `gameStateSchema` before returning.

**Implementation note (destiny-rama.8, revises this section after landing):**
- Step 2 does **not** stamp `npcType:'world'` — it lets the factory derive `npcType` from each
  person's own definition, same as every other hydration path. Verified against real data: of the 3
  shipped `worldNpcStates` entries, only `npc-dalen-morke` is `npcType:'story'`; the other two
  (`npc-enemy-tomas-rell`, `npc-enemy-catrin-hale`) are `npcType:'enemy'` by definition despite
  having lived in `worldNpcStates` (the §10 / destiny-rama.14 source-of-truth drift). Blanket-stamping
  `'world'` would have planted a wrong fact into the schema instead of carrying the pre-existing drift
  forward untouched for rama.14 to fix at its source.
- Each migration step's guard is **array/key presence**, not `saveVersion` equality. A save can
  already be stamped `saveVersion:7` by an earlier step's migration alone (e.g. after destiny-rama.7
  landed but before destiny-rama.8's code existed, a save could be v7 with `roster` already renamed
  yet `worldNpcStates`/`npcCaptivityStates` still present) — version number alone can't disambiguate
  "fully migrated" from "partially migrated," so each step must independently detect and fold its own
  legacy field whenever it's present, regardless of the stamped version.
- Recruiting a person who already has a non-roster runtime entry (`playerRosterMember:false`) is not
  yet supported — `recruitNpc`'s `alreadyOnRoster` guard rejects any npcId with an existing runtime
  entry instead of upserting `playerRosterMember` on it. Currently unreachable in practice
  (`generateHireOffers` only generates offers for `npcType:'roster'` definitions), so no regression
  today, but any future path that offers a hire on a `npcType:'world'` definition needs this fixed
  first — filed as a follow-up bead (destiny-rama.17) rather than solved inline, since it's a
  recruitment-semantics change, not a storage fold.

`data/runtime/initial-game-state.json` is updated by hand to the v7 shape (single list) as part of
the schema ticket. Also decide there whether to hydrate the 12 world definitions that currently have
**no** runtime entry (only `npc-dalen-morke`, `npc-enemy-tomas-rell`, `npc-enemy-catrin-hale` exist
today) — recommended: hydrate all ambient world defs so districts actually have people. (Still open —
tracked as destiny-rama.13 / E1, explicitly out of destiny-rama.8's scope.)

**Implementation note (destiny-rama.13):**
- Re-verified rather than trusted the "12 missing" figure above: by the time this ticket ran, **zero**
  of the 15 `npcType:'world'` definitions had a runtime entry (the 3 pre-existing hand-authored
  entries turned out to be `story`/`enemy`, not `world` — same drift already called out in the
  destiny-rama.8 note above). All 15 world defs were hydrated, not 12.
- Each hydrated entry sets `assignedDistrictId` explicitly to the definition's `districtId` (not left
  at the factory's `null` default). This is load-bearing, not cosmetic: `npcDistance.ts` falls back to
  the definition's `districtId` when `assignedDistrictId` is null, but several district-scoped
  intention handlers do **not** — `npcLeadershipActions.ts` (mediate-conflict/consolidate-power),
  `npcIntellectActions.ts` (people-watch, scout-ahead), `npcSurvivalActions.ts`, `npcSpecialActions.ts`,
  and `applyMoneyEarningIntentions.ts` all early-return or degrade silently when
  `npc.assignedDistrictId` is null. Leaving it unset would have hydrated 15 people who could still
  never act on any district-scoped intention — defeating the point of the ticket.
- **Display population (`selectWorldNpcViewsByDistrict`) was never actually empty before this
  ticket** — that selector iterates `contentCatalog.npcs` filtered by `npcType`, resolving location
  from `def.schedule` with `locationOverride` as a runtime override, entirely independent of whether
  a runtime entry exists. The real gap closed here is **agency**: only `npcRuntimeStates` entries can
  hold `currentIntention` or be selected by the intention/agency pipelines (`intentions.ts`,
  `npcAgency/*`), which iterate `state.npcRuntimeStates` exclusively and never
  `contentCatalog.npcs`. Before this ticket, all 15 ambient world people were decorative (visible on
  district maps, could form soft-bonds with each other via `applyWorldNpcSocialSimulation`'s
  definition-driven sweep) but had zero capacity for intentions, captivity, or agency-driven ambient
  behavior. The ticket's literal "district population > 3" acceptance criterion doesn't hold verbatim
  for every district (`district-the-pale` reaches exactly 3 ambient world residents, `district-harbor`
  and `district-the-hollows` reach 2) — the regression test in `initialGameState.test.ts` instead
  asserts the metric that's actually true and meaningful: every district with an ambient world def now
  has ≥2 runtime-hydrated (intention-eligible) residents, up from 0.
- **Regression discovered and fixed as a direct consequence of this hydration**:
  `npcAggressionActions.test.ts`'s local `addRosterEntry` test helper unconditionally appended a
  synthetic roster clone under a hardcoded npcId (`'npc-alis-vey'`) without checking for a
  pre-existing entry. Since `npc-alis-vey` is one of the 15 now-hydrated ambient defs, this produced
  **two** `npcRuntimeStates` entries sharing one npcId in three existing tests — `find()`-based
  lookups then silently resolved to the wrong (pre-existing world) entry instead of the test's
  intended synthetic roster clone, breaking one assertion (`raises the actor's own fear on failure`)
  outright and leaving the other two passing only by accident (they didn't happen to assert on the
  colliding entry's own state). Fixed by making the helper filter out any existing entry for that
  npcId before appending — this is the exact "duplicate npcId in the unified list" bug class that
  destiny-rama.17 already tracks for the real recruitment flow, just surfacing here in a test fixture
  first. Any other test file building ad-hoc `npcRuntimeStates` entries under a hardcoded id should be
  checked against the content catalog before reusing an id casually — it may now collide with a real,
  already-hydrated ambient definition.
- No new NPC definitions were authored (non-goal honored). No captivity/story/enemy defs were
  touched — only the 15 `npcType:'world'` entries.

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

**Post-rama.8 correction to this plan:** the rama.6 audit scoped its ~85-site sweep to
`src/application/commands/`. Landing the actual fold (rama.8) surfaced a second, disjoint category of
"player's team" sites the audit's scope didn't cover: **selectors** (`selectors/roster.ts`'s
`selectRosterEntries`, `selectors/dashboard.ts`, `selectors/ledger.ts`, `selectors/bondMarket.ts`,
`selectors/house.ts`) and **UI components reading `npcRuntimeStates` directly, bypassing selectors**
(`InvestigationScreen.tsx`, `ExpeditionPrepScreen.tsx`, `ShopsScreen.tsx`, `HouseScreen.tsx`). None of
these were reachable by the command-layer grep, and several had no existing test to catch the
regression at all (found by manual sweep, not a failing test, after the fold made the bug live) —
e.g. the roster wage bill and dashboard roster count would have silently included Mira's custody
handler/guards once the fold landed. **destiny-rama.9 (the captivity fold) must repeat this sweep**
against `src/application/selectors/` and `src/ui/` in addition to `src/application/commands/`, not
assume rama.6's original file list was exhaustive.

**Post-rama.9 addendum:** the repeated sweep found the same class of gap *again*, in a third
category the previous sweeps didn't cover: "pick one candidate from the whole population"
target-selection idioms inside individual command functions (`npcMediateConflict`,
`npcAssertDominance`, `npcCareForInjured` in `npcAggressionActions.ts`/`npcLeadershipActions.ts`,
`npcHostGathering` in `npcSpecialActions.ts`) whose own doc comments already said "roster NPC" but
whose `.filter(...).sort(...)[0]` target logic had no `playerRosterMember` check — each was dormant
until the fold actually landed (previously `npcRuntimeStates` held only roster persons, so the
missing filter was unreachable). Separately, `intentions.ts`'s 6 romance/social handlers
(flirt-with, court-romantically, visit-lover, spend-time-with, seek-intimacy, flirt-aggressively)
selected a target via a bare `assignment === 'idle'` check — captives (e.g. Mira, whose hydrated
entry defaults to idle) and wards were never excluded as targets, only as actors. Fixed by reusing
`isNpcBlockedFromIntention` on the candidate, not by adding `playerRosterMember` — those handlers
correctly stay whole-population by design (world NPCs are valid romance targets per the epic's full
social parity goal); only captivity/ward/directive exclusion was missing. **Any future ticket
touching a "find the best/worst/nearest NPC" pattern must check target eligibility explicitly — a
doc comment saying "roster" or "idle" is not evidence the code actually enforces it once the
population is shared.**

## 10. Known adjacent finding (separate bead)

`npcs.json` contains 6 `npcType:"enemy"` entries **and** `enemy-npcs.json` is a separate enemy
catalog with its own schema. Potential source-of-truth drift for enemies. Not part of this epic —
file as its own bug bead and cross-link.

**Resolved (destiny-rama.14):** decided in favor of full unification rather than "document and
leave separate," for two reasons found during analysis — not just theoretical drift risk:

1. **A genuine duplicate existed, not just a schema split.** `npc-enemy-tomas-rell` had two
   independent records — one in each file — with identical stats/traits (clearly hand-kept in sync)
   but diverging fields (the `npcs.json` copy had `startingEquipment`/`loyalties`, the
   `enemy-npcs.json` copy had `encounterRole`/`recruitableOnDefeat`/etc.). Nothing enforced that sync;
   it was luck, not structure.
2. **A live, reachable bug, not a dormant one.** `combat.ts`'s post-victory "recruitable defeated
   enemy" logic drew from `contentCatalog.enemyNpcs` (17 entries, 13 `recruitableOnDefeat:true`) to
   generate a real `availableForHire` offer. But `recruitNpc` (`recruitment.ts`) only ever resolved
   `contentCatalog.npcsById` — never `enemyNpcsById` — so accepting that offer silently no-opped
   (`npcDef` undefined → early return) for every one of those 13 *except* Tomas Rell, the one
   accidental overlap. There was zero test coverage of this path, so the bug shipped invisibly.
   Fixed by adding a `combat.test.ts` regression test and a `recruitment.test.ts` regression test
   (`recruitNpc` now completes for `npc-enemy-rack`, previously enemy-catalog-only).

**Mechanics of the merge:**
- `npcDefinitionSchema` gained the 8 combat-only fields from the deleted `enemyNpcDefinitionSchema`
  (`isRecurring`, `organizationId`, `encounterRole`, `recruitableOnDefeat`, `recruitCondition`,
  `loyaltyOnRecruit`, `lore`, `creatureType`), all optional/defaulted so every existing non-enemy def
  is unaffected.
- All 17 `enemy-npcs.json` entries were merged into `npcs.json` with `npcType:'enemy'`. The 16 that
  had no prior `npcs.json` record became new entries; `npc-enemy-tomas-rell` had the 8 combat fields
  merged into his existing, richer `npcs.json` record (kept his `startingEquipment`/`loyalties`).
- `enemy-npcs.json` deleted. `enemyNpcDefinitionSchema`/`EnemyNpcDefinition` removed from
  `contracts.ts`. `contentCatalog.enemyNpcs`/`enemyNpcsById` removed.
- 4 consumers previously falling back to `enemyNpcsById` (`roster.ts`'s `selectRosterEntries`,
  `mira.ts`'s `resolveNpcName`, `recruitment.ts`'s `selectAvailableForHire`,
  `combat.ts`'s recruitable-defeated-enemy filter) simplified to a single `npcsById` lookup — the
  fallback is now genuinely dead code, not just redundant. Two UI files
  (`ExpeditionPrepScreen.tsx`, `ExpeditionTravelScreen.tsx`) had the same fallback pattern for
  displaying squad-member names and were simplified the same way.
- One pre-existing hand-built test fixture (`matchQuirkToContext.test.ts`'s `baseNpc`, typed directly
  as `NpcDefinition` rather than built via `.parse()`) needed the 3 new required-with-default fields
  (`isRecurring`, `recruitableOnDefeat`, `creatureType`) added — TypeScript's inferred output type for
  Zod `.default()` fields is non-optional, so any hand-built literal of the full type (not run through
  `.parse()`) breaks the same way on any future schema-default addition. Not fixed here (out of
  scope): `compatibility.test.ts`'s `makeNpcDef` already casts `as NpcDefinition` around a
  significantly stale, mismatched shape (`strength`/`intelligence` attributes, `status: 'available'`)
  that predates this ticket and was unaffected by it either way.

## 11. E2E verification results (destiny-rama.15)

Full gate at the time of this ticket: `pnpm typecheck` clean, `pnpm test:run` 255 files / 2785 tests
green, `pnpm test:playthrough:golden` + `:all` green (98 tests), `pnpm lint` shows only the 6
pre-existing, unrelated errors tracked separately (destiny-67gq).

**Combined v6→v7 migration fixture (new):** `localSaveSnapshot.test.ts` gained one test exercising
the full `migrateState` chain against a single raw save carrying all three legacy shapes at once
(`roster` field, `worldNpcStates` array, `npcCaptivityStates` record) — the prior tests each covered
one fold in isolation. Confirms: clean upgrade to `saveVersion:7`, no legacy keys survive, no
duplicate ids, no data loss on Marion's stats, Dalen's npcType correctly derived from his own
definition (not hardcoded), Mira's captivityState carried over intact, and — the actual point of this
epic — **a captive's `currentIntention` is `null` straight out of migration**, before any command
even runs.

**Playwright manual verification (fresh save, no prior localStorage):** created a new game and
advanced ~7 in-game days via repeated "End Day". Findings:
- World/story/enemy persons visibly generate and execute intentions daily: self-care/self-improvement
  (`"Caevis Sable-Cairn meditates to clear their mind."`, `"Osanna Cray finds what shelter they can."`),
  skill practice (`"Alis Vey practices melee on their own."`), and — notably — **enemy-npcType**
  persons doing social observation (`"Tomas Rell noted Brannic Thule's reliability without saying
  so."`, `"Catrin Hale noted Cessa Rill's reliability without saying so."`), plus
  `applyWorldNpcSocialSimulation`'s ambient bond formation across the newly-hydrated ambient
  population (`"X and Y are openly tied now"`, district whispers). This is live, end-to-end
  confirmation that D1/D2/D3 (rama.10/11/12) work for the full population, not just roster.
- Mira (captive) never appeared in the activity log across the whole run and her
  `currentIntention` stayed `null` at every check — confirmed directly from the persisted
  `GameState` in `localStorage`, not just inferred from log absence.

**Bug found and fixed during this verification (not present in any existing test):**
`applyNakednessConsequences` (`src/application/commands/clothing/applyNakednessConsequences.ts`)
iterated the full `npcRuntimeStates` list with **no filter at all** — the exact "population-scan
lacks the correct filter" class documented repeatedly in §9. Before the unified list this loop only
ever saw roster members (clothing is a player-managed equipment concern); once world/story/enemy/
captive persons joined the same array, it fired every day for anyone hydrated with no clothing, which
several ambient world defs and Mira are (her nakedness is an authored captivity detail, not a bug in
her definition). Live symptom: `"Mira was seen naked in public."` / `"...Morale -20, stress +15."`
plus the same for Dalen Morke, Tomas Rell, and Catrin Hale, verbatim every single day, permanently
tanking their morale/stress with zero way to stop it and firing a `npc-naked-public` world event for
someone the player has no way to observe. Doubly wrong for a captive specifically: `isInPublic` keys
off `roomAssignment === null`, but a captive's confinement is tracked via `captivityState.siteId`/
`roomId`, not `roomAssignment` — so `roomAssignment === null` incorrectly reads as "out in the city"
for someone who is, definitionally, not free to be seen anywhere. Fixed by scoping the loop to
`playerRosterMember` (matching the established "player-house economics stays roster-only" pattern
used elsewhere in this epic — `npcAgency/*`, wage payments) and additionally excluding captive/ward
status even for a `playerRosterMember` who gets captured. Added 2 regression tests; no prior test
existed covering a non-roster or captive person in this mechanic at all, so the bug had zero coverage
until this manual E2E pass surfaced it.
