## Why

What player-facing or system-facing problem exists? Be specific — name the file, field, or
screen that is wrong or missing.

## What

What behavior changes after this Bead is complete? Describe the delta, not the feature.

## Why now

Why should this work happen before other work?

Examples:
- blocks three later content Beads
- fixes a false promise already visible to the player
- removes architecture debt before content expansion

## Player impact

What will the player now be able to understand, do, observe, or feel?

_Required for: gameplay, UI, quest, event, dialogue, and content Beads._

## System impact

Which models, commands, selectors, UI surfaces, docs, or content packs are expected to change?

## Does not include

Explicit non-goals. At least two bullet points.

Examples:
- no new quest content
- no art pass
- no balance pass
- no save migration beyond default values

## Evidence

Which audit findings, files, screens, tests, or user-reported problems justify this Bead?

## DO NOT

Explicit failure modes to avoid. At least two bullet points.

Examples:
- DO NOT implement as probability roll when NPC agency is expected
- DO NOT show zero counts in player-facing messages (use alternative phrasing or hide)
- DO NOT sort when filtering is required
- DO NOT log every NPC decision (noise, not signal)
- DO NOT use Math.random (breaks determinism)
- DO NOT make important events purely probabilistic without player agency

## Visibility Level

How much of this simulation should the player see?

- **BACKGROUND**: Simulation runs invisibly. No Activity Log entries for intermediate steps.
- **MOMENT**: Only important results appear in Activity Log with names (coalition forms, expedition succeeds, status changes).
- **CONTINUOUS**: UI shows ongoing state (e.g., "3 NPCs working corridor").

_Required for: any ticket involving NPC behavior, world simulation, or economy._

## Examples

Concrete before/after showing what "good" looks like.

**BAD (mehrdeutig):**
- "Coalition clears corridor over time"
- "NPCs work on the corridor"

**GOOD (klar):**
- "Day 7: Activity Log - 'Tessaly assembled a coalition for the Green Corridor'"
- "Day 10: Activity Log - 'Tessaly's coalition fought through bandits, cleared sector 2'"
- "Day 12: Activity Log - 'The Green Corridor is open. Trade flows again.'"
- "Player has NO visibility into days 7-11 progress unless they join"

## Acceptance Criteria

1. **Player-visible:** What can the player now do or see?
2. **System / technical:** What is the precise contract (schema, function signature, API)?
3. **Tests / verification:** Which tests must pass, and at what count threshold?

## Finding coverage

If from an audit or panel review, list the finding IDs this Bead covers.

Examples:
- `F3, F5` — full coverage
- `covers F5 runtime depth, not F5 presentation`

## Fiction contract

_Required only for narrative-heavy Beads._

The diegetic truth the implementation must preserve.

Example: `The vault key is earned through clues and NPC interaction, not passive day progression.`
