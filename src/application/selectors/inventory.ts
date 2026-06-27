import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import type { GameState } from '../../domain'

/**
 * Local item reference type for selectors - uses instanceId for consistency
 * with existing code patterns. Different from domain ItemInstance which uses uniqueId.
 */
type ItemRef = {
  instanceId: string
  itemId: string
  quantity: number
}

export type ItemAction = {
  type: 'use' | 'give' | 'install' | 'sell' | 'open' | 'equip' | 'pack' | 'unpack'
  label: string
  requiresTarget: boolean
}

const CATEGORY_PRIMARY_ACTION: Record<string, ItemAction> = {
  consumable: { type: 'use', label: 'Use', requiresTarget: false },
  document: { type: 'open', label: 'Open', requiresTarget: false },
  gift: { type: 'give', label: 'Give', requiresTarget: true },
  tool: { type: 'equip', label: 'Equip', requiresTarget: false },
  householdModule: { type: 'install', label: 'Install in House', requiresTarget: false },
  module: { type: 'install', label: 'Install in House', requiresTarget: false },
  tradeGood: { type: 'sell', label: 'Sell', requiresTarget: false },
  material: { type: 'sell', label: 'Sell', requiresTarget: false },
  weapon: { type: 'equip', label: 'Equip', requiresTarget: false },
  armor: { type: 'equip', label: 'Equip', requiresTarget: false },
  accessory: { type: 'equip', label: 'Equip', requiresTarget: false },
}

/** Helper to flatten all player bag slots into a list of ItemRef objects */
function getPlayerItemsFromInventory(inventoryState: GameState['inventoryState']): ItemRef[] {
  const items: ItemRef[] = []
  for (const container of inventoryState.player.bagContainers) {
    for (const slot of container.slots) {
      if (slot.itemInstanceId) {
        const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
        if (instanceDef) {
          items.push({
            instanceId: slot.itemInstanceId,
            itemId: instanceDef.itemId,
            quantity: slot.quantity,
          })
        }
      }
    }
  }
  return items
}

/** Helper to get items from house_storage container */
function getHouseStorageItems(inventoryState: GameState['inventoryState']): ItemRef[] {
  const items: ItemRef[] = []
  for (const container of inventoryState.sharedContainers) {
    if (container.ownerId === 'house_storage') {
      for (const slot of container.slots) {
        if (slot.itemInstanceId) {
          const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
          if (instanceDef) {
            items.push({
              instanceId: slot.itemInstanceId,
              itemId: instanceDef.itemId,
              quantity: slot.quantity,
            })
          }
        }
      }
    }
  }
  return items
}

/** Helper to get items from mission_pack container */
function getMissionPackItems(inventoryState: GameState['inventoryState']): ItemRef[] {
  const items: ItemRef[] = []
  for (const container of inventoryState.sharedContainers) {
    if (container.ownerId === 'mission_pack') {
      for (const slot of container.slots) {
        if (slot.itemInstanceId) {
          const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
          if (instanceDef) {
            items.push({
              instanceId: slot.itemInstanceId,
              itemId: instanceDef.itemId,
              quantity: slot.quantity,
            })
          }
        }
      }
    }
  }
  return items
}

/** Returns owned items filtered by storage location */
export function selectItemsByLocation(state: RootState, location: 'inventory' | 'house_storage' | 'equipped' | 'mission_pack' | 'archived'): ItemRef[] {
  const inventoryState = state.game.inventoryState
  switch (location) {
    case 'inventory':
      return getPlayerItemsFromInventory(inventoryState)
    case 'house_storage':
      return getHouseStorageItems(inventoryState)
    case 'mission_pack':
      return getMissionPackItems(inventoryState)
    case 'equipped':
    case 'archived':
      // These locations are not yet migrated - return empty for now
      return []
    default:
      return []
  }
}

export const selectGiftInventoryItems = createSelector(
  [(state: RootState) => state.game.inventoryState],
  (inventoryState) => {
    const playerItems = getPlayerItemsFromInventory(inventoryState)
    return playerItems
      .flatMap((owned) => {
        const definition = contentCatalog.itemsById.get(owned.itemId)
        if (!definition || definition.category !== 'gift') return []
        return [{ instanceId: owned.instanceId, itemName: definition.name }]
      })
  },
)

