import { describe, it, expect } from 'vitest'
import { selectDashboardSummary } from './dashboard'
import { createGameStore } from '../store/gameStore'

describe('selectDashboardSummary', () => {
  it('counts only player-roster members, not the whole unified runtime list (destiny-rama.8)', () => {
    // The base save hydrates 3 non-player-roster persons (Mira's custody handler + 2 guards) into
    // the same npcRuntimeStates array as Marion Vale. rosterCount must reflect the player's own
    // roster (1), not the full population (4).
    const store = createGameStore()
    const summary = selectDashboardSummary(store.getState())
    expect(summary.rosterCount).toBe(1)
  })
})
