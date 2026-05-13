import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'

const selectGame = (state: RootState) => state.game

export const selectHouseState = createSelector([selectGame], (game) => game.house)

export const selectHouseRooms = createSelector([selectGame], (game) => game.house.rooms)

export const selectHouseRepairSummary = createSelector([selectGame], (game) => {
  const rooms = game.house.rooms
  const totalRepairCost = rooms.reduce((sum, r) => sum + r.repairCost, 0)
  const damagedCount = rooms.filter(
    (r) => r.state === 'damaged' || r.state === 'stripped' || r.state === 'collapsed',
  ).length
  const intactCount = rooms.filter((r) => r.state === 'intact').length
  const canAffordAny = rooms.some(
    (r) => r.repairCost > 0 && r.repairCost <= game.money,
  )
  return { totalRepairCost, damagedCount, intactCount, canAffordAny, vaultUnlocked: game.house.vaultUnlocked }
})

import { ROOM_FUNCTION_CAPACITY_BONUS } from '../commands/assignRoomFunction'

const BASE_CREW_CAPACITY = 4

export const selectCrewCapacity = createSelector([selectGame], (game) => {
  const functionBonus = game.house.rooms
    .filter((r) => r.state === 'intact' && r.roomFunction !== null)
    .reduce((sum, r) => sum + (ROOM_FUNCTION_CAPACITY_BONUS[r.roomFunction!] ?? 0), 0)

  const total = BASE_CREW_CAPACITY + game.house.rosterBonus + functionBonus
  return {
    base: BASE_CREW_CAPACITY,
    rosterBonus: game.house.rosterBonus,
    functionBonus,
    total,
    filled: game.roster.length,
  }
})
