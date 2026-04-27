# Task Contract

Every Bead assigned to an agent should include the following structure.

## Template

### Objective

What must be achieved, in one sentence.

### Scope

What is in scope and out of scope.

### Ownership

Exact files, directories, or modules the agent may change.

### Inputs

Documents, contracts, and existing modules that are authoritative for this task.

### Expected Output

Concrete deliverables, not vague intent.

### Validation

Exact checks required before handoff.

### Architecture Constraints

Dependency rules or layering constraints that must not be broken.

### TDD Expectation

State which tests must be written first or what behavior must be covered.

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
