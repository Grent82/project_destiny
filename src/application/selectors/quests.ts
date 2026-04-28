import { getQuestTemplates } from '../content/contentCatalog'
import type { RootState } from '../store/gameStore'

export const selectAvailableQuests = (state: RootState) =>
  getQuestTemplates().filter((q) => {
    if (!state.game.availableQuests.includes(q.id)) return false
    if (q.requiredFactionStanding) {
      const standing = state.game.factionStandings[q.requiredFactionStanding.factionId] ?? 0
      if (standing < q.requiredFactionStanding.minStanding) return false
    }
    return true
  })

export const selectActiveQuests = (state: RootState) =>
  state.game.activeQuests.map((aq) => ({
    runtime: aq,
    template: getQuestTemplates().find((q) => q.id === aq.questId) ?? null,
  }))

export const selectCompletedQuestIds = (state: RootState) => state.game.completedQuestIds

export const selectActiveInvestigation = (state: RootState) => state.game.activeInvestigation

export const selectActiveInvestigationQuest = (state: RootState) => {
  const inv = state.game.activeInvestigation
  if (!inv) return null
  const template = getQuestTemplates().find((q) => q.id === inv.questId) ?? null
  return { investigation: inv, template }
}
