# Testing Strategy

Comprehensive documentation for Project Destiny's testing approach, covering test architecture, patterns, and workflows.

## 1. Overview

### Testing Philosophy

Project Destiny employs a multi-layered testing strategy that prioritizes:

- **Determinism**: All tests use seeded RNG to ensure reproducible results
- **Clean Architecture**: Tests respect layer boundaries (Domain → Application → UI)
- **Data-First**: Scenarios are plain objects, not class instances
- **Explicit Feedback**: Failures are accumulated rather than throwing, providing complete failure reports

### Testing Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Pyramid                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                      ┌─────┐                                │
│                      │ E2E │  (1-5% - Browser/Playwright)   │
│                    ┌───────┴───────┐                        │
│                    │ Playthrough    │  (10-15% - Scenarios) │
│                  ┌──┴───────────────┴──┐                    │
│                  │ Integration          │  (20-25% - Store) │
│                ┌──┴─────────────────────┴──┐                │
│                │      Unit Tests            │  (60-70%)     │
│                └─────────────────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 2. Test Pyramid

### Unit Tests (60-70%)

**Scope**: Individual commands, utilities, and pure functions

**Location**: Co-located with source files (`*.test.ts`)

**Characteristics**:
- Fast execution (<1ms per test)
- No external dependencies
- Test single behavior in isolation
- Use `testFixtures.ts` for common state setups

**Example**:
```typescript
import { applyFoodConsumption } from './applyFoodConsumption'

it('reduces food stock by total consumption', () => {
  const state = makeState({ foodStock: 10000 })
  const result = applyFoodConsumption(state)
  expect(result.foodStock).toBe(10000 - expectedConsumption)
})
```

### Integration Tests (20-25%)

**Scope**: Command + Redux store interactions, selector compositions

**Location**: `src/application/commands/`, `src/application/selectors/`

**Characteristics**:
- Test command-to-reducer pipelines
- Verify store state transitions
- Validate selector view models

**Example**:
```typescript
const store = createGameStore(initialState)
store.dispatch(gameActions.addNpcToSelectedSquad('npc-id'))
expect(store.getState().game.selectedSquadNpcIds).toContain('npc-id')
```

### Playthrough Tests (10-15%)

**Scope**: Declarative end-to-end scenario specs at the command layer

**Location**: `src/application/playthrough/scenarios/`

**Characteristics**:
- Express player intentions as typed steps
- No UI references (command-level only)
- Execute deterministically with seeded RNG
- Support branching scenarios

**See Section 8 for detailed playthrough documentation.**

### E2E Tests (1-5%)

**Scope**: Browser-level user flows

**Location**: `src/ui/playthrough/`, `e2e/`

**Characteristics**:
- Playwright-based browser automation
- Test actual UI interactions
- Validate end-to-end user journeys

**Example**:
```typescript
// src/ui/playthrough/goldenPath.test.ts
test('completes golden path through UI', async ({ page }) => {
  await page.goto('/game')
  await page.click('[data-testid="start-expedition"]')
  // ...
})
```

## 3. Test Framework

### Vitest Configuration

**File**: `vite.config.ts`

```typescript
test: {
  include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  exclude: ['src/**/*.stories.@(js|jsx|mjs|ts|tsx)', 'src/**/*.mdx'],
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/test/setup.ts',
}
```

**Key Settings**:

| Setting | Value | Purpose |
|---------|-------|---------|
| `include` | `src/**/*.test.ts(x)` | Test file pattern |
| `exclude` | `*.stories.*`, `*.mdx` | Skip Storybook/MDX files |
| `environment` | `jsdom` | DOM emulation for React tests |
| `globals` | `true` | Enable `describe`, `it`, `expect` without imports |
| `setupFiles` | `./src/test/setup.ts` | Global test setup |

### Multi-Project Structure

The configuration supports two test projects:

1. **Main Project**: Standard unit/integration tests
2. **Storybook Project**: Component tests via `@storybook/addon-vitest`

### Setup File

**File**: `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom/vitest'
```

Provides Jest-compatible matchers:
- `toBeInTheDocument()`
- `toHaveTextContent()`
- `toHaveAttribute()`
- `toBeVisible()`
- And 50+ more Testing Library matchers

## 4. Test Commands

### Available pnpm Scripts

