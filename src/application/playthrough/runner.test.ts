import { describe, it, expect } from 'vitest'
import { runScenario } from './runner'
import { debtDeadlineScenario } from './scenarios/debtDeadline'
import type { PlaythroughScenario } from './contracts'
import {
  dispatchStep,
  assertStep,
  checkpointStep,
  advanceDaysStep,
  assertion,
} from './contracts'
import { gameActions } from '../store/gameSlice'

describe('playthrough runner contract', () => {
  describe('builder helpers', () => {
    it('dispatchStep returns correct type', () => {
      const step = dispatchStep('test', () => {})
      expect(step.type).toBe('dispatch')
      expect(step.label).toBe('test')
    })

    it('assertStep returns correct type', () => {
      const step = assertStep('check', [assertion('a', 'desc', () => true)])
      expect(step.type).toBe('assert')
    })

    it('checkpointStep returns correct type', () => {
      const step = checkpointStep('cp1', 'label')
      expect(step.type).toBe('checkpoint')
      expect(step.checkpointId).toBe('cp1')
    })

    it('advanceDaysStep returns correct type', () => {
      const step = advanceDaysStep('wait', 5)
      expect(step.type).toBe('advance-days')
      expect(step.days).toBe(5)
    })
  })

  describe('runScenario — linear', () => {
    const simpleScenario: PlaythroughScenario = {
      id: 'scenario-simple',
      title: 'Simple linear pass',
      rngSeed: 1,
      steps: [
        advanceDaysStep('Advance 2 days', 2),
        checkpointStep('cp1', 'After 2 days'),
        assertStep('Day is at least 3', [
          assertion('day-gte-3', 'day >= 3', (state) => state.day >= 3),
        ]),
      ],
    }

    it('returns passed: true for a passing scenario', () => {
      const result = runScenario(simpleScenario)
      expect(result.passed).toBe(true)
      expect(result.failures).toHaveLength(0)
    })

    it('captures checkpoint state', () => {
      const result = runScenario(simpleScenario)
      expect(result.checkpoints['cp1']).toBeDefined()
      expect(result.checkpoints['cp1'].day).toBeGreaterThanOrEqual(3)
    })

    it('records a trace entry per step', () => {
      const result = runScenario(simpleScenario)
      expect(result.trace).toHaveLength(3)
      expect(result.trace.every((t) => t.status === 'ok')).toBe(true)
    })
  })

  describe('runScenario — failing assertion', () => {
    const failingScenario: PlaythroughScenario = {
      id: 'scenario-failing',
      title: 'Deliberately failing assertion',
      rngSeed: 1,
      steps: [
        assertStep('Impossible check', [
          assertion('always-fail', 'This always fails', () => false),
        ]),
      ],
    }

    it('returns passed: false and records failure', () => {
      const result = runScenario(failingScenario)
      expect(result.passed).toBe(false)
      expect(result.failures.some((f) => f.assertionId === 'always-fail')).toBe(true)
    })
  })

  describe('runScenario — dispatch step', () => {
    it('dispatch can modify state via gameActions', () => {
      const scenario: PlaythroughScenario = {
        id: 'scenario-dispatch',
        title: 'Dispatch changes state',
        rngSeed: 1,
        steps: [
          advanceDaysStep('Advance 1 day', 1),
          assertStep('Day advanced', [
            assertion('day-gt-1', 'day > 1 after advance', (state) => state.day > 1),
          ]),
        ],
      }
      const result = runScenario(scenario)
      expect(result.passed).toBe(true)
    })
  })

  describe('runScenario — branching', () => {
    const branchingScenario: PlaythroughScenario = {
      id: 'scenario-branch',
      title: 'Branch scenario',
      rngSeed: 1,
      steps: [
        {
          type: 'branch',
          label: 'Money branch',
          branches: [
            {
              branchId: 'earn',
              label: 'Earn money',
              steps: [
                dispatchStep('Advance day', (_s, d) => d(gameActions.endDay())),
                assertStep('Day advanced', [assertion('day', 'day > 1', (s) => s.day > 1)]),
              ],
            },
            {
              branchId: 'no-earn',
              label: 'Do nothing',
              steps: [
                assertStep('No extra money', [assertion('money-same', 'money unchanged', (s) => s.money >= 0)]),
              ],
            },
          ],
        },
      ],
    }

    it('executes branches independently', () => {
      const result = runScenario(branchingScenario)
      expect(result.branches).toBeDefined()
      expect(result.branches!['earn']).toBeDefined()
      expect(result.branches!['no-earn']).toBeDefined()
    })

    it('each branch has its own trace', () => {
      const result = runScenario(branchingScenario)
      expect(result.branches!['earn'].trace.length).toBeGreaterThan(0)
    })
  })

  describe('runScenario — example scenario (debt deadline)', () => {
    it('executes without crashing', () => {
      expect(() => runScenario(debtDeadlineScenario)).not.toThrow()
    })

    it('produces a RunResult with both branches', () => {
      const result = runScenario(debtDeadlineScenario)
      expect(result.branches?.['branch-pay']).toBeDefined()
      expect(result.branches?.['branch-ignore']).toBeDefined()
    })

    it('pay branch records cp-after-pay checkpoint', () => {
      const result = runScenario(debtDeadlineScenario)
      expect(result.branches!['branch-pay'].checkpoints['cp-after-pay']).toBeDefined()
    })
  })
})

