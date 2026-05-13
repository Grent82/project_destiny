import { createSelector } from '@reduxjs/toolkit'
import { getQuestTemplates, contentCatalog } from '../content/contentCatalog'
import { getQuestPresentation } from '../content/questPresentation'
import type { RootState } from '../store/gameStore'
import { getQuestLeadFreshness, isQuestLeadExpired } from '../../domain/quests/contracts'

export const selectAvailableQuests = createSelector(
  (state: RootState) => state.game.availableQuestLeads,
  (state: RootState) => state.game.factionStandings,
  (state: RootState) => state.game.completedQuestIds,
  (state: RootState) => state.game.day,
  (availableQuestLeads, factionStandings, completedQuestIds, day) =>
    availableQuestLeads.flatMap((lead) => {
      if (isQuestLeadExpired(lead, day)) return []
      const q = getQuestTemplates().find((quest) => quest.id === lead.questId)
      if (!q) return []
      if (q.requiredFactionStanding) {
        const standing = factionStandings[q.requiredFactionStanding.factionId] ?? 0
        if (standing < q.requiredFactionStanding.minStanding) return []
      }
      if (q.prerequisiteQuestId && !completedQuestIds.includes(q.prerequisiteQuestId)) {
        return []
      }
      return [{ lead, template: q }]
    }),
)

export const selectAvailableQuestLeads = createSelector(
  selectAvailableQuests,
  (state: RootState) => state.game.day,
  (entries, day) =>
    entries.map(({ lead, template }) => ({
      lead: {
        ...lead,
        freshness: getQuestLeadFreshness(lead, day),
      },
      template,
      presentation: getQuestPresentation(template),
    })),
)

function getQuestUrgencyRank(timeLimitDays: number | null | undefined) {
  if (timeLimitDays == null) return 0
  if (timeLimitDays <= 2) return 3
  if (timeLimitDays <= 5) return 2
  return 1
}