| Command | Description |
|---------|-------------|
| `pnpm test` | Vitest watch mode |
| `pnpm test:run` | Single-pass test run (CI) |
| `pnpm test:playthrough` | Run all playthrough scenarios |
| `pnpm test:playthrough:golden` | Golden path scenario only |
| `pnpm test:playthrough:branches` | Branch scenario tests |
| `pnpm test:playthrough:funnel` | Quest funnel playthrough |
| `pnpm test:playthrough:invariants` | Event system invariants |
| `pnpm test:playthrough:browser` | Browser-based playthrough tests |
| `pnpm test:playthrough:all` | All playthrough test suites |
| `pnpm test:e2e` | Playwright E2E tests |
| `pnpm test:e2e:ui` | Playwright UI mode |
| `pnpm test:e2e:debug` | Playwright debug mode |
| `pnpm test:e2e:report` | Show E2E report |

### Running Specific Tests

```bash
# Single test file
pnpm exec vitest run src/application/commands/combat.test.ts

# Specific test by name
pnpm exec vitest run src/application/commands/combat.test.ts -t "advances rngSeed"

# Test directory
pnpm exec vitest run src/application/playthrough/

# With coverage
pnpm test:run --coverage
```

## 5. Test Structure

### File Naming Conventions

| Pattern | Location | Purpose |
|---------|----------|---------|
| `*.test.ts` | Co-located with source | Unit tests |
| `*.test.tsx` | UI components | React component tests |
| `fixtures.ts` | Test directories | Shared test data |
| `contracts.ts` | Test directories | Type definitions |
| `runner.ts` | Test directories | Test execution logic |

### Directory Structure

```
src/
├── application/
│   ├── commands/
│   │   ├── applyFoodConsumption.ts
│   │   ├── applyFoodConsumption.test.ts  # Co-located tests
│   │   └── testFixtures.ts               # Shared fixtures
│   ├── playthrough/
│   │   ├── contracts.ts                  # Scenario types
│   │   ├── runner.ts                     # Scenario executor
│   │   ├── fixtures.ts                   # Playthrough fixtures
│   │   └── scenarios/
│   │       ├── goldenPath.ts
│   │       ├── goldenPath.test.ts
│   │       ├── branchScenarios.test.ts
│   │       └── ...
│   └── selectors/
│       └── *.test.ts                     # Selector tests
├── ui/
│   ├── playthrough/                      # Browser playthrough tests
│   └── components/
│       └── Button.test.tsx               # Component tests
└── test/
    └── setup.ts                          # Global setup
```

## 6. Fixtures

### Using testFixtures.ts

**File**: `src/application/commands/testFixtures.ts`

Provides pre-built test data to avoid constructing complex state from scratch.

**Available Fixtures**:

```typescript
import { idaRhysRosterEntry, initialStateWithIda } from './testFixtures'

// Single NPC roster entry (Ida Rhys after hiring)
const npc = idaRhysRosterEntry

// Complete game state with Marion + Ida on roster
const state = initialStateWithIda
```

### Creating Custom Fixtures

Pattern for test-specific fixtures:

```typescript
// In your test file
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initialGameStateSnapshot,
    ...overrides,
  }
}

// Usage
const state = makeState({
  money: 500,
  roster: [...initialRoster, customNpc],
})
```

### Playthrough Fixtures

**File**: `src/application/playthrough/fixtures.ts`

```typescript
import {
  fixtureDefaultStart,    // Day 1, clean state
  fixtureDay15,           // Day 15, morning
  fixtureDebtCrisisImminent, // Day 28, no money
  fixtureCombatActive,    // Combat active state
  withState,              // Helper: merge with snapshot
  standardInvariants,     // Common invariant set
} from './fixtures'
```

**Helper Function**:
```typescript
const customStart = withState({
  day: 30,
  money: 100,
  debtPaid: false,
})
```

## 7. Command Testing Pattern

### Standard Pattern

Commands are pure state transformers: `(state: GameState, params) => GameState`