import { formatPlaythroughReport, diffBranchResults } from './runner'
import type { RunResult } from './contracts'
import { initialGameStateSnapshot } from '../store/initialGameState'

function makeRunResult(overrides: Partial<RunResult> = {}): RunResult {
  return {
    scenarioId: 'test-scenario',
    finalState: { ...initialGameStateSnapshot },
    checkpoints: {},
    trace: [{ label: 'step-1', status: 'ok' }],
    failures: [],
    passed: true,
    ...overrides,
  }
}

describe('formatPlaythroughReport', () => {
  it('includes scenario id and PASSED status for clean run', () => {
    const report = formatPlaythroughReport(makeRunResult())
    expect(report).toContain('test-scenario')
    expect(report).toContain('PASSED')
  })

  it('shows FAILED and failure count when there are failures', () => {
    const result = makeRunResult({
      passed: false,
      failures: [{ stepLabel: 'step-1', assertionId: 'a', description: 'money too low' }],
    })
    const report = formatPlaythroughReport(result)
    expect(report).toContain('FAILED')
    expect(report).toContain('1 failure')
    expect(report).toContain('money too low')
  })

  it('includes final state metrics', () => {
    const report = formatPlaythroughReport(makeRunResult())
    expect(report).toContain('Day:')
    expect(report).toContain('Money:')
    expect(report).toContain('Roster:')
    expect(report).toContain('Unrest:')
  })

  it('shows branch summary when branches are present', () => {
    const result = makeRunResult({
      branches: {
        'branch-a': makeRunResult({ scenarioId: 'branch-a', passed: true }),
        'branch-b': makeRunResult({ scenarioId: 'branch-b', passed: false, failures: [{ stepLabel: 's', assertionId: 'x', description: 'fail' }] }),
      },
    })
    const report = formatPlaythroughReport(result)
    expect(report).toContain('branch-a')
    expect(report).toContain('branch-b')
  })
})

describe('diffBranchResults', () => {
  it('reports no meaningful deltas when states are identical', () => {
    const r = makeRunResult()
    const diff = diffBranchResults('A', r, 'B', r)
    expect(diff).toContain('no meaningful metric deltas')
  })

  it('highlights money difference', () => {
    const base = makeRunResult({ finalState: { ...initialGameStateSnapshot, money: 100 } })
    const compare = makeRunResult({ finalState: { ...initialGameStateSnapshot, money: 250 } })
    const diff = diffBranchResults('base', base, 'compare', compare)
    expect(diff).toContain('Money')
    expect(diff).toContain('+150')
  })

  it('highlights last encounter outcome change', () => {
    const base = makeRunResult({ finalState: { ...initialGameStateSnapshot, lastEncounterSummary: null } })
    const compare = makeRunResult({
      finalState: {
        ...initialGameStateSnapshot,
        lastEncounterSummary: { outcome: 'victory', label: 'Victory', day: 1, timeSlot: 'morning', linkedQuestId: null, noteLines: [] },
      },
    })
    const diff = diffBranchResults('base', base, 'compare', compare)
    expect(diff).toContain('Last encounter')
    expect(diff).toContain('victory')
  })
})
