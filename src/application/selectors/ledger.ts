import { createSelector } from '@reduxjs/toolkit'

import { wageForStatus } from '../commands/endDay'
import type { RootState } from '../store/gameStore'

const selectGame = (state: RootState) => state.game

export const selectLedgerSummary = createSelector([selectGame], (game) => {
  const rosterWages = game.roster.reduce((sum, npc) => sum + wageForStatus(npc.status), 0)
  const dailyExpenses = rosterWages
  const daysRemaining = Math.max(0, game.debtDueDay - game.day)

  const activeContracts = game.activeQuests.map((q) => ({
    questId: q.questId,
    status: q.status,
    acceptedOnDay: q.acceptedOnDay,
  }))

  return {
    houseName: game.householdLore.houseName,
    day: game.day,
    debtAmount: game.debtAmount,
    debtDueDay: game.debtDueDay,
    debtPaid: game.debtPaid,
    debtCrisisTriggered: game.debtCrisisTriggered,
    daysRemaining,
    marks: game.money,
    dailyExpenses,
    rosterWages,
    factionStandings: game.factionStandings,
    activeContracts,
    mainQuestStage: game.mainQuest.stage,
  }
})
