# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

## Project Workflow

- Read `docs/agent-operating-model.md` before starting significant work.
- Follow `docs/engineering-standards.md` for architecture and code quality rules.
- Use `docs/task-contract.md` when creating or refining tasks.
- Treat Beads as the only backlog and dependency tracker.

## Architecture and Quality Priorities

- Clean architecture with inward dependency flow
- Strong testability and extensibility
- TDD for domain and application behavior
- Small, bounded tasks with clear ownership
- No business rules hidden in UI components

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

Use the baseline validation loop below.

```bash
pnpm lint
pnpm format
pnpm test
pnpm test:run
pnpm typecheck
pnpm build
```

## Architecture Overview

The architecture docs will be created and maintained through the Architect role. Until then, use the design intent from `GAME_DESIGN_DOCUMENT.md` and the operating constraints in `docs/engineering-standards.md`.

## Conventions & Patterns

- Domain logic should remain framework-agnostic.
- Business behavior should be covered by tests first when changed.
- Use explicit contracts and narrow write scopes for agent tasks.
