/**
 * Stash selectors for house storage.
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

export const selectStashedWeapons = createSelector([selectGame], (game) => {
  const houseStorageItems = getHouseStorageItems(game.inventoryState)
  const stashedIds = new Set(houseStorageItems.map((o) => o.itemId))
  return (rawWeapons as Array<{ id: string; name: string; weaponClass: string; damageMin: number; damageMax: number; accuracy: number; tier: number }>)
    .filter((w) => stashedIds.has(w.id))
})

export const selectStashedArmors = createSelector([selectGame], (game) => {
  const houseStorageItems = getHouseStorageItems(game.inventoryState)
  const stashedIds = new Set(houseStorageItems.map((o) => o.itemId))
  return (rawArmor as Array<{ id: string; name: string; armorClass: string; soak: number; evasionPenalty: number; tier: number }>)
    .filter((a) => stashedIds.has(a.id))
})
