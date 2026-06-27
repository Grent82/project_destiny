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
- Use `docs/workflows/lower-model-playbook.md` when delegating work to smaller/cheaper models or subagents.
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

## UI Work — Playwright MCP

A Playwright MCP server is configured in `.mcp.json`. For any UI/layout/screen work, use it to take screenshots and verify results visually:

```bash
pnpm dev   # start dev server first (port 5173)
# then use playwright MCP tools: playwright_screenshot, playwright_navigate, playwright_click
```

**UI/UX and Art Direction beads must be labeled:**

```bash
bd label add <id> ui-ux        # interaction, layout, component work
bd label add <id> art-direction # icons, images, visual identity
```

A UI bead without a label is a gap. This rule applies to all agents.

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

**When ending a work session**, you MUST complete ALL steps below.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Run quality gates**:
   - `bd preflight` (beads hygiene: lint + stale + orphans; note: the Go/Nix checklist in its output is a known limitation of the beads CLI — ignore those lines)
   - `pnpm lint` — ESLint + TypeScript
   - `pnpm typecheck` — `tsc --noEmit`
   - `pnpm test:run` — Vitest test suite
5. **Push code** (if changes made):
   ```bash
   git add .
   git commit -m "feat: ..."  # or appropriate message
   ```
   **Note:** No git remote configured. Commits are local-only.

**CRITICAL RULES:**
- Run quality gates before considering work shippable: `pnpm lint && pnpm typecheck && pnpm test:run`
- Note: `bd preflight` output includes a Go/Nix checklist that doesn't apply to this TypeScript project — this is a known limitation of the beads CLI; ignore those lines and use the pnpm commands above
- All commits are local-only (no remote configured)
- Use `bd close <id>` to mark issues complete
- The `SessionEnd` hook auto-runs `bd preflight` on session exit
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

`./scripts/codex-test.sh` also applies the current Codex-desktop stability guardrails:
- `STORYBOOK_DISABLE_CHROMATIC=1`
- default `--maxWorkers=4` unless you override it explicitly

Check that wrapper and `vite.config.ts` first if the full Vitest run starts failing through Storybook/browser worker startup noise.

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

## Schema-Change Hygiene

Bei `contracts.ts` Schema-Änderungen:

1. **BEFORE schreiben:** `grep -r "fieldName" src --include="*.ts" --include="*.tsx"` für alle Lese-Stellen, `grep -r "fieldName" src --include="*.test.ts"` für Test-Fixtures
2. **AFTER schreiben:** `pnpm typecheck` IMMER ausführen, VOR commit
3. **Alle TypeError in einem Batch fixen**, nicht inkrementell — Schema-Drift ohne vollständige Consumer-Analyse führt zu 6-10 Korrektur-Iterationen

**Checklist für pregnancyState-Änderungen:**
- [ ] Domain schema aktualisiert
- [ ] Initial game state aktualisiert (`data/runtime/initial-game-state.json`)
- [ ] Alle command tests aktualisiert
- [ ] Alle fixture files aktualisiert (`testFixtures.ts`, `initialStateWithIda`, etc.)
- [ ] `rosterReducers.ts` (wenn pregnancyState geschrieben wird)
- [ ] `pursuePlayerLegacy.ts/test.ts`
- [ ] `applyNpcPairing.ts`
- [ ] `captivityPregnancyDiscovery.ts/test.ts`

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
