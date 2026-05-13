import { describe, it, expect } from 'vitest'
import {
  fixtureDefaultStart,
  fixtureDay15,
  fixtureDebtCrisisImminent,
  withState,
  standardInvariants,
  diffBranches,
  branchDivergedOn,
} from './fixtures'
import { runScenario } from './runner'
import type { PlaythroughScenario } from './contracts'
import { advanceDaysStep, assertStep, assertion } from './contracts'

describe('playthrough fixtures and helpers', () => {
  describe('withState helper', () => {
    it('merges partial over base snapshot', () => {
      const state = withState({ day: 15, money: 0 })
      expect(state.day).toBe(15)
      expect(state.money).toBe(0)
      expect(state.roster).toBeDefined()
    })

    it('fixtureDay15 produces day 15 state', () => {
      const state = withState(fixtureDay15)
      expect(state.day).toBe(15)
    })

    it('fixtureDebtCrisisImminent has no money and debt not triggered', () => {
      const state = withState(fixtureDebtCrisisImminent)
      expect(state.money).toBe(0)
      expect(state.debtCrisisTriggered).toBe(false)
    })
  })

  describe('standardInvariants', () => {
    it('pass on default start state', () => {
      const state = withState(fixtureDefaultStart)
      const failures = standardInvariants
        .filter((inv) => !inv.predicate(state))
        .map((inv) => inv.description)
      expect(failures).toHaveLength(0)
    })

    it('money-non-negative catches negative money', () => {
      const state = withState({ money: -1 })
      const inv = standardInvariants.find((i) => i.id === 'money-non-negative')!
      expect(inv.predicate(state)).toBe(false)
    })

    it('debt-consistency catches paid + crisis both true', () => {
      const state = withState({ debtPaid: true, debtCrisisTriggered: true })
      const inv = standardInvariants.find((i) => i.id === 'debt-consistency')!
      expect(inv.predicate(state)).toBe(false)
    })
  })

  describe('diffBranches and branchDivergedOn', () => {
    it('detects day divergence between branches that advance different amounts', () => {
      const scenario: PlaythroughScenario = {
        id: 'scenario-day-diff',
        title: 'Branches advance different days',
        rngSeed: 1,
        steps: [
          {
            type: 'branch',
            label: 'Day divergence',
            branches: [
              {
                branchId: 'fast',
                label: 'Advance 3 days',
                steps: [advanceDaysStep('3 days', 3)],
              },
              {
                branchId: 'slow',
                label: 'Advance 1 day',
                steps: [advanceDaysStep('1 day', 1)],
              },
            ],
          },
        ],
      }
      const result = runScenario(scenario)
      const delta = diffBranches(result.branches!['fast'], result.branches!['slow'])
      expect(branchDivergedOn(delta, 'dayDelta')).toBe(true)
    })

    it('returns zero deltas for identical states', () => {
      const scenario: PlaythroughScenario = {
        id: 'scenario-identical',
        title: 'Identical branches',
        rngSeed: 1,
        steps: [
          {
            type: 'branch',
            label: 'Both branches do nothing',
            branches: [
              {
                branchId: 'a',
                label: 'Branch A',
                steps: [advanceDaysStep('1 day', 1)],
              },
              {
                branchId: 'b',
                label: 'Branch B',
                steps: [advanceDaysStep('1 day', 1)],
              },
            ],
          },
        ],
      }
      const result = runScenario(scenario)
      const delta = diffBranches(result.branches!['a'], result.branches!['b'])
      expect(delta.moneyDelta).toBe(0)
      expect(delta.rosterSizeDelta).toBe(0)
    })
  })

  describe('scenario with standardInvariants', () => {
    it('runs without invariant violations on simple scenario (empty squad)', () => {
      const scenario: PlaythroughScenario = {
        id: 'scenario-invariants',
        title: 'Standard invariants hold',
        rngSeed: 1,
        // Empty squad to avoid squad-from-roster false positive on initial state
        initialState: withState({ day: 5, selectedSquadNpcIds: [] }),
        steps: [
          advanceDaysStep('Advance 3 days', 3),
          assertStep('Day advanced', [assertion('day', 'day >= 8', (s) => s.day >= 8)]),
        ],
        invariants: standardInvariants,
      }
      const result = runScenario(scenario)
      const invariantFailures = result.failures.filter((f) => f.stepLabel.startsWith('[invariant'))
      expect(invariantFailures).toHaveLength(0)
    })
  })
})
