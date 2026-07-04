import type { GameState } from '../../domain'
import { createQuestLeadRuntime, createQuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../content/contentCatalog'
import { MAX_ACTIVITY_ENTRIES } from './activityLog'
import { settleQuestFailure, settleQuestSuccess } from './questSettlement'
import { isQuestExpired } from './questUtils'
import { formatMarks } from '../../domain/game/currency'
import { QUEST_IDS } from '../content/ids'
import { createRng } from './seededRng'
import { getMiraQuestBeats } from '../selectors/miraCustody'

type QuestLeadOverrides = Parameters<typeof createQuestLeadRuntime>[2]

function pushSystemLog(state: GameState, message: string): GameState {
  const newEntry = {
    id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
    day: state.day,
    timeSlot: state.timeSlot,
    category: 'system' as const,
    message,
  }
  let newLog = [newEntry, ...state.activityLog]
  if (newLog.length >= MAX_ACTIVITY_ENTRIES) {
    newLog = newLog.slice(0, MAX_ACTIVITY_ENTRIES)
  }
  return { ...state, activityLog: newLog }
}

/**
 * Applies mid-quest beats when transitioning to a new stage.
 * Shared helper used by all stage transitions to ensure beats fire consistently.
 * For Mira quests, uses runtime-backed beats from captivity state.
 * For other quests, uses template hard-coded beats.
 */
export function applyMidQuestBeats(
  state: Pick<GameState, 'npcCaptivityStates' | 'npcRuntimeStates' | 'completedQuestIds' | 'activeQuests' | 'day' | 'timeSlot' | 'activityLog'>,
  runtime: { questId: string; stageId: string; journalEntries: string[]; currentObjectiveLabel: string | null },
  template: { midQuestBeats?: Array<{ atStageId: string; label: string; journalEntry: string }> } | null,
  newStageId: string,
): void {
  // For Mira quests, use runtime-backed beats from captivity state
  if (runtime.questId.startsWith('quest-mira-')) {
    const miraBeats = getMiraQuestBeats(state, runtime.questId)
    for (const beat of miraBeats) {
      if (beat.atStageId === newStageId) {
        const beatAlreadyApplied = runtime.journalEntries.includes(beat.journalEntry)
        if (!beatAlreadyApplied) {
          runtime.currentObjectiveLabel = beat.label
          runtime.journalEntries.push(beat.journalEntry)
        }
      }
    }
    return
  }

  // For non-Mira quests, use template hard-coded beats
  if (!template?.midQuestBeats) return

  for (const beat of template.midQuestBeats) {
    if (beat.atStageId === newStageId) {
      const beatAlreadyApplied = runtime.journalEntries.includes(beat.journalEntry)
      if (!beatAlreadyApplied) {
        runtime.currentObjectiveLabel = beat.label
        runtime.journalEntries.push(beat.journalEntry)
      }
    }
  }
}

export function canDiscoverQuest(state: GameState, questId: string): boolean {
  // Check basic state: not already a lead, not active, not completed
  if (state.availableQuestLeads.some((lead) => lead.questId === questId)) return false
  if (state.activeQuests.some((quest) => quest.questId === questId)) return false
  if (state.completedQuestIds.includes(questId)) return false

  // Check failed quests and their retry behavior
  const failedIndex = state.failedQuestIds.findIndex((id) => id === questId)
  if (failedIndex !== -1) {
    const failedQuest = state.questHistory.find((q) => q.questId === questId)
    if (!failedQuest) return false // Should not happen, but be safe

    // 'fail' means the quest cannot be rediscovered after failure
    if (failedQuest.context.retryBehavior === 'fail') return false

    // 'retryable' means the quest can be rediscovered
    if (failedQuest.context.retryBehavior === 'retryable') return true

    // 'branch' means a successor quest should have been offered instead
    // Treat as non-rediscoverable (the successor is the intended path)
    return false
  }

  return true
}

export function addQuestLeadIfNew(
  state: GameState,
  questId: string,
  overrides: QuestLeadOverrides = {},
): GameState {
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template || !canDiscoverQuest(state, questId)) return state
  if (template.requiredFactionStanding) {
    const standing = state.factionStandings[template.requiredFactionStanding.factionId] ?? 0
    if (standing < template.requiredFactionStanding.minStanding) return state
  }
  let nextState: GameState = {
    ...state,
    availableQuestLeads: [...state.availableQuestLeads, createQuestLeadRuntime(template, state.day, overrides)],
  }
  nextState = pushSystemLog(nextState, `New lead discovered: ${template.title}.`)
  return nextState
}

