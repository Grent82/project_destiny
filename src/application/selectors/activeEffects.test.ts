import { describe, expect, it } from 'vitest'
import { selectActiveEffectsSummary } from './activeEffects'
import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'

describe('selectActiveEffectsSummary (destiny-y7jx)', () => {
  it('returns all-empty on a fresh game state', () => {
    const store = createGameStore(initialGameStateSnapshot)
    expect(selectActiveEffectsSummary(store.getState())).toEqual({
      statuses: [],
      trainingBonuses: [],
      statBoosts: [],
      equippedTools: [],
    })
  })

  it('reports a timed status with its remaining duration and an indefinite one as null', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      playerStatuses: [
        { statusId: 'mild-impairment', source: 'Gray Dust (Powdered)', duration: 2 },
        { statusId: 'infection-risk', source: 'Tar-Thatch Poultice' },
      ],
    }
    const store = createGameStore(state)
    const result = selectActiveEffectsSummary(store.getState())
    expect(result.statuses).toEqual([
      { statusId: 'mild-impairment', source: 'Gray Dust (Powdered)', value: undefined, remainingDuration: 2 },
      { statusId: 'infection-risk', source: 'Tar-Thatch Poultice', value: undefined, remainingDuration: null },
    ])
  })

  it('computes remaining days for a temp stat boost from expiresDay and the current day', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 5,
      tempStatBoosts: [{ stat: 'strength', value: 8, expiresDay: 8 }],
    }
    const store = createGameStore(state)
    const result = selectActiveEffectsSummary(store.getState())
    expect(result.statBoosts).toEqual([{ stat: 'strength', value: 8, remainingDays: 3 }])
  })

  it('clamps remaining days at zero for an already-expired boost still present in state', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      day: 10,
      tempStatBoosts: [{ stat: 'strength', value: 8, expiresDay: 8 }],
    }
    const store = createGameStore(state)
    const result = selectActiveEffectsSummary(store.getState())
    expect(result.statBoosts[0]?.remainingDays).toBe(0)
  })

  it('passes through active training bonuses as-is', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      activeTrainingBonuses: [{ skill: 'medicine', value: 5, source: 'Herb Garden Module (Windowbox Cultivation)' }],
    }
    const store = createGameStore(state)
    const result = selectActiveEffectsSummary(store.getState())
    expect(result.trainingBonuses).toEqual([{ skill: 'medicine', value: 5, source: 'Herb Garden Module (Windowbox Cultivation)' }])
  })

  it('resolves an equipped tool to its real item name', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      equippedTools: [{ itemId: 'item-lockpick-ringcut', skill: 'lockpicking', value: 15 }],
    }
    const store = createGameStore(state)
    const result = selectActiveEffectsSummary(store.getState())
    expect(result.equippedTools).toEqual([
      { itemId: 'item-lockpick-ringcut', itemName: 'Ring-Cut Lockpick Set', skill: 'lockpicking', value: 15 },
    ])
  })
})
