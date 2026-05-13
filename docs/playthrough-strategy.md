# Playthrough Strategy and Scenario Inventory

Project Destiny uses a layered playthrough harness to validate game state correctness and UI action wiring. This document describes the strategy, the current scenario inventory, and how to extend coverage.

---

## Strategy Overview

**Command-level playthroughs are primary.** They execute pure state-mutation functions without any DOM or framework overhead. They are fast, deterministic, and ideal for regression coverage of game logic.

**Browser-level smoke playthroughs are secondary.** They render React components with React Testing Library to verify that the same scenario intent is honoured in the UI — that buttons are wired to correct actions and that key routes render without crashing.

### Why this layering?

| Layer | What it proves | Speed | Stability |
|---|---|---|---|
| Command-level | State machine correctness, invariants, branch outcomes | Fast | High |
| Browser smoke | Action wiring, route reachability, visible consequences | Medium | Medium |

Browser tests do not try to replicate command-level coverage. They focus on a small critical set: does the UI let the player do the thing the command layer expects?

---

## Execution Commands

```bash
# Run all playthrough suites
pnpm test:playthrough:all

# Command-level only (full playthrough harness + funnel)
pnpm test:playthrough

# Golden-path scenario only
pnpm test:playthrough:golden

# Branch scenario pack only
pnpm test:playthrough:branches

# Quest-funnel regression scenarios
pnpm test:playthrough:funnel

# Browser smoke playthroughs only
pnpm test:playthrough:browser
```

All commands are thin wrappers over `vitest run <path>`. The output format is identical to `pnpm test:run`. Use `--reporter=verbose` for step-by-step trace.

---

## Scenario Inventory

### Command-Level Scenarios (`src/application/playthrough/scenarios/`)

| File | Scenario ID | Seed | Purpose |
|---|---|---|---|
| `goldenPath.ts` | `scenario-golden-path` | 42 | Baseline: squad prep → expedition → return. No quest, no combat. Roster and money invariants. |
| `combatFirst.ts` | `scenario-combat-first` | 1001 | Squad-combat engagement on day 1, then expedition. Verifies combat-to-expedition transition. |
| `economyFirst.ts` | `scenario-economy-first` | 2002 | Marks accumulation before expedition. Verifies economy flow without combat. |
| `failurePath.ts` | `scenario-failure-path` | 3003 | Debt crisis triggered. Verifies debt and faction penalties on crisis. |
| `debtDeadline.ts` | `scenario-debt-deadline` | 4004 | Branch scenario: pay vs. ignore debt. Divergent outcomes verified in parallel. |
| `relationshipFirst.ts` | `scenario-relationship-first` | 5005 | Relationship changes before and after expedition return. |

### Quest-Funnel Scenarios (`src/application/commands/questFunnelPlaythrough.test.ts`)

| Group | Scenario | What it proves |
|---|---|---|
| Delivery funnel | `quest-nightbloom-extract` | Lead discovery → accept → step guard → on-site advance → resolution |
| Investigation funnel | `quest-ledger-recovery` | Accepted state, district context, travel integration |
| Complication check | `quest-nightbloom-extract` | risk=0 succeeds, risk=1 fails, not_ready guard, no dangling state |
| Deduplication | any | `addQuestLeadIfNew` is idempotent |

### Browser Smoke Tests (`src/ui/playthrough/smokePlaythrough.test.tsx`)

| Group | What it proves |
|---|---|
| Golden-path dashboard | GlobalStatusBar renders day, End Day advances state, active quest visible |
| Contract execution | Delivery on-site screen renders, two-step flow resolves quest |
| House screen | Renders rooms, "View House Accounts" link present |
| Investigation | Empty state renders without crash, `startInvestigation` action wires correctly |

---

## Report Utilities

The `formatPlaythroughReport(result)` and `diffBranchResults(baseLabel, base, compareLabel, compare)` functions in `src/application/playthrough/runner.ts` produce stable text output:

```ts
import { runScenario, formatPlaythroughReport, diffBranchResults } from '../playthrough/runner'
import { goldenPathScenario } from '../playthrough/scenarios/goldenPath'

const result = runScenario(goldenPathScenario)
console.log(formatPlaythroughReport(result))

// For branch comparison:
const payBranch = result.branches!['branch-pay']
const ignoreBranch = result.branches!['branch-ignore']
console.log(diffBranchResults('pay', payBranch, 'ignore', ignoreBranch))
```

---

## How to Add New Scenarios

### Adding a command-level scenario

1. Create a new file in `src/application/playthrough/scenarios/`.
2. Export a `PlaythroughScenario` object using the `dispatchStep`, `assertStep`, `checkpointStep`, and `assertion` helpers from `../contracts`.
3. Choose a unique `id` (format: `scenario-<name>`) and an explicit `rngSeed` integer.
4. Add a test file alongside it (or in `runner.test.ts`) that calls `runScenario(yourScenario)` and asserts `result.passed`.
5. Register the scenario in the table above.

### Adding a branch scenario

Use a `BranchStep` in your scenario:

```ts
import { branchStep, dispatchStep } from '../contracts'

// Inside your scenario steps array:
branchStep('key-decision', [
  { branchId: 'branch-a', label: 'Option A', steps: [...] },
  { branchId: 'branch-b', label: 'Option B', steps: [...] },
])
```

The runner executes each branch independently and populates `result.branches`.

### Adding a browser smoke test

1. Add a new `describe` block to `src/ui/playthrough/smokePlaythrough.test.tsx`.
2. Use the existing `AppProviders` + `MemoryRouter` + `createGameStore` pattern.
3. Focus on route reachability and action wiring — not exhaustive state comparison.
4. Reuse the same quest IDs and district IDs as the command-level funnel tests where possible.

### Naming rules

- Scenario IDs: `scenario-<kebab-case-name>`
- Branch IDs: `branch-<kebab-case-outcome>`
- Checkpoint IDs: `cp-<kebab-case-label>`
- Assertion IDs: `assert-<metric>-<condition>` (e.g. `assert-money-positive`)

---

## Invariants

The runner supports `invariants: AssertionSpec[]` on any scenario. These are checked after every step. Common invariants:

```ts
assertion('assert-money-non-negative', 'Money must not go negative', (state) => state.money >= 0),
assertion('assert-no-duplicate-quests', 'No duplicate active quest IDs', (state) => {
  const ids = state.activeQuests.map((q) => q.questId)
  return new Set(ids).size === ids.length
}),
```

---

## CI Integration

The playthrough commands are ready to wire into CI as a pre-merge gate:

```yaml
# Example GitHub Actions step
- run: pnpm test:playthrough:all
```

The output is stable (no random timestamps, no floating metrics) and exits non-zero on any failure.
