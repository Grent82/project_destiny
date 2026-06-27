# Agent Instructions

Project Destiny uses a coordinator-led multi-agent workflow with Beads as the only backlog system.

## Start Here

- Read [docs/agent-operating-model.md](docs/agent-operating-model.md).
- Follow [docs/engineering-standards.md](docs/engineering-standards.md).
- Use the task structure in [docs/task-contract.md](docs/task-contract.md).
- Use [docs/workflows/bead-creation.md](docs/workflows/bead-creation.md) when creating or refining Beads.
- **Bead clarity standards**: Every Bead must include `DO NOT` section (failure modes to avoid), `Visibility Level` (BACKGROUND|MOMENT|CONTINUOUS) for simulation work, and `Examples` (BAD vs GOOD) for ambiguous work. See template at `.beads/templates/bead-description.md`.
- Use [docs/workflows/design-review.md](docs/workflows/design-review.md) for any player-facing design work or UX critique.
- Use [docs/workflows/event-review.md](docs/workflows/event-review.md) when designing or reviewing authored events, tutorial events, or event aftermath presentation.
- Use [docs/workflows/dialogue-review.md](docs/workflows/dialogue-review.md) when designing or reviewing dialogue trees.
- Use [docs/workflows/loop-level-verification.md](docs/workflows/loop-level-verification.md) for player-facing loop changes, routing changes, event pacing changes, and aftermath surfaces.
- Use [docs/workflows/ki-retro.md](docs/workflows/ki-retro.md) when the user asks for lessons learned from a session, workflow errors, collaboration failures, or sustainable process improvements.
- Use `/clear-review` skill for structured code reviews using the C.L.E.A.R. Framework (Correctness, Libraries, Efficiency, Architecture, Risks).
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
- **Destructive CLI writes** (`bd update --description/--notes`, file overwrites from variables): never feed them from an unverified pipeline. Validate the variable first, run the loop on ONE id and read the result back, then batch. (A failed parse once blanked 8 bead descriptions.)
- **Bead claims must be code-verified first.** Before writing 'X is missing' or 'nothing does Y' into a bead, grep for it. A bead that misdescribes the system misroutes every model that executes it. (A 2026-06-11 bead claimed missing antagonists while simulateRivalOrgs acted daily.)
- In screen tests, prefer **role-based queries** (`getByRole('heading', …)`, panel scoping via `within`) over `getByText` for any string that can legitimately appear twice (map label + panel, card + plan).

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

## UI Work — Playwright MCP

A Playwright MCP server is configured in `.mcp.json`. For any UI/layout/screen work, use it to take screenshots and verify the result visually before committing:

```bash
pnpm dev   # start dev server first
# then use playwright MCP tools: playwright_screenshot, playwright_navigate, playwright_click
```

**Read the actual port from the dev-server output before verifying.** Vite falls back to 5174+ when 5173 is taken; a browser pointed at a stale server silently shows old assets (changes "don't work", icons "missing"). If a change does not appear, check the server port before debugging the change.

**Before closing a player-facing UI bead**, walk the fresh-eyes and map/plate checklists in `docs/workflows/design-review.md` against screenshots — legend completeness, spatial plausibility, stranger test for names — and record the violations found in the bead. Zero findings on a first pass means the pass was not honest.

**UI/UX and Art Direction beads must be labeled.** When creating or updating a bead that touches screens, components, layout, or visual identity:

```bash
bd label add <id> ui-ux        # for interaction and layout work
bd label add <id> art-direction # for visual identity, icons, images
```

This rule applies to all agents. A UI bead without a label is a gap.

## Code Change Gates

Run these **before committing** (typecheck first, then tests, then build):

```bash
pnpm typecheck     # zero errors - MUST pass before commit
pnpm test:run      # must pass, count must not drop below 333
pnpm build         # clean build before committing
```

Do not rely on post-commit hooks. Typecheck failures block the commit.

If the Codex desktop environment resolves `node` to the bundled app runtime and Vite/Vitest fail to load `rolldown` native bindings, use the project-local fallback wrappers instead:

```bash
./scripts/codex-test.sh
./scripts/codex-typecheck.sh
./scripts/codex-build.sh
```

`./scripts/codex-test.sh` also carries Codex-desktop stability overrides:
- sets `STORYBOOK_DISABLE_CHROMATIC=1` for local test runs
- defaults Vitest to `--maxWorkers=4` unless you override it explicitly

