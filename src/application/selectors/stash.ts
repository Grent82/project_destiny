import { createSelector } from '@reduxjs/toolkit'

import rawArmor from '../../../data/definitions/armor.json'
import rawWeapons from '../../../data/definitions/weapons.json'
import type { RootState } from '../store/gameStore'

const selectGame = (state: RootState) => state.game

/** @deprecated Use selectOwnedItemsByLocation. Kept for backward compat. */
export const selectStash = createSelector([selectGame], (game) => game.stash)

export const selectStashedWeapons = createSelector([selectGame], (game) => {
  const stashedIds = new Set(
    game.ownedItems.filter((o) => o.location === 'house_storage').map((o) => o.itemId)
  )
  return (rawWeapons as Array<{ id: string; name: string; weaponClass: string; damageMin: number; damageMax: number; accuracy: number; tier: number }>)
    .filter((w) => stashedIds.has(w.id))
})

export const selectStashedArmors = createSelector([selectGame], (game) => {
  const stashedIds = new Set(
    game.ownedItems.filter((o) => o.location === 'house_storage').map((o) => o.itemId)
  )
  return (rawArmor as Array<{ id: string; name: string; armorClass: string; soak: number; evasionPenalty: number; tier: number }>)
    .filter((a) => stashedIds.has(a.id))
})

export const selectOwnedItemsByLocation = createSelector([selectGame], (game) => ({
  inventory: game.ownedItems.filter((o) => o.location === 'inventory'),
  house_storage: game.ownedItems.filter((o) => o.location === 'house_storage'),
  equipped: game.ownedItems.filter((o) => o.location === 'equipped'),
  mission_pack: game.ownedItems.filter((o) => o.location === 'mission_pack'),
  archived: game.ownedItems.filter((o) => o.location === 'archived'),
}))
