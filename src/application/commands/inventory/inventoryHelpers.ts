/**
 * Helper functions for inventory access during migration.
 * These provide a backward-compatible API while code is being migrated.
 */

import type { GameState } from '../../../domain/game/contracts'
import type { ItemInstance, InventoryContainer, InventorySlot } from '../../../domain/inventory/contracts'
import { contentCatalog } from '../../content/contentCatalog'

/**
 * Find an item instance by its uniqueId in player inventory.
 */
export function findPlayerItem(state: GameState, uniqueId: string): {
  instance: ItemInstance
  container: InventoryContainer
  slot: InventorySlot
  containerIndex: number
  slotIndex: number
} | null {
  for (const [containerIndex, container] of state.inventoryState.player.bagContainers.entries()) {
    for (const [slotIndex, slot] of container.slots.entries()) {
      if (slot.itemInstanceId === uniqueId) {
        return {
          instance: {
            uniqueId: slot.itemInstanceId,
            itemId: slot.itemInstanceId,
            quantity: slot.quantity,
            locationType: 'player_inventory',
            locationId: 'player',
            acquiredDay: 1,
            flags: [],
          },
          container,
          slot,
          containerIndex,
          slotIndex,
        }
      }
    }
  }
  return null
}

/**
 * Remove an item from player inventory.
 */
export function removePlayerItem(state: GameState, uniqueId: string, quantity = 1): GameState {
  const newContainers = state.inventoryState.player.bagContainers.map((container) => {
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === uniqueId)
    if (slotIndex === -1) return container

    const slot = container.slots[slotIndex]
    const newSlots = [...container.slots]

    if (slot.quantity <= quantity) {
      newSlots.splice(slotIndex, 1)
    } else {
      newSlots[slotIndex] = {
        ...slot,
        quantity: slot.quantity - quantity,
      }
    }

    return { ...container, slots: newSlots }
  }).filter((c) => c.slots.length > 0)

  const usedSlots = newContainers.reduce((sum, c) => sum + c.slots.length, 0)

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: {
        ...state.inventoryState.player,
        bagContainers: newContainers,
        usedBagSlots: usedSlots,
      },
    },
  }
}

/**
 * Add an item to player inventory.
 */
export function addPlayerItem(state: GameState, uniqueId: string, quantity = 1): GameState {
  const newContainers = state.inventoryState.player.bagContainers.map((container) => {
    const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === uniqueId)

    if (slotIndex !== -1) {
      const newSlots = [...container.slots]
      newSlots[slotIndex] = {
        ...newSlots[slotIndex],
        quantity: newSlots[slotIndex].quantity + quantity,
      }
      return { ...container, slots: newSlots }
    }

    if (container.slots.length < container.maxSlots) {
      const newSlots = [
        ...container.slots,
        {
          slotId: `slot-${uniqueId}-${Date.now()}`,
          itemInstanceId: uniqueId,
          quantity,
        },
      ]
      return { ...container, slots: newSlots }
    }

    return container
  })

  // If no space, create new container
  let finalContainers = newContainers
  const hasSpace = newContainers.some((c) => c.slots.length < c.maxSlots)
  if (!hasSpace) {
    finalContainers = [
      ...newContainers,
      {
        containerId: `bag-${Date.now()}`,
        containerType: 'backpack',
        ownerId: 'player',
        maxSlots: 20,
        slots: [{ slotId: `slot-${uniqueId}-new`, itemInstanceId: uniqueId, quantity }],
        locked: false,
      },
    ]
  }

  const usedSlots = finalContainers.reduce((sum, c) => sum + c.slots.length, 0)

  // Without a registry entry, this item is invisible to selectItemsByLocation/selectItemActions
  // (the House Storage / Mission Pack panels) even though it is physically in bagContainers --
  // useItem.ts's findPlayerItem synthesizes an ItemInstance from the slot directly and doesn't
  // need this, but the display selectors read itemRegistry exclusively.
  const existingRegistryEntry = state.inventoryState.itemRegistry[uniqueId]
  const registryEntry: ItemInstance = existingRegistryEntry
    ? { ...existingRegistryEntry, quantity: existingRegistryEntry.quantity + quantity }
    : {
        uniqueId,
        itemId: uniqueId,
        quantity,
        locationType: 'player_inventory',
        locationId: 'player',
        acquiredDay: state.day,
        flags: [],
      }

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      itemRegistry: {
        ...state.inventoryState.itemRegistry,
        [uniqueId]: registryEntry,
      },
      player: {
        ...state.inventoryState.player,
        bagContainers: finalContainers,
        usedBagSlots: usedSlots,
      },
    },
  }
}

