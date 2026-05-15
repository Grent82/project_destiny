# Engineering Standards

## Purpose

These standards define how Project Destiny code should be written so multiple agents can extend it safely over time.

## Primary Goals

- testability
- extensibility
- low coupling
- explicit contracts
- maintainable domain logic

## Clean Code Rules

- Prefer small functions with explicit inputs and outputs.
- Keep side effects at the edges of the system.
- Name modules by domain purpose, not technical convenience.
- Avoid hidden mutable shared state.
- Prefer explicit data transformations over clever abstractions.
- Delete dead code quickly instead of leaving speculative hooks.
- Do not introduce framework dependencies into core domain modules.

## Architecture Rules

- Keep domain logic framework-agnostic.
- Represent business concepts as typed models or value objects.
- Put orchestration in application services or use cases.
- Put persistence, I/O, and adapters in infrastructure.
- Keep UI concerned with interaction and presentation only.

## Testing Rules

- TDD is the default.
- Every domain rule should have direct unit tests.
- Every bug fix should begin with a failing test when reproducible.
- Avoid relying only on broad integration tests for core calculations.
- Prefer deterministic tests over snapshot-heavy tests.
- Mock only at external boundaries.

## Extensibility Rules

- Add new capabilities through stable interfaces where possible.
- Avoid giant central switch statements when domain polymorphism can be made explicit.
- Keep data definitions declarative where content is expected to grow.
- Separate immutable content definitions from mutable save-state.

## Review Rules

Code review should prioritize:

- correctness
- architectural integrity
- test coverage quality
- dependency direction
- clarity of intent
- player comprehension for player-facing changes
- visible consequence after interaction
- layer-appropriate information hierarchy in UI surfaces

Style issues matter less than structural violations.

## Refactoring Guidance

Refactor only when one of these is true:

- duplication is causing maintenance risk
- current structure blocks a required feature
- tests are hard to write because boundaries are wrong
- domain concepts are leaking across layers

Do not perform broad opportunistic refactors inside unrelated tasks.