export function acceptQuestFromLead(state: GameState, questId: string): GameState {
  const leadIndex = state.availableQuestLeads.findIndex(
    (lead) => lead.questId === questId && (lead.expiresOnDay == null || state.day <= lead.expiresOnDay),
  )
  if (leadIndex === -1) return state
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template) return state

  const lead = state.availableQuestLeads[leadIndex]
  const newActiveQuests = [...state.activeQuests, createQuestRuntime(template, state.day, lead)]
  const newAvailableLeads = [
    ...state.availableQuestLeads.slice(0, leadIndex),
    ...state.availableQuestLeads.slice(leadIndex + 1),
  ]

  let nextState: GameState = {
    ...state,
    availableQuestLeads: newAvailableLeads,
    activeQuests: newActiveQuests,
  }

  nextState = pushSystemLog(nextState, `Contract accepted: ${template.title}.`)

  if (questId === QUEST_IDS.MIRA_RESCUE && state.mainQuest?.stage === 'lead-found') {
    nextState = {
      ...nextState,
      mainQuest: {
        stage: 'location-known',
        lastClue:
          "Tessaly Ash confirms it: Mira is in the old tannery on the Pale's eastern edge. You know where she is. Now you need a way in.",
      },
    }
  }
  return nextState
}

export function expireTimedQuestsOnState(state: GameState): GameState {
  const toExpire = state.activeQuests
    .filter((q) => {
      const template = getQuestTemplates().find((t) => t.id === q.questId)
      return template != null && isQuestExpired(q, template, state.day)
    })
    .map((q) => q.questId)

  let nextState: GameState = state
  for (const questId of toExpire) {
    nextState = settleQuestFailure(nextState, questId, {
      objectiveLabel: 'The contract expired before the house acted.',
      journalEntry: 'Time ran out before the contract could be completed.',
      failureMessage: `Contract failed: "${getQuestTemplates().find((t) => t.id === questId)?.title ?? questId}". The house bears the cost.`,
    })
  }
  return nextState
}

export function resolveSimpleContractObjective(state: GameState, questId: string): GameState {
  const hasRuntime = state.activeQuests.some((entry) => entry.questId === questId)
  if (!hasRuntime) return state
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template) return state
  if (template.objectiveType !== 'delivery' && template.objectiveType !== 'survival') return state

  const runtime = state.activeQuests.find((q) => q.questId === questId)!
  if (runtime.progress.completedSteps < 2) return state

  const label = template.objectiveType === 'delivery' ? 'Delivery complete' : 'Job done'
  return settleQuestSuccess(state, questId, {
    objectiveLabel: 'The on-site work is done. Return and settle accounts.',
    journalEntry: 'The contract was completed on-site.',
    completionMessage: `${label}: "${template.title}". ${formatMarks(template.rewardMarks)} received.`,
  })
}

/**
 * Advances a delivery or survival quest from its initial state to the 'on-site' step.
 * Represents transit to the district and initial contact / position-taking.
 * Returns the updated GameState.
 */
