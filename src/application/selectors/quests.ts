import { createSelector } from '@reduxjs/toolkit'
import { getQuestTemplates, contentCatalog } from '../content/contentCatalog'
import { getQuestPresentation } from '../content/questPresentation'
import type { RootState } from '../store/gameStore'

export const selectAvailableQuests = (state: RootState) =>
  getQuestTemplates().filter((q) => {
    if (!state.game.availableQuests.includes(q.id)) return false
    if (q.requiredFactionStanding) {
      const standing = state.game.factionStandings[q.requiredFactionStanding.factionId] ?? 0
      if (standing < q.requiredFactionStanding.minStanding) return false
    }
    if (q.prerequisiteQuestId && !state.game.completedQuestIds.includes(q.prerequisiteQuestId)) {
      return false
    }
    return true
  })

export const selectAvailableQuestLeads = createSelector(
  selectAvailableQuests,
  (templates) =>
    templates.map((template) => ({
      template,
      presentation: getQuestPresentation(template),
    })),
)

export const selectActiveQuests = createSelector(
  (state: RootState) => state.game.activeQuests,
  (activeQuests) =>
    activeQuests.map((aq) => ({
      runtime: aq,
      template: getQuestTemplates().find((q) => q.id === aq.questId) ?? null,
    })).map((entry) => ({
      ...entry,
      presentation: entry.template ? getQuestPresentation(entry.template) : null,
      displayTitle: entry.runtime.acceptedTitle,
      objectiveLabel: entry.runtime.currentObjectiveLabel ?? entry.runtime.acceptedBriefing,
      incidentDistrictId: entry.runtime.context.incidentDistrictId ?? entry.template?.districtId ?? null,
    })),
)

export const selectActiveQuestById = (state: RootState, questId: string | null) => {
  if (!questId) return null
  return selectActiveQuests(state).find((entry) => entry.runtime.questId === questId) ?? null
}

export const selectCompletedQuestIds = (state: RootState) => state.game.completedQuestIds

export const selectActiveInvestigation = (state: RootState) => state.game.activeInvestigation

export const selectActiveInvestigationQuest = (state: RootState) => {
  const inv = state.game.activeInvestigation
  if (!inv) return null
  const template = getQuestTemplates().find((q) => q.id === inv.questId) ?? null
  return { investigation: inv, template }
}

export const selectActiveThreatNpc = (state: RootState) => {
  const activeQuest = state.game.activeQuests[0]
  if (!activeQuest) return null
  const template = getQuestTemplates().find((q) => q.id === activeQuest.questId)
  if (!template?.enemyNpcId) return null
  const npcDef = contentCatalog.npcsById.get(template.enemyNpcId)
  if (!npcDef) return null
  const faction = npcDef.factionAffinityId
    ? contentCatalog.factionsById.get(npcDef.factionAffinityId)?.name ?? npcDef.factionAffinityId
    : null
  return {
    id: npcDef.id,
    name: npcDef.name,
    motivation: npcDef.motivation ?? null,
    factionName: faction,
  }
}

export const selectThreatNpcForQuest = (state: RootState, questId: string | null) => {
  const activeQuest = questId ? state.game.activeQuests.find((quest) => quest.questId === questId) : null
  if (!activeQuest) return null
  const template = getQuestTemplates().find((q) => q.id === activeQuest.questId)
  if (!template?.enemyNpcId) return null
  const npcDef = contentCatalog.npcsById.get(template.enemyNpcId)
  if (!npcDef) return null
  const faction = npcDef.factionAffinityId
    ? contentCatalog.factionsById.get(npcDef.factionAffinityId)?.name ?? npcDef.factionAffinityId
    : null
  return {
    id: npcDef.id,
    name: npcDef.name,
    motivation: npcDef.motivation ?? null,
    factionName: faction,
  }
}
