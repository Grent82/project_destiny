# NPC Cross-District Travel — Design (destiny-q80n.10)

## Why this exists

`NpcRuntimeState.assignedDistrictId` exists and is read by several intention handlers
(`npcPatrolDistrict`, the `selectWorldNpcViewsByDistrict`/`selectWorldNpcsByDistrictAndSlot`
selectors, `intentionTypesForNpc`'s district-scoped types) — but **no code path anywhere
writes a new value to it**. World/story NPCs are hydrated once with a home district and stay
there for the life of the save. This was flagged during the Mira questline work as something
NPCs "should" be able to do, and confirmed via source read (not assumption) to be genuinely
half-built rather than a misunderstanding of an existing feature.

This document is the design output of destiny-q80n.10. It does not change any code — it
specifies exactly what the follow-up implementation tickets (filed alongside this doc) must do,
and — more importantly — documents a real interaction hazard with existing content that any
implementation must account for.

## Existing building blocks (confirmed via source, not assumed)

- `NpcIntention.targetId: string` + `targetType: NpcIntentionTargetTypeSchema` already supports
  `'district'` as a target type (`src/domain/npc/contracts.ts:374-393`). No new intention schema
  fields are needed — a travel intention can carry its destination in the existing `targetId`.
- `DistrictDefinition.adjacentDistrictIds: string[]` already exists and is populated for every
  district (`src/domain/districts/contracts.ts:37`, confirmed non-empty via
  `district-the-pale`/`district-the-mireward` lookups this session). This is the natural,
  already-authored adjacency graph — no new static data needs to be invented.
- `DistrictDefinition.accessRestricted: boolean` and `minControlFactionStanding: number | null`
  already gate player travel in `src/application/commands/districtTravel.ts:19-28`. An NPC-travel
  implementation must respect at least `accessRestricted` (see "Access gating" below).
- The `WIRED_INTENTION_TYPES` / `WORLD_ELIGIBLE_INTENTION_TYPES` / handler-registration pattern is
  mature and self-documenting — `src/application/commands/intentions.ts:393-489`'s comment block
  is effectively a checklist left by prior tickets (destiny-kuw0, destiny-rjwy, destiny-nid0,
  destiny-bkln) for exactly this kind of addition.

## The one hard blocker: static POI links go stale on relocation

**This is the finding that makes "just add a handler" insufficient, and the reason this ticket
was correctly scoped as design-only rather than bundled into content work.**

destiny-gyvi (closed earlier this session) fixed 12 world/story NPCs whose dialogue was
unreachable by linking them to a specific POI via `pois.json`'s `npcId` field — e.g.
`poi-hollows-the-sink.npcId = "npc-cutter"`. This link is **static content data**, resolved once
at `contentCatalog` load time (`src/application/content/contentCatalog.ts`). The entire
"Speak with the contact" flow (`src/ui/screens/DistrictPoiScreen.tsx:180-207`,
`src/application/selectors/districts.ts:74`) depends on the POI's district matching where the
player can actually find that NPC.

If `npc-cutter` becomes eligible for a `travel-district` intention and relocates to a different
district, `poi-hollows-the-sink.npcId` still says he's in The Hollows — his dialogue becomes
silently unreachable again, exactly the bug destiny-gyvi just fixed, except now happening
dynamically at runtime instead of from an authoring mistake. Nothing in the current selector
layer cross-checks `npc.assignedDistrictId` against the POI's own `districtId` before offering
the "Speak with the contact" button.

Two ways to resolve this were considered:

1. **Make POI occupancy dynamic** — have `selectDistrictPOIs` verify
   `npc.assignedDistrictId === poi.districtId` at read time before exposing `dialogueId`, and add
   a way to find a wandered-off NPC elsewhere (e.g. surface them in the destination district's
   ward-folk list with a talk affordance). This is the "complete" fix but is a real UI/selector
   feature in its own right — reachability would need a general per-district "who's actually here
   right now" resolution, not just a POI-keyed lookup. Sizeable, and not what this ticket's
   Non-Goals promised.
2. **Scope eligibility so it can't happen** — a world NPC is only eligible for `travel-district`
   if they have no static `poi.npcId` link (i.e., they are a "pure ambient" citizen with no
   authored quest-giver/dialogue role tying them to a specific spot). Named informants (the 12
   just fixed, Old Maret, Garet Doyle, Sister Vael, etc.) stay put; anonymous ambient population
   can wander.

**Decision: option 2 for the first implementation.** It is the minimal change that delivers the
feature ("NPCs should be able to move between districts") without reopening or compounding
destiny-gyvi's fix, and it matches this project's stated preference for small, safe increments
over one large change. Option 1 remains available as a later enhancement once there's an actual
need for a *named* NPC to relocate (e.g. a quest that has an informant flee to a different
district) — at that point it should be a scripted `locationOverride`/`assignedDistrictId` write
from the quest command itself, not the ambient intention system, so it doesn't need the general
selector rework either.

## Proposed intention: `travel-district`

### Schema

Add `'travel-district'` to `npcIntentionTypeSchema` (`src/domain/shared/contracts.ts:5-60`).

### Eligibility (`src/application/commands/intentions/eligibility.ts`)

Add to `WORLD_ELIGIBLE_INTENTION_TYPES`. **Not** roster-eligible — roster NPC "movement" is
already player-directed (deployment/assignment), and the wandering behavior this ticket targets
is specifically about ambient population life, matching the existing rationale block's framing
of what world/story NPCs are for.

Additionally, `intentionTypesForNpc` (or the pipeline candidate generator — see below) must
exclude any world NPC where `contentCatalog.pois.some(p => p.npcId === npc.npcId)` is true, per
the blocker above. This check belongs in the generation pipeline (stage below), not in the
static eligibility set, since eligibility is meant to answer "what is this person by kind/status"
— the POI-link check is content-shape-dependent per individual NPC, not per npcType.

### Wiring (`src/application/commands/intentions.ts`)

Add to `WIRED_INTENTION_TYPES`.

### Generation — when does an NPC want to travel

In `getPersonalityDrivenIntentions` (`src/application/commands/intentions/pipeline.ts`), add a
trait-driven trigger consistent with the existing pattern (e.g. `curiosity >= 65` → wanderlust).
Keep the base weight low relative to survival/social types — this should be a rare event, not a
constant churn. Candidate generation must additionally:

- Confirm `npc.assignedDistrictId` is set (nothing to travel from otherwise).
- Confirm the NPC has no static `poi.npcId` link (the blocker above).
- Confirm at least one adjacent district is a legal destination (see Access gating) — if none
  qualify, do not offer the type at all rather than silently falling back to something wrong.

Consider a cooldown so the same NPC doesn't hop every cycle — e.g. gate on
`npc.lastContactDay` distance or a new lightweight flag in `npc.flags` (`'traveled-day:N'`),
following the existing free-form-tag convention already used for ambient state
(`docs/analysis/unified-npc-runtime-contract-2026-07-04.md` on `flags`).

### Target selection (the actual new logic — not just data)

`calculateNpcIntention` (`src/application/commands/intentions.ts:308-341`) currently hardcodes
**every** intention's `targetId` to `state.currentDistrictId` (the player's own location) —
confirmed via source read, this is a single generic assignment applied regardless of type, not
something meaningful per-type today. `travel-district` needs a real branch here: compute
`targetId` as a seeded-RNG pick from
`contentCatalog.districtsById.get(npc.assignedDistrictId)?.adjacentDistrictIds`, filtered per
Access gating below. This is the one part of the design that is unambiguously new code, not
content authoring.

