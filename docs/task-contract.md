# Task Contract

Every Bead assigned to an agent should include the following structure.

For backlog quality rules and authoring guidance, also read [docs/workflows/bead-creation.md](docs/workflows/bead-creation.md).

## Template

### Objective

What must be achieved, in one sentence.

### Why

What player-facing or system-facing problem exists.

### Why Now

Why this task should happen in the current milestone or before adjacent work.

### Scope

What is in scope and out of scope.

### Player Impact

What the player will understand, do, observe, or feel differently after completion.

### Ownership

Exact files, directories, or modules the agent may change.

### Inputs

Documents, contracts, and existing modules that are authoritative for this task.

### Expected Output

Concrete deliverables, not vague intent.

For `runtime too shallow` tasks, the expected output must explicitly say:

- which outcomes lead to `settle`
- which outcomes lead to `setback / retry`
- which outcomes lead to `branch / follow-up`
- what player-visible surface proves each state transition

### Evidence

The findings, files, screens, or user reports that justify the task.

### Validation

Exact checks required before handoff.

For player-facing work, include:

- how player comprehension is checked
- how route clarity is checked
- how post-action readability is checked

For quest, event, and other player-facing loop work, validation should also say:

- how `success`, `partial`, and `failure` are each verified
- whether `partial` is allowed to complete the task, or must keep it active
- which test or playthrough proves that the core fiction promise is actually fulfilled before settlement

### Architecture Constraints

Dependency rules or layering constraints that must not be broken.

### TDD Expectation

State which tests must be written first or what behavior must be covered.

For high-value story or investigation work, default to one test per meaningful outcome:

- `success` closes correctly
- `partial` behaves correctly
- `failure` behaves correctly

### Finding Coverage

Which audit or review findings this task covers. If coverage is only partial, say so explicitly.

### Fiction Contract

Required for narrative-heavy work. State the diegetic truth the task must preserve.

### Stop Conditions

Conditions under which the agent must stop and create a blocker note instead of guessing.

Include this stop condition for authored-runtime alignment work:

- if the implementation cannot say whether `partial` means `progress`, `setback`, or `completion`, stop and tighten the contract before coding

## Runtime-Depth Note

If a Bead originates from an audit finding classified as `runtime too shallow`, agents should implement in this order:

1. outcome model
2. runtime state transitions
3. player-visible proof surface
4. copy polish

Do not treat improved wording as sufficient when the finding says the runtime promise itself is missing.

## Example

### Objective

Implement the NPC relationship aggregate.

### Scope

In scope:

- relationship value object
- transition rules
- tests

Out of scope:

- UI rendering
- persistence adapters

### Ownership

- `src/domain/relationships/*`
- `src/domain/shared/*` if needed for reusable primitives
- matching test files

### Inputs

- `docs/architecture.md`
- `docs/engineering-standards.md`
- `docs/product.md`

### Expected Output

- relationship aggregate with typed axes
- pure update functions
- invariants enforced by tests

### Validation

- unit tests pass
- typecheck passes

### Architecture Constraints

- no UI imports
- no storage concerns
- domain remains pure

### TDD Expectation

- failing tests for axis clamping and relationship event application written first

### Stop Conditions

- affinity model undefined in product docs
- another task owns the shared primitives needed
