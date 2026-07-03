# East Wing Buildout Contract

Date: 2026-07-03
Bead: `destiny-cf4m`
Epic: `destiny-e1l6`

## Purpose

Define the version-1 slot topology, allowed room types, and exclusivity rules for the East Wing
buildout, so `destiny-m1qh` (runtime), `destiny-24pn` (ballroom), `destiny-wfe3` (infirmary), and
`destiny-4z91` (UI) can implement without guessing at architectural logic or drifting into
"every room everywhere" genericism.

This is a design-contract decision. No runtime implementation happens in this bead.

## Current state

`room-east-wing` is today a single house room (`state: 'collapsed'`, `repairCost: 200`,
`roomFunction: null`), mechanically identical to every other entry in `house.rooms[]`
(`houseRoomSchema`). Once repaired it would become one more intact room with one assignable
function — no different from the kitchen or the study. That's too thin for a headline expansion
the epic wants to carry real "house identity" weight.

Two existing systems already provide almost everything a v1 buildout needs, reused rather than
reinvented:

- `roomFunctionSchema` already includes `'infirmary'` and `'reception'` — no new function values
  needed.
- `hostGathering.ts` already gates on `roomFunction === 'reception'` and caps gatherings at 4 NPCs
  — a small, intimate scale. A ballroom is the *same* function at a grander scale, not a new one.
- `assignRoomFunction` already lets a player freely reassign any intact room's function, no cost,
  "replaces any existing function assignment." This is the right default for ordinary rooms, but
  it is exactly what East Wing must **not** inherit for free — see Decision 5 below.

## Decision

### 1. Slot count: 2, not 3, for version 1

East Wing repair unlocks exactly **2 buildout spaces**: one hall-scale, one chamber-scale. This
matches the user's "2-3 new spaces" direction and the two named examples (ballroom = hall-scale,
infirmary = chamber-scale) while keeping v1 lean. A third slot is explicit future scope (see
Non-goals) — do not add one speculatively now.

### 2. Slot scale and allowed room types

| Slot | Scale | v1 allowed room type | Mechanism |
|---|---|---|---|
| East Wing Hall | Hall-scale (large, formal) | `reception` at `upgradeTier: 'luxurious'` | Reuses `hostGathering.ts`'s existing `reception` check; the ballroom bead (`destiny-24pn`) extends that pipeline to read `upgradeTier` and unlock a higher NPC cap / grander gathering types at `luxurious`, rather than inventing a parallel gathering system. |
| East Wing Chamber | Chamber-scale (small, functional) | `infirmary` | Reuses the existing `hasInfirmarySupport`/`recovery.ts` treatment-tier pipeline directly — no new mechanism, just another `roomFunction: 'infirmary'` room for that pipeline to find. |

Each slot hosts exactly one room type in v1 — not a menu of alternatives. Future versions may add
alternative room types per slot (e.g. a chapel or great hall as another hall-scale option, an
archive or additional quarters as another chamber-scale option); v1 does not need to build that
choice architecture since there is nothing yet to choose between.

### 3. Runtime representation: two ordinary rooms, not a new data model

On East Wing repair completion, replace the single `room-east-wing` entry in `house.rooms[]` with
two new entries (e.g. `room-east-wing-hall`, `room-east-wing-chamber`), each an ordinary
`houseRoomSchema` object using the exact same repair/upgrade/function machinery every other room
already uses. **No schema change is needed.** This is `destiny-m1qh`'s job; this contract exists
so that bead doesn't invent a parallel "buildout slot" concept when the flat room array already
does the job.

### 4. Exclusivity: what "competing" actually means in v1

The two slots are **not** mutually exclusive with each other — a player who can afford it may
eventually build both the Hall and the Chamber. The "competing" tension in v1 is economic, not
structural: repairing East Wing (200 Mk) plus building out each slot to its useful tier is a real
cost that competes directly against the day-30 debt deadline and against each other for the
player's limited Marks. That tension is sufficient to carry "which kind of house are you
rebuilding" without needing artificial cross-slot exclusion.

### 5. Rebuild: locked once built, unlike ordinary rooms — this is the real identity choice

This is the one place East Wing must diverge from the generic room system. `assignRoomFunction`
today lets a player freely reassign any intact room's function at no cost — appropriate for the
kitchen or the study, wrong for a headline "what does this house become" choice. **Once a player
builds out an East Wing slot (Hall or Chamber) in v1, that choice is locked for the remainder of
the playthrough** — the generic `assignRoomFunction` command must not be usable on
`room-east-wing-hall`/`room-east-wing-chamber`. This is what makes it a real commitment rather
than a reversible decoration choice, and is the concrete form the epic's "House Identity" framing
takes in v1.

## Non-goals for v1 (explicit, so child beads don't silently expand scope)

- No third buildout slot.
- No menu of alternative room types per slot (each slot has exactly one v1 option).
- No detailed architecture-map/floorplan rendering of the two new spaces.
- No rebuild/swap path once a slot is built (see Decision 5) — this is deliberate, not a gap to
  fill later without a separate design decision.
- No new `roomFunction` enum values — `reception` and `infirmary` already exist and are reused.

## Required downstream changes

1. `destiny-m1qh` (runtime): implement the repair→split-into-two-rooms transition (Decision 3);
   add the East Wing-specific "choose and lock" command that bypasses/blocks
   `assignRoomFunction` for these two room IDs once set (Decision 5).
2. `destiny-24pn` (ballroom): extend `hostGathering.ts`'s reception-room lookup to recognize
   `upgradeTier: 'luxurious'` and unlock the grander payoff at that tier (Decision 2).
3. `destiny-wfe3` (infirmary): no new mechanism required — the East Wing Chamber is just another
   infirmary room for the existing recovery pipeline (`recovery.ts`) to find via
   `hasInfirmarySupport`.
4. `destiny-4z91` (UI): must present the Hall/Chamber choice as a real, effectively-permanent
   commitment (Decision 5), not a reversible pick — copy and confirmation flow should reflect that.

## Bottom line

East Wing repair produces two ordinary house rooms, not a new subsystem. The Hall becomes a
`reception` room at the top upgrade tier (ballroom); the Chamber becomes an `infirmary` room. Both
reuse existing pipelines end to end. The only genuinely new rule is that these two choices, once
made, are locked — that lock is what turns "which room did I build" into "what kind of house am I
rebuilding."
