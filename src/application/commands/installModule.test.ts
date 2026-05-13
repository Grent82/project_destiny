/**
 * Tests for house storage capacity and household module installation (destiny-f3ti).
 */

import { describe, it, expect } from 'vitest'
import { installModule } from './installModule'
import { selectHouseStorageInfo } from '../selectors/house'
import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'

const MODULE_INSTANCE = 'inst-module-lock-reinf-test01'
const NON_MODULE_INSTANCE = 'inst-item-medkit-field-18ef14bc' // already in initial state

/** State with a household module item in ownedItems */
function stateWithModule(itemId: string, instanceId: string): GameState {
  return {
    ...initialGameStateSnapshot,
    ownedItems: [
      ...initialGameStateSnapshot.ownedItems,
      { instanceId, itemId, location: 'inventory' as const, quantity: 1 },
    ],
  }
}

describe('installModule command', () => {
  it('moves item from ownedItems to installedHouseModules', () => {
    const state = stateWithModule('item-module-lock-reinforcement', MODULE_INSTANCE)
    const result = installModule(state, MODULE_INSTANCE)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.state.ownedItems.find((i) => i.instanceId === MODULE_INSTANCE)).toBeUndefined()
    expect(result.state.installedHouseModules.some((m) => m.moduleItemId === 'item-module-lock-reinforcement')).toBe(true)
  })

  it('applies storage_expand effect to houseStorageCapacity', () => {
    // item-module-lock-reinforcement has storage_expand +8
    const state = stateWithModule('item-module-lock-reinforcement', MODULE_INSTANCE)
    const baseCap = state.houseStorageCapacity
    const result = installModule(state, MODULE_INSTANCE)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.state.houseStorageCapacity).toBe(baseCap + 8)
  })

  it('records the install day', () => {
    const state: GameState = {
      ...stateWithModule('item-module-lock-reinforcement', MODULE_INSTANCE),
      day: 7,
    }
    const result = installModule(state, MODULE_INSTANCE)
    expect(result.success).toBe(true)
    if (!result.success) return
    const mod = result.state.installedHouseModules.find((m) => m.moduleItemId === 'item-module-lock-reinforcement')
    expect(mod?.installedAtDay).toBe(7)
  })

  it('rejects item not in ownedItems', () => {
    const result = installModule(initialGameStateSnapshot, 'nonexistent-instance')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reason).toBe('item_not_found')
  })

  it('rejects non-module item category', () => {
    const result = installModule(initialGameStateSnapshot, NON_MODULE_INSTANCE)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reason).toBe('not_a_module')
  })

  it('rejects already-installed module', () => {
    const state: GameState = {
      ...stateWithModule('item-module-lock-reinforcement', MODULE_INSTANCE),
      installedHouseModules: [{ moduleItemId: 'item-module-lock-reinforcement', installedAtDay: 1 }],
    }
    const result = installModule(state, MODULE_INSTANCE)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reason).toBe('already_installed')
  })

  it('logs the install activity', () => {
    const state = stateWithModule('item-module-lock-reinforcement', MODULE_INSTANCE)
    const result = installModule(state, MODULE_INSTANCE)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.state.activityLog.some((e) => e.message.includes('installed'))).toBe(true)
  })

  it('module without storage_expand does not change capacity', () => {
    // item-module-water-purifier has rest_quality_bonus only (no storage_expand)
    const state = stateWithModule('item-module-water-purifier', 'inst-water-purifier-test01')
    const baseCap = state.houseStorageCapacity
    const result = installModule(state, 'inst-water-purifier-test01')
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.state.houseStorageCapacity).toBe(baseCap)
  })
})

describe('selectHouseStorageInfo', () => {
  it('reports correct base capacity', () => {
    const store = createGameStore()
    const info = selectHouseStorageInfo(store.getState())
    expect(info.capacity).toBe(40)
  })

  it('reports used slots from house_storage items', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      ownedItems: [
        { instanceId: 'inst-a', itemId: 'item-spare-parts', location: 'house_storage', quantity: 1 },
        { instanceId: 'inst-b', itemId: 'item-spare-parts', location: 'house_storage', quantity: 1 },
        { instanceId: 'inst-c', itemId: 'item-medkit-field', location: 'inventory', quantity: 1 },
      ],
    }
    const store = createGameStore(state)
    const info = selectHouseStorageInfo(store.getState())
    expect(info.usedSlots).toBe(2)
    expect(info.available).toBe(38)
  })

  it('reflects capacity increase after module install', () => {
    const state = stateWithModule('item-module-lock-reinforcement', MODULE_INSTANCE)
    const result = installModule(state, MODULE_INSTANCE)
    expect(result.success).toBe(true)
    if (!result.success) return
    const store = createGameStore(result.state)
    const info = selectHouseStorageInfo(store.getState())
    expect(info.capacity).toBe(48) // 40 + 8
    expect(info.installedModules).toHaveLength(1)
  })
})