/**
 * Check if player has an item in inventory.
 */
export function hasPlayerItem(state: GameState, itemId: string): boolean {
  for (const container of state.inventoryState.player.bagContainers) {
    for (const slot of container.slots) {
      if (slot.itemInstanceId === itemId) return true
    }
  }
  return false
}

/**
 * Get item definition by instanceId.
 */
export function getItemDefinition(instanceId: string) {
  return contentCatalog.itemsById.get(instanceId)
}

/**
 * Get all items in player inventory with a specific location-like filter.
 * Migration helper: replaces selectItemsByLocation(state, location)
 */
export function getPlayerInventoryItems(state: GameState): Array<{
  instanceId: string
  itemId: string
  quantity: number
}> {
  const items: Array<{ instanceId: string; itemId: string; quantity: number }> = []

  for (const container of state.inventoryState.player.bagContainers) {
    for (const slot of container.slots) {
      if (slot.itemInstanceId) {
        items.push({
          instanceId: slot.itemInstanceId,
          itemId: slot.itemInstanceId,
          quantity: slot.quantity,
        })
      }
    }
  }

  return items
}

/**
 * Get all items in house storage (shared containers).
 * Migration helper: replaces selectItemsByLocation(state, 'house_storage')
 */
export function getHouseStorageItems(state: GameState): Array<{
  instanceId: string
  itemId: string
  quantity: number
}> {
  const items: Array<{ instanceId: string; itemId: string; quantity: number }> = []

  for (const container of state.inventoryState.sharedContainers) {
    for (const slot of container.slots) {
      if (slot.itemInstanceId) {
        items.push({
          instanceId: slot.itemInstanceId,
          itemId: slot.itemInstanceId,
          quantity: slot.quantity,
        })
      }
    }
  }

  return items
}

/**
 * Get all equipped items.
 * Migration helper: replaces selectItemsByLocation(state, 'equipped')
 */
export function getEquippedItems(state: GameState): Array<{
  instanceId: string
  itemId: string
  slot: 'weapon' | 'armor' | 'accessory_1' | 'accessory_2'
}> {
  const items: Array<{ instanceId: string; itemId: string; slot: 'weapon' | 'armor' | 'accessory_1' | 'accessory_2' }> = []
  const equipment = state.inventoryState.player.equipmentSlots

  if (equipment.weapon) {
    items.push({ instanceId: equipment.weapon, itemId: equipment.weapon, slot: 'weapon' })
  }
  if (equipment.armor) {
    items.push({ instanceId: equipment.armor, itemId: equipment.armor, slot: 'armor' })
  }
  if (equipment.accessory_1) {
    items.push({ instanceId: equipment.accessory_1, itemId: equipment.accessory_1, slot: 'accessory_1' })
  }
  if (equipment.accessory_2) {
    items.push({ instanceId: equipment.accessory_2, itemId: equipment.accessory_2, slot: 'accessory_2' })
  }

  return items
}

/**
 * Get all mission pack items.
 * Migration helper: replaces selectItemsByLocation(state, 'mission_pack')
 */
export function getMissionPackItems(state: GameState): Array<{
  instanceId: string
  itemId: string
  quantity: number
}> {
  const items: Array<{ instanceId: string; itemId: string; quantity: number }> = []

  for (const container of state.inventoryState.player.bagContainers) {
    if (container.containerType === 'supply_pack' || container.name === 'Mission Pack') {
      for (const slot of container.slots) {
        if (slot.itemInstanceId) {
          items.push({
            instanceId: slot.itemInstanceId,
            itemId: slot.itemInstanceId,
            quantity: slot.quantity,
          })
        }
      }
    }
  }

  return items
}

/**
 * Get house storage capacity.
 */
export function getHouseStorageCapacity(state: GameState): number {
  return state.houseStorageCapacity
}

/**
 * Count used house storage slots.
 */
export function countUsedHouseStorageSlots(state: GameState): number {
  return state.inventoryState.sharedContainers.reduce((sum, c) => sum + c.slots.length, 0)
}