```typescript
import { myCommand } from './myCommand'
import { initialGameStateSnapshot } from '../store/initialGameState'

describe('myCommand', () => {
  // Fixture factory
  function makeState(overrides: Partial<typeof initialGameStateSnapshot> = {}) {
    return {
      ...initialGameStateSnapshot,
      ...overrides,
    }
  }

  it('performs expected state transformation', () => {
    // Arrange
    const state = makeState({
      money: 1000,
      roster: [{ ...baseNpc, npcId: 'test-npc' }],
    })

    // Act
    const result = myCommand(state, { param: 'value' })

    // Assert
    expect(result.money).toBe(900)
    expect(result.roster).toHaveLength(2)
  })

  it('handles edge case: empty roster', () => {
    const state = makeState({ roster: [] })
    const result = myCommand(state, { param: 'value' })
    expect(result.roster).toEqual([])
  })

  it('is deterministic for same inputs', () => {
    const state = makeState({ money: 500 })
    const result1 = myCommand(state, { param: 'value' })
    const result2 = myCommand(state, { param: 'value' })
    expect(result1).toEqual(result2)
  })

  it('preserves unrelated state fields', () => {
    const state = makeState({
      money: 1000,
      factionStandings: { factionA: 50 },
    })
    const result = myCommand(state, { param: 'value' })
    expect(result.factionStandings).toEqual(state.factionStandings)
  })
})
```

### Testing with Redux Store

For integration tests that verify reducer behavior:

```typescript
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'

describe('myCommand reducer', () => {
  it('dispatches command and updates state', () => {
    const store = createGameStore(initialGameStateSnapshot)

    store.dispatch(gameActions.myCommand({ param: 'value' }))

    const state = store.getState().game
    expect(state.money).toBe(900)
  })
})
```

## 8. Playthrough Tests

### Architecture

```
Scenario Definition  →  Runner  →  RunResult
       ↓                    ↓           ↓
  PlaythroughScenario   runScenario   { passed, failures, trace }
```

### Scenario Structure

**File**: `src/application/playthrough/contracts.ts`

```typescript
export interface PlaythroughScenario {
  id: string              // Unique stable identifier
  title: string           // Human-readable name
  rngSeed: number         // Deterministic seed
  initialState?: Partial<GameState>  // Optional overrides
  steps: ScenarioStep[]   // Ordered steps
  invariants?: AssertionSpec[]       // Checked after each step
}
```

### Step Types

```typescript
// Execute a command via dispatch
dispatchStep('label', (state, dispatch) => {
  dispatch(gameActions.someCommand(params))
})

// Advance game time
advanceDaysStep('label', days: number)

// Validate state predicates
assertStep('label', [
  assertion('id', 'description', (state) => boolean),
])

// Snapshot partial state
checkpointStep('checkpoint-id', 'label')

// Split into parallel branches
branchStep('label', [
  { branchId: 'branch-a', label: 'Option A', steps: [...] },
  { branchId: 'branch-b', label: 'Option B', steps: [...] },
])
```

### Writing a Scenario

**File**: `src/application/playthrough/scenarios/goldenPath.ts`

```typescript
import type { PlaythroughScenario } from '../contracts'
import { dispatchStep, assertStep, checkpointStep, assertion } from '../contracts'
import { gameActions } from '../../store/gameSlice'

export const goldenPathScenario: PlaythroughScenario = {
  id: 'scenario-golden-path',
  title: 'Golden Path: Management → Expedition → Return',
  rngSeed: 7,
  initialState: {
    ...initialGameStateSnapshot,
    money: 300,
  },

  steps: [
    checkpointStep('cp-start', 'Initial state'),

    assertStep('Verify starting conditions', [
      assertion('money-available', 'Money >= 200', (s) => s.money >= 200),
      assertion('expedition-idle', 'No expedition active', (s) =>
        s.expeditionState.status === 'idle'
      ),
    ]),

    dispatchStep('Add NPC to squad', (_state, dispatch) => {
      dispatch(gameActions.addNpcToSelectedSquad('npc-marion-vale'))
    }),

    dispatchStep('Start expedition', (_state, dispatch) => {
      dispatch(
        gameActions.startExpedition({
          destinationId: 'dest-green-corridor',
          squadNpcIds: ['npc-marion-vale'],
          supplies: 5,
        })
      )
    }),

    assertStep('Expedition started', [
      assertion('exp-traveling', 'Status is traveling', (s) =>
        s.expeditionState.status === 'traveling'
      ),
      assertion('npc-deployed', 'NPC assignment is deployed', (s) =>
        s.roster.find((n) => n.npcId === 'npc-marion-vale')?.assignment === 'deployed'
      ),
    ]),

    // ... more steps
  ],

  invariants: [
    assertion('money-non-negative', 'Money never negative', (s) => s.money >= 0),
    assertion('day-positive', 'Day always positive', (s) => s.day > 0),
    assertion('roster-alive', 'All NPCs healthy', (s) =>
      s.roster.every((n) => n.states.health >= 0)
    ),
  ],
}
```

