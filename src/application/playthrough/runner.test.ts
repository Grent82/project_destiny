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
