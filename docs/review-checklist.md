# Review Checklist

Use this checklist when reviewing a completed Bead.

## 1. Correctness

- Does the change do what the Bead says it should do?
- Is there any obvious regression or broken behavior?
- Are edge cases or invariant breaks visible from the diff?

## 2. Architecture

- Does dependency direction still follow `UI -> Application -> Domain` and `Infrastructure -> Application -> Domain`?
- Did business rules stay out of UI components and framework adapters?
- Are content definitions and runtime state still separate?

## 3. Tests

- Were tests added or updated for behavior changes?
- Was TDD followed for domain or application behavior, or was an exception recorded?
- Are the tests meaningful, deterministic, and focused on behavior rather than snapshots alone?

## 4. Contracts and Coupling

- Does the change respect the current source-of-truth documents?
- Are module boundaries still clear?
- Did the change avoid hidden coupling, broad shared mutable state, or leaking implementation details across layers?

## 5. Validation

- Were the required quality gates run for the type of change?
- If code changed, were `typecheck`, `lint`, and `test:run` addressed?
- If UI integration changed, was `build` also addressed?

## 6. Scope Discipline

- Does the diff stay within the Bead’s intended scope?
- Are unrelated edits absent?
- Was follow-up work captured as a new or existing Bead instead of being silently deferred?

## Review Output

When leaving findings, prioritize in this order:

1. correctness
2. missing tests
3. architecture violations
4. hidden coupling
5. maintainability risks
