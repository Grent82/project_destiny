import { describe, expect, it } from 'vitest'

import {
  selectDashboardSummary,
  selectDistrictSummaries,
  selectFactionSummaries,
  selectRosterDetail,
  selectRosterEntries,
} from '../index'
import { initialGameStateSnapshot } from './initialGameState'
import { createGameStore } from './gameStore'

describe('game store integration', () => {
  it('loads the seeded runtime state through the application store', () => {
    const store = createGameStore()

    expect(store.getState().game).toEqual(initialGameStateSnapshot)
  })

  it('exposes dashboard, roster, district, and faction selectors', () => {
    const store = createGameStore()
    const state = store.getState()

    expect(selectDashboardSummary(state)).toMatchObject({
      day: 1,
      timeSlot: 'morning',
      money: 500,
      rosterCount: 2,
      assignedSquadCount: 2,
    })
    expect(selectRosterEntries(state)).toHaveLength(2)
    expect(selectRosterDetail(state, 'npc-marion-vale')?.name).toBe('Marion Vale')
    expect(selectDistrictSummaries(state)).toHaveLength(3)
    expect(selectFactionSummaries(state)).toHaveLength(3)
  })
})
