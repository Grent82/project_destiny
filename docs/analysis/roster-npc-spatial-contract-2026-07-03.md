# Roster NPC Spatial Contract

Date: 2026-07-03
Bead: `destiny-9l6q`
Epic: `destiny-6tzh`

## Purpose

Define one coherent contract for where a roster NPC lives, works, currently is, and how that
differs from captivity. This exists so `destiny-4vt0`, `destiny-co2w`, `destiny-q5ra`, and
`destiny-vsgm` can implement without re-deriving semantics or guessing at edge cases.

This is a simulation-contract decision, not a UI-copy decision. It defines the presence
primitives; `destiny-co2w` decides how those primitives are surfaced as player-facing
reachability rules and copy.

## Current problem summary

`roomAssignment` is read as four different things depending on which file is asking:

- lodging/residence proof (`hasResidentQuarters`, `applyStateDecay.ts`, `recovery.ts`)
- same-room "encounter" proxy for NPC-NPC intimacy (`applyHouseholdIntimacy.ts`,
  `applyArousalMechanics.ts`)
- in-house duty-post proof (`foodFlow.ts`, `bondMarket.ts` kitchen checks)
- public/private proxy (`applyNakednessConsequences.ts`: `roomAssignment === null` means "in public")

Meanwhile `assignment` + `assignedDistrictId` answer duty/absence at the district level, and
`captivityState.siteId/roomId` (ADR 0002) answers a richer, place-aware model for captives only.
Nothing today unifies these into one answer for "is this NPC here right now."

The result: household intimacy can progress between two NPCs who happen to share a room id even
if one of them is deployed; recovery and duty logic both quietly depend on the same field meaning
different things; and the recent NPC-panel fix (`destiny-rdve`) had to hand-roll district/house
reachability logic inline because no shared helper existed.

## Version 1 contract

### 1. Five presence questions, not one field

Every roster NPC answer to "where are they" is actually five separate questions:

1. **Quarters** — where do they live, if anywhere in the house?
2. **Duty placement** — where are they stationed for work, if that work is in-house?
3. **Current presence** — where are they reachable *right now*, for social/encounter purposes?
4. **Deployment absence** — are they off-screen on a mission/expedition?
5. **Captivity presence** — are they held, and if so where, under whose custody?

Version 1 does not require a new schema field for all five immediately. It requires that every
system asking "where is this NPC" name which of these five questions it means, and stop reusing
`roomAssignment` as a universal answer.

### 2. Field/meaning matrix

| Concept | Canonical source (v1) | Status |
|---|---|---|
| Quarters (residence) | `npc.roomAssignment`, when it points to a room in `RESIDENTIAL_ROOM_IDS` and that room is `intact` | **Survives.** This becomes `roomAssignment`'s *only* sanctioned meaning going forward. |
| Duty placement (in-house work post) | today: `npc.roomAssignment` (kitchen check) | **Split required.** Duty placement must stop sharing a field with quarters. `destiny-vsgm` introduces an explicit duty-post concept (e.g. `houseDutyPostId`) distinct from `roomAssignment`. Until that lands, existing kitchen-duty reads of `roomAssignment` are tolerated legacy debt — do not add *new* duty checks against `roomAssignment`. |
| Duty placement (out-of-house work/defense/transfer) | `npc.assignedDistrictId` | **Survives.** Authoritative whenever `assignment` implies the NPC is away from the house (`working` with a district target, `deployed`, `defense`, `transferred`). Must be `null` when the NPC's current duty keeps them inside the house. |
| Current presence (derived) | new canonical helper `getNpcPresence(state, npc)` | **New.** Not a stored field — a computed result combining captivity, assignment, and quarters (precedence in §3). Replaces ad hoc inline logic such as the `socialPresenceReason` block added to `NpcDetailPanel.tsx` in `destiny-rdve`. |
| Deployed | `npc.assignment === 'deployed'` (+ optional `assignedDistrictId` for the mission district) | **Survives.** Means off-screen field absence: not reachable for any private/domestic interaction, and excluded from house-support eligibility (lodging, recovery, household intimacy). |
| Captive / missing | `npc.captivityState.status` (`'captive' \| 'missing'`), `siteId`, `roomId` | **Survives, and overrides.** Whenever `captivityState.status` is `'captive'` or `'missing'`, it is authoritative for presence. `roomAssignment`/`assignedDistrictId` must be ignored for that NPC until captivity resolves (`rescued`/`returned`). |

### 3. Presence precedence rule

`getNpcPresence(state, npc)` must resolve in this order — first match wins:

1. `captivityState.status === 'captive'` → `{ kind: 'captive', siteId, roomId }`
2. `captivityState.status === 'missing'` → `{ kind: 'missing' }`
3. `assignment === 'deployed'` → `{ kind: 'deployed', districtId: assignedDistrictId }`
4. `assignment` is `'working' | 'defense' | 'transferred'` **and** `assignedDistrictId` is set and
   differs from `state.houseDistrictId` → `{ kind: 'district', districtId: assignedDistrictId }`
5. otherwise → `{ kind: 'house', roomId: roomAssignment }` (the NPC is at House Valdris; the room
   id is their quarters/duty post if known, `null` if unassigned)

This precedence is not new invention — it already exists piecemeal (`isEligibleResident` in
`applyHouseholdIntimacy.ts` checks `deployed`/`captive`/`missing`/`ward` before trusting
`roomAssignment`; `NpcDetailPanel.tsx` checks assignment before district before house). This
decision promotes that pattern to the one required rule, so it stops being reinvented per file.

### 4. Residence-only triggers vs. co-presence triggers

Not every system needs to know where an NPC is *right now*. Some only need to know whether they
have a home.

