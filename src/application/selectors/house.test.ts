import { describe, it, expect } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import {
  selectExteriorTier,
  selectComputedExteriorTier,
  selectExteriorTierAdvanceable,
  selectHouseImprovementsSummary,
  selectHousePrestige,
} from './house'
import type { GameState } from '../../domain/game/contracts'
import { initialGameStateSnapshot } from '../store/initialGameState'

function makeStateWithRooms(intactCount: number, withFunctionCount: number): GameState {
  const rooms = initialGameStateSnapshot.house.rooms.map((r, i) => ({
    ...r,
    state: (i < intactCount ? 'intact' : 'collapsed') as 'intact' | 'collapsed',
    roomFunction: (i < withFunctionCount ? 'barracks' : null) as 'barracks' | null,
  }))
  return {
    ...initialGameStateSnapshot,
    house: { ...initialGameStateSnapshot.house, rooms, exteriorState: 'ruined' as const },
  }
}

describe('house exterior state selectors', () => {
  it('starts at ruined', () => {
    const store = createGameStore()
    expect(selectExteriorTier(store.getState())).toBe('ruined')
  })

  describe('selectComputedExteriorTier', () => {
    it('returns ruined with 0 intact rooms', () => {
      const store = createGameStore(makeStateWithRooms(0, 0))
      expect(selectComputedExteriorTier(store.getState())).toBe('ruined')
    })

    it('returns patched with 2 intact rooms, 0 functions', () => {
      const store = createGameStore(makeStateWithRooms(2, 0))
      expect(selectComputedExteriorTier(store.getState())).toBe('patched')
    })

    it('returns maintained with 3 intact rooms and 1 function', () => {
      const store = createGameStore(makeStateWithRooms(3, 1))
      expect(selectComputedExteriorTier(store.getState())).toBe('maintained')
    })

    it('returns restored with 5 intact rooms and 2 functions', () => {
      const store = createGameStore(makeStateWithRooms(5, 2))
      expect(selectComputedExteriorTier(store.getState())).toBe('restored')
    })

    it('returns grand with 7 intact rooms and 3 functions', () => {
      const state = makeStateWithRooms(7, 3)
      const intactCount = state.house.rooms.filter((r) => r.state === 'intact').length
      const withFunctionCount = state.house.rooms.filter(
        (r) => r.state === 'intact' && r.roomFunction !== null
      ).length
      expect(intactCount).toBe(7)
      expect(withFunctionCount).toBe(3)
      const store = createGameStore(state)
      expect(selectComputedExteriorTier(store.getState())).toBe('grand')
    })
  })

  describe('selectExteriorTierAdvanceable', () => {
    it('returns true when computed is higher than committed', () => {
      // 2 intact rooms → computed patched, but committed ruined
      const store = createGameStore(makeStateWithRooms(2, 0))
      expect(selectExteriorTierAdvanceable(store.getState())).toBe(true)
    })

    it('returns false when computed matches committed', () => {
      const store = createGameStore(makeStateWithRooms(2, 0))
      store.dispatch(gameActions.advanceExteriorState({ targetTier: 'patched' }))
      expect(selectExteriorTierAdvanceable(store.getState())).toBe(false)
    })
  })

  describe('advanceExteriorState action', () => {
    it('advances from ruined to patched', () => {
      const store = createGameStore()
      store.dispatch(gameActions.advanceExteriorState({ targetTier: 'patched' }))
      expect(selectExteriorTier(store.getState())).toBe('patched')
    })

    it('does not go backwards', () => {
      const store = createGameStore()
      store.dispatch(gameActions.advanceExteriorState({ targetTier: 'restored' }))
      store.dispatch(gameActions.advanceExteriorState({ targetTier: 'patched' }))
      expect(selectExteriorTier(store.getState())).toBe('restored')
    })

    it('advances through all tiers', () => {
      const store = createGameStore()
      for (const tier of ['patched', 'maintained', 'restored', 'grand'] as const) {
        store.dispatch(gameActions.advanceExteriorState({ targetTier: tier }))
      }
      expect(selectExteriorTier(store.getState())).toBe('grand')
    })
  })

  describe('selectHousePrestige', () => {
    it('starts at collapsed tier for ruined house', () => {
      const store = createGameStore()
      // Initial state may have some intact rooms giving a small score, but tier is still collapsed
      expect(selectHousePrestige(store.getState()).tier).toBe('collapsed')
    })

    it('returns collapsed tier for ruined house', () => {
      const store = createGameStore()
      expect(selectHousePrestige(store.getState()).tier).toBe('collapsed')
    })

    it('increases score when exterior tier advances', () => {
      const store = createGameStore()
      store.dispatch(gameActions.advanceExteriorState({ targetTier: 'restored' }))
      expect(selectHousePrestige(store.getState()).score).toBeGreaterThan(0)
    })
  })

  describe('selectHouseImprovementsSummary (destiny-h8hz)', () => {
    it('reports zeroed improvements and no modules on a fresh house', () => {
      const store = createGameStore()
      const summary = selectHouseImprovementsSummary(store.getState())
      expect(summary.houseImprovements).toEqual({ waterQuality: 0, herbSupply: 0, entrySecurity: 0 })
      expect(summary.sleepQualityBonus).toBe(0)
      expect(summary.installedModules).toEqual([])
    })

    it('resolves an installed module to its name and effect descriptions', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        installedHouseModules: [{ moduleItemId: 'item-module-water-purifier', installedAtDay: 3 }],
        houseImprovements: { waterQuality: 2, herbSupply: 0, entrySecurity: 0 },
        sleepQualityBonus: 10,
      }
      const store = createGameStore(state)
      const summary = selectHouseImprovementsSummary(store.getState())
      expect(summary.houseImprovements).toEqual({ waterQuality: 2, herbSupply: 0, entrySecurity: 0 })
      expect(summary.sleepQualityBonus).toBe(10)
      expect(summary.installedModules).toEqual([
        {
          moduleItemId: 'item-module-water-purifier',
          name: 'Clay-Char Water Purifier Stack',
          installedAtDay: 3,
          effectDescriptions: ['Sleep Quality +10', 'Water Quality +2'],
        },
      ])
    })

    it('describes training_bonus and storage_expand effects on other modules', () => {
      const state: GameState = {
        ...initialGameStateSnapshot,
        installedHouseModules: [
          { moduleItemId: 'item-module-herb-garden', installedAtDay: 1 },
          { moduleItemId: 'item-module-lock-reinforcement', installedAtDay: 2 },
        ],
      }
      const store = createGameStore(state)
      const summary = selectHouseImprovementsSummary(store.getState())
      const herbGarden = summary.installedModules.find((m) => m.moduleItemId === 'item-module-herb-garden')
      const lockBar = summary.installedModules.find((m) => m.moduleItemId === 'item-module-lock-reinforcement')
      expect(herbGarden?.effectDescriptions).toEqual(['Sleep Quality +5', 'medicine training +5', 'Herb Supply +1'])
      expect(lockBar?.effectDescriptions).toEqual(['Storage +8', 'Entry Security +1'])
    })
  })
})
