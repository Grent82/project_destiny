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

### Evidence

The findings, files, screens, or user reports that justify the task.

### Validation

Exact checks required before handoff.

For player-facing work, include:

- how player comprehension is checked
- how route clarity is checked
- how post-action readability is checked

### Architecture Constraints

Dependency rules or layering constraints that must not be broken.

### TDD Expectation

State which tests must be written first or what behavior must be covered.

### Finding Coverage

Which audit or review findings this task covers. If coverage is only partial, say so explicitly.

### Fiction Contract

Required for narrative-heavy work. State the diegetic truth the task must preserve.

### Stop Conditions

Conditions under which the agent must stop and create a blocker note instead of guessing.

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