**Residence-only is sufficient for:**
- recovery/lodging support tier (`hasResidentQuarters`, `getNpcRecoverySupport`)
- state-decay quarters/fatigue/morale bonuses (`applyStateDecay.ts`)

These ask "does this NPC have an assigned bed," not "are they lying in it right now." Keep them
keyed on quarters (`roomAssignment` + `RESIDENTIAL_ROOM_IDS`) as-is.

**Co-presence (derived current presence) is required for:**
- NPC-NPC household intimacy triggers (`applyHouseholdIntimacy.ts`)
- NPC-NPC arousal/proximity triggers (`applyArousalMechanics.ts`)
- player↔NPC social reachability (`destiny-co2w`'s domain: Talk Deeply, Court, gifts, dates,
  intimacy)

Version 1 accepts that in-house co-presence is approximated by "both resolve to
`{ kind: 'house' }` and neither is excluded by the precedence rule above" — it does not require
minute-by-minute movement simulation. What changes is that this approximation must run through
`getNpcPresence`, not through raw `roomAssignment` equality, so that a deployed or captive NPC can
never appear co-present just because a stale room id still matches.

### 5. What "deployed" and "working" mean, precisely

- **Deployed**: off-screen on a mission/expedition. Not reachable for private/domestic
  interaction. Excluded from lodging/recovery/household-intimacy eligibility. Whether remote,
  low-fidelity contact (e.g. base dialogue) remains possible is a UI-policy question for
  `destiny-co2w` to decide on top of this contract — this decision only guarantees the NPC is not
  falsely reachable as "at the house."
- **Working**: split by whether the job is in-house or out-of-house.
  - Out-of-house (`assignedDistrictId` set, differs from house district): presence resolves to
    `{ kind: 'district' }`. Not reachable for house-based private actions until they return.
  - In-house (`assignedDistrictId` null): presence resolves to `{ kind: 'house' }`. The specific
    duty post (e.g. kitchen) is a duty-placement question (§2), not a presence question — the NPC
    is at the house and, in principle, co-presence-eligible, even while on duty.

### 6. Captivity bridge

Captivity keeps its own richer site/room model (ADR 0002, `applyNpcRoomInteractions.ts`). This
contract does not replace it — it bridges it. A captive or missing NPC:

- is never treated as co-present with ordinary roster/household systems
- is never eligible for quarters-based recovery/lodging support
- interacts with guards/caregivers exclusively through the captivity room/site model, which
  remains the source of truth for that NPC while `captivityState.status` is `'captive'`

## Scenario matrix (minimum tests later beads must cover)

1. **Shared quarters, not co-present** — two NPCs both have `roomAssignment: 'room-quarters'`, one
   has `assignment: 'deployed'`. Household intimacy must not trigger.
2. **Co-present without shared quarters** — two NPCs both resolve to `{ kind: 'house' }` (e.g. one
   has no `roomAssignment`, the other has `roomAssignment: 'room-kitchen'`). Presence should
   report both as co-present at the house level even though they don't share a lodging room.
3. **Deployed absence** — `assignment: 'deployed'`. Presence resolves to `{ kind: 'deployed' }`;
   excluded from lodging support, household intimacy, and private social actions regardless of any
   stale `roomAssignment` value.
4. **Working in another district** — `assignment: 'working'`, `assignedDistrictId` set to a
   district other than the house district. Presence resolves to `{ kind: 'district' }`; not
   reachable for house-based private actions.
5. **Captive with guard/caregiver interaction** — `captivityState.status: 'captive'`, `siteId` and
   `roomId` set. Presence resolves to `{ kind: 'captive' }` regardless of `roomAssignment`; only
   captivity-room interaction logic may act on this NPC's location.

## What version 1 does not promise

- no minute-by-minute movement or pathfinding simulation
- no schema migration performed by this decision itself (field split for duty-post is delegated to
  `destiny-vsgm`; the shared `getNpcPresence` helper is delegated to `destiny-co2w`/`destiny-vsgm`)
- no UI-policy ruling on which social actions tolerate remote (non-co-present) interaction — that
  is `destiny-co2w`'s decision, built on these primitives
- no change to the captivity room/site model itself — only an explicit statement of how it
  overrides ordinary roster presence

## Required downstream changes

1. `destiny-vsgm` — split `roomAssignment` into quarters-only semantics and a distinct duty-post
   concept; introduce `getNpcPresence` (or equivalent) as the canonical helper implementing the
   precedence rule in §3.
2. `destiny-4vt0` — route `applyHouseholdIntimacy.ts` and `applyArousalMechanics.ts` through
   canonical co-presence instead of raw `roomAssignment` equality.
3. `destiny-co2w` — build player↔NPC social reachability and UI copy on top of `getNpcPresence`,
   replacing the inline `socialPresenceReason` logic in `NpcDetailPanel.tsx`.
4. `destiny-q5ra` — consolidate NPC-NPC romance/date pipelines onto the same presence contract so
   they stop diverging from household intimacy's rules.
5. `destiny-uj3s` — player lodging can proceed independently (it already has its own decision,
   `destiny-i8nc`), but should describe player location using the same house/district vocabulary
   defined here for consistency.

## Non-goals for downstream implementation

- do not keep `roomAssignment` as a catch-all; every new read of it must be a quarters question
- do not add a second, slightly-different presence helper per screen or command
- do not let household intimacy or arousal triggers fire for deployed, captive, or missing NPCs
  even if a stale room id matches
- do not require full room-by-room simulation to satisfy this contract

## Bottom line

Quarters answers where an NPC lives. Duty placement answers where they work. Current presence is
derived, not stored, and takes captivity and deployment into account before ever trusting a room
id. Deployment means off-screen absence. Captivity overrides everything else. One helper —
`getNpcPresence` — is the required single source of truth for all of it going forward.
