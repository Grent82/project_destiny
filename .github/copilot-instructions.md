# Copilot Instructions — Project Destiny

## Session Start

Every session must begin with:

```bash
bd prime          # load full workflow context and session protocol
```

Then run the RPG audit from `docs/workflows/session-rpg-audit.md` before claiming any work. Do not start implementation before a bead is claimed.

```bash
bd ready              # find available work
bd show <id>          # view task details
bd update <id> --claim  # claim before starting
bd close <id>         # mark done when finished
```

Use `bd` for ALL task tracking. Do not use markdown TODO lists or other tools.

When creating or materially refining a Bead, follow `docs/workflows/bead-creation.md`.
Use `docs/workflows/design-review.md` for player-facing design review and UX critique.
Use `docs/workflows/dialogue-review.md` for dialogue-tree work.
At minimum, include:

- `why`
- `what`
- `why now`
- `player impact`
- `system impact`
- explicit non-goals
- acceptance criteria
- finding coverage

For narrative-heavy Beads, also include a `fiction contract`.
For player-facing work, verify comprehension, route clarity, and visible consequence — not only passing state tests.

## Build, Test & Lint

```bash
pnpm dev          # start dev server
pnpm build        # tsc -b && vite build
pnpm typecheck    # zero errors required
pnpm lint         # eslint
pnpm format       # prettier --write .
pnpm test         # vitest watch mode
pnpm test:run     # vitest run (CI — must pass, count must not drop below 333)
```

Run a single test file:
```bash
pnpm test:run src/application/commands/combat.test.ts
```

Run tests matching a pattern:
```bash
pnpm test:run --reporter=verbose -t "endDay"
```

**Before and after every code change:** `pnpm test:run && pnpm typecheck && pnpm build`

## Architecture

Four layers with inward-only dependency flow:

```
UI → Application → Domain
Infrastructure → Application → Domain
```

- **`src/domain/`** — pure game rules, no framework dependencies. Subfolders per concept: `combat/`, `npc/`, `factions/`, `items/`, `quests/`, `relationships/`, etc. Each exports a `contracts.ts` with Zod schemas and inferred types.
- **`src/application/`** — orchestration. `commands/` for state mutations, `selectors/` for reads, `store/` for Redux slice + store, `content/` for catalog access, `ports/` for I/O interfaces.
- **`src/infrastructure/`** — browser adapters: `persistence/` (localStorage), `content/` (JSON loaders).
- **`src/ui/`** — React components only; no business rules. `screens/`, `components/`, `app/`.

State management: Redux Toolkit (`gameSlice.ts`). All gameplay mutations go through slice actions backed by pure command functions in `src/application/commands/`.

## Key Conventions

### GameState is the central contract

`src/domain/game/contracts.ts` exports `gameStateSchema` (Zod) and the inferred `GameState` type. **Every field in `GameState` must also exist with a default in `data/runtime/initial-game-state.json`.**

**Schema change checklist** — any time `gameStateSchema` changes:
1. Update `data/runtime/initial-game-state.json`.
2. Find affected fixtures: `grep -rl 'BASE_GAME\|gameState' src --include='*.test.ts'`
3. Update every fixture that builds a full `GameState`.
4. Run `pnpm test:run` — verify all pass.
5. Warn: browser localStorage saves with the old schema will be auto-discarded at runtime.

Skipping any step causes startup crashes.

### Content vs. runtime state

- **Immutable definitions** (NPC stats, item specs, faction defs) live in `data/definitions/` as JSON, loaded via `src/application/content/contentCatalog.ts`.
- **Mutable runtime state** lives in `GameState` (the Redux store). Content is referenced by stable string IDs only.

### Test fixtures

- `src/application/commands/testFixtures.ts` — shared `GameState` snapshots (e.g. `initialStateWithIda`). Extend here when new scenarios are needed across multiple tests.
- The canonical starting state is `initialGameStateSnapshot` from `src/application/store/initialGameState.ts`, which parses `data/runtime/initial-game-state.json` at startup.
- Vitest globals are enabled; `jsdom` environment; setup in `src/test/setup.ts`.

### TDD is the default

Write a failing test first for every new domain or application behavior. Mock only at external boundaries (ports).

### Dead code watch

When touching `combat.ts`, `endDay.ts`, or `gameSlice.ts`: every flag or field **set** must also be **read** somewhere. If you write to a field nothing reads, create a bead — do not leave silent dead code.

### Randomness injection

Domain functions that need randomness accept an RNG function as an explicit parameter (not `Math.random()` directly). `src/application/commands/seededRng.ts` provides a deterministic RNG for tests.

## Session Completion

Work is NOT complete until `git push` succeeds:

```bash
git pull --rebase
bd dolt push
git push
git status  # must show "up to date with origin"
```

## Key Files

| File | Purpose |
|---|---|
| `src/domain/game/contracts.ts` | `GameState` schema — central contract |
| `data/runtime/initial-game-state.json` | Default game state; must match schema |
| `src/application/store/gameSlice.ts` | Redux slice; all gameplay actions |
| `src/application/commands/testFixtures.ts` | Shared test state snapshots |
| `src/application/content/contentCatalog.ts` | Content definition loader |
| `docs/architecture.md` | Layer definitions and module rules |
| `docs/engineering-standards.md` | Code and testing standards |