export const selectActiveQuests = createSelector(
  (state: RootState) => state.game.activeQuests,
  (state: RootState) => state.game.currentDistrictId,
  (state: RootState) => state.game.selectedSquadNpcIds.length,
  (state: RootState) => state.game.activeCombat,
  (activeQuests, currentDistrictId, selectedSquadCount, activeCombat) =>
    activeQuests.map((aq) => ({
      runtime: aq,
      template: getQuestTemplates().find((q) => q.id === aq.questId) ?? null,
    })).map((entry) => ({
      ...entry,
      presentation: entry.template ? getQuestPresentation(entry.template) : null,
      displayTitle: entry.runtime.acceptedTitle,
      objectiveLabel: entry.runtime.currentObjectiveLabel ?? entry.runtime.acceptedBriefing,
      incidentDistrictId: entry.runtime.context.incidentDistrictId ?? entry.template?.districtId ?? null,
      readiness: (() => {
        const incidentDistrictId = entry.runtime.context.incidentDistrictId ?? entry.template?.districtId ?? null
        const districtName = incidentDistrictId
          ? contentCatalog.districtsById.get(incidentDistrictId)?.name ?? incidentDistrictId
          : null
        const hasOngoingEncounter =
          activeCombat?.outcome === 'ongoing' && activeCombat.linkedQuestId === entry.runtime.questId

        if (entry.template?.objectiveType === 'combat') {
          if (hasOngoingEncounter) {
            return {
              state: 'resume-encounter',
              label: 'Resume encounter',
              detail: 'An on-site encounter is already underway.',
              route: '/combat',
              blocked: false,
            }
          }
          if (incidentDistrictId && currentDistrictId !== incidentDistrictId) {
            return {
              state: 'blocked-location',
              label: `Travel to ${districtName ?? 'the incident site'}`,
              detail: 'You are not at the incident site yet.',
              route: incidentDistrictId ? `/district/${incidentDistrictId}` : '/contracts',
              blocked: true,
            }
          }
          if (selectedSquadCount === 0) {
            return {
              state: 'blocked-squad',
              label: 'Assemble a squad on-site',
              detail: 'No operatives are selected for the clash.',
              route: `/missions/${entry.runtime.questId}`,
              blocked: true,
            }
          }
          return {
            state: 'ready-now',
            label: 'Open on-site deployment',
            detail: 'The incident site is reached and the squad can commit.',
            route: `/missions/${entry.runtime.questId}`,
            blocked: false,
          }
        }

        if (entry.template?.objectiveType === 'investigation') {
          if (incidentDistrictId && currentDistrictId !== incidentDistrictId) {
            return {
              state: 'blocked-location',
              label: `Travel to ${districtName ?? 'the district'}`,
              detail: 'The lead must be worked in the correct district.',
              route: incidentDistrictId ? `/district/${incidentDistrictId}` : '/contracts',
              blocked: true,
            }
          }
          return {
            state: 'ready-now',
            label: 'Begin the investigation',
            detail: 'The district is right. Put operatives on the lead.',
            route: '/investigation',
            blocked: false,
          }
        }

        if (entry.template?.objectiveType === 'delivery') {
          if (incidentDistrictId && currentDistrictId !== incidentDistrictId) {
            return {
              state: 'blocked-location',
              label: `Travel to ${districtName ?? 'the drop site'}`,
              detail: 'The handoff can only happen on-site in the target district.',
              route: incidentDistrictId ? `/district/${incidentDistrictId}` : '/contracts',
              blocked: true,
            }
          }
          return {
            state: 'ready-now',
            label: 'Open on-site handoff',
            detail: 'Meet the contact in person, spend the watch, and make the exchange.',
            route: `/contracts/${entry.runtime.questId}/execute`,
            blocked: false,
          }
        }

        if (entry.template?.objectiveType === 'survival') {
          if (incidentDistrictId && currentDistrictId !== incidentDistrictId) {
            return {
              state: 'blocked-location',
              label: `Travel to ${districtName ?? 'the contract site'}`,
              detail: 'The watch must be held in the assigned district.',
              route: incidentDistrictId ? `/district/${incidentDistrictId}` : '/contracts',
              blocked: true,
            }
          }
          return {
            state: 'ready-now',
            label: 'Open on-site watch',
            detail: 'Hold position through the current watch and absorb the local risk.',
            route: `/contracts/${entry.runtime.questId}/execute`,
            blocked: false,
          }
        }

        if (incidentDistrictId && currentDistrictId !== incidentDistrictId) {
          return {
            state: 'blocked-location',
            label: `Travel to ${districtName ?? 'the district'}`,
            detail: 'This contract can only be completed on-site.',
            route: incidentDistrictId ? `/district/${incidentDistrictId}` : '/contracts',
            blocked: true,
          }
        }

        return {
          state: 'ready-now',
          label: 'Resolve the on-site task',
          detail: 'The contract can be advanced from the current district.',
          route: '/contracts',
          blocked: false,
        }
      })(),
      urgencyRank: getQuestUrgencyRank(entry.template?.timeLimitDays),
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

export const selectRecommendedQuestAction = createSelector(
  selectActiveQuests,
  selectAvailableQuestLeads,
  (activeQuests, availableQuestLeads) => {
    const topActiveQuest = activeQuests
      .slice()
      .sort((left, right) => {
        const storyDelta = Number(Boolean(right.template?.questType === 'story')) - Number(Boolean(left.template?.questType === 'story'))
        if (storyDelta !== 0) return storyDelta
        const readinessDelta = Number(Boolean(!right.readiness.blocked)) - Number(Boolean(!left.readiness.blocked))
        if (readinessDelta !== 0) return readinessDelta
        return right.urgencyRank - left.urgencyRank
      })[0]

    if (topActiveQuest) {
      return {
        kind: 'active' as const,
        title: topActiveQuest.displayTitle,
        headline: topActiveQuest.readiness.label,
        detail: topActiveQuest.readiness.detail,
        route: topActiveQuest.readiness.route,
        blocked: topActiveQuest.readiness.blocked,
        urgencyRank: topActiveQuest.urgencyRank,
        isStory: topActiveQuest.template?.questType === 'story',
      }
    }

    const topLead = availableQuestLeads
      .slice()
      .sort((left, right) => {
        const storyDelta = Number(Boolean(right.template.questType === 'story')) - Number(Boolean(left.template.questType === 'story'))
        if (storyDelta !== 0) return storyDelta
        return getQuestUrgencyRank(right.template.timeLimitDays) - getQuestUrgencyRank(left.template.timeLimitDays)
      })[0]

    if (topLead) {
      return {
        kind: 'lead' as const,
        title: topLead.template.title,
        headline: 'Review the lead on the Work Board',
        detail: topLead.presentation.whyNow,
        route: '/contracts',
        blocked: false,
        urgencyRank: getQuestUrgencyRank(topLead.template.timeLimitDays),
        isStory: topLead.template.questType === 'story',
      }
    }

    return null
  },
)

/**
 * Returns activity log entries that are aftermath-tagged (from quest settlement aftermath).
 * Useful for a "World Consequences" panel in the UI.
 */
export const selectQuestAftermathLog = createSelector(
  (state: RootState) => state.game.activityLog,
  (log) => log.filter((entry) => entry.id?.startsWith('aftermath-')),
)
