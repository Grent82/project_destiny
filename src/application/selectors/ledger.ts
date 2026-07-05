import { createSelector } from '@reduxjs/toolkit'

import { wageForStatus } from '../commands/endDay'
import { contentCatalog } from '../content/contentCatalog'
import type { RootState } from '../store/gameStore'
import { computeWorkingIncome } from './roster'
import { TITLE_IDS } from '../content/ids'

const selectGame = (state: RootState) => state.game

/** Estimates the per-day title income for a single NPC based on their active title. */
function estimateTitleIncome(npc: { activeTitle: string | null; skills: Record<string, number> }): number {
  if (!npc.activeTitle) return 0
  switch (npc.activeTitle) {
    case TITLE_IDS.STEWARD: {
      const admin = npc.skills['administration'] ?? 45
      return Math.min(25, 15 + Math.floor(Math.max(0, admin - 45) / 10) * 2)
    }
    case TITLE_IDS.QUARTERMASTER: {
      const admin = npc.skills['administration'] ?? 40
      return 3 + Math.floor(Math.max(0, admin - 40) / 15)
    }
    case TITLE_IDS.FENCE: {
      const intrigue = npc.skills['intrigue'] ?? 40
      return intrigue > 55 ? 10 : 5
    }
    default:
      return 0
  }
}

export const selectDailyIncomeBreakdown = createSelector([selectGame], (game) => {
  // playerRosterMember, not the raw unified list (destiny-rama.8) — this is the player's wage bill
  // and income estimate; world/story/enemy persons sharing the same runtime array are not on
  // payroll and must not inflate it (the same gap already fixed for the real command in
  // applyWages.ts during the rama.6 audit — this UI-facing estimate selector needs the same fix).
  const roster = game.npcRuntimeStates.filter((npc) => npc.playerRosterMember)
  const wages = roster.reduce((sum, npc) => sum + wageForStatus(npc.status), 0)

  const workingNpcIncome = roster
    .filter((npc) => npc.assignment === 'working')
    .reduce((sum, npc) => sum + computeWorkingIncome(npc.skills), 0)

  // House baseline: +5 Marks/day always
  const HOUSE_BASELINE = 5
  const titleIncome = roster.reduce((sum, npc) => sum + estimateTitleIncome(npc), 0) + HOUSE_BASELINE

  const net = workingNpcIncome + titleIncome - wages

  return { wages, workingNpcIncome, titleIncome, net }
})

export const selectLedgerSummary = createSelector([selectGame, selectDailyIncomeBreakdown], (game, dailyIncome) => {
  const rosterWages = dailyIncome.wages
  const dailyExpenses = rosterWages
  const daysRemaining = Math.max(0, game.debtDueDay - game.day)
  const netDailyBurn = Math.max(0, dailyExpenses - dailyIncome.workingNpcIncome - dailyIncome.titleIncome)
  const daysOfRunwayAtCurrentRate =
    netDailyBurn > 0 ? Math.floor(game.money / netDailyBurn) : 999
  const projectedMarksByDebt =
    daysRemaining > 0 ? game.money - netDailyBurn * daysRemaining : game.money
  const willMeetDebt = projectedMarksByDebt >= game.debtAmount

  const activeContracts = game.activeQuests.map((q) => ({
    questId: q.questId,
    title: q.acceptedTitle,
    status: q.status,
    stageId: q.stageId,
    acceptedOnDay: q.acceptedOnDay,
    currentObjectiveLabel: q.currentObjectiveLabel,
    incidentDistrictName: q.context.incidentDistrictId
      ? contentCatalog.districtsById.get(q.context.incidentDistrictId)?.name ?? q.context.incidentDistrictId
      : null,
  }))

  return {
    houseName: game.householdLore.houseName,
    day: game.day,
    debtAmount: game.debtAmount,
    debtClaimantNpcId: game.debtClaimantNpcId,
    debtClaimantName:
      contentCatalog.npcsById.get(game.debtClaimantNpcId)?.name ?? game.debtClaimantNpcId,
    debtEnforcementFactionId: game.debtEnforcementFactionId,
    debtEnforcementName:
      contentCatalog.factionsById.get(game.debtEnforcementFactionId)?.name ?? game.debtEnforcementFactionId,
    debtBeneficiaryFactionId: game.debtBeneficiaryFactionId,
    debtBeneficiaryName:
      contentCatalog.factionsById.get(game.debtBeneficiaryFactionId)?.name ?? game.debtBeneficiaryFactionId,
    debtDueDay: game.debtDueDay,
    debtPaid: game.debtPaid,
    debtCrisisTriggered: game.debtCrisisTriggered,
    daysRemaining,
    marks: game.money,
    dailyExpenses,
    rosterWages,
    daysOfRunwayAtCurrentRate,
    projectedMarksByDebt,
    willMeetDebt,
    factionStandings: game.factionStandings,
    activeContracts,
    mainQuestStage: game.mainQuest.stage,
  }
})