export function advanceToOnSiteStep(state: GameState, questId: string): GameState {
  const runtime = state.activeQuests.find((q) => q.questId === questId)
  if (!runtime) return state
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template) return state
  if (template.objectiveType !== 'delivery' && template.objectiveType !== 'survival') return state
  if (runtime.progress.completedSteps >= 2) return state

  const stepLabel = template.objectiveType === 'delivery'
    ? 'Contact reached. Confirm terms and wait for the exchange window.'
    : 'Position established. Hold through the watch until the job is marked clear.'

  // Create new runtime with updated properties
  const updatedRuntime = {
    ...runtime,
    stageId: 'on-site' as const,
    progress: {
      ...runtime.progress,
      completedSteps: 2,
      lastAdvancedDay: state.day,
    },
    currentObjectiveLabel: stepLabel,
    journalEntries: [...runtime.journalEntries, stepLabel],
  }

  // Apply mid-quest beats for the 'on-site' stage
  applyMidQuestBeats(
    {
      npcCaptivityStates: state.npcCaptivityStates,
      npcRuntimeStates: state.npcRuntimeStates,
      completedQuestIds: state.completedQuestIds,
      activeQuests: state.activeQuests,
      day: state.day,
      timeSlot: state.timeSlot,
      activityLog: state.activityLog,
    },
    { questId: updatedRuntime.questId, stageId: updatedRuntime.stageId, journalEntries: updatedRuntime.journalEntries, currentObjectiveLabel: updatedRuntime.currentObjectiveLabel },
    template,
    'on-site',
  )

  // Return new state with updated runtime
  const questIndex = state.activeQuests.findIndex((q) => q.questId === questId)
  return {
    ...state,
    activeQuests: [
      ...state.activeQuests.slice(0, questIndex),
      updatedRuntime,
      ...state.activeQuests.slice(questIndex + 1),
    ],
  }
}

/**
 * Resolves a delivery or survival quest with a complication check.
 * Uses the template's complicationRisk field and state.rngSeed for deterministic RNG.
 * Returns the updated GameState.
 */
export function resolveWithComplicationCheck(
  state: GameState,
  questId: string,
  complicationRiskOverride?: number,
): GameState {
  const runtime = state.activeQuests.find((q) => q.questId === questId)
  if (!runtime) return state
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template) return state
  if (template.objectiveType !== 'delivery' && template.objectiveType !== 'survival') return state
  if (runtime.progress.completedSteps < 2) return state

  // Use override if provided (for tests), otherwise fall back to template default
  const complicationRisk = complicationRiskOverride ?? template.complicationRisk ?? 0
  if (complicationRisk > 0) {
    const { rng } = createRng(state.rngSeed)
    const roll = rng()
    if (roll < complicationRisk) {
      const reason = template.objectiveType === 'delivery'
        ? 'The exchange was intercepted. The delivery failed.'
        : 'The squad could not hold the position. The job is forfeit.'
      return settleQuestFailure(state, questId, {
        objectiveLabel: reason,
        journalEntry: reason,
        failureMessage: `Contract failed: "${template.title}". ${reason}`,
      })
    }
    // Advance RNG seed for next use
    // Note: We don't update state.rngSeed here since this is called from a reducer
    // The seed will be advanced by other means (e.g., event resolution)
  }

  const requiredWatches = runtime.context.executionDurationWatches
  if (requiredWatches != null) {
    const setupSteps = 2
    const watchesLogged = Math.max(0, runtime.progress.completedSteps - setupSteps)
    const nextWatchesLogged = Math.min(requiredWatches, watchesLogged + 1)
    const updatedRuntime = {
      ...runtime,
      progress: {
        ...runtime.progress,
        completedSteps: Math.max(
          runtime.progress.completedSteps,
          setupSteps + nextWatchesLogged,
        ),
        lastAdvancedDay: state.day,
      },
      journalEntries:
        nextWatchesLogged < requiredWatches
          ? [...runtime.journalEntries, `Watch ${nextWatchesLogged} of ${requiredWatches} logged on-site.`]
          : runtime.journalEntries,
    }

    if (nextWatchesLogged < requiredWatches) {
      const questIndex = state.activeQuests.findIndex((q) => q.questId === questId)
      return {
        ...state,
        activeQuests: [
          ...state.activeQuests.slice(0, questIndex),
          updatedRuntime,
          ...state.activeQuests.slice(questIndex + 1),
        ],
      }
    }

    const questIndex = state.activeQuests.findIndex((q) => q.questId === questId)
    state = {
      ...state,
      activeQuests: [
        ...state.activeQuests.slice(0, questIndex),
        updatedRuntime,
        ...state.activeQuests.slice(questIndex + 1),
      ],
    }
  }

  const label = template.objectiveType === 'delivery' ? 'Delivery complete' : 'Job done'
  return settleQuestSuccess(state, questId, {
    objectiveLabel: 'The on-site work is done. Return and settle accounts.',
    journalEntry: 'The contract was completed on-site.',
    completionMessage: `${label}: "${template.title}". ${formatMarks(template.rewardMarks)} received.`,
  })
}
