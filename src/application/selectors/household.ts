import { createSelector } from '@reduxjs/toolkit'

import { getRenownLevel } from '../../domain/progression/contracts'
import type { Ward } from '../../domain/game/contracts'
import type { RootState } from '../store/gameStore'

export function selectHouseName(state: RootState): string {
  return state.game.householdLore.houseName
}

const selectGame = (state: RootState) => state.game

/** All current wards in the household. */
export const selectWards = createSelector([selectGame], (game): Ward[] => game.wards)

/** Total roster capacity = renown-based slots + house room bonus slots. */
export const selectRosterCapacity = createSelector([selectGame], (game) => {
  const renownSlots = getRenownLevel(game.playerCharacter.renown).rosterSlots
  const houseBonus = game.house.rosterBonus ?? 0
  return {
    total: renownSlots + houseBonus,
    renownSlots,
    houseBonus,
    current: game.roster.length,
    isFull: game.roster.length >= renownSlots + houseBonus,
  }
})
