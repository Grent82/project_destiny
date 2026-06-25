# Engineering Standards

## Purpose

These standards define how Project Destiny code should be written so multiple agents can extend it safely over time.

## Primary Goals

- testability
- extensibility
- low coupling
- explicit contracts
- maintainable domain logic

## Clean Code Rules

- Prefer small functions with explicit inputs and outputs.
- Keep side effects at the edges of the system.
- Name modules by domain purpose, not technical convenience.
- Avoid hidden mutable shared state.
- Prefer explicit data transformations over clever abstractions.
- Delete dead code quickly instead of leaving speculative hooks.
- Do not introduce framework dependencies into core domain modules.

## Architecture Rules

- Keep domain logic framework-agnostic.
- Represent business concepts as typed models or value objects.
- Put orchestration in application services or use cases.
- Put persistence, I/O, and adapters in infrastructure.
- Keep UI concerned with interaction and presentation only.

## Testing Rules

- TDD is the default.
- Every domain rule should have direct unit tests.
- Every bug fix should begin with a failing test when reproducible.
- Avoid relying only on broad integration tests for core calculations.
- Prefer deterministic tests over snapshot-heavy tests.
- Mock only at external boundaries.

### Outcome-asymmetry rule

When a command or event has multiple outcome paths (`victory`/`defeat`, `success`/`failure`, `found`/`not found`), **every distinct outcome must have its own test**.

A passing defeat test does not imply the victory path is correct. A passing success test does not imply the failure branch is correct.

Apply this rule especially to:
- combat resolution (`concludeCombatEncounter` with `victory`, `defeat`)
- quest settlement (`settleQuestSuccess`, `settleQuestFailure`)
- investigation outcomes
- any command that branches on a boolean flag or enum

When writing a test for one outcome, immediately write the sibling test for the opposite outcome in the same commit.

### Entry-point completeness rule

When a feature has a constraint described to the player (e.g. "cannot deploy", "cannot train", "cannot equip"), **every code entry point that could bypass that constraint must be guarded and tested**.

Do not treat one guard in one location as sufficient. Audit: selector, command, UI dispatch path. All three must enforce the same rule. Shared helpers (e.g. `isDeployable()`) are preferred over ad-hoc per-location guards.

## Extensibility Rules

- Add new capabilities through stable interfaces where possible.
- Avoid giant central switch statements when domain polymorphism can be made explicit.
- Keep data definitions declarative where content is expected to grow.
- Separate immutable content definitions from mutable save-state.

## Value-convention-as-schema rule

**When two systems communicate through a value convention, that is a missing schema field.**

Example: if command A writes `state.lastFiredDay['site-growth:pressure'] = 5` and command B reads it to make a decision, that string key and its numeric value represent shared domain knowledge. That knowledge should be:

1. **Named** — a constant or enum member, not a magic string
2. **Registered** — in the appropriate schema or catalog
3. **Documented** — owner and key namespace recorded

**Current lastFiredDay namespace example** (documented as anti-pattern, kept for migration):
- `site-growth:*` — site pressure/growth tracking
- `site-pressure:*` — site occupancy pressure
- `rel-milestone-*` — relationship milestone fire days
- `captivity-pregnancy:*` — captivity/pregnancy state

**Rule**: New code must not add to grab-bag fields. If a value is shared across systems, it gets its own schema field with a default in initial state.

## Review Rules

Code review should prioritize:

- correctness
- architectural integrity
- test coverage quality
- dependency direction
- clarity of intent
- player comprehension for player-facing changes
- visible consequence after interaction
- layer-appropriate information hierarchy in UI surfaces

Style issues matter less than structural violations.

## Refactoring Guidance

Refactor only when one of these is true:

- duplication is causing maintenance risk
- current structure blocks a required feature
- tests are hard to write because boundaries are wrong
- domain concepts are leaking across layers

Do not perform broad opportunistic refactors inside unrelated tasks.

## Living World Intimacy Principles

Intimacy ist ein **Living World Mechanic**, nicht Player-only:

1. **NPC-NPC Intimacy ist der Kern** — NPCs bilden Beziehungen unabhängig vom Player. Das ist die primäre Simulation; Player-NPC ist sekundär.

2. **Player-NPC Intimacy ist sekundär** — Player kann teilnehmen, aber ist nicht der Auslöser. Neue Intimacy-Features immer zuerst als NPC-NPC Mechanic designen, dann Player-Integration hinzufügen.

3. **Keine globalen Settings** — Pregnancy ist immer ON. Kein Feature-Flag, kein "disable pregnancy" Toggle. Das ist ein Welt-Mechanic, keine Spiel-Einstellung.

4. **Contraception ist item-driven** — Keine abstract boolean Preference. Contraception existiert nur als physische Items im Inventory von Spieler oder NPC.
   - **NPC-Produktion:** Apotheker, Heiler, Schwarzmarkthändler produzieren Contraception Items (kein Spieler-Crafting)
   - **Mehrere Quellen:** Gilded Heights (premium), The Tangle (schwarzmarkt), The Pale (basic)
   - **Dynamisches Angebot/Nachfrage:** Verfügbarkeit schwankt per District-Tension, Restock-Cycles, Preis-Modulatoren
   - **Item-Typen:** Herbal Contraceptive (basic, Einweg), Barrier Device (premium, mehrmalig), Tonic/Elixir (mittel, 3-5 uses)
   - **Inventory-Check vor Intimacy:** Keine Items = kein Schutz, keine Checkbox im UI

**Warum:** Living World Prinzip — NPCs sind Agenten mit eigenen Leben, nicht nur Player-Tools. Intimacy ist Teil der sozialen Simulation, nicht ein Player-Feature. Contraception als Item macht den Mechanic sichtbar, taktbar und in die Wirtschaft integrierbar.

**Beads:**
- `destiny-l3mw` — Player-NPC physical intimacy (CLOSED — implemented)
- `destiny-k98y` — NPC-NPC physical intimacy (Living World) (P2)
- `destiny-z7xr` — Contraception Items: NPC-Produktion, dynamisches Angebot/Nachfrage (P2)

## Quality Gates

### Pre-commit hook

`simple-git-hooks` runs `pnpm typecheck` before every commit. A commit with TypeScript errors is blocked.

Set up after cloning:
```bash
pnpm install   # runs prepare automatically, which installs the hook
```

If the hook is missing after a fresh clone, run:
```bash
pnpm prepare
```

### CI (GitHub Actions)

`.github/workflows/ci.yml` runs `pnpm typecheck` and `pnpm test:run` on every push to `main` and on every pull request targeting `main`.