If the full test run starts failing through Storybook/browser worker noise again, inspect that wrapper and `vite.config.ts` before treating it as a gameplay regression.

## TDD Practice

Write tests parallel to code, not after. When writing a test:
- Read the implementation first — do not guess expected values.
- Verify ranges, deltas, and computed values from the code before writing assertions.
- If the test fails due to wrong assumptions, fix the test, not the code.
- For new behavior in domain/application layers, write the failing test before the implementation.

When running repo-wide tests, watch for nested worktrees or generated mirrors under `.claude/worktrees/`.
They can cause duplicate test discovery, worker timeouts, or false negatives if the runner scans them as part of the project tree.
If a full run starts picking up test files from those paths, treat that as tooling noise first and fix the discovery scope before debugging product code.

## Pre-Commit Checklist

Before any `git commit`, verify:
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm test:run` passes, test count not dropped
- [ ] `pnpm build` succeeds
- [ ] No unintended file changes (check `git status`)
- [ ] Commit message follows convention (`feat:`, `fix:`, `docs:`, `chore:`)

## C.L.E.A.R. Review Checklist

Before closing any implementation Bead with code changes:

### C - Correctness
- [ ] Code compiles without errors
- [ ] All functional requirements met
- [ ] Edge cases handled (null, empty, boundaries)
- [ ] Logic verified (no off-by-one, correct conditions)

### L - Libraries & Dependencies
- [ ] All imports exist in package.json
- [ ] No hallucinated packages or APIs
- [ ] Dependencies follow clean architecture (Domain has no external deps)
- [ ] `npm audit` clean or known issues documented

### E - Efficiency
- [ ] No obvious O(n²) patterns where O(n) possible
- [ ] No redundant operations in loops
- [ ] Resources properly managed (no leaks)
- [ ] React: no unnecessary re-renders

### A - Architecture Fit
- [ ] Domain logic in domain layer only
- [ ] No framework code in domain
- [ ] Side effects at system boundaries
- [ ] Code follows project patterns

### R - Risks & Security
- [ ] No secrets/credentials in code
- [ ] Input validated at boundaries
- [ ] No XSS/SQL injection risks
- [ ] Error messages don't leak internals

## Schema Change Checklist

Whenever `gameStateSchema` in `src/domain/game/contracts.ts` changes:

1. Update `data/runtime/initial-game-state.json` with the new field and its default.
2. Find all test fixtures: `grep -rl 'BASE_GAME\|gameState' src --include='*.test.ts'`
3. Update every fixture that builds a full `GameState` object.
4. Run `pnpm test:run` — verify all tests pass.
5. Warn the user: browser localStorage saves with the old schema will be auto-discarded.

Skipping any step causes startup crashes (the "Take the Ledger" class of bug).

## Verification Protocol — Read/Verify Before Write

**Kernregel:** Bevor ANYTHING geschrieben wird (Code, Bead, Datei, Schema), müssen die folgenden Verifikationsschritte durchgeführt werden. Jedes Überspringen kostet typischerweise 2-4 Stunden Nacharbeit.

### ✅ Checkliste (vor jedem Write)

**1. Source lesen**
- `grep -r "symbolName" src --include="*.ts"` für alle Vorkommnisse
- `Read` die tatsächliche Datei für aktuellen Stand
- **NIEMALS** Versionen, Signaturen oder Existenz aus Memory/Summary annehmen

**2. Schema-Abhängigkeiten prüfen (bei contracts.ts Änderungen)**
- Alle Schemas die das Feld referenzieren auflisten
- Zyklische Abhängigkeiten vor Umordnung prüfen
- `data/runtime/initial-game-state.json` mit Default-Werten aktualisieren
- **data/definitions/*.json** Content-Dateien prüfen (quest templates, etc.)
- **ALLE** Test-Fixtures die GameState bauen aktualisieren
- `pnpm typecheck` sofort nach Schreiben, VOR Commit

**3. Entry Points finden (bei Constraints "cannot X")**
- Alle UI Entry Points greppen die den Command dispatchen
- Alle Command Guards greppen die die Constraint enforced
- **Einen Test pro Entry Point** schreiben
- Bead ist unvollständig wenn nicht alle Entry Points gefixt sind

**4. Pipeline-Outputs validieren (bei destruktiven Writes)**
- Variable zuerst echo: `echo "$var" | head -1`
- Länge prüfen: `[ -n "$var" ] || exit 1` (bash) oder `assert` (Python)
- Mit **einem Item** testen bevor batching über mehrere IDs/Dateien
- Nach jedem destruktiven Batch sofort eine Probe lesen

**5. Post-Compaction Verifikation**
- Alle zusammengefassten Fakten als **"verdächtig, nicht bewiesen"** behandeln
- Versionsnummern neu greppen (z.B. `saveVersion`)
- Symbol-Namen und Pfade neu greppen
- **NIEMALS** Code-Fakten, Versionen, API-Signaturen aus Summaries copy-pasten

**6. Schema-Ordnung (zyklische Dependencies)**
- Welche Schemas referenzieren welche (Dependency Graph zeichnen)
- Abhängige Schemas **nach** ihren Dependencies definieren
- Sofort mit `pnpm typecheck` testen — Zod wirft bei Forward-References

### Kosten-Nutzen

| Übersprungener Schritt | Typische Nacharbeit | Vorbeugungsaufwand |
|------------------------|---------------------|-------------------|
| Source nicht gelesen | 2-4h iterative Fixes | 5-10min grep + Read |
| Schema ohne Consumer-Analyse | 86 TypeError, 3h Batch-Fix | 10min grep alle Consumer |
| Entry Points unvollständig | Blocker in UI, Nachbesserung | 5min grep + 1 Test pro Pfad |
| Pipeline nicht validiert | 8 gelöschte Beads, manueller Restore | 2min echo + length check |
| Compaction-Fakten unverifiziert | Phantom-IDs, falsche Versionen | 5min Re-grep |

### Bead-Hygiene

Beads können "verwaist" sein (funktional erledigt, aber nicht geschlossen). Vor jeder Implementation:
1. `bd show <id>` lesen → Was sagt die Description wirklich?
2. Code gegen Behauptung prüfen → Existiert die Funktionalität schon?
3. Tests laufen → Sind sie grün oder rot?

**Kosten verpasster Prüfung**: Ticket als "zu machen" annehmen, dann feststellen es ist schon da → 30min Zeitverschwendung + falscher Epic-Progress

### Ticket-Scope

Bei `/loop` Abarbeitung: **Kleine, fokussierte Tickets priorisieren**. Große Tickets (>3 neue Files, mehrere Commands) sollten:
1. Erst als "zu groß" markiert werden
2. In kleinere, unabhängige Teile gesplittet werden
3. Oder als "Design Required" zurückgestellt werden

**Kosten falscher Scope**: 15-30min pro Ticket für Analysis, dann Verwerfen → Zeitverlust für Loop-Effizienz

## Circular Dependency Prevention

**Schema-Refactoring Rule — Circular Dependency Prevention:**

Bevor du eine Schema-Definition von A nach B verschiebst:

1. **Git history check**: `git log -p --follow -- <file>` um ursprüngliche Location zu finden
2. **Import graph analysieren**: 
   - `grep -r "from.*shared/contracts" src/domain --include="*.ts" | wc -l` (wer importiert von shared?)
   - `grep -r "from.*npc/contracts" src/domain --include="*.ts" | wc -l` (wer importiert von npc?)
3. **Zirkulärisität prüfen**: Wenn A von B importiert UND B von A → ZIRKULÄR!
4. **Tests laufen lassen**: Nicht nur `pnpm typecheck` sondern auch `pnpm test:run` - zirkuläre Dependencies zeigen sich oft erst im Runtime-Import (TypeError: Cannot read properties of undefined)

**Warum**: Verschieben von `npcIntentionTypeSchema` von `shared/contracts` nach `npc/contracts` mit Import zurück nach shared → zirkulär → 187 Test-Files failed. Git stash/pattern zeigte dass 2340 Tests vorher grün waren.

**Wie anwenden**: Bei jedem Schema-Refactor:
```bash
# 1. Import-Graph visualisieren
grep -r "from.*contracts" src/domain --include="*.ts" | grep -v "node_modules" | head -20

# 2. Zirkularität prüfen
# Wenn shared/contracts importiert von npc/contracts UND npc/contracts importiert von shared/contracts → STOP

# 3. After fix, full test run
pnpm test:run  # nicht nur typecheck!
```

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
- Use `bd remember` for session-relevant insights during active work
- Use `.claude/memory/MEMORY.md` for durable project knowledge that persists across sessions (ki-retro output)

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
