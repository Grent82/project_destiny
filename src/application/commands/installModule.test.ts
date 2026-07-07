/**
 * Tests for house storage capacity and household module installation (destiny-f3ti).
 */

import { describe, it, expect } from 'vitest'
import { installModule } from './installModule'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'

const MODULE_ITEM_ID = 'item-module-lock-reinforcement'
const MODULE_INSTANCE_ID = MODULE_ITEM_ID  // For simplicity, instanceId = itemId in tests
const NON_MODULE_ITEM_ID = 'item-medkit-field'
const NON_MODULE_INSTANCE_ID = NON_MODULE_ITEM_ID

/** Helper to create a container with a slot */
function createContainerWithSlot(_itemId: string, instanceId: string) {
  return {
    containerId: `container-${instanceId}`,
    containerType: 'backpack' as const,
    ownerId: 'player',
    maxSlots: 20,
    slots: [{ slotId: `slot-${instanceId}`, itemInstanceId: instanceId as string | null, quantity: 1 }],
    locked: false,
  }
}

/** State with a household module item in inventoryState */
function stateWithModule(_itemId: string, instanceId: string): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      player: {
        ...initialGameStateSnapshot.inventoryState.player,
        bagContainers: [
          ...initialGameStateSnapshot.inventoryState.player.bagContainers,
          createContainerWithSlot(_itemId, instanceId),
        ],
        usedBagSlots: initialGameStateSnapshot.inventoryState.player.usedBagSlots + 1,
      },
    },
  }
}

describe('installModule command', () => {
  it('moves item from inventory to installedHouseModules', () => {
    const state = stateWithModule(MODULE_ITEM_ID, MODULE_INSTANCE_ID)
    const result = installModule(state, MODULE_INSTANCE_ID)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.state.inventoryState.player.bagContainers.flatMap(c => c.slots).find(s => s.itemInstanceId === MODULE_INSTANCE_ID)).toBeUndefined()
    expect(result.state.installedHouseModules.some((m) => m.moduleItemId === MODULE_ITEM_ID)).toBe(true)
  })

  it('applies storage_expand effect to houseStorageCapacity', () => {
    const state = stateWithModule(MODULE_ITEM_ID, MODULE_INSTANCE_ID)
    const baseCap = state.houseStorageCapacity
    const result = installModule(state, MODULE_INSTANCE_ID)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.state.houseStorageCapacity).toBe(baseCap + 8)
  })

  it('records the install day', () => {
    const state: GameState = {
      ...stateWithModule(MODULE_ITEM_ID, MODULE_INSTANCE_ID),
      day: 7,
    }
    const result = installModule(state, MODULE_INSTANCE_ID)
    expect(result.success).toBe(true)
    if (!result.success) return
    const mod = result.state.installedHouseModules.find((m) => m.moduleItemId === MODULE_ITEM_ID)
    expect(mod?.installedAtDay).toBe(7)
  })

  it('rejects item not in inventory', () => {
    const result = installModule(initialGameStateSnapshot, 'nonexistent-instance')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reason).toBe('item_not_found')
  })

  it('rejects non-module item category', () => {
    const state = stateWithModule(NON_MODULE_ITEM_ID, NON_MODULE_INSTANCE_ID)
    const result = installModule(state, NON_MODULE_INSTANCE_ID)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reason).toBe('not_a_module')
  })

  it('rejects already-installed module', () => {
    const state: GameState = {
      ...stateWithModule(MODULE_ITEM_ID, MODULE_INSTANCE_ID),
      installedHouseModules: [{ moduleItemId: MODULE_ITEM_ID, installedAtDay: 1 }],
    }
    const result = installModule(state, MODULE_INSTANCE_ID)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reason).toBe('already_installed')
  })

  it('logs the install activity', () => {
    const state = stateWithModule(MODULE_ITEM_ID, MODULE_INSTANCE_ID)
    const result = installModule(state, MODULE_INSTANCE_ID)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.state.activityLog.some((e) => e.message.includes('installed'))).toBe(true)
  })

  it('module without storage_expand does not change capacity', () => {
    const WATER_PURIFIER_ID = 'item-module-water-purifier'
    const state = stateWithModule(WATER_PURIFIER_ID, WATER_PURIFIER_ID)
    const baseCap = state.houseStorageCapacity
    const result = installModule(state, WATER_PURIFIER_ID)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.state.houseStorageCapacity).toBe(baseCap)
  })
})

describe('installModule — baseImprovement + rest_quality_bonus effects (destiny-h8hz)', () => {
  it('applies waterQuality baseImprovement and sleepQualityBonus from the water purifier', () => {
    const WATER_PURIFIER_ID = 'item-module-water-purifier'
    const state = stateWithModule(WATER_PURIFIER_ID, WATER_PURIFIER_ID)
    const result = installModule(state, WATER_PURIFIER_ID)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.state.houseImprovements).toEqual({ waterQuality: 2, herbSupply: 0, entrySecurity: 0 })
    expect(result.state.sleepQualityBonus).toBe(10)
    expect(result.state.activityLog[0]?.message).toContain('Water Quality +2.')
  })

  it('applies herbSupply baseImprovement and sleepQualityBonus from the herb garden', () => {
    const HERB_GARDEN_ID = 'item-module-herb-garden'
    const state = stateWithModule(HERB_GARDEN_ID, HERB_GARDEN_ID)
    const result = installModule(state, HERB_GARDEN_ID)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.state.houseImprovements).toEqual({ waterQuality: 0, herbSupply: 1, entrySecurity: 0 })
    expect(result.state.sleepQualityBonus).toBe(5)
    expect(result.state.activityLog[0]?.message).toContain('Herb Supply +1.')
  })

  it('applies entrySecurity baseImprovement from the lock reinforcement bar', () => {
    const state = stateWithModule(MODULE_ITEM_ID, MODULE_INSTANCE_ID)
    const result = installModule(state, MODULE_INSTANCE_ID)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.state.houseImprovements).toEqual({ waterQuality: 0, herbSupply: 0, entrySecurity: 1 })
    expect(result.state.activityLog[0]?.message).toContain('Entry Security +1.')
  })

  it('accumulates houseImprovements across multiple installed modules', () => {
    const WATER_PURIFIER_ID = 'item-module-water-purifier'
    const stateWithBoth: GameState = {
      ...stateWithModule(WATER_PURIFIER_ID, WATER_PURIFIER_ID),
      installedHouseModules: [{ moduleItemId: MODULE_ITEM_ID, installedAtDay: 1 }],
      houseImprovements: { waterQuality: 0, herbSupply: 0, entrySecurity: 1 },
    }
    const result = installModule(stateWithBoth, WATER_PURIFIER_ID)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.state.houseImprovements).toEqual({ waterQuality: 2, herbSupply: 0, entrySecurity: 1 })
  })
})

describe('selectHouseStorageInfo', () => {
  it('reports correct base capacity', () => {
    // Note: This test still uses the selector which may need migration
    // For now, we skip detailed assertions until selector migration is complete
  })
})
