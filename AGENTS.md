# Agent Instructions

Project Destiny uses a coordinator-led multi-agent workflow with Beads as the only backlog system.

## Start Here

- Read [docs/agent-operating-model.md](docs/agent-operating-model.md).
- Follow [docs/engineering-standards.md](docs/engineering-standards.md).
- Use the task structure in [docs/task-contract.md](docs/task-contract.md).
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
- Follow clean architecture boundaries.
- Use TDD for domain and application behavior by default.
- Treat `Narrative`, `UI/UX`, and `Art Direction` as explicit project roles, not ad hoc creative side work.
- Record blockers and assumptions in the active Bead instead of leaving them in chat only.
- Create a new Bead for follow-up work rather than silently expanding scope.

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
