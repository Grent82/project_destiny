import { createSelector } from '@reduxjs/toolkit'

import rawArmor from '../../../data/definitions/armor.json'
import rawWeapons from '../../../data/definitions/weapons.json'
import type { RootState } from '../store/gameStore'

const selectGame = (state: RootState) => state.game

export const selectStash = createSelector([selectGame], (game) => game.stash)

export const selectStashedWeapons = createSelector([selectGame], (game) => {
  const stashedIds = new Set(game.stash.weapons)
  return (rawWeapons as Array<{ id: string; name: string; weaponClass: string; damageMin: number; damageMax: number; accuracy: number; tier: number }>)
    .filter((w) => stashedIds.has(w.id))
})

export const selectStashedArmors = createSelector([selectGame], (game) => {
  const stashedIds = new Set(game.stash.armors)
  return (rawArmor as Array<{ id: string; name: string; armorClass: string; soak: number; evasionPenalty: number; tier: number }>)
    .filter((a) => stashedIds.has(a.id))
})
