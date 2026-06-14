import type { GameState } from '../../domain'
import { createQuestLeadRuntime, createQuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../content/contentCatalog'
import { MAX_ACTIVITY_ENTRIES } from './activityLog'
import { settleQuestFailure, settleQuestSuccess } from './questSettlement'
import { isQuestExpired } from './questUtils'
import { formatMarks } from '../../domain/game/currency'
import { QUEST_IDS } from '../content/ids'
import { createRng } from './seededRng'

type QuestLeadOverrides = Parameters<typeof createQuestLeadRuntime>[2]

function pushSystemLog(state: GameState, message: string) {
  state.activityLog.unshift({
    id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
    day: state.day,
    timeSlot: state.timeSlot,
    category: 'system',
    message,
  })
  if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
}

/**
 * Applies mid-quest beats when transitioning to a new stage.
 * Shared helper used by all stage transitions to ensure beats fire consistently.
 */
export function applyMidQuestBeats(
  runtime: { stageId: string; journalEntries: string[]; currentObjectiveLabel: string | null },
  template: { midQuestBeats?: Array<{ atStageId: string; label: string; journalEntry: string }> } | null,
  newStageId: string,
): void {
  if (!template?.midQuestBeats) return

  for (const beat of template.midQuestBeats) {
    if (beat.atStageId === newStageId) {
      // Only apply if this beat hasn't been applied yet (check journal entries)
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
): boolean {
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template || !canDiscoverQuest(state, questId)) return false
  if (template.requiredFactionStanding) {
    const standing = state.factionStandings[template.requiredFactionStanding.factionId] ?? 0
    if (standing < template.requiredFactionStanding.minStanding) return false
  }
  state.availableQuestLeads.push(createQuestLeadRuntime(template, state.day, overrides))
  pushSystemLog(state, `New lead discovered: ${template.title}.`)
  return true
}

export function acceptQuestFromLead(state: GameState, questId: string): boolean {
  const leadIndex = state.availableQuestLeads.findIndex(
    (lead) => lead.questId === questId && (lead.expiresOnDay == null || state.day <= lead.expiresOnDay),
  )
  if (leadIndex === -1) return false
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template) return false

  const [lead] = state.availableQuestLeads.splice(leadIndex, 1)
  state.activeQuests.push(createQuestRuntime(template, state.day, lead))
  pushSystemLog(state, `Contract accepted: ${template.title}.`)

  if (questId === QUEST_IDS.MIRA_RESCUE && state.mainQuest.stage === 'lead-found') {
    state.mainQuest.stage = 'location-known'
    state.mainQuest.lastClue =
      "Tessaly Ash confirms it: Mira is in the old tannery on the Pale's eastern edge. You know where she is. Now you need a way in."
  }
  return true
}

export function expireTimedQuestsOnState(state: GameState): void {
  const toExpire = state.activeQuests
    .filter((q) => {
      const template = getQuestTemplates().find((t) => t.id === q.questId)
      return template != null && isQuestExpired(q, template, state.day)
    })
    .map((q) => q.questId)

  for (const questId of toExpire) {
    settleQuestFailure(state, questId, {
      objectiveLabel: 'The contract expired before the house acted.',
      journalEntry: 'Time ran out before the contract could be completed.',
      failureMessage: `Contract failed: "${getQuestTemplates().find((t) => t.id === questId)?.title ?? questId}". The house bears the cost.`,
    })
  }
}

export function resolveSimpleContractObjective(state: GameState, questId: string): boolean {
  const hasRuntime = state.activeQuests.some((entry) => entry.questId === questId)
  if (!hasRuntime) return false
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template) return false
  if (template.objectiveType !== 'delivery' && template.objectiveType !== 'survival') return false

  const runtime = state.activeQuests.find((q) => q.questId === questId)!
  if (runtime.progress.completedSteps < 2) return false

  const label = template.objectiveType === 'delivery' ? 'Delivery complete' : 'Job done'
  settleQuestSuccess(state, questId, {
    objectiveLabel: 'The on-site work is done. Return and settle accounts.',
    journalEntry: 'The contract was completed on-site.',
    completionMessage: `${label}: "${template.title}". ${formatMarks(template.rewardMarks)} received.`,
  })
  return true
}

