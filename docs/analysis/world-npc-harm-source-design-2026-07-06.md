# World NPC Harm-Source Mechanic — Design Decision (destiny-s97u)

## Why this exists

`destiny-629x` scaffolded `health`/`injury`/`assignment:'recovering'` onto every `NpcRuntimeState`
(world and story persons included, once the unified-runtime migration folded them into the same
list as roster). The recovery *runtime* (`applyStateDecay.ts`, `recovery.ts`) already processes a
world NPC's `recovering` state exactly like a roster member's — confirmed via source read this
session, not assumed: `applyStateDecay.ts`'s Step 2b loop is unfiltered by `npcType` (only
`npcType:'enemy'` is excluded), so the fields are fully wired. But nothing anywhere ever *sets* a
world NPC's `injury` above its default of 0. This document is the design decision destiny-s97u
asks for: which system should own that, and with what frequency/severity.

## Decision: a new system, not an extension of `applyIncidentAgency.ts`

The ticket proposed two candidates. Investigated both via source read before deciding — per this
project's "hasst Annahmen" standard, not by assumption:

**Rejected: extend `applyIncidentAgency.ts`.** Read the full module plus its orchestrator
(`npcAgency/index.ts`). Both are explicitly, deliberately scoped to
`playerRosterMember && assignment === 'working'` — the orchestrator's own doc comment says so in
terms that were clearly the result of a prior audit: *"every sub-module here is player-house-
specific ... driven by the PLAYER's own operatives being sent to work a district job"*
(`destiny-rama.12` full-parity audit). World NPCs have no equivalent of "the player sent them to
work a job" — their ambient life runs entirely through the Intention System and
`applyWorldNpcSocialSimulation.ts`, a structurally different simulation. Widening
`applyIncidentAgency`'s filter to include world NPCs would require inventing a meaning for
"working" that doesn't fit how world NPCs are actually modeled, and would silently violate a
scope boundary another ticket already locked down on purpose.

**Rejected as insufficient alone: extend `npcConfrontRival`.** This intention (already
world-eligible, built this session's sibling work on the Intention System made this easy to
verify) only ever adjusts `fear`/`anger` on an authored rival relationship — never health/injury.
It is narrow by design (fires only for the handful of NPCs with an authored `rival` loyalty entry
in `npcs.json`) and tonally is a social confrontation, not a fight. Turning it into a health/injury
mechanic would be a scope change to a small, already-working, correctly-scoped feature, and would
still leave the vast majority of world NPCs (with no authored rival) completely uncovered.

**Decision: a new module**, `applyWorldNpcDangerExposure` (new file, e.g.
`src/application/commands/npcAgency/worldNpcDangerExposure.ts`), called from
`handleSocialSimulationPhase.ts` alongside the existing `applyWorldNpcSocialSimulation` call (the
phase that already owns ambient world-NPC life). Two independent trigger paths, both reusing
signals that already exist and are already visible to the player — no new schema, no new state:

### Path 1 — district danger exposure (ambient)

Every `npcType:'world'|'story'` person with `assignedDistrictId` set, `assignment === 'idle'`
(never double-hit someone already recovering/working/deployed), has a small daily chance of a
"close call" scaled by that district's current `districtTension` (`state.districtTension`,
0-100, already read/drained by `patrol-district` and raised by `applyIncidentAgency`/feud
escalation — an already-legible danger signal the player can see and act on, e.g. by patrolling).

- `chance = max(0, districtTension - 40) / 400` — zero below tension 40, rising to 15% at tension
  100. Deliberately gated to genuinely dangerous districts, not universal ambient risk.
- On a hit: `injury += roll(3..10)` — weighted to the low ("light injury", <15) end of the
  contract's bands (`docs/analysis/recovery-rest-injury-contract-2026-07-03.md`). A single hit
  essentially never crosses into `SERIOUS_INJURY_THRESHOLD` (30); it takes sustained exposure to a
  dangerous district over multiple days to escalate that far.
- Only transition to `assignment: 'recovering'` when accumulated injury actually crosses 30 (the
  contract's existing serious-injury threshold, `isSeriousInjury`/`SERIOUS_INJURY_THRESHOLD` from
  `recovery.ts` — reused, not reinvented).

