import { getQuestTemplates } from '../content/contentCatalog'
import type { RootState } from '../store/gameStore'

export const selectAvailableQuests = (state: RootState) =>
  getQuestTemplates().filter((q) => state.game.availableQuests.includes(q.id))

export const selectActiveQuests = (state: RootState) =>
  state.game.activeQuests.map((aq) => ({
    runtime: aq,
    template: getQuestTemplates().find((q) => q.id === aq.questId) ?? null,
  }))

export const selectCompletedQuestIds = (state: RootState) => state.game.completedQuestIds
