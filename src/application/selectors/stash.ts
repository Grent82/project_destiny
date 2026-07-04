/**
 * Stash selectors for house storage.
 * Updated to use canonical inventory model with proper instance tracking.
 */

import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import type { GameState } from '../../domain'
import rawArmor from '../../../data/definitions/armor.json'
import rawWeapons from '../../../data/definitions/weapons.json'

const selectGame = (state: RootState) => state.game

/** @deprecated Use selectOwnedItemsByLocation. Kept for backward compat. */
export const selectStash = createSelector([selectGame], (game) => game.stash)

/** Helper to get items from house_storage container */
function getHouseStorageItems(inventoryState: GameState['inventoryState']): { instanceId: string; itemId: string; quantity: number }[] {
  const items: { instanceId: string; itemId: string; quantity: number }[] = []
  for (const container of inventoryState.sharedContainers) {
    // Support both old 'house_storage' and new 'household:house-blackthorn:storage' patterns
    if (container.ownerId === 'house_storage' || container.ownerId === 'household:house-blackthorn' || container.containerId === 'household:house-blackthorn:storage') {
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

/**
 * Select stashed weapons with full item details including instance IDs.
 * Returns weapon definitions with the instanceId that can be used for equipping.
 */
export const selectStashedWeapons = createSelector([selectGame], (game) => {
  const houseStorageItems = getHouseStorageItems(game.inventoryState)
  const weaponInstances = houseStorageItems.filter((item) => {
    const def = rawWeapons.find((w) => w.id === item.itemId)
    return def !== undefined
  })

  return weaponInstances.map((instance) => {
    const def = rawWeapons.find((w) => w.id === instance.itemId)!
    return {
      ...def,
      instanceId: instance.instanceId, // Include instanceId for equip action
    }
  })
})

/**
 * Select stashed armors with full item details including instance IDs.
 */
export const selectStashedArmors = createSelector([selectGame], (game) => {
  const houseStorageItems = getHouseStorageItems(game.inventoryState)
  const armorInstances = houseStorageItems.filter((item) => {
    const def = rawArmor.find((a) => a.id === item.itemId)
    return def !== undefined
  })

  return armorInstances.map((instance) => {
    const def = rawArmor.find((a) => a.id === instance.itemId)!
    return {
      ...def,
      instanceId: instance.instanceId, // Include instanceId for equip action
    }
  })
})
