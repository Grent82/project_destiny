import { current, type PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../../domain'
import { contentCatalog, getQuestTemplates } from '../../content/contentCatalog'
import { matchesQuestDiscoveryAtPoi } from '../../content/questDiscovery'
import {
  addQuestLeadIfNew,
  acceptQuestFromLead,
  expireTimedQuestsOnState,
  resolveSimpleContractObjective,
  advanceToOnSiteStep,
  resolveWithComplicationCheck,
  applyMidQuestBeats,
} from '../../commands/questLifecycle'
import { settleQuestFailure, settleQuestSuccess } from '../../commands/questSettlement'
import {
  computeBestInvestigationSkill,
  computeApproachSkillValue,
  rollInvestigationOutcome,
  buildInvestigationOperativeResults,
  computeFiledEvidenceBonus,
} from '../../commands/investigation'
import {
  applyInvestigationApproachQuestState,
  applyInvestigationOutcomeQuestState,
  applyInvestigationQuestSetup,
  getInvestigationApproachForQuest,
  getInvestigationOutcomeCopy,
  getInvestigationOutcomeHandling,
  getInvestigationStartCopy,
} from '../../commands/investigationProfiles'
import { MAX_ACTIVITY_ENTRIES } from '../../commands/activityLog'

function pushQuestLog(state: GameState, message: string) {
  state.activityLog.unshift({
    id: `log-${state.day}-${state.timeSlot}-quest-${state.activityLog.length + 1}`,
    day: state.day,
    timeSlot: state.timeSlot,
    category: 'system',
    message,
  })
  if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
}

export const questReducers = {
  updateQuestRuntime(
    state: GameState,
    action: PayloadAction<{
      questId: string
      stageId?: string
      currentObjectiveLabel?: string | null
      completedSteps?: number
      appendJournalEntry?: string
    }>,
  ) {
    const quest = state.activeQuests.find((entry) => entry.questId === action.payload.questId)
    if (!quest) return
    if (action.payload.stageId !== undefined) {
      quest.stageId = action.payload.stageId
      const template = getQuestTemplates().find((t) => t.id === quest.questId) ?? null
      // Use shared helper for consistent beat application
      applyMidQuestBeats(
        {
          npcRuntimeStates: state.npcRuntimeStates,
          completedQuestIds: state.completedQuestIds,
          activeQuests: state.activeQuests,
          day: state.day,
          timeSlot: state.timeSlot,
          activityLog: state.activityLog,
        },
        { questId: quest.questId, stageId: quest.stageId, journalEntries: quest.journalEntries, currentObjectiveLabel: quest.currentObjectiveLabel },
        template,
        action.payload.stageId,
      )
    }
    if (action.payload.currentObjectiveLabel !== undefined) {
      quest.currentObjectiveLabel = action.payload.currentObjectiveLabel
    }
    if (action.payload.completedSteps !== undefined) {
      quest.progress.completedSteps = Math.max(
        quest.progress.completedSteps,
        Math.min(quest.progress.requiredSteps, action.payload.completedSteps),
      )
    }
    quest.progress.lastAdvancedDay = state.day
    if (action.payload.appendJournalEntry) {
      quest.journalEntries = [...quest.journalEntries, action.payload.appendJournalEntry]
    }
  },

  acceptQuest(state: GameState, action: PayloadAction<{ questId: string }>) {
    return acceptQuestFromLead(state, action.payload.questId)
  },

  discoverQuestLeadsAtPoi(
    state: GameState,
    action: PayloadAction<{ districtId: string; poiId: string }>,
  ) {
    const { districtId, poiId } = action.payload
    const poi = contentCatalog.poisById.get(poiId)
    if (!poi || poi.districtId !== districtId) return state
    let nextState: GameState = state
    for (const template of getQuestTemplates()) {
      if (!matchesQuestDiscoveryAtPoi(template, poi)) continue
      nextState = addQuestLeadIfNew(nextState, template.id, {
        discoverySource: template.discoverySource,
        discoveryDistrictId: districtId,
        sourcePoiId: poi.id,
        issuerFactionId: poi.factionId ?? template.employerFactionId,
      })
    }
    return nextState
  },

  discoverQuestLeadsFromNpc(
    state: GameState,
    action: PayloadAction<{ districtId: string; npcId: string; poiId?: string | null }>,
  ) {
    const { districtId, npcId, poiId = null } = action.payload
    let nextState: GameState = state
    for (const template of getQuestTemplates()) {
      if (template.discoverySource !== 'npc') continue
      if (template.sourceNpcId !== npcId) continue
      if (template.discoveryDistrictId !== districtId) continue
      const npc = contentCatalog.npcsById.get(npcId)
      nextState = addQuestLeadIfNew(nextState, template.id, {
        discoverySource: 'npc',
        discoveryDistrictId: districtId,
        sourceNpcId: npcId,
        sourcePoiId: poiId,
        issuerFactionId: npc?.factionAffinityId ?? template.employerFactionId,
      })
    }
    return nextState
  },

  completeQuest(state: GameState, action: PayloadAction<{ questId: string }>) {
    return settleQuestSuccess(state, action.payload.questId, {
      journalEntry: 'The contract was resolved in the house ledger.',
    })
  },

  resolveSimpleContract(state: GameState, action: PayloadAction<{ questId: string }>) {
    return resolveSimpleContractObjective(state, action.payload.questId)
  },

  advanceToOnSiteStep(state: GameState, action: PayloadAction<{ questId: string }>) {
    const snapshot = current(state) as GameState
    return advanceToOnSiteStep(snapshot, action.payload.questId)
  },

  resolveContractWithComplicationCheck(
    state: GameState,
    action: PayloadAction<{ questId: string }>,
  ) {
    const snapshot = current(state) as GameState
    return resolveWithComplicationCheck(snapshot, action.payload.questId)
  },

  failQuest(state: GameState, action: PayloadAction<{ questId: string }>) {
    return settleQuestFailure(state, action.payload.questId)
  },

  expireTimedQuests(state: GameState) {
    return expireTimedQuestsOnState(state)
  },

  startInvestigation(state: GameState, action: PayloadAction<{ questId: string }>) {
    const quest = getQuestTemplates().find((q) => q.id === action.payload.questId)
    if (!quest || quest.objectiveType !== 'investigation') return
    state.activeInvestigation = {
      questId: action.payload.questId,
      districtId: quest.districtId,
      rollResult: 'pending',
      stage: 'approach-selection',
      chosenApproachId: null,
      clueText: null,
    }
    state.lastInvestigationResult = null
    const runtime = state.activeQuests.find((aq) => aq.questId === action.payload.questId)
    if (runtime) {
      applyInvestigationQuestSetup(runtime, action.payload.questId)
      runtime.stageId = 'investigating'
      runtime.progress.completedSteps = Math.max(runtime.progress.completedSteps, 1)
      runtime.progress.lastAdvancedDay = state.day

      // Apply mid-quest beats FIRST (for generic quests)
      applyMidQuestBeats(
        {
          npcRuntimeStates: state.npcRuntimeStates,
          completedQuestIds: state.completedQuestIds,
          activeQuests: state.activeQuests,
          day: state.day,
          timeSlot: state.timeSlot,
          activityLog: state.activityLog,
        },
        { questId: runtime.questId, stageId: runtime.stageId, journalEntries: runtime.journalEntries, currentObjectiveLabel: runtime.currentObjectiveLabel },
        quest ?? null,
        'investigating',
      )

      // Then apply start copy (overrides beat for story quests with custom setup)
      const startCopy = getInvestigationStartCopy(action.payload.questId)
      runtime.currentObjectiveLabel = startCopy.objectiveLabel
      runtime.journalEntries = [...runtime.journalEntries, startCopy.journalEntry]
    }
  },

  chooseInvestigationApproach(state: GameState, action: PayloadAction<{ approachId: string }>) {
    if (!state.activeInvestigation || state.activeInvestigation.stage !== 'approach-selection') return
    const approach = getInvestigationApproachForQuest(
      state.activeInvestigation.questId,
      action.payload.approachId,
    )
    if (!approach) return

    state.activeInvestigation.stage = 'ready-to-resolve'
    state.activeInvestigation.chosenApproachId = approach.id
    state.activeInvestigation.clueText = approach.clueText

    const runtime = state.activeQuests.find((q) => q.questId === state.activeInvestigation!.questId)
    if (runtime) {
      applyInvestigationApproachQuestState(
        runtime,
        state.activeInvestigation.questId,
        approach.id,
        state.day,
      )
      runtime.currentObjectiveLabel = `Approach: ${approach.label}. Assign operatives and resolve the investigation.`
      runtime.progress.completedSteps = Math.max(runtime.progress.completedSteps, 2)
      runtime.journalEntries = [...runtime.journalEntries, approach.clueText]
    }
  },

  resolveInvestigation(state: GameState, action: PayloadAction<{ npcIds: string[] }>) {
    if (!state.activeInvestigation) return
    if (state.activeInvestigation.stage !== 'ready-to-resolve') return
    const { questId, chosenApproachId } = state.activeInvestigation
    const quest = getQuestTemplates().find((q) => q.id === questId)
    if (!quest) return
    const runtime = state.activeQuests.find((q) => q.questId === questId)
    if (!runtime) return

    const approach = chosenApproachId
      ? getInvestigationApproachForQuest(questId, chosenApproachId)
      : null
    const bestSkillValue = approach
      ? computeApproachSkillValue(state, action.payload.npcIds, approach.primarySkills)
      : computeBestInvestigationSkill(state, action.payload.npcIds)
    const difficultyModifier =
      (approach?.difficultyModifier ?? 0) + computeFiledEvidenceBonus(state, chosenApproachId)

    const { outcome, roll, nextSeed } = rollInvestigationOutcome(
      state.rngSeed,
      bestSkillValue,
      difficultyModifier,
    )
    const operativeResults = buildInvestigationOperativeResults(
      state,
      action.payload.npcIds,
      approach?.primarySkills ?? ['intrigue', 'security', 'administration', 'negotiation'],
      roll,
      difficultyModifier,
    )
    state.activeInvestigation.rollResult = outcome
    state.rngSeed = nextSeed
    state.lastInvestigationResult = {
      questId,
      districtId: state.activeInvestigation.districtId,
      outcome,
      chosenApproachId,
      clueText: state.activeInvestigation.clueText,
      operativeResults,
    }

    const bonusType = approach?.bonusType ?? 'none'
    const requiredDays = runtime.context.executionDurationDays

    if (requiredDays != null) {
      const setupSteps = 2
      const surveillanceDaysLogged = Math.max(0, runtime.progress.completedSteps - setupSteps)
      // Use lastSurveillanceLoggedDay for deduplication - separate from lastAdvancedDay
      // which can be overwritten by startInvestigation on subsequent days
      const alreadyWorkedToday =
        surveillanceDaysLogged > 0 && runtime.progress.lastSurveillanceLoggedDay === state.day
      const nextSurveillanceDaysLogged = alreadyWorkedToday
        ? surveillanceDaysLogged
        : Math.min(requiredDays, surveillanceDaysLogged + 1)

      runtime.progress.completedSteps = Math.max(
        runtime.progress.completedSteps,
        setupSteps + nextSurveillanceDaysLogged,
      )
      // Only update lastSurveillanceLoggedDay when actually logging progress
      if (!alreadyWorkedToday) {
        runtime.progress.lastSurveillanceLoggedDay = state.day
      }
      // Always update lastAdvancedDay for generic "last touched" tracking
      runtime.progress.lastAdvancedDay = state.day

      if (!alreadyWorkedToday) {
        const progressEntry = `Surveillance day ${nextSurveillanceDaysLogged} of ${requiredDays} logged.`
        runtime.journalEntries = [...runtime.journalEntries, progressEntry]
        pushQuestLog(
          state,
          `${quest.title}: surveillance day ${nextSurveillanceDaysLogged} of ${requiredDays} logged.`,
        )
      }

      if (nextSurveillanceDaysLogged < requiredDays) {
        runtime.currentObjectiveLabel =
          `Continue surveillance tomorrow. ${nextSurveillanceDaysLogged} of ${requiredDays} days logged.`
        state.lastInvestigationResult = null
        state.activeInvestigation = null
        return
      }
    }

    const successCopy = getInvestigationOutcomeCopy(questId, 'success')
    const partialCopy = getInvestigationOutcomeCopy(questId, 'partial')
    const failureCopy = getInvestigationOutcomeCopy(questId, 'failure')
    const outcomeHandling = getInvestigationOutcomeHandling(questId, outcome)

    const stateSnapshot = current(state) as GameState
    const stateWithOutcomeEffects = applyInvestigationOutcomeQuestState(
      stateSnapshot,
      questId,
      outcome,
    )
    Object.assign(state, stateWithOutcomeEffects)
    const activeRuntime = state.activeQuests.find((q) => q.questId === questId)

    if (outcomeHandling?.keepQuestActive) {
      if (!activeRuntime) return
      activeRuntime.stageId = outcomeHandling.stageId
      activeRuntime.currentObjectiveLabel = outcomeHandling.objectiveLabel
      activeRuntime.progress.lastAdvancedDay = state.day
      activeRuntime.journalEntries = [...activeRuntime.journalEntries, outcomeHandling.journalEntry]
      pushQuestLog(state, outcomeHandling.activityLogMessage)
      state.activeInvestigation = null
      return
    }

    if (outcome === 'success') {
      const rewardScale = bonusType === 'extra_marks' ? 1.25 : 1.0
      const effectiveReward = Math.floor(quest.rewardMarks * rewardScale)
      const settledState = settleQuestSuccess(current(state) as GameState, questId, {
        rewardScale,
        journalEntry: successCopy.journalEntry,
        completionMessage:
          successCopy.completionMessage ??
          `The investigation concludes. ${effectiveReward} Marks received.`,
      })
      Object.assign(state, settledState)
    } else if (outcome === 'partial') {
      const halfReward = Math.floor(quest.rewardMarks / 2)
      const settledState = settleQuestSuccess(current(state) as GameState, questId, {
        rewardScale: 0.5,
        applyStanding: false,
        applyCityDial: false,
        applyDebtReduction: false,
        applyUnlocksNpc: false,
        renownGainOverride: 2,
        journalEntry: partialCopy.journalEntry,
        completionMessage:
          partialCopy.completionMessage ??
          `The investigation yields something, though not everything. ${halfReward} Marks.`,
      })
      Object.assign(state, settledState)
    } else {
      const settledState = settleQuestFailure(current(state) as GameState, questId, {
        applyStanding: bonusType !== 'reduce_penalty',
        failureMessage:
          failureCopy.failureMessage ?? 'The investigation goes nowhere. The opportunity is lost.',
        journalEntry: failureCopy.journalEntry,
      })
      Object.assign(state, settledState)
    }
    state.activeInvestigation = null
  },

  clearLastInvestigationResult(state: GameState) {
    state.lastInvestigationResult = null
  },
}
