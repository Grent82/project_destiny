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
  const wages = game.roster.reduce((sum, npc) => sum + wageForStatus(npc.status), 0)

  const workingNpcIncome = game.roster
    .filter((npc) => npc.assignment === 'working')
    .reduce((sum, npc) => sum + computeWorkingIncome(npc.skills), 0)

  // House baseline: +5 Marks/day always
  const HOUSE_BASELINE = 5
  const titleIncome = game.roster.reduce((sum, npc) => sum + estimateTitleIncome(npc), 0) + HOUSE_BASELINE

  const net = workingNpcIncome + titleIncome - wages

  return { wages, workingNpcIncome, titleIncome, net }
})

export const selectLedgerSummary = createSelector([selectGame], (game) => {
  const rosterWages = game.roster.reduce((sum, npc) => sum + wageForStatus(npc.status), 0)
  const dailyExpenses = rosterWages
  const daysRemaining = Math.max(0, game.debtDueDay - game.day)

  // Burn rate: use net daily burn (wages minus estimated passive income) for runway
  const workingNpcIncome = game.roster
    .filter((npc) => npc.assignment === 'working')
    .reduce((sum, npc) => sum + computeWorkingIncome(npc.skills), 0)
  const HOUSE_BASELINE = 5
  const titleIncome = game.roster.reduce(
    (sum, npc) => sum + estimateTitleIncome(npc), 0
  ) + HOUSE_BASELINE
  const netDailyBurn = Math.max(0, dailyExpenses - workingNpcIncome - titleIncome)
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
