import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { applyEndOfDayResources } from '../commands/endDay'
import {
  selectCityResources,
  selectCorridorStatus,
  selectShopPriceModifier,
} from '../selectors/cityResources'
import type { GameState } from '../../domain'

// selectCityResources/selectCorridorStatus/selectShopPriceModifier are pure
// selectors — we can drive them with a plain RootState-shaped object.
function makeRootState(game: GameState) {
  return { game }
}

describe('selectCityResources', () => {
  it('returns the correct cityResources shape', () => {
    const state = makeRootState(initialGameStateSnapshot)
    expect(selectCityResources(state as Parameters<typeof selectCityResources>[0])).toEqual({
      foodSecurity: 62,
      waterAccess: 70,
      materialStock: 50,
      corridorStatus: 'open',
    })
  })
})

describe('selectCorridorStatus', () => {
  it('returns the corridor status', () => {
    const state = makeRootState(initialGameStateSnapshot)
    expect(selectCorridorStatus(state as Parameters<typeof selectCorridorStatus>[0])).toBe('open')
  })
})

describe('selectShopPriceModifier', () => {
  it('returns 1.0 when corridor is open', () => {
    const state = makeRootState(initialGameStateSnapshot)
    expect(selectShopPriceModifier(state as Parameters<typeof selectShopPriceModifier>[0])).toBe(1.0)
  })

  it('returns 1.15 when corridor is disrupted', () => {
    const state = makeRootState({
      ...initialGameStateSnapshot,
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'disrupted' },
    })
    expect(selectShopPriceModifier(state as Parameters<typeof selectShopPriceModifier>[0])).toBe(1.15)
  })

  it('returns 1.3 when corridor is blocked', () => {
    const state = makeRootState({
      ...initialGameStateSnapshot,
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'blocked' },
    })
    expect(selectShopPriceModifier(state as Parameters<typeof selectShopPriceModifier>[0])).toBe(1.3)
  })
})

describe('adjustCityResource clamping logic', () => {
  it('clamps to 100 when delta would exceed max', () => {
    const resource = 62
    const delta = 200
    const result = Math.max(0, Math.min(100, resource + delta))
    expect(result).toBe(100)
  })

  it('clamps to 0 when delta would go below min', () => {
    const resource = 62
    const delta = -200
    const result = Math.max(0, Math.min(100, resource + delta))
    expect(result).toBe(0)
  })

  it('applies delta normally within range', () => {
    const resource = 62
    const delta = 10
    const result = Math.max(0, Math.min(100, resource + delta))
    expect(result).toBe(72)
  })
})

describe('applyEndOfDayResources', () => {
  it('increases NPC hunger by 10 extra when foodSecurity is below 40', () => {
    const lowFoodState: GameState = {
      ...initialGameStateSnapshot,
      cityResources: { ...initialGameStateSnapshot.cityResources, foodSecurity: 30 },
    }
    const result = applyEndOfDayResources(lowFoodState)
    for (const npc of result.roster) {
      const before = initialGameStateSnapshot.roster.find((r) => r.npcId === npc.npcId)!
      expect(npc.states.hunger).toBe(Math.min(100, before.states.hunger + 10))
    }
  })

  it('does not apply extra hunger when foodSecurity is 40 or above', () => {
    const result = applyEndOfDayResources(initialGameStateSnapshot)
    for (const npc of result.roster) {
      const before = initialGameStateSnapshot.roster.find((r) => r.npcId === npc.npcId)!
      expect(npc.states.hunger).toBe(before.states.hunger)
    }
  })

  it('reduces foodSecurity by 10 and logs warning when corridor is blocked', () => {
    const blockedState: GameState = {
      ...initialGameStateSnapshot,
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'blocked' },
    }
    const result = applyEndOfDayResources(blockedState)
    expect(result.cityResources.foodSecurity).toBe(
      initialGameStateSnapshot.cityResources.foodSecurity - 10,
    )
    const warning = result.activityLog.find((e) => e.message.includes('Green Corridor'))
    expect(warning).toBeDefined()
    expect(warning?.category).toBe('system')
  })

  it('reduces foodSecurity by 3 when corridor is disrupted (no warning logged)', () => {
    const disruptedState: GameState = {
      ...initialGameStateSnapshot,
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'disrupted' },
    }
    const result = applyEndOfDayResources(disruptedState)
    expect(result.cityResources.foodSecurity).toBe(
      initialGameStateSnapshot.cityResources.foodSecurity - 3,
    )
    const corridorLog = result.activityLog.find((e) => e.message.includes('Green Corridor'))
    expect(corridorLog).toBeUndefined()
  })

  it('clamps foodSecurity to 0 when blocked and nearly depleted', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        foodSecurity: 5,
        corridorStatus: 'blocked',
      },
    }
    const result = applyEndOfDayResources(state)
    expect(result.cityResources.foodSecurity).toBe(0)
  })
})
