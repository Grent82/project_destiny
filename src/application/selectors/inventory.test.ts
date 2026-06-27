import { describe, it, expect } from 'vitest'
import { selectItemsByLocation, selectItemActions, moveItem } from './inventory'
import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'
import type { ContainerType } from '../../domain/inventory/contracts'

// Test item definitions - these need to exist in contentCatalog
const herbalTonicInstanceId = 'inst-tonic-01'
const herbalTonicItemId = 'item-medkit-field'

const suspiciousLetterInstanceId = 'inst-letter-01'
const suspiciousLetterItemId = 'item-ledger-bureau'

const packedToolInstanceId = 'inst-tool-01'
const packedToolItemId = 'item-lockpick-ringcut'

function createInventoryWithPlayerItems(itemInstances: Array<{ instanceId: string; itemId: string; quantity: number }>) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: itemInstances.length > 0 ? [{
        containerId: 'container-player-bag',
        containerType: 'backpack' as ContainerType,
        ownerId: 'player',
        maxSlots: 20,
        slots: itemInstances.map((item) => ({
          slotId: `slot-${item.instanceId}`,
          itemInstanceId: item.instanceId,
          quantity: item.quantity,
        })),
        locked: false,
      }] : [],
      usedBagSlots: itemInstances.length,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: [],
    itemRegistry: Object.fromEntries(itemInstances.map((item) => [item.instanceId, { itemId: item.itemId }])),
  }
}

function createInventoryWithHouseStorageItems(itemInstances: Array<{ instanceId: string; itemId: string; quantity: number }>) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [],
      usedBagSlots: 0,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: itemInstances.length > 0 ? [{
      containerId: 'container-house-storage',
      containerType: 'vault' as ContainerType,
      ownerId: 'house_storage',
      maxSlots: 50,
      slots: itemInstances.map((item) => ({
        slotId: `slot-${item.instanceId}`,
        itemInstanceId: item.instanceId,
        quantity: item.quantity,
      })),
      locked: false,
    }] : [],
    itemRegistry: Object.fromEntries(itemInstances.map((item) => [item.instanceId, { itemId: item.itemId }])),
  }
}

function createInventoryWithMissionPackItems(itemInstances: Array<{ instanceId: string; itemId: string; quantity: number }>) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [],
      usedBagSlots: 0,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: itemInstances.length > 0 ? [{
      containerId: 'container-mission-pack',
      containerType: 'supply_pack' as ContainerType,
      ownerId: 'mission_pack',
      maxSlots: 20,
      slots: itemInstances.map((item) => ({
        slotId: `slot-${item.instanceId}`,
        itemInstanceId: item.instanceId,
        quantity: item.quantity,
      })),
      locked: false,
    }] : [],
    itemRegistry: Object.fromEntries(itemInstances.map((item) => [item.instanceId, { itemId: item.itemId }])),
  }
}

function stateWithPlayerItems(items: Array<{ instanceId: string; itemId: string; quantity: number }>): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: createInventoryWithPlayerItems(items),
  }
}

function stateWithHouseStorageItems(items: Array<{ instanceId: string; itemId: string; quantity: number }>): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: createInventoryWithHouseStorageItems(items),
  }
}

function stateWithMissionPackItems(items: Array<{ instanceId: string; itemId: string; quantity: number }>): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: createInventoryWithMissionPackItems(items),
  }
}

describe('selectItemsByLocation', () => {
  it('returns only items with matching location', () => {
    const state = stateWithPlayerItems([{ instanceId: herbalTonicInstanceId, itemId: herbalTonicItemId, quantity: 2 }])
    const store = createGameStore(state)
    const inventoryItems = selectItemsByLocation(store.getState(), 'inventory')
    expect(inventoryItems).toHaveLength(1)
    expect(inventoryItems[0].instanceId).toBe('inst-tonic-01')
  })

  it('returns house_storage items separately', () => {
    const state = stateWithHouseStorageItems([{ instanceId: suspiciousLetterInstanceId, itemId: suspiciousLetterItemId, quantity: 1 }])
    const store = createGameStore(state)
    const houseItems = selectItemsByLocation(store.getState(), 'house_storage')
    expect(houseItems).toHaveLength(1)
    expect(houseItems[0].instanceId).toBe('inst-letter-01')
  })

  it('returns empty array when location has no items', () => {
    const state = stateWithPlayerItems([{ instanceId: herbalTonicInstanceId, itemId: herbalTonicItemId, quantity: 2 }])
    const store = createGameStore(state)
    const result = selectItemsByLocation(store.getState(), 'mission_pack')
    expect(result).toHaveLength(0)
  })

  it('returns multiple items for same location', () => {
    const tonic2 = { instanceId: 'inst-tonic-02', itemId: herbalTonicItemId, quantity: 1 }
    const state = stateWithPlayerItems([
      { instanceId: herbalTonicInstanceId, itemId: herbalTonicItemId, quantity: 2 },
      tonic2,
    ])
    const store = createGameStore(state)
    const result = selectItemsByLocation(store.getState(), 'inventory')
    expect(result).toHaveLength(2)
  })
})

describe('selectItemActions', () => {
  it('returns empty array for unknown instanceId', () => {
    const store = createGameStore()
    expect(selectItemActions(store.getState(), 'nonexistent')).toHaveLength(0)
  })

  it('returns pack action for inventory consumable', () => {
    const state = stateWithPlayerItems([{ instanceId: herbalTonicInstanceId, itemId: herbalTonicItemId, quantity: 2 }])
    const store = createGameStore(state)
    const actions = selectItemActions(store.getState(), 'inst-tonic-01')
    const types = actions.map((a) => a.type)
    expect(types).toContain('use')
    expect(types).toContain('pack')
  })

  it('returns unpack action for mission_pack item', () => {
    const state = stateWithMissionPackItems([{ instanceId: packedToolInstanceId, itemId: packedToolItemId, quantity: 1 }])
    const store = createGameStore(state)
    const actions = selectItemActions(store.getState(), 'inst-tool-01')
    const types = actions.map((a) => a.type)
    expect(types).toContain('unpack')
    expect(types).not.toContain('pack')
  })
})

describe('moveItem action', () => {
  it('moves an item from inventory to mission_pack', () => {
    const state = stateWithPlayerItems([{ instanceId: herbalTonicInstanceId, itemId: herbalTonicItemId, quantity: 2 }])
    const store = createGameStore(state)
    store.dispatch({ type: 'game/moveItem', payload: { instanceId: 'inst-tonic-01', location: 'mission_pack' } })
    const after = selectItemsByLocation(store.getState(), 'mission_pack')
    expect(after).toHaveLength(1)
    expect(after[0].instanceId).toBe('inst-tonic-01')
  })

  it('moves an item back from mission_pack to inventory', () => {
    const state = stateWithMissionPackItems([{ instanceId: herbalTonicInstanceId, itemId: herbalTonicItemId, quantity: 2 }])
    const store = createGameStore(state)
    store.dispatch({ type: 'game/moveItem', payload: { instanceId: 'inst-tonic-01', location: 'inventory' } })
    const after = selectItemsByLocation(store.getState(), 'inventory')
    expect(after).toHaveLength(1)
  })
})
