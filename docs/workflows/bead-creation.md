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

### Acceptance

Split acceptance into three lenses where relevant:

1. `Player-visible acceptance`
2. `System / technical acceptance`
3. `Tests / verification acceptance`

Do not rely only on technical wording when the Bead changes the player experience.

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

Good:

- `Household rivalry can block a rival expansion and surface the result in state and log`
- `A room clue unlocks exactly one new Marion dialogue branch`
- `A faction agenda changes one shared economic dial and one visible downstream surface`

Weak:

- `Make households more dynamic`
- `Improve NPC world simulation`
- `Expand quest generation`

If the title sounds like a direction rather than a contract, the Bead is still too broad.

## Audit traceability

When a list of findings is turned into Beads:

1. number every finding
2. map every finding to one or more Beads
3. create a new Bead for every gap
4. state partial coverage honestly

Never close an audit with unmapped findings.

## Default quality bar

If a Bead changes runtime behavior, it should normally identify:

- the affected layer or ownership area
- the expected validation shape
- whether TDD is required

If it changes story/world logic, it should also identify:

- the fiction contract
- the player-facing consequence
- the follow-through surface where the change becomes visible

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
- the Mira / House Valdric story spine
- world NPC interaction
- meaningful choice and consequence

If it does none of those, make sure it is clearly justified as enabling infrastructure.
