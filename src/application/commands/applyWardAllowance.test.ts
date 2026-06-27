import { describe, it, expect } from 'vitest'
import { applyWardAllowance } from './applyWardAllowance'
import type { GameState } from '../../domain/game/contracts'
import { initialGameStateSnapshot } from '../store/initialGameState'

function createWardState(
  lastAllowanceDay: number | null,
  allowancePerWeek: number,
  personalSavings: number,
): GameState {
  const wardNpc = {
    ...initialGameStateSnapshot.roster[0],
    npcId: 'npc-ward-test',
    name: 'Test Ward',
    status: 'ward' as const,
    wardPersonalAllowance: {
      allowancePerWeek,
      personalSavings,
      lastAllowanceDay,
      allowedItems: [],
      restrictedItems: [],
    },
  }

  return {
    ...initialGameStateSnapshot,
    roster: [wardNpc],
    day: 14,
  }
}

describe('applyWardAllowance', () => {
  it('pays allowance when 7 days have passed', () => {
    const state = createWardState(7, 5, 10) // last paid day 7, allowance 5, savings 10
    const result = applyWardAllowance(state)

    const ward = result.roster.find((n) => n.npcId === 'npc-ward-test')
    expect(ward?.wardPersonalAllowance?.personalSavings).toBe(15) // 10 + 5
    expect(ward?.wardPersonalAllowance?.lastAllowanceDay).toBe(14)
  })

  it('does not pay allowance when less than 7 days have passed', () => {
    const state = createWardState(10, 5, 10) // last paid day 10, only 4 days passed
    const result = applyWardAllowance(state)

    const ward = result.roster.find((n) => n.npcId === 'npc-ward-test')
    expect(ward?.wardPersonalAllowance?.personalSavings).toBe(10) // unchanged
    expect(ward?.wardPersonalAllowance?.lastAllowanceDay).toBe(10) // unchanged
  })

  it('pays allowance on exactly day 7', () => {
    const state = createWardState(7, 5, 10) // last paid day 7, today is day 14 (exactly 7 days)
    const result = applyWardAllowance(state)

    const ward = result.roster.find((n) => n.npcId === 'npc-ward-test')
    expect(ward?.wardPersonalAllowance?.personalSavings).toBe(15)
  })

  it('handles ward with no previous allowance (first payment)', () => {
    const state = createWardState(null, 3, 0) // never paid before
    const result = applyWardAllowance(state)

    const ward = result.roster.find((n) => n.npcId === 'npc-ward-test')
    expect(ward?.wardPersonalAllowance?.personalSavings).toBe(3)
    expect(ward?.wardPersonalAllowance?.lastAllowanceDay).toBe(14)
  })

  it('skips wards with zero allowance', () => {
    const state = createWardState(7, 0, 10) // zero allowance
    const result = applyWardAllowance(state)

    const ward = result.roster.find((n) => n.npcId === 'npc-ward-test')
    expect(ward?.wardPersonalAllowance?.personalSavings).toBe(10) // unchanged
  })

  it('skips non-ward NPCs', () => {
    const state = {
      ...createWardState(7, 5, 10),
      roster: [
        {
          ...createWardState(7, 5, 10).roster[0],
          status: 'citizen' as const,
        },
      ],
    }
    const result = applyWardAllowance(state)

    // Should not modify non-ward NPCs (savings should remain unchanged)
    expect(result.roster[0].wardPersonalAllowance?.personalSavings).toBe(10)
    expect(result.roster[0].wardPersonalAllowance?.lastAllowanceDay).toBe(7)
  })

  it('adds activity log entry for payment', () => {
    const state = createWardState(7, 5, 10)
    const result = applyWardAllowance(state)

    const logEntry = result.activityLog.find((entry) =>
      entry.message.includes('Taschengeld'),
    )
    expect(logEntry).toBeDefined()
    expect(logEntry?.message).toContain('5 Mk')
  })

  it('accumulates savings across multiple payments', () => {
    const state = createWardState(0, 5, 20) // already has 20, last paid day 0
    const result = applyWardAllowance(state)

    const ward = result.roster.find((n) => n.npcId === 'npc-ward-test')
    expect(ward?.wardPersonalAllowance?.personalSavings).toBe(25) // 20 + 5
  })
})
