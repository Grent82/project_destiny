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
- If the change touched a player-facing loop, was [docs/workflows/loop-level-verification.md](docs/workflows/loop-level-verification.md) applied?

## 6. Product Truth

- Does the affected screen or loop answer the main player question for that moment?
- If navigation changed, is route continuity explicitly verified?
- If day-one or opening-fiction copy changed, is fresh-save truth explicitly verified?
- If events or bulk simulation changed, is pacing/budget explicitly verified?
- If aftermath changed, are outcome, consequence, and next destination readable?

## 7. Scope Discipline

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
