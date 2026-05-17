import { describe, it, expect } from 'vitest'
import { applyWages, wageForStatus } from './applyWages'
import { initialStateWithIda } from './testFixtures'

describe('applyWages', () => {
  describe('contractWagePerDay', () => {
    it('uses contractWagePerDay over status-based wage when set', () => {
      const state = {
        ...initialStateWithIda,
        money: 1000,
        roster: initialStateWithIda.roster.map((r) =>
          r.npcId === 'npc-ida-rhys'
            ? { ...r, contractWagePerDay: 15, status: 'mercenary' as const }
            : r,
        ),
      }
      const result = applyWages(state)
      const idaEntry = result.roster.find((r) => r.npcId === 'npc-ida-rhys')
      // Ida's contractWagePerDay is 15; mercenary status-based wage is 8
      // Money should be deducted by 15 (not 8) for Ida, plus Marion's wage
      const marionEntry = state.roster.find((r) => r.npcId !== 'npc-ida-rhys')!
      const marionWage = marionEntry.contractWagePerDay ?? wageForStatus(marionEntry.status)
      expect(idaEntry).toBeDefined()
      expect(result.money).toBe(1000 - 15 - marionWage)
    })

    it('falls back to status-based wage when contractWagePerDay is absent', () => {
      const state = {
        ...initialStateWithIda,
        money: 1000,
        roster: initialStateWithIda.roster.map((r) =>
          r.npcId === 'npc-ida-rhys'
            ? { ...r, contractWagePerDay: undefined, status: 'mercenary' as const }
            : r,
        ),
      }
      const result = applyWages(state)
      const marionEntry = state.roster.find((r) => r.npcId !== 'npc-ida-rhys')!
      const marionWage = marionEntry.contractWagePerDay ?? wageForStatus(marionEntry.status)
      expect(result.money).toBe(1000 - wageForStatus('mercenary') - marionWage)
    })
  })

  describe('wage arrears departure', () => {
    it('logs a warning when an NPC reaches 7 days unpaid', () => {
      // wagesOwedDays starts at 6; step 1 increments to 7, triggering the warning
      const state = {
        ...initialStateWithIda,
        money: 0,
        roster: initialStateWithIda.roster.map((r) =>
          r.npcId === 'npc-ida-rhys' ? { ...r, wagesOwedDays: 6 } : r,
        ),
      }
      const result = applyWages(state)
      const log = result.activityLog.find((e) => e.message.includes('not been paid in a week'))
      expect(log).toBeDefined()
    })

    it('removes NPC from roster at 14 days unpaid', () => {
      const state = {
        ...initialStateWithIda,
        money: 0,
        roster: initialStateWithIda.roster.map((r) =>
          r.npcId === 'npc-ida-rhys' ? { ...r, wagesOwedDays: 14 } : r,
        ),
      }
      const result = applyWages(state)
      expect(result.roster.find((r) => r.npcId === 'npc-ida-rhys')).toBeUndefined()
      const log = result.activityLog.find((e) => e.message.includes('gone unpaid for two weeks'))
      expect(log).toBeDefined()
    })

    it('does not remove bonded NPCs even at 14 days unpaid', () => {
      const state = {
        ...initialStateWithIda,
        money: 0,
        roster: initialStateWithIda.roster.map((r) =>
          r.npcId === 'npc-ida-rhys'
            ? { ...r, wagesOwedDays: 14, bondStatus: { holderId: 'player', bondType: 'labor' as const, contractedUntilDay: 999 } }
            : r,
        ),
      }
      const result = applyWages(state)
      expect(result.roster.find((r) => r.npcId === 'npc-ida-rhys')).toBeDefined()
    })
  })
})