/**
 * Advances a delivery or survival quest from its initial state to the 'on-site' step.
 * Represents transit to the district and initial contact / position-taking.
 * Returns true if advancement succeeded.
 */
export function advanceToOnSiteStep(state: GameState, questId: string): boolean {
  const runtime = state.activeQuests.find((q) => q.questId === questId)
  if (!runtime) return false
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template) return false
  if (template.objectiveType !== 'delivery' && template.objectiveType !== 'survival') return false
  if (runtime.progress.completedSteps >= 2) return false

  const stepLabel = template.objectiveType === 'delivery'
    ? 'Contact reached. Confirm terms and wait for the exchange window.'
    : 'Position established. Hold through the watch until the job is marked clear.'

  runtime.stageId = 'on-site'
  runtime.progress.completedSteps = 2
  runtime.progress.lastAdvancedDay = state.day
  runtime.currentObjectiveLabel = stepLabel
  runtime.journalEntries.push(stepLabel)

  // Apply mid-quest beats for the 'on-site' stage
  applyMidQuestBeats(runtime, template, 'on-site')

  return true
}

/**
 * Resolves a delivery or survival quest with a complication check.
 * Uses the template's complicationRisk field and state.rngSeed for deterministic RNG.
 * Returns 'success' | 'failed' | 'in_progress' | 'not_ready' | 'not_applicable'.
 */
export function resolveWithComplicationCheck(
  state: GameState,
  questId: string,
  complicationRiskOverride?: number,
): 'success' | 'failed' | 'in_progress' | 'not_ready' | 'not_applicable' {
  const runtime = state.activeQuests.find((q) => q.questId === questId)
  if (!runtime) return 'not_applicable'
  const template = getQuestTemplates().find((q) => q.id === questId)
  if (!template) return 'not_applicable'
  if (template.objectiveType !== 'delivery' && template.objectiveType !== 'survival') return 'not_applicable'
  if (runtime.progress.completedSteps < 2) return 'not_ready'

  // Use override if provided (for tests), otherwise fall back to template default
  const complicationRisk = complicationRiskOverride ?? template.complicationRisk ?? 0
  if (complicationRisk > 0) {
    const { rng } = createRng(state.rngSeed)
    const roll = rng()
    if (roll < complicationRisk) {
      const reason = template.objectiveType === 'delivery'
        ? 'The exchange was intercepted. The delivery failed.'
        : 'The squad could not hold the position. The job is forfeit.'
      settleQuestFailure(state, questId, {
        objectiveLabel: reason,
        journalEntry: reason,
        failureMessage: `Contract failed: "${template.title}". ${reason}`,
      })
      return 'failed'
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
    runtime.progress.completedSteps = Math.max(
      runtime.progress.completedSteps,
      setupSteps + nextWatchesLogged,
    )
    runtime.progress.lastAdvancedDay = state.day

    if (nextWatchesLogged < requiredWatches) {
      const remainingWatches = requiredWatches - nextWatchesLogged
      const watchEntry = `Watch ${nextWatchesLogged} of ${requiredWatches} logged on-site.`
      runtime.currentObjectiveLabel =
        `Hold for another watch. ${remainingWatches} ${remainingWatches === 1 ? 'watch' : 'watches'} remaining.`
      runtime.journalEntries.push(watchEntry)
      return 'in_progress'
    }
  }

  const label = template.objectiveType === 'delivery' ? 'Delivery complete' : 'Job done'
  settleQuestSuccess(state, questId, {
    objectiveLabel: 'The on-site work is done. Return and settle accounts.',
    journalEntry: 'The contract was completed on-site.',
    completionMessage: `${label}: "${template.title}". ${formatMarks(template.rewardMarks)} received.`,
  })
  return 'success'
}

