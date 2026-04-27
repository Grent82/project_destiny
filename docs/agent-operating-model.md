# Agent Operating Model

## Purpose

This document defines how agentic work is organized in Project Destiny.

The objective is to make multi-agent coding reliable, testable, and extensible. The operating model is optimized for:

- clean architecture
- clean code
- testability
- extensibility
- TDD
- dependency-aware execution with Beads

This document is process source of truth for agent collaboration.

## Principles

- Prefer small, verifiable changes over broad speculative changes.
- Keep domain rules independent from frameworks and UI.
- Make every feature testable at the domain level.
- Use TDD whenever behavior is being introduced or changed.
- Use Beads as the only backlog and dependency tracker.
- Minimize overlapping file ownership between agents.
- Integrate often. Do not let long-lived divergent work accumulate.

## Operating Structure

Project Destiny uses a coordinator-led multi-agent model.

### Coordinator

The coordinator owns:

- backlog hygiene
- task decomposition
- assignment of work
- dependency management in Beads
- review routing
- integration decisions
- escalation when scope or architecture is unclear

The coordinator is the only role that may redefine scope or accept tradeoffs that affect multiple areas.

### Worker roles

Worker roles execute bounded tasks with explicit ownership. Default roles:

- `Architect`
- `Systems`
- `UI`
- `Data`
- `Narrative`
- `UI/UX`
- `Art Direction`
- `Verifier`

Additional temporary roles may exist, but only if they own a narrow, explicit scope.

## Source of Truth Order

When instructions disagree, use this order:

1. `docs/product.md`
2. `docs/architecture.md`
3. `docs/ui-principles.md`
4. `docs/narrative.md`
5. `docs/art-direction.md`
6. `docs/engineering-standards.md`
7. domain schemas and contracts
8. implementation details
9. generated content

If a conflict exists between two higher-priority documents, stop and create a Bead for clarification instead of guessing.

## Beads Policy

Beads is the only backlog system for this project.

Do not use:

- markdown TODO lists as planning source of truth
- ad hoc chat checklists as backlog
- parallel issue trackers

### Required Beads usage

- `bd ready` before starting work
- `bd show <id>` before implementing
- `bd update <id> --claim` when starting a task
- `bd note <id>` for assumptions, blockers, or handoff details
- `bd close <id>` only after validation is complete

### Backend mode note

The current setup uses the embedded Dolt backend created by `bd init`. This supports only one writer at a time for Beads operations.

Implications:

- multiple agents may work in parallel on code if write scopes are disjoint
- Beads writes should be serialized through the coordinator or one active writer
- if the project later needs concurrent backlog mutation by several agents, migrate Beads to server mode

### Dependency rule

If a task depends on another task’s output, encode that dependency in Beads. Do not rely on chat memory.

### Preferred issue types

- `epic` for milestone-level work
- `feature` for vertical slices
- `task` for bounded implementation
- `decision` for architecture or process decisions
- `chore` for tooling, maintenance, and automation

## Task Lifecycle

Each task follows this sequence:

1. Coordinator defines or selects a ready Bead.
2. Worker claims the Bead.
3. Worker verifies scope, ownership, and dependencies.
4. Worker writes or updates tests first when behavior is changing.
5. Worker implements the smallest change that satisfies the test.
6. Worker runs validation.
7. Worker records assumptions, touched files, and follow-up work in the Bead.
8. Verifier reviews if the change crosses role boundaries or changes behavior.
9. Coordinator integrates and closes the loop.

## Task Sizing Rules

Tasks should be:

- independently testable
- finishable in one focused session
- narrow in write scope
- explicit about inputs and outputs

Good tasks:

- define NPC schema and validation rules
- implement relationship aggregate and tests
- build roster table from existing selectors

Bad tasks:

- build the game
- design the entire architecture
- make the UI polished

## Ownership Boundaries

Each agent should work in a mostly disjoint write scope.

### Preferred ownership

- `Architect`: `docs/*`, architecture decisions, interface contracts
- `Systems`: `src/domain/*`, `src/application/*`, rules engines, reducers, use cases
- `UI`: `src/ui/*`, `src/features/*`, view models, interaction wiring
- `Data`: `data/*`, schemas, seed data, balancing data
- `Narrative`: `docs/narrative.md`, narrative content docs, writing standards, faction and NPC text packs
- `UI/UX`: `docs/ui-principles.md`, screen blueprints, UX review docs, UI acceptance criteria
- `Art Direction`: `docs/art-direction.md`, visual direction docs, prompt packs, asset briefs
- `Verifier`: tests, validation reports, review findings

Shared files should be minimized. If multiple roles must edit the same file, the coordinator must serialize the work.

## Clean Architecture Rules

Project Destiny follows dependency direction from outside to inside.

### Layers

- `Domain`: entities, value objects, policies, invariants
- `Application`: use cases, orchestration, ports
- `Infrastructure`: persistence, serialization, external tooling
- `UI`: presentation, interaction, rendering

### Dependency constraints

- Domain depends on nothing project-specific outside itself.
- Application may depend on domain.
- Infrastructure may depend on application and domain.
- UI may depend on application and domain contracts, not infrastructure internals.
- No business rules in UI components.
- No framework concerns in domain entities.

### Design preference

- model rules as pure functions or well-contained services
- isolate side effects behind ports
- favor composition over inheritance
- prefer explicit types and contracts over conventions

## TDD Policy

TDD is required for all new behavior in domain and application layers unless the coordinator explicitly records an exception in the Bead.

### Default loop

1. Write a failing test.
2. Implement the smallest change to pass it.
3. Refactor while preserving green tests.

### Where TDD is mandatory

- domain entities
- use cases
- reducers and state transitions
- combat resolution
- relationship and trait calculations
- event eligibility and outcome rules
- serialization logic with invariants

### Where TDD is strongly preferred

- UI view models
- selectors
- adapters

### Where snapshot-only testing is insufficient

- combat math
- state transitions
- dependency gating
- data validation rules

## Definition of Done

A task is not done until all of the following are true:

- scope is complete
- tests were added or updated for behavior changes
- relevant validation passed
- no unrelated edits were introduced
- assumptions are recorded in the Bead
- follow-up work is captured as new Beads when needed

## Escalation Rules

Stop and escalate to the coordinator when:

- the task requires changing source-of-truth documents
- ownership boundaries are unclear
- another task has not yet produced a required contract
- architecture constraints would need to be violated
- the requested scope is larger than one bounded task

## Review Model

The Verifier should focus on:

- behavioral regressions
- architectural violations
- missing tests
- leaking framework concerns into core logic
- data-contract mismatches
- unbounded coupling

The coordinator resolves review conflicts and decides whether a task is closed or reopened.