### Path 2 — feud violence (targeted, narrative)

A world NPC with an active `feud-with:<npcId>` flag (already produced by
`applyWorldNpcSocialSimulation.ts`'s `maybeEscalateFeud`, which itself already requires a
`rivalry`/`grudge`/`territorial_conflict` soft bond to reach strength >= 70 before becoming a
`feud` — i.e. already a rare, hard-earned relationship state, not something to gate further) has
an independent flat 5%/day chance the feud flares into an actual physical altercation: both
parties take `injury += roll(10..20)` (deliberately higher than path 1's ambient hits — a targeted
personal conflict, not incidental danger), and their shared district's tension rises. This reuses
the flag system rather than inventing new relationship state.

## Frequency/severity summary (the ticket's acceptance criteria #2)

- Path 1 (ambient): capped at 15%/day, only above tension 40, 3-10 injury per hit — soft enough
  that a single bad district doesn't manufacture "recovering" NPCs overnight, but sustained danger
  genuinely accumulates. **Visibility: BACKGROUND** for routine hits below the serious-injury
  threshold (no log spam for every random citizen's scrape) — but the moment injury actually
  crosses `SERIOUS_INJURY_THRESHOLD` and the NPC enters `assignment:'recovering'` for the first
  time, this module logs it directly (MOMENT): `applyStateDecay.ts`'s Step 2b only logs *ongoing*
  recovery progress/completion for people already `recovering`, never the initial transition into
  that state, so that log line has to live here, not there.
- Path 2 (feud): flat 5%/day, only for NPCs already in an active feud (itself rare), 10-20 injury
  to both — a real, named event. **Visibility: MOMENT**, always logged, matching
  `maybeEscalateFeud`'s own existing precedent of always logging feud escalations.
- Both exclude `npcType:'enemy'` (no runtime agency, belongs to the combat system, matches every
  other agency module's exclusion) and anyone not `assignment === 'idle'`.

## Interaction checked and found safe

Does an injured-but-not-yet-`recovering` world NPC (injury 3-25, the common case) lose dialogue
reachability or otherwise break anything from this session's `destiny-gyvi`/`destiny-q80n.10`
work? No — `DistrictPoiScreen`'s "Speak with the contact" button gates only on `isHere` and
`poi.dialogueId`, never on `npc.assignment` or `states.injury`. Once injury crosses 30 and
`assignment` becomes `'recovering'`, `isNpcBlockedFromIntention` blocks that person from *any*
intention (including `travel-district` from this session's work) — so a recovering world NPC
correctly stops wandering and stays put at their home POI, which if anything is a narratively nice
side effect (the player can go visit them) rather than a conflict.

## Adjacent finding, not in scope here

While reading `applyWorldNpcSocialSimulation.ts` for the feud-flag mechanism, noticed its
pairing/bonding logic reads `NpcDefinition.districtId` (the static content field) rather than
`NpcRuntimeState.assignedDistrictId` (the runtime field `destiny-q80n.10`'s travel feature can now
move). A world NPC who has travelled to a new district would still be paired for bonds/feuds based
on their original home district in this module. This is the same class of "static field vs. runtime
location" gap already flagged as a known, accepted limitation for the ward-folk flavor list in
`docs/analysis/npc-cross-district-travel-design-2026-07-06.md` — not a blocker for this ticket
(travel-eligible NPCs are, by that same design's own rule, exactly the ones with no static POI
link, and bonding doesn't have the reachability consequence the POI link does), but worth a
follow-up ticket if travel-district sees real play. Filed separately below rather than expanding
this ticket's scope.

## Verification the implementation must satisfy

- `pnpm typecheck && pnpm test:run` green.
- Tests: path 1 never fires below tension 40; scales correctly at tension 100; never single-hit
  crosses into `recovering`; accumulates correctly across multiple days into `recovering` once
  injury >= 30. Path 2 only fires for NPCs with an active feud flag; injures both parties; raises
  shared district tension; always logs. Both exclude `npcType:'enemy'` and non-idle NPCs.
- No regression in `applyStateDecay.test.ts`'s existing recovering-world-NPC coverage (destiny-629x
  already tests the runtime side with a manually-constructed injured world NPC — this ticket makes
  the setup that test had to fake happen for real).
