import type { PayloadAction } from '@reduxjs/toolkit'

import type { CouncilVoteEvent, GameState } from '../../../domain'
import type { NpcSitePresence } from '../../../domain/world/runtime'
import type { InstitutionalTier } from '../../../domain/governance/contracts'
import { getRenownLevel } from '../../../domain/progression/contracts'
import { applyOutcomes, type OutcomeContext } from '../../commands/applyEventOutcome'
import { concretizeSite as concretizeSiteCommand, collapseSite as collapseSiteCommand } from '../../commands/siteLifecycle'
import { travelToDistrict as travelToDistrictCommand } from '../../commands/districtTravel'
import { applyRelationshipDelta } from '../../commands/adjustRelationship'
import { buildEventRumorEntry } from '../../commands/spawnEventRumor'
import { contentCatalog, getNpcDefinitions } from '../../content/contentCatalog'
import { MAX_ACTIVITY_ENTRIES } from '../../commands/activityLog'

export const worldReducers = {
  concretizeSite(state: GameState, action: PayloadAction<{ siteId: string }>) {
    return concretizeSiteCommand(state, action.payload.siteId)
  },

  collapseSite(state: GameState, action: PayloadAction<{ siteId: string }>) {
    return collapseSiteCommand(state, action.payload.siteId)
  },

  upsertNpcSitePresence(state: GameState, action: PayloadAction<NpcSitePresence>) {
    const next = action.payload
    const index = state.npcSitePresences.findIndex((presence) => presence.occupancyId === next.occupancyId)
    if (index === -1) {
      state.npcSitePresences.push(next)
      return
    }
    state.npcSitePresences[index] = next
  },

  clearNpcSitePresence(state: GameState, action: PayloadAction<{ occupancyId?: string; npcId?: string }>) {
    const { occupancyId, npcId } = action.payload
    state.npcSitePresences = state.npcSitePresences.filter((presence) => {
      if (occupancyId && presence.occupancyId === occupancyId) return false
      if (npcId && presence.npcId === npcId) return false
      return true
    })
  },

  resolveEvent(state: GameState, action: PayloadAction<{ eventId: string; choiceId: string }>) {
    const { eventId, choiceId } = action.payload
    const template = contentCatalog.eventsById.get(eventId)
    if (!template) return

    const choice = template.choices.find((c) => c.id === choiceId)
    if (!choice) return

    const pendingIndex = state.pendingEvents.findIndex((event) => event.eventId === eventId)
    const pendingEvents =
      pendingIndex === -1
        ? state.pendingEvents
        : state.pendingEvents.filter((_, index) => index !== pendingIndex)
    const matchingInstance = state.eventInstances.find(
      (instance) => instance.eventId === eventId && instance.resolvedOnDay === null,
    )
    const next = {
      ...state,
      pendingEvents,
      eventInstances: matchingInstance
        ? state.eventInstances.map((instance) =>
            instance.instanceId === matchingInstance.instanceId
              ? { ...instance, resolvedOnDay: state.day, chosenOptionId: choiceId }
              : instance,
          )
        : state.eventInstances,
    }
    const context: OutcomeContext = {
      npcId: matchingInstance?.sourceNpcId ?? null,
      contextId: matchingInstance?.contextId ?? null,
    }
    return applyOutcomes(next, choice.outcomes, context)
  },

  travelToDistrict(state: GameState, action: PayloadAction<string>) {
    return travelToDistrictCommand(state, action.payload)
  },

  adjustFactionStanding(
    state: GameState,
    action: PayloadAction<{ factionId: string; delta: number }>,
  ) {
    const { factionId, delta } = action.payload
    const prev = state.factionStandings[factionId] ?? 0
    state.factionStandings[factionId] = Math.max(-100, Math.min(100, prev + delta))
    const next = state.factionStandings[factionId]

    for (const milestone of [50, 75] as const) {
      if (prev < milestone && next >= milestone) {
        const rumor = buildEventRumorEntry(
          contentCatalog.eventRumorTemplates,
          { eventType: 'faction-milestone', factionId, milestone },
          state.currentDistrictId ?? 'district-the-pale',
          state.day,
        )
        if (rumor && !state.rumors.some((r) => r.eventSource === rumor.eventSource)) {
          state.rumors.push(rumor)
        }
      }
    }

    if (delta < -10) {
      state.roster.forEach((rosterNpc) => {
        const npcDef = getNpcDefinitions().find((n) => n.id === rosterNpc.npcId)
        if (npcDef?.factionAffinityId === factionId) {
          rosterNpc.traits.loyalty = Math.max(0, (rosterNpc.traits.loyalty ?? 50) - 5)
          if (rosterNpc.traits.loyalty < 30) {
            state.activityLog.unshift({
              id: `log-faction-loyalty-${rosterNpc.npcId}-${state.day}`,
              day: state.day,
              timeSlot: state.timeSlot,
              category: 'system',
              message: `${npcDef.name} takes notice of what was done to their people.`,
            })
          }
        }
      })
    }
  },

  adjustRelationship(
    state: GameState,
    action: PayloadAction<{
      fromId: string
      toId: string
      axis: 'affinity' | 'respect' | 'fear' | 'trust' | 'loyalty'
      delta: number
      reason?: string
    }>,
  ) {
    const { fromId, toId, axis, delta, reason } = action.payload
    const result = applyRelationshipDelta(state, fromId, toId, axis, delta)
    if (result.significant && reason) {
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-rel-${state.activityLog.length + 1}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: reason,
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    }
  },

  setInstitutionalStanding(
    state: GameState,
    action: PayloadAction<{ factionId: string; tier: InstitutionalTier }>,
  ) {
    const { factionId, tier } = action.payload
    state.institutionalStanding[factionId] = tier
    if (tier === 'blacklisted') {
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `House Valdric has been blacklisted by ${factionId}. Enforcement will follow.`,
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    } else if (tier === 'hostile') {
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `The institutional arm of ${factionId} has turned against the house.`,
      })
      if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    }
  },

  addCouncilVote(state: GameState, action: PayloadAction<CouncilVoteEvent>) {
    state.activeCouncilVotes.push(action.payload)
  },

  resolveCouncilVote(
    state: GameState,
    action: PayloadAction<{ voteId: string; playerInfluenced: boolean; passes: boolean }>,
  ) {
    const { voteId, passes } = action.payload
    const vote = state.activeCouncilVotes.find((v) => v.id === voteId)
    if (!vote) return

    vote.outcome = passes ? 'passed' : 'failed'

    state.activityLog.unshift({
      id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'system',
      message: `Council vote: "${vote.title}" — ${passes ? 'passed' : 'failed'}.${passes ? ` ${vote.effect}` : ''}`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()

    state.activeCouncilVotes = state.activeCouncilVotes.filter((v) => v.id !== voteId)
  },

  influenceCouncilVote(
    state: GameState,
    action: PayloadAction<{ voteId: string; stance: 'support' | 'oppose' }>,
  ) {
    const { voteId, stance } = action.payload
    const vote = state.activeCouncilVotes.find((v) => v.id === voteId)
    if (!vote || vote.outcome !== 'pending') return

    const houseSeats = state.houseWardSeats
    const renownLevel = getRenownLevel(state.playerCharacter.renown)
    const renownSeats = renownLevel.councilSeats
    if (houseSeats === 0 && renownSeats === 0) return

    vote.playerVote = stance
    state.activityLog.unshift({
      id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'system',
      message:
        houseSeats > 0
          ? `House Valdric casts a ${stance} ward vote on "${vote.title}".`
          : `House Valdric leans on chamber sponsors to ${stance} "${vote.title}".`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
  },
}
