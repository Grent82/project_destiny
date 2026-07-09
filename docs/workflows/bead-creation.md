# Bead Creation Workflow

This workflow defines how backlog items are created and refined in Project Destiny.

Use it whenever an agent creates:

- a new Bead
- a child Bead from an epic
- a follow-up Bead from an audit or review
- a refinement update to an existing Bead

The goal is simple: a Bead must be a reliable implementation contract, not just a reminder that something exists.

## Core rule

Every Bead must make it obvious:

- what problem exists
- why it matters now
- what change will be observable after completion
- what is explicitly out of scope
- how the result will be verified

If any of those are missing, the Bead is too weak.

## Classify the Bead first

Before writing the Bead, decide which kind it is:

- `audit / analysis`
- `design decision`
- `implementation`
- `follow-up / polish`

Do not mix those casually.

Examples:

- an audit Bead should identify and frame a problem, not silently include implementation
- a design-decision Bead should define the contract, not absorb all downstream code changes
- an implementation Bead should change behavior, not reopen unresolved product questions

When the work spans phases, split it into parent/child Beads.

## Epic rule

An epic is not automatically the next implementation unit.

Before starting work from an epic, extract or identify one thin slice that:

- changes one observable behavior
- has clear acceptance
- can be verified on its own
- does not require silently solving the whole epic at once

If no such slice exists yet, create it first.

## Required Bead fields

Every new or materially updated Bead should answer these sections.

### Why

What player-facing or system-facing problem exists?

### What

What behavior changes after this Bead is complete?

### Why now

Why should this work happen in this milestone or before other work?

Examples:

- blocks three later content Beads
- fixes a false promise already visible to the player
- removes architecture debt before content expansion
- improves first-hour player guidance

### Player impact

What will the player now be able to understand, do, observe, or feel?

This section is mandatory for all gameplay, UI, quest, event, dialogue, and content Beads.

### System impact

Which models, commands, selectors, UI surfaces, docs, or content packs are expected to change?

### Does not include

State explicit non-goals.

Examples:

- no new quest content
- no art pass
- no balance pass
- no save migration beyond default values

This is the main defense against scope creep.

### Evidence

Which audit findings, files, screens, tests, or user-reported problems justify the Bead?

### DO NOT

Explicit failure modes to avoid. At least two bullet points.

This section prevents the class of ambiguity that caused issues like:
- destiny-pcbl: "coalition effort" implemented as probability roll instead of NPC agency
- Recruitment filtering: "filter by district" implemented as "sort by district"
- Site pressure: "show pressure" showed "0 occupants" instead of hiding the message

Examples:
- DO NOT implement as probability roll when NPC agency is expected
- DO NOT show zero counts in player-facing messages (use alternative phrasing or hide)
- DO NOT sort when filtering is required
- DO NOT log every NPC decision (noise, not signal)
- DO NOT use Math.random (breaks determinism)
- DO NOT make important events purely probabilistic without player agency

### Visibility Level

How much of this simulation should the player see? Choose one:

- **BACKGROUND**: Simulation runs invisibly. No Activity Log entries for intermediate steps.
- **MOMENT**: Only important results appear in Activity Log with names (coalition forms, expedition succeeds, status changes).
- **CONTINUOUS**: UI shows ongoing state (e.g., "3 NPCs working corridor").

_Required for: any ticket involving NPC behavior, world simulation, or economy._

### Examples

Concrete before/after showing what "good" looks like. This is critical for avoiding ambiguity.

**BAD (mehrdeutig):**
- "Coalition clears corridor over time"
- "NPCs work on the corridor"

**GOOD (klar):**
- "Day 7: Activity Log - 'Tessaly assembled a coalition for the Green Corridor'"
- "Day 10: Activity Log - 'Tessaly's coalition fought through bandits, cleared sector 2'"
- "Day 12: Activity Log - 'The Green Corridor is open. Trade flows again.'"
- "Player has NO visibility into days 7-11 progress unless they join"

### Acceptance

Split acceptance into three lenses where relevant:

1. `Player-visible acceptance`
2. `System / technical acceptance`
3. `Tests / verification acceptance`

Do not rely only on technical wording when the Bead changes the player experience.

#### "Cannot X" rule

If the Bead introduces or fixes a player-facing constraint ("cannot deploy", "cannot train", "cannot equip", etc.), acceptance **must** explicitly list every code entry point that enforces the constraint:

