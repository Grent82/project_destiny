# ADR 0001: Initial Stack and Quality Gates

## Status

Accepted

## Context

Project Destiny needs an initial implementation stack that supports:

- clean architecture
- strong testability
- TDD-first domain work
- data-driven content
- fast local feedback loops
- agent-friendly project conventions

The stack must help the team build a browser game without forcing business rules into UI code. It must also keep setup and verification simple enough that multiple agents can reason about it consistently.

## Decision

Project Destiny will start with the following stack.

### Package manager and runtime

- `pnpm`
- `Node.js 22 LTS`

### Frontend application

- `React`
- `TypeScript`
- `Vite`
- `React Router` for top-level screen navigation when routing becomes necessary

### State and application wiring

- `Redux Toolkit` for runtime game-state integration in the application and UI boundary
- plain TypeScript domain and application modules for game rules

Important constraint:

- Redux Toolkit is not the home for business rules
- domain and application logic remain framework-agnostic
- Redux reducers and slices should orchestrate state application and UI integration, not define combat, relationship, economy, or faction rules directly

### Validation and schemas

- `Zod` for runtime schema validation

Zod will be used for:

- content file validation
- save-file validation
- adapter boundary validation where useful

### Testing

- `Vitest` as test runner
- `@testing-library/react` for UI tests
- `@testing-library/user-event` for interaction tests

Optional later:

- `Playwright` for end-to-end flows after the first playable slice exists

### Linting and formatting

- `ESLint`
- `Prettier`

## Required Scripts

The initial scaffold must provide these commands:

```bash
pnpm lint
pnpm format
pnpm test
pnpm test:run
pnpm typecheck
pnpm build
```

### Gate meanings

- `pnpm lint`
  Enforces code-quality and architecture-adjacent static rules.

- `pnpm format`
  Applies repository formatting.

- `pnpm test`
  Runs tests in watch mode for local TDD workflows.

- `pnpm test:run`
  Runs tests once in CI-friendly mode.

- `pnpm typecheck`
  Runs TypeScript checking without build output.

- `pnpm build`
  Confirms the application bundles successfully.

## Required Quality Gate Policy

### For architecturally significant or behavior-changing work

At minimum:

- `pnpm test:run`
- `pnpm typecheck`
- `pnpm lint`

### For UI integration work

At minimum:

- `pnpm test:run`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

### For docs-only changes

- no code gates required unless code or config also changed

## Project Structure Implications

The selected stack should be scaffolded to align with the architecture document:

```text
src/
  domain/
  application/
  infrastructure/
  ui/
```

Additional directories expected early:

```text
data/
docs/
```

Testing support should be placed in:

```text
src/test/
```

or an equivalent dedicated test-support directory that does not blur production boundaries.

## Rationale

### Why React + TypeScript + Vite

- mature and fast browser-game UI stack
- fast local iteration
- simple scaffold path
- TypeScript improves agent and human reasoning over contracts

### Why Redux Toolkit

- explicit state transitions
- predictable integration for complex UI
- good tooling and test ergonomics
- enough structure to keep the application boundary legible

Redux Toolkit is chosen for integration discipline, not as a substitute for domain modeling.

### Why Zod

- runtime validation is needed for content-heavy systems
- aligns well with TypeScript
- useful at content and save boundaries

### Why Vitest

- fast feedback loop
- works naturally with Vite
- suitable for TDD in domain and UI layers

### Why ESLint + Prettier

- clear static rules and consistent formatting
- reduces churn in multi-agent code review

## Non-Goals

This decision does not:

- define every package version
- define the final persistence storage mechanism beyond local-first boundaries
- define a backend stack
- authorize business logic inside Redux slices or React components
- commit the project to end-to-end tooling before the first playable slice exists

## Constraints for Future Agents

- do not place core game rules in React components
- do not place core game rules in Redux reducers unless the reducer is only applying already-defined domain logic
- validate content and save boundaries with Zod
- write domain and application behavior with TDD by default
- prefer pure modules in `src/domain` and `src/application`

## Follow-On Work Unblocked

This decision unblocks:

- project scaffold and baseline scripts
- initial test and lint setup
- first domain contracts
- first data-schema work
- initial UI shell planning
