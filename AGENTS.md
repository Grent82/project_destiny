# Agent Instructions

Project Destiny uses a coordinator-led multi-agent workflow with Beads as the only backlog system.

## Start Here

- Read [docs/agent-operating-model.md](docs/agent-operating-model.md).
- Follow [docs/engineering-standards.md](docs/engineering-standards.md).
- Use the task structure in [docs/task-contract.md](docs/task-contract.md).
- Use [docs/workflows/bead-creation.md](docs/workflows/bead-creation.md) when creating or refining Beads.
- Use [docs/workflows/design-review.md](docs/workflows/design-review.md) for any player-facing design work or UX critique.
- Use [docs/workflows/dialogue-review.md](docs/workflows/dialogue-review.md) when designing or reviewing dialogue trees.
- Use [docs/workflows/loop-level-verification.md](docs/workflows/loop-level-verification.md) for player-facing loop changes, routing changes, event pacing changes, and aftermath surfaces.
- Use [docs/workflows/ki-retro.md](docs/workflows/ki-retro.md) when the user asks for lessons learned from a session, workflow errors, collaboration failures, or sustainable process improvements.
- Respect role boundaries in [docs/roles](docs/roles).
- Use [docs/workflows](docs/workflows) when the task is narrative, UI-heavy, or art-direction-heavy.

## Required Workflow

```bash
bd prime
bd ready
bd show <id>
bd update <id> --claim
```

Do not start implementation before the task is claimed and its ownership is clear.

## Session Start Checklist

Every session must begin with these two steps **before claiming any bead**:

1. `bd prime` — load full workflow context and session protocol
2. **RPG audit** — run the quick alignment check from [docs/workflows/session-rpg-audit.md](docs/workflows/session-rpg-audit.md)

The RPG audit answers four questions about whether this session's planned work advances player character agency, the Mira story arc, world NPC interactions, or meaningful choice and consequence. If the answer to all four is No, reorder the queue before starting.

## Core Rules

- Use `bd` for all backlog and dependency tracking.
- Prefer small, testable tasks with explicit file ownership.
- When creating or updating a Bead, include `why`, `what`, `why now`, `player impact`, `system impact`, explicit non-goals, acceptance, and finding coverage.
- Follow clean architecture boundaries.
- Use TDD for domain and application behavior by default.
- Treat `Narrative`, `UI/UX`, and `Art Direction` as explicit project roles, not ad hoc creative side work.
- Record blockers and assumptions in the active Bead instead of leaving them in chat only.
- Create a new Bead for follow-up work rather than silently expanding scope.
- For narrative-heavy Beads, record a `fiction contract`.
- For player-facing Beads, verify not only state correctness but also player comprehension, route clarity, and post-action readability.
- After regressions, interruptions, or user-reported quality failures, run a `KI Retro` pass before moving on if the user asks for process improvement. Convert important findings into docs, Beads, tests, or instruction updates.

## Audit → Bead Traceability Rule

When converting a list of findings (from audits, reviews, or expert reports) into beads, you **must** produce an explicit mapping before finishing:

1. List every finding by number or ID.
2. For each finding, record which bead covers it — either its own bead or a named group bead.
3. Any finding not in the mapping is a **gap** — create a bead for it before closing.
4. Grouping related findings into one bead is fine; silently dropping a finding is not.

This prevents the synthesis agent from merging 48 findings into 27 beads and losing 7 without notice.

## Non-Interactive Shell Commands

Always use non-interactive flags with commands that may prompt.

```bash
cp -f source dest
mv -f source dest
rm -f file
rm -rf directory
cp -rf source dest
```

## Code Change Gates

Run these before **and** after any code change:

```bash
pnpm test:run      # must pass, count must not drop below 333
pnpm typecheck     # zero errors
pnpm build         # clean build before committing
```

If the Codex desktop environment resolves `node` to the bundled app runtime and Vite/Vitest fail to load `rolldown` native bindings, use the project-local fallback wrappers instead:

```bash
./scripts/codex-test.sh
./scripts/codex-typecheck.sh
./scripts/codex-build.sh
```

## Schema Change Checklist

Whenever `gameStateSchema` in `src/domain/game/contracts.ts` changes:

1. Update `data/runtime/initial-game-state.json` with the new field and its default.
2. Find all test fixtures: `grep -rl 'BASE_GAME\|gameState' src --include='*.test.ts'`
3. Update every fixture that builds a full `GameState` object.
4. Run `pnpm test:run` — verify all tests pass.
5. Warn the user: browser localStorage saves with the old schema will be auto-discarded.

Skipping any step causes startup crashes (the "Take the Ledger" class of bug).

## Dead Code Watch

When touching `combat.ts`, `endDay.ts`, or `gameSlice.ts`:

- Every flag or field **set** must also be **read** somewhere in the same file or its consumers.
- If you write to a field and nothing reads it: create a bead, do not leave silent dead code.
- Known dead mechanics tracked in bead `destiny-a8r` (staggered flag, evasionPenalty).

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