- Which selector filters it?
- Which command guards it?
- Which UI dispatch path blocks it?
- Is there a shared `isX()` helper, or are guards duplicated?

A Bead that says "working NPCs cannot deploy" but only fixes one of three entry points is incomplete. The acceptance criteria must name all three and require a test for each.

For `runtime too shallow` Beads, acceptance must also define an outcome matrix:

- what `success` means
- what `partial` means
- what `failure` means
- whether each outcome settles, retries, branches, or stays unresolved

If this matrix is missing, the Bead is too weak for implementation because the agent will be forced to guess the state machine.

### Dependencies

List required prior Beads explicitly.

### Finding coverage

If the Bead comes from an audit, review, or synthesis pass, record the covered findings.

Examples:

- `F3, F5, F9`
- `covers F5 runtime depth, not F5 presentation`

Do not imply full coverage when the Bead only addresses one slice of a finding.

### Fiction contract

Required for narrative-heavy Beads.

This records the diegetic truth the implementation must preserve.

Examples:

- `The vault key is earned through clues and NPC interaction, not passive day progression.`
- `Marion occupies a salvaged room, not a privileged preserved chamber.`

## Preferred backlog shape

Use this sequence whenever possible:

1. `capability` Bead
2. `content` Bead that exploits the capability
3. `polish` or `expansion` Beads afterward

Examples:

- first: typed evidence artifacts
- then: house clues that create those artifacts
- then: follow-up quest/dialogue content that consumes them

This keeps implementation order sane and avoids adding shallow content onto missing systems.

## Good Bead patterns

Good:

- `Turn room discoveries into tracked artifacts that can unlock one dialogue or quest branch`
- `Add event instance provenance so world incidents can become follow-up leads`
- `Define which navigation surfaces are global vs. POI-contextual`

Weak:

- `Improve house story`
- `Refactor quest architecture`
- `Make events better`

The strong version says what changes and what the player will notice.

## Thin-slice preference

Prefer Beads that can prove one meaningful claim end to end.

## C.L.E.A.R. Review before Bead Closure

Before closing any implementation Bead with code changes, run a C.L.E.A.R. review:

```bash
/clear-review src/path/to/changed/files
```

Minimum requirements for closure:
- **Correctness:** Tests pass, edge cases handled
- **Libraries:** No hallucinated packages, dependencies valid
- **Efficiency:** No obvious anti-patterns
- **Architecture:** Clean boundaries maintained
- **Risks:** Security review complete (if applicable)

Record the review findings in the Bead notes before closure.

Good:

- `Household rivalry can block a rival expansion and surface the result in state and log`
- `A room clue unlocks exactly one new Marion dialogue branch`
- `A faction agenda changes one shared economic dial and one visible downstream surface`

Weak:

- `Make households more dynamic`
- `Improve NPC world simulation`
- `Expand quest generation`

If the title sounds like a direction rather than a contract, the Bead is still too broad.

For runtime-depth work, the preferred thin slice is not "add richer flavor" but:

- define one quest's real outcome contract
- implement the state transitions for that contract
- prove the player can see the difference between unresolved progress and true completion

## Audit traceability

When a list of findings is turned into Beads:

1. number every finding
2. map every finding to one or more Beads
3. create a new Bead for every gap
4. state partial coverage honestly

Never close an audit with unmapped findings.

### Before creating Beads from a multi-chapter document

Read the whole document first, not just the chapter that prompted the session. A forensic
analysis or design doc with multiple chapters (e.g. NPC intentions, economy, item effects)
must be triaged as a whole before any Bead gets created — creating Beads only for the
chapter that was top of mind silently drops the others (destiny-x125: only NPC-intention
Beads were created from a forensic analysis; economy and item-effects chapters were
overlooked entirely).

