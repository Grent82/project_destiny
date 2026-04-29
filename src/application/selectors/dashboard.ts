import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'

const selectGame = (state: RootState) => state.game

export const selectDashboardSummary = createSelector([selectGame], (game) => {
  const roster = game.roster

  return {
    day: game.day,
    timeSlot: game.timeSlot,
    money: game.money,
    rosterCount: roster.length,
    deployedCount: roster.filter((npc) => npc.assignment === 'deployed').length,
    recoveringCount: roster.filter((npc) => npc.assignment === 'recovering').length,
    assignedSquadCount: game.selectedSquadNpcIds.length,
    cityDials: game.cityDials,
    recentActivity: game.activityLog.slice(0, 3),
  }
})

export const selectDebtStatus = createSelector([selectGame], (game) => ({
  debtAmount: game.debtAmount,
  debtDueDay: game.debtDueDay,
  debtPaid: game.debtPaid,
  debtCrisisTriggered: game.debtCrisisTriggered,
  daysRemaining: Math.max(0, game.debtDueDay - game.day),
  marks: game.money,
}))

export const selectProtagonistName = createSelector(
  [selectGame],
  (game) => game.protagonistName,
)

export const selectHasSeenOpening = createSelector(
  [selectGame],
  (game) => game.hasSeenOpening,
)

export const selectHouseDistrictId = createSelector(
  [selectGame],
  (game) => game.houseDistrictId,
)