### Running Scenarios

**File**: `src/application/playthrough/scenarios/goldenPath.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { runScenario, formatPlaythroughReport } from '../runner'
import { goldenPathScenario } from './goldenPath'

describe('Golden Path Scenario', () => {
  it('completes successfully', () => {
    const result = runScenario(goldenPathScenario)
    expect(result.passed).toBe(true)
  })

  it('produces expected final state', () => {
    const result = runScenario(goldenPathScenario)
    expect(result.finalState.expeditionState.status).toBe('idle')
    expect(result.finalState.roster[0].assignment).toBe('idle')
  })

  it('generates stable report', () => {
    const result = runScenario(goldenPathScenario)
    const report = formatPlaythroughReport(result)
    expect(report).toMatchSnapshot()
  })
})
```

### Branch Testing

```typescript
export const branchScenario: PlaythroughScenario = {
  id: 'scenario-branch-test',
  title: 'Test Decision Branches',
  rngSeed: 42,
  steps: [
    dispatchStep('Setup', (state, dispatch) => {
      dispatch(gameActions.someSetupCommand())
    }),

    // Branch into two paths
    {
      type: 'branch',
      label: 'Choose path',
      branches: [
        {
          branchId: 'pay-debt',
          label: 'Pay debt',
          steps: [
            dispatchStep('Pay debt', (state, dispatch) => {
              dispatch(gameActions.payDebt())
            }),
            assertStep('Verify paid', [
              assertion('debt-paid', 'Debt is paid', (s) => s.debtPaid === true),
            ]),
          ],
        },
        {
          branchId: 'ignore-debt',
          label: 'Ignore debt',
          steps: [
            advanceDaysStep('Wait', 15),
            assertStep('Verify crisis', [
              assertion('crisis-triggered', 'Crisis triggered', (s) =>
                s.debtCrisisTriggered === true
              ),
            ]),
          ],
        },
      ],
    },
  ],
}
```

### Invariants

**Shared Invariants** (`src/application/playthrough/fixtures.ts`):

```typescript
export const standardInvariants: AssertionSpec[] = [
  invariantMoneyNonNegative,  // Money >= 0
  invariantDayPositive,       // Day > 0
  invariantSquadFromRoster,   // Squad members exist in roster
  invariantDebtConsistency,   // debtPaid && debtCrisisTriggered = false
  invariantQuestNoOverlap,    // Active quests not in completed
]
```

**Custom Invariants**:
```typescript
assertion(
  'custom-invariant-id',
  'Human-readable description',
  (state) => /* predicate returns true if invariant holds */
)
```

## 9. Coverage

### Coverage Configuration

Coverage is configured via `@vitest/coverage-v8`:

```bash
pnpm test:run --coverage
```

### Coverage Requirements

- **Statements**: Target 80%+
- **Branches**: Target 75%+
- **Functions**: Target 80%+
- **Lines**: Target 80%+

### Generating Coverage Report

```bash
# Generate HTML report
pnpm test:run --coverage --reporter=html

# View in browser
open coverage/index.html
```

### Coverage Exclusions

The following are typically excluded from coverage:
- Test setup files (`src/test/setup.ts`)
- Type-only files (`contracts.ts`)
- Fixture files (`fixtures.ts`, `testFixtures.ts`)
- Storybook files (`*.stories.tsx`)

## 10. Best Practices

### Naming Conventions

**Test Descriptions**:
```typescript
// ✓ Good - describes behavior
it('reduces food stock by total consumption')
it('handles edge case: empty roster')
it('is deterministic for same inputs')

// ✗ Avoid - implementation details
it('returns new state object')
it('calls calculateTotalConsumption')
```

**Assertion Messages**:
```typescript
// ✓ Good
expect(result.money).toBe(900)
expect(state.roster).toHaveLength(2)

// ✗ Avoid - redundant when test name is clear
expect(result.money).toBe(900) // money should be 900
```

