import type { PayloadAction } from '@reduxjs/toolkit'

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
} from '../../commands/questLifecycle'
import { settleQuestFailure, settleQuestSuccess } from '../../commands/questSettlement'
import {
  computeBestInvestigationSkill,
  computeApproachSkillValue,
  getInvestigationApproach,
  rollInvestigationOutcome,
} from '../../commands/investigation'

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
      const template = getQuestTemplates().find((t) => t.id === quest.questId)
      if (template?.midQuestBeats) {
        for (const beat of template.midQuestBeats) {
          if (beat.atStageId === action.payload.stageId) {
            quest.currentObjectiveLabel = beat.label
            quest.journalEntries = [...quest.journalEntries, beat.journalEntry]
          }
        }
      }
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
    acceptQuestFromLead(state, action.payload.questId)
  },

  discoverQuestLeadsAtPoi(
    state: GameState,
    action: PayloadAction<{ districtId: string; poiId: string }>,
  ) {
    const { districtId, poiId } = action.payload
    const poi = contentCatalog.poisById.get(poiId)
    if (!poi || poi.districtId !== districtId) return
    for (const template of getQuestTemplates()) {
      if (!matchesQuestDiscoveryAtPoi(template, poi)) continue
      addQuestLeadIfNew(state, template.id, {
        discoverySource: template.discoverySource,
        discoveryDistrictId: districtId,
        sourcePoiId: poi.id,
        issuerFactionId: poi.factionId ?? template.employerFactionId,
      })
    }
  },

  discoverQuestLeadsFromNpc(
    state: GameState,
    action: PayloadAction<{ districtId: string; npcId: string; poiId?: string | null }>,
  ) {
    const { districtId, npcId, poiId = null } = action.payload
    for (const template of getQuestTemplates()) {
      if (template.discoverySource !== 'npc') continue
      if (template.sourceNpcId !== npcId) continue
      if (template.discoveryDistrictId !== districtId) continue
      const npc = contentCatalog.npcsById.get(npcId)
      addQuestLeadIfNew(state, template.id, {
        discoverySource: 'npc',
        discoveryDistrictId: districtId,
        sourceNpcId: npcId,
        sourcePoiId: poiId,
        issuerFactionId: npc?.factionAffinityId ?? template.employerFactionId,
      })
    }
  },

  completeQuest(state: GameState, action: PayloadAction<{ questId: string }>) {
    settleQuestSuccess(state, action.payload.questId, {
      journalEntry: 'The contract was resolved in the house ledger.',
    })
  },

  resolveSimpleContract(state: GameState, action: PayloadAction<{ questId: string }>) {
    resolveSimpleContractObjective(state, action.payload.questId)
  },

  advanceToOnSiteStep(state: GameState, action: PayloadAction<{ questId: string }>) {
    advanceToOnSiteStep(state, action.payload.questId)
  },

  resolveContractWithComplicationCheck(
    state: GameState,
    action: PayloadAction<{ questId: string; complicationRisk?: number }>,
  ) {
    resolveWithComplicationCheck(state, action.payload.questId, action.payload.complicationRisk ?? 0)
  },

  failQuest(state: GameState, action: PayloadAction<{ questId: string }>) {
    settleQuestFailure(state, action.payload.questId)
  },

  expireTimedQuests(state: GameState) {
    expireTimedQuestsOnState(state)
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
    const runtime = state.activeQuests.find((aq) => aq.questId === action.payload.questId)
    if (runtime) {
      runtime.stageId = 'investigating'
      runtime.currentObjectiveLabel = 'Choose how to work this lead — your approach shapes the risk and reward.'
      runtime.progress.completedSteps = Math.max(runtime.progress.completedSteps, 1)
      runtime.progress.lastAdvancedDay = state.day
      runtime.journalEntries = [...runtime.journalEntries, 'The house has committed operatives to investigate the lead.']
    }
  },

  chooseInvestigationApproach(state: GameState, action: PayloadAction<{ approachId: string }>) {
    if (!state.activeInvestigation || state.activeInvestigation.stage !== 'approach-selection') return
    const approach = getInvestigationApproach(action.payload.approachId)
    if (!approach) return

    state.activeInvestigation.stage = 'ready-to-resolve'
    state.activeInvestigation.chosenApproachId = approach.id
    state.activeInvestigation.clueText = approach.clueText

    const runtime = state.activeQuests.find((q) => q.questId === state.activeInvestigation!.questId)
    if (runtime) {
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

    const approach = chosenApproachId ? getInvestigationApproach(chosenApproachId) : null
    const bestSkillValue = approach
      ? computeApproachSkillValue(state, action.payload.npcIds, approach.primarySkills)
      : computeBestInvestigationSkill(state, action.payload.npcIds)
    const difficultyModifier = approach?.difficultyModifier ?? 0

    const { outcome, nextSeed } = rollInvestigationOutcome(state.rngSeed, bestSkillValue, difficultyModifier)
    state.activeInvestigation.rollResult = outcome
    state.rngSeed = nextSeed

    const bonusType = approach?.bonusType ?? 'none'

    if (outcome === 'success') {
      const rewardScale = bonusType === 'extra_marks' ? 1.25 : 1.0
      const effectiveReward = Math.floor(quest.rewardMarks * rewardScale)
      settleQuestSuccess(state, questId, {
        rewardScale,
        journalEntry: 'The lead yielded a decisive result.',
        completionMessage: `The investigation concludes. ${effectiveReward} Marks received.`,
      })
    } else if (outcome === 'partial') {
      const halfReward = Math.floor(quest.rewardMarks / 2)
      settleQuestSuccess(state, questId, {
        rewardScale: 0.5,
        applyStanding: false,
        applyCityDial: false,
        applyDebtReduction: false,
        applyUnlocksNpc: false,
        renownGainOverride: 2,
        journalEntry: 'The investigation yielded only part of the truth.',
        completionMessage: `The investigation yields something, though not everything. ${halfReward} Marks.`,
      })
    } else {
      settleQuestFailure(state, questId, {
        applyStanding: bonusType !== 'reduce_penalty',
        failureMessage: 'The investigation goes nowhere. The opportunity is lost.',
        journalEntry: 'The lead went cold and the opportunity slipped away.',
      })
    }
    state.activeInvestigation = null
  },
}
