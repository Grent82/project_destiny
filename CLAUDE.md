# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Workflow

- Read `docs/agent-operating-model.md` before starting significant work.
- Follow `docs/engineering-standards.md` for architecture and code quality rules.
- Use `docs/task-contract.md` when creating or refining tasks.
- Use `docs/workflows/bead-creation.md` when creating or materially refining Beads.
- Use `docs/workflows/design-review.md` for player-facing design review and UX critique.
- Use `docs/workflows/dialogue-review.md` for dialogue-tree work.
- Use `docs/workflows/ki-retro.md` when asked for lessons learned, workflow issues, or sustainable quality/process improvements.
- Treat Beads as the only backlog and dependency tracker.

## Architecture and Quality Priorities

- Clean architecture with inward dependency flow
- Strong testability and extensibility
- TDD for domain and application behavior
- Small, bounded tasks with clear ownership
- No business rules hidden in UI components
- Beads must record `why`, `what`, `why now`, `player impact`, `system impact`, explicit non-goals, acceptance, and finding coverage
- Narrative-heavy Beads must also record a `fiction contract`
- Player-facing work must be reviewed for comprehension, route clarity, and visible consequence, not only for passing tests
- When a session exposed regressions, collaboration failures, or escaped quality issues, follow `docs/workflows/ki-retro.md` and turn the findings into durable artifacts rather than leaving them in chat only

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->


## Build & Test

```bash
pnpm lint
pnpm format
pnpm test           # watch mode
pnpm test:run       # single pass, all tests
pnpm typecheck
pnpm build
```

If the Codex desktop runtime hits the `rolldown` native-binding / codesign failure, use the project-local wrappers that force a compatible system Node:

```bash
./scripts/codex-test.sh
./scripts/codex-typecheck.sh
./scripts/codex-build.sh
```

When running repo-wide tests, watch for nested worktrees or generated mirrors under `.claude/worktrees/`.
They can cause duplicate test discovery, worker timeouts, or misleading failures if the runner traverses them as part of the repository.
Treat that as a test-discovery hygiene problem first, not immediately as a product regression.

**Run a single test file:**
```bash
pnpm exec vitest run src/application/commands/combat.test.ts
```

**Run a specific test by name:**
```bash
pnpm exec vitest run src/application/commands/combat.test.ts -t "advances rngSeed"
```

**Playthrough regression suites:**
```bash
pnpm test:playthrough:golden    # canonical regression (fastest)
pnpm test:playthrough:all       # all playthrough scenarios
pnpm test:playthrough:funnel    # quest funnel scenarios
pnpm test:playthrough:browser   # browser smoke
```

## Architecture

The project uses clean architecture with a strict inward dependency direction:

```
UI → Application → Domain
Infrastructure → Application → Domain
```

Domain must not import from UI, Infrastructure, or any browser/framework API.

### Layer Overview

**`src/domain/`** — Pure game rules; no framework dependencies.
Each subdomain has a `contracts.ts` that exports Zod schemas and inferred types. Key subdomains: `game`, `npc`, `combat`, `quests`, `events`, `factions`, `items`, `relationships`, `governance`, `districts`, `expedition`, `rumors`, `titles`, `dialogue`, `progression`, `shared`.

The central aggregate is `GameState` (defined in `src/domain/game/contracts.ts`). Everything mutable lives in `GameState`. Immutable content definitions (NPC defs, item defs, faction defs) live separately in `data/definitions/*.json` and are loaded into `contentCatalog` at startup.

**`src/application/`** — Orchestration and use cases.
- `commands/` — Pure functions `(state: GameState, ...params) → GameState`. Name them as imperative domain actions (`endDay`, `startCombatEncounter`, `recruitNpc`). Side effects are forbidden here.
- `selectors/` — Memoized Redux selectors that compose runtime state with content definitions to produce view models. Nothing in UI computes a view model itself.
- `store/gameSlice.ts` — One Redux slice wrapping all commands as thin reducers. Reducers call commands and return their result.
- `content/contentCatalog.ts` — Static registry of all game definitions loaded from JSON. Access definitions by array or by ID.
- `ports/` — Interfaces (e.g. `SaveGameStore`) implemented by infrastructure.
- `playthrough/` — Declarative end-to-end scenario specs (`runner.ts` executes them step-by-step).

**`src/infrastructure/`** — Adapters and persistence. `localSaveSnapshot.ts` implements `SaveGameStore`, handles save migration (v0→v1→v2), and validates with `gameStateSchema` before persisting.

**`src/ui/`** — React + Redux. Screens select data via `useAppSelector` and dispatch actions via `useAppDispatch`. No business logic in components. 21 screen routes defined in `App.tsx`.

### Key Patterns

**Command (pure state transformer):**
```ts
export function commandName(state: GameState, params: ...): GameState {
  // return new state, never mutate
}
```

**Reducer (thin wrapper in gameSlice.ts):**
```ts
actionName(state, action: PayloadAction<...>) {
  const snapshot = current(state) as GameState
  return commandFn(snapshot, action.payload)
}
```

**Selector (view model composer):**
```ts
export const selectSomething = createSelector(
  [selectGame],
  (game) => /* merge runtime state with contentCatalog definitions */
)
```

**Schema + type (domain contracts):**
```ts
export const thingSchema = z.object({ ... })
export type Thing = z.infer<typeof thingSchema>
```
Always use `import type { Foo }` when the import is type-only (`verbatimModuleSyntax` is enabled).

### Determinism and RNG

All randomness flows through `state.rngSeed`. Commands that need randomness derive a seeded RNG from it and advance the seed in the returned state. Tests rely on the deterministic seed — do not introduce `Math.random()`.

### Activity Log

`appendActivityLogEntry(state, category, message)` adds player-visible feedback to `state.activityLog` (capped at 100). Valid categories: `'economy' | 'combat' | 'system'`.

### Test Fixtures

`src/application/commands/testFixtures.ts` exports:
- `idaRhysRosterEntry` — a pre-built `NpcRuntimeState`
- `initialStateWithIda` — a `GameState` with Ida on the roster

Use these as the base for command tests rather than constructing state from scratch.

## Conventions

- Schemas named `*Schema`, types inferred as `z.infer<typeof *Schema>`.
- Module names describe domain purpose, not technical role (`applyNpcAgency`, not `npcUtils`).
- Tests co-located with their command files (e.g. `combat.ts` → `combat.test.ts`).
- Content definitions are immutable; mutable save-state is versioned and validated on load.
- Refactor only when: duplication causes maintenance risk, current structure blocks a feature, tests are hard to write, or domain concepts are leaking across layers.