### Determinism Rules

1. **Never use `Math.random()`** - Always use seeded RNG from `state.rngSeed`
2. **Avoid time-based logic** - Use game day, not real time
3. **Clone state properly** - Use `structuredClone()` for deep copies
4. **Reset RNG per step** - Runner handles this automatically

### Assertion Patterns

**Single Responsibility**:
```typescript
// ✓ One assertion per test where possible
it('reduces food stock', () => {
  expect(result.foodStock).toBe(1000 - consumption)
})

// ✗ Multiple unrelated assertions
it('does everything', () => {
  expect(result.foodStock).toBe(900)
  expect(result.money).toBe(500)
  expect(result.roster).toHaveLength(3)
})
```

**Error Handling**:
```typescript
// ✓ Accumulate failures (playthrough style)
const failures: RunFailure[] = []
for (const spec of specs) {
  if (!spec.predicate(state)) {
    failures.push({ ... })
  }
}
expect(failures).toHaveLength(0)

// ✗ Early throw (stops at first failure)
if (!predicate(state)) {
  throw new Error('Failed')
}
```

### Test Organization

**Group Related Tests**:
```typescript
describe('applyFoodConsumption', () => {
  describe('food stock reduction', () => {
    it('reduces by total consumption')
    it('clamps to 0 when insufficient')
  })

  describe('determinism', () => {
    it('produces same result for same state')
    it('advances rngSeed consistently')
  })

  describe('state preservation', () => {
    it('preserves waterAccess')
    it('preserves materialStock')
  })
})
```

### Playthrough-Specific Guidelines

1. **Use meaningful step labels**: `'Depart on expedition'` not `'Step 1'`
2. **Assert after state-changing steps**: Validate expected transitions
3. **Use checkpoints for snapshot testing**: Capture key milestones
4. **Define invariants upfront**: System-wide constraints
5. **Test branches for decision points**: Cover alternative paths

### Common Anti-Patterns

```typescript
// ✗ DON'T: Test implementation details
it('calls calculateTotalConsumption internally')

// ✓ DO: Test observable behavior
it('reduces food stock by roster + district consumption')

// ✗ DON'T: Create state from scratch every time
it('works', () => {
  const state = { day: 1, money: 100, roster: [...], districts: [...] }
  // ... 50 lines of setup
})

// ✓ DO: Use fixture factories
it('works', () => {
  const state = makeState({ money: 100 })
})

// ✗ DON'T: Ignore edge cases
it('calculates consumption', () => {
  // Only tests normal case
})

// ✓ DO: Test boundaries
it('calculates consumption', () => {
  // Normal case
})
it('handles zero roster members')
it('handles maximum district count')
```

## Quick Reference

### Test Command Cheatsheet

```bash
# Development (watch mode)
pnpm test

# CI/CD (single pass)
pnpm test:run

# Specific file
pnpm exec vitest run src/path/to/file.test.ts

# Specific test name
pnpm exec vitest run file.test.ts -t "test name"

# Playthrough suites
pnpm test:playthrough:golden
pnpm test:playthrough:all
pnpm test:playthrough:funnel

# With coverage
pnpm test:run --coverage
```

### Fixture Import Paths

```typescript
// Command-level fixtures
import { idaRhysRosterEntry, initialStateWithIda } from './testFixtures'

// Playthrough fixtures
import {
  fixtureDefaultStart,
  fixtureDay15,
  standardInvariants,
  withState,
} from '../fixtures'

// Scenario helpers
import {
  dispatchStep,
  assertStep,
  checkpointStep,
  advanceDaysStep,
  assertion,
} from '../contracts'

// Runner
import { runScenario, formatPlaythroughReport } from '../runner'
```

### Invariant Checklist

When writing playthrough scenarios, consider these standard invariants:

- [ ] Money never goes negative
- [ ] Day counter always positive
- [ ] Roster NPCs have valid health (≥ 0)
- [ ] Selected squad members exist in roster
- [ ] Debt state is consistent (not both paid and crisis)
- [ ] Active quests don't overlap with completed
- [ ] Expedition state machine transitions are valid
- [ ] Faction standings remain in valid range

---

*Last updated: 2026-06-27*
