import { describe, it, expect } from 'vitest'
import { selectDailyIncomeBreakdown } from './ledger'
import { createGameStore } from '../store/gameStore'
import { wageForStatus } from '../commands/endDay'

describe('selectDailyIncomeBreakdown', () => {
  it('only bills wages for player-roster members, not world/story/enemy persons sharing the unified list (destiny-rama.8)', () => {
    // The base save hydrates 3 non-player-roster persons (Mira's custody handler + 2 guards) into
    // the same npcRuntimeStates array as Marion Vale. They must not be on the house's payroll.
    const store = createGameStore()
    const breakdown = selectDailyIncomeBreakdown(store.getState())
    const marion = store.getState().game.npcRuntimeStates.find((n) => n.npcId === 'npc-marion-vale')!
    expect(breakdown.wages).toBe(wageForStatus(marion.status))
  })
})