1. Read every chapter/table in the source document, not only the obviously relevant one.
2. Categorize every gap found, per chapter — not just the one the session started with.
3. Roughly estimate the Bead count per category before creating any of them.
4. Confirm the category breakdown and rough count with the user before mass-creating
   Beads — a one-line summary ("~6 NPC-intention Beads, ~4 economy Beads, ~3 item-effects
   Beads") is enough; do not silently create 20+ Beads from a single pass.
5. After creating each batch, spot-check `bd show <id>` on a few to confirm `--type` and
   `--priority` actually match intent (task vs. bug vs. feature) — `bd create` does not
   validate that a Bead's stated content matches its declared type.

## Fresh-eyes playthrough evidence (player-facing beads)

**Requirement**: Any bead that changes player-facing behavior (events, quests, UI, dialogue, NPC interactions) must include playthrough evidence before closure.

**Evidence types** (choose one or more):
- Screenshot of the new behavior in action
- Activity Log excerpt showing the change
- Before/after comparison of player-visible output
- Test output demonstrating the behavior

**Checklist** (attach to bead notes):
- [ ] Player can understand what happened
- [ ] Route to next action is clear
- [ ] Consequence is visible (not hidden in state)
- [ ] Success/partial/failure paths are all demonstrated

**Example**:
```
Playthrough evidence:
- Day 3, Morning Report: event shows presentationFlavour scene text
- Activity Log: "Marion leaves a note on your desk — corridor tolls raised"
- Screenshot: event modal with kicker "A Scene" and actor portrait

Checklist:
- [x] Player understands the event source (Marion as actor)
- [x] Next action clear (choose response or dismiss)
- [x] Consequence visible in log and state
- [x] All paths shown (auto-resolve + choice paths)
```

## Simulation scenario as Definition of Done (feature beads)

**Requirement**: Any feature bead must name the playthrough/simulation scenario that proves its loop.

**Examples**:
- "Run `pnpm test:playthrough:funnel` — new quest path appears at day 5"
- "Run 40-day sim (`destiny-lzke` scenario) — coalition lifecycle events fire and resolve"
- "Manual playthrough day 1-7 — corridor reopening progress visible in Activity Log"

**Stop condition**: If no existing scenario proves the loop, file a follow-up bead to create one — do not ship without coverage.

## Default quality bar

If a Bead changes runtime behavior, it should normally identify:

- the affected layer or ownership area
- the expected validation shape
- whether TDD is required

If it changes story/world logic, it should also identify:

- the fiction contract
- the player-facing consequence
- the follow-through surface where the change becomes visible

If it is a quest- or loop-depth Bead, it should also identify:

- whether `partial` is a valid completion state or not
- what keeps the task active after a setback
- which UI/log/journal surface communicates the new state to the player

## Enforcement

Three mechanisms ensure the template is used:

### 1. Validation on create (automatic)

`validation.on-create = warn` is set in `.beads/config.yaml`.
Every `bd create` call automatically warns when `## Acceptance Criteria` is missing.
Use `--validate` to get an error (blocks creation) instead of a warning.

```bash
bd create "My bead" --description "$(cat .beads/templates/bead-description.md)" --validate
```

### 2. Lint on session close (manual gate)

Run before every session-close push:

```bash
bd lint          # check all open issues for missing sections
bd preflight     # full pre-push check (lint + stale + orphans)
```

A bead that fails `bd lint` is not shippable. Fix the description before closing the session.

### 3. Template file (authoring scaffold)

The canonical scaffold is at `.beads/templates/bead-description.md`.

For agents: copy-paste or pipe it as the starting point for every new description.

```bash
# Start a new bead with the template pre-filled
bd create "Title here" \
  --description "$(cat .beads/templates/bead-description.md)" \
  --validate
```

Fill in each section. Remove `Fiction contract` for non-narrative Beads.

## Lightweight authoring template

> The canonical scaffold lives at `.beads/templates/bead-description.md`.
> Use that file as the authoritative source. The summary below is for quick reference only.

```text
## Why
What player/system problem exists?

## What
What behavior changes after this bead?

## Why now
Why is this important in the current milestone/order?

## Player impact
What becomes clearer, playable, or more meaningful?

## System impact
Which models, commands, selectors, UI surfaces, content packs, or docs are affected?

## Does not include
Explicit non-goals.

## Evidence
Findings, files, screens, tests, or user reports that justify the work.

## Acceptance Criteria
1. Player-visible acceptance
2. System / technical acceptance
3. Tests / verification acceptance

## Finding coverage
Which findings this bead covers.

## Fiction contract
Only when narrative-heavy.
```

## Project-specific reminder

Project Destiny is an RPG first.

A strong Bead for this repo usually improves at least one of:

- player character agency
- the Mira / House Valdris story spine
- world NPC interaction
- meaningful choice and consequence

If it does none of those, make sure it is clearly justified as enabling infrastructure.
