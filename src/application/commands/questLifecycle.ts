import type { GameState } from '../../domain'
import { createQuestLeadRuntime, createQuestRuntime } from '../../domain/quests/contracts'
import { getQuestTemplates } from '../content/contentCatalog'
import { MAX_ACTIVITY_ENTRIES } from './activityLog'
import { settleQuestFailure, settleQuestSuccess } from './questSettlement'

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

export function canDiscoverQuest(state: GameState, questId: string): boolean {
  return (
    !state.availableQuestLeads.some((lead) => lead.questId === questId) &&
    !state.activeQuests.some((quest) => quest.questId === questId) &&
    !state.completedQuestIds.includes(questId)
  )
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

  if (questId === 'quest-mira-rescue' && state.mainQuest.stage === 'lead-found') {
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
      return template?.timeLimitDays != null && state.day - q.acceptedOnDay >= template.timeLimitDays
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

  const label = template.objectiveType === 'delivery' ? 'Delivery complete' : 'Job done'
  settleQuestSuccess(state, questId, {
    objectiveLabel: 'The on-site work is done. Return and settle accounts.',
    journalEntry: 'The contract was completed on-site.',
    completionMessage: `${label}: "${template.title}". ${template.rewardMarks} Marks received.`,
  })
  return true
}


