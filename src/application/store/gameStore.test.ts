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

  it('seeds Mira as a hidden live captive in the canonical tannery runtime', () => {
    const store = createGameStore()
    const captivity = store.getState().game.npcCaptivityStates['npc-mira']

    expect(captivity).toMatchObject({
      status: 'captive',
      holderId: 'faction-gilded-court',
      siteId: 'site-poi-pale-old-tannery',
      roomId: 'tannery-inner-ring',
      regime: 'guarded',
      questTag: 'quest-mira-rescue',
    })
  })

  it('does not leak Mira rescue work into fresh-save available leads', () => {
    const store = createGameStore()

    expect(store.getState().game.availableQuestLeads.some((lead) => lead.questId === 'quest-mira-rescue')).toBe(false)
  })

  it('exposes dashboard, roster, district, and faction selectors', () => {
    const store = createGameStore()
    const state = store.getState()

    expect(selectDashboardSummary(state)).toMatchObject({
      day: 1,
      timeSlot: 'morning',
      money: 100,
      rosterCount: 1,
      assignedSquadCount: 1,
    })
    expect(selectRosterEntries(state)).toHaveLength(1)
    expect(selectRosterDetail(state, 'npc-marion-vale')?.name).toBe('Marion Vale')
    expect(selectDistrictSummaries(state).length).toBeGreaterThanOrEqual(3)
    expect(selectFactionSummaries(state).length).toBeGreaterThanOrEqual(3)
  })
})