/** Returns all available actions for a given owned item instance */
export function selectItemActions(state: RootState, instanceId: string): ItemAction[] {
  const inventoryState = state.game.inventoryState
  let owned: ItemRef | null = null

  // Check player inventory
  for (const container of inventoryState.player.bagContainers) {
    for (const slot of container.slots) {
      if (slot.itemInstanceId === instanceId) {
        const instanceDef = inventoryState.itemRegistry[instanceId]
        if (instanceDef) {
          owned = { instanceId: slot.itemInstanceId, itemId: instanceDef.itemId, quantity: slot.quantity }
        }
        break
      }
    }
    if (owned) break
  }

  // Check house storage
  if (!owned) {
    for (const container of inventoryState.sharedContainers) {
      if (container.ownerId === 'house_storage') {
        for (const slot of container.slots) {
          if (slot.itemInstanceId === instanceId) {
            const instanceDef = inventoryState.itemRegistry[instanceId]
            if (instanceDef) {
              owned = { instanceId: slot.itemInstanceId, itemId: instanceDef.itemId, quantity: slot.quantity }
            }
            break
          }
        }
        if (owned) break
      }
    }
  }

  // Check mission pack
  if (!owned) {
    for (const container of inventoryState.sharedContainers) {
      if (container.ownerId === 'mission_pack') {
        for (const slot of container.slots) {
          if (slot.itemInstanceId === instanceId) {
            const instanceDef = inventoryState.itemRegistry[instanceId]
            if (instanceDef) {
              owned = { instanceId: slot.itemInstanceId, itemId: instanceDef.itemId, quantity: slot.quantity }
            }
            break
          }
        }
        if (owned) break
      }
    }
  }

  if (!owned) return []

  const def = contentCatalog.itemsById.get(owned.itemId)
  if (!def) return []

  const actions: ItemAction[] = []
  const primary = CATEGORY_PRIMARY_ACTION[def.category]
  if (primary) actions.push(primary)

  // Secondary: pack/unpack between inventory and mission_pack
  const isInInventoryOrHouseStorage = inventoryState.player.bagContainers.some((c) =>
    c.slots.some((s) => s.itemInstanceId === instanceId)
  ) || inventoryState.sharedContainers.some((c) =>
    c.ownerId === 'house_storage' && c.slots.some((s) => s.itemInstanceId === instanceId)
  )
  const isInMissionPack = inventoryState.sharedContainers.some((c) =>
    c.ownerId === 'mission_pack' && c.slots.some((s) => s.itemInstanceId === instanceId)
  )

  if (isInInventoryOrHouseStorage) {
    actions.push({ type: 'pack', label: 'Add to Pack', requiresTarget: false })
  }
  if (isInMissionPack) {
    actions.push({ type: 'unpack', label: 'Remove from Pack', requiresTarget: false })
  }

  return actions
}

// ─── Player Equipment Selectors ─────────────────────────────────────────────

export const selectPlayerEquipment = createSelector(
  [(state: RootState) => state.game.inventoryState.player.equipmentSlots],
  (equipmentSlots) => ({
    weapon: equipmentSlots.weapon,
    armor: equipmentSlots.armor,
    accessory_1: equipmentSlots.accessory_1,
    accessory_2: equipmentSlots.accessory_2,
  }),
)

export const selectPlayerBagContainers = createSelector(
  [(state: RootState) => state.game.inventoryState.player.bagContainers],
  (bagContainers) => bagContainers,
)

export const selectPlayerUsedBagSlots = createSelector(
  [(state: RootState) => state.game.inventoryState.player.usedBagSlots],
  (usedBagSlots) => usedBagSlots,
)

export const selectPlayerTotalBagSlots = createSelector(
  [(state: RootState) => state.game.inventoryState.player.totalBagSlots],
  (totalBagSlots) => totalBagSlots,
)

export const selectItemDefinition = createSelector(
  [(state: RootState, instanceId: string) => instanceId, (state: RootState) => state.game.inventoryState.itemRegistry, (state: RootState) => contentCatalog.itemsById],
  (instanceId, itemRegistry, itemsById) => {
    if (!instanceId) return null
    const instance = itemRegistry[instanceId]
    if (!instance) return null
    return itemsById.get(instance.itemId) ?? null
  },
)
