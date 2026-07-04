import { createSelector } from '@reduxjs/toolkit'
import { selectRosterNpcs } from '../commands/npcPopulation'
import { contentCatalog } from '../content/contentCatalog'
import { getRenownLevel } from '../../domain/progression/contracts'
import type { RootState } from '../store/gameStore'
import type { WeaponDefinition, ArmorDefinition } from '../../domain/items/contracts'
import { HOUSEHOLD_STORAGE_CONTAINER_ID, getHouseStorageItems } from '../commands/inventory/householdStorage'

export function selectHouseName(state: RootState): string {
  return state.game.householdLore.houseName
}

const selectGame = (state: RootState) => state.game

/** Total roster capacity = renown-based slots + house room bonus slots. */
export const selectRosterCapacity = createSelector([selectGame], (game) => {
  const renownSlots = getRenownLevel(game.playerCharacter.renown).rosterSlots
  const houseBonus = game.house.rosterBonus ?? 0
  return {
    total: renownSlots + houseBonus,
    renownSlots,
    houseBonus,
    current: selectRosterNpcs(game).length,
    isFull: selectRosterNpcs(game).length >= renownSlots + houseBonus,
  }
})

// ─── Household Storage Selectors ────────────────────────────────────────────

/**
 * Select all items currently in household storage.
 */
export const selectHouseStorageItems = createSelector([selectGame], (game) => {
  return getHouseStorageItems({ inventoryState: game.inventoryState })
})

/**
 * Select weapons currently in household storage with full item definitions.
 * Returns items with properly typed weapon definitions.
 */
export const selectHouseStorageWeapons = createSelector([selectGame], (game) => {
  const items = getHouseStorageItems({ inventoryState: game.inventoryState })
  return items
    .map((item) => {
      const def = contentCatalog.itemsById.get(item.itemId)
      return def && def.category === 'weapon'
        ? { ...item, definition: def as WeaponDefinition }
        : null
    })
    .filter((item): item is { instanceId: string; itemId: string; quantity: number; name: string; definition: WeaponDefinition } => item !== null)
})

/**
 * Select armors currently in household storage with full item definitions.
 * Returns items with properly typed armor definitions.
 */
export const selectHouseStorageArmors = createSelector([selectGame], (game) => {
  const items = getHouseStorageItems({ inventoryState: game.inventoryState })
  return items
    .map((item) => {
      const def = contentCatalog.itemsById.get(item.itemId)
      return def && def.category === 'armor'
        ? { ...item, definition: def as ArmorDefinition }
        : null
    })
    .filter((item): item is { instanceId: string; itemId: string; quantity: number; name: string; definition: ArmorDefinition } => item !== null)
})

/**
 * Select whether household storage has available space.
 */
export const selectHasHouseStorageSpace = createSelector([selectGame], (game) => {
  const storageContainer = game.inventoryState.sharedContainers.find(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID || c.ownerId === HOUSEHOLD_STORAGE_CONTAINER_ID
  )

  if (!storageContainer) {
    return true // No container means unlimited (will be created on first use)
  }

  return storageContainer.slots.length < storageContainer.maxSlots
})

/**
 * Select household storage info including capacity and usage.
 * Note: This selector is for the new canonical inventory storage system.
 * For the legacy house storage selector, use selectHouseStorageInfo from ./house
 */
export const selectHouseholdStorageInfo = createSelector([selectGame], (game) => {
  const storageContainer = game.inventoryState.sharedContainers.find(
    (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID || c.ownerId === HOUSEHOLD_STORAGE_CONTAINER_ID
  )

  if (!storageContainer) {
    return {
      used: 0,
      total: 50, // Default capacity for canonical storage
      available: 50,
      percentageUsed: 0,
    }
  }

  const used = storageContainer.slots.length
  const total = storageContainer.maxSlots
  const available = total - used
  const percentageUsed = Math.round((used / total) * 100)

  return {
    used,
    total,
    available,
    percentageUsed,
  }
})