### Access gating

Exclude any candidate destination where `district.accessRestricted === true`. Do **not** attempt
to apply `minControlFactionStanding` — that field is compared against `state.factionStandings`,
which is the *player's* reputation, not a concept that exists for an individual world NPC; it is
not meaningfully applicable here and inventing an NPC-level standing concept to satisfy it would
be over-scoping a first implementation.

### Confidence & urgency

`calculateIntentionConfidence`: base on `perception` (knowing safe routes) and `curiosity`,
matching the existing formula shapes for other district-scoped types (`patrol-district`'s
formula is the closest analog).

`calculateUrgencyDays`: moderate, e.g. 5-6 days — this is not time-critical the way `eat-meal` is.

### Execution — the actual relocation

New function, e.g. `npcTravelDistrict(state, npcId, rng)`, colocated with `npcPatrolDistrict` in
`src/application/commands/npcAggressionActions.ts` (same file, same "district-scoped ambient
action" family) or a new sibling file if that file is getting large:

1. Look up the NPC; no-op if missing or `!assignedDistrictId`.
2. **Re-validate** the destination at execution time (not just at intention-creation time) — the
   world may have changed between the two (a district could have flipped to
   `accessRestricted` in the interim). Defense-in-depth, matching this codebase's existing
   pattern of double-checking guards at both generation and execution sites.
3. Write the new `assignedDistrictId` immutably:
   `npcRuntimeStates: state.npcRuntimeStates.map(n => n.npcId === npcId ? { ...n, assignedDistrictId: destinationId } : n)`.
4. Append an activity-log entry (`'system'` category) naming both districts — this is the *only*
   player-visible signal that an ambient NPC has moved, since there is no other notification
   mechanism; without it a careful player would just see someone quietly vanish from one
   district's ward-folk list and reappear in another's with no explanation.
5. Register `travelDistrictHandler` (`canExecute`/`execute`) in the `INTENTION_HANDLERS` dispatch
   map (`src/application/commands/intentions.ts:1435` area), following the exact
   `patrolDistrictHandler` shape immediately above it.

## Interactions checked and found safe (no action needed)

- `npcConfrontRival` (`src/application/commands/npcAggressionActions.ts`) resolves a rival by
  `npcId` against `state.npcRuntimeStates` with no district co-location check today — a rival
  relocating away doesn't newly break anything that wasn't already cross-district-agnostic.
- `selectWorldNpcViewsByDistrict`'s schedule-based placement (`src/application/selectors/worldNpcs.ts`)
  already reads `runtime?.locationOverride ?? def.schedule[slot] ?? null` and independently
  resolves `poi.districtId` — a relocated NPC without a `schedule` (the pure-ambient population
  this design targets) simply won't be placed on any POI marker in their old district anymore and
  will show up correctly in their new one via `selectWorldNpcsByDistrictAndSlot`'s district filter,
  since that filter matches on the NPC definition's `districtId`... **except `districtId` is a
  static content field too, not runtime state.** This selector was not designed to reflect
  `assignedDistrictId` at all — it filters on `npc.districtId` (content) directly. This is a
  second, smaller instance of the same "static field vs. runtime location" gap, but for the
  *content-authoring* district rather than the POI link, and it only affects the ambient
  "ward-folk" flavor list (no dialogue/interaction consequence, unlike the POI blocker above). Not
  a blocker for a first implementation given the eligibility restriction above (only pure-ambient
  NPCs with no dialogue travel, so nothing is actually lost — they just won't show up in the
  ward-folk flavor text of their new district, only their old one). Worth a one-line follow-up
  note in the implementation ticket, not a redesign.

## Scope confirmation (restating the epic's own Non-Goal)

None of the 8 Mira questline NPCs are affected either way by this feature: they are `npcType`
`story`/`enemy` and either scripted (Mira, Orren Wex, the enemy leaders) or already excluded from
`travel-district` eligibility by the POI-link rule above (Cessa Rill, Dael Morw, Sanna Veld,
Brand — all fixed with static POI links this session, all therefore ineligible to wander). This
confirms the epic's original Non-Goals section was correct without needing to re-verify it after
the fact.

## Verification the implementation ticket(s) must satisfy

- `pnpm typecheck && pnpm test:run` green.
- A new test confirming `npcTravelDistrict` only ever writes an `assignedDistrictId` that was in
  the source district's `adjacentDistrictIds` and is not `accessRestricted`.
- A new test confirming a world NPC with a `poi.npcId` link is never selected as a `travel-district`
  candidate by the generation pipeline (regression guard for the blocker this doc identifies).
- Confirm no existing test hardcodes a specific ambient NPC's district as immutable in a way that
  would spuriously fail once travel is live (the ambient-population-per-district minimum test in
  `src/application/store/initialGameState.test.ts`, hit this session for an unrelated data change,
  is the kind of test to check here — a *travel* event is transient/probabilistic at runtime, not
  a change to the initial snapshot, so it should not conflict, but confirm before shipping).
