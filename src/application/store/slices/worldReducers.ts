import { current } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { CouncilVoteEvent, GameState } from '../../../domain'
import type { NpcSitePresence } from '../../../domain/world/runtime'
import type { InstitutionalTier } from '../../../domain/governance/contracts'
import { getRenownLevel } from '../../../domain/progression/contracts'
import { applyOutcomes, type OutcomeContext } from '../../commands/applyEventOutcome'
import { createEventInstance, normalizePendingEventInstances } from '../../commands/eventInstances'
import { appendEventChronicleEntry, buildResolvedEventArtifacts } from '../../commands/eventResolutionArtifacts'
import { concretizeSite as concretizeSiteCommand, collapseSite as collapseSiteCommand } from '../../commands/siteLifecycle'
import { travelToDistrict as travelToDistrictCommand } from '../../commands/districtTravel'
import { applyRelationshipDelta } from '../../commands/adjustRelationship'
import { buildEventRumorEntry } from '../../commands/spawnEventRumor'
import { contentCatalog, getNpcDefinitions } from '../../content/contentCatalog'
import { MAX_ACTIVITY_ENTRIES } from '../../commands/activityLog'
import { applyVoteEffects } from '../../commands/applyPolitics'
import { proposeCouncilVote as proposeCouncilVoteCommand } from '../../commands/proposeCouncilVote'
import { createRng } from '../../commands/seededRng'

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

  resolveEvent(
    state: GameState,
    action: PayloadAction<{ instanceId?: string | null; eventId: string; choiceId: string }>,
  ) {
    const { eventId, choiceId, instanceId } = action.payload
    const normalized = normalizePendingEventInstances(state)
    const template = contentCatalog.eventsById.get(eventId)
    if (!template) return

    const choice = template.choices.find((c) => c.id === choiceId)
    if (!choice) return

    const pendingIndex = normalized.pendingEvents.findIndex((event) =>
      instanceId ? event.instanceId === instanceId : event.eventId === eventId,
    )
    const pendingEvents =
      pendingIndex === -1
        ? normalized.pendingEvents
        : normalized.pendingEvents.filter((_, index) => index !== pendingIndex)
    const matchingInstance =
      (instanceId
        ? normalized.eventInstances.find((instance) => instance.instanceId === instanceId)
        : normalized.eventInstances.find(
            (instance) => instance.eventId === eventId && instance.resolvedOnDay === null,
          )) ??
      createEventInstance(normalized, template)
    const next = {
      ...normalized,
      lastResolvedEventSummary: buildResolvedEventArtifacts(
        normalized,
        eventId,
        choiceId,
        matchingInstance?.sourceNpcId ?? template.sourceNpcId ?? null,
        matchingInstance?.sourceDistrictId ?? template.sourceDistrictId ?? null,
      )?.summary ?? null,
      pendingEvents,
      eventInstances: normalized.eventInstances.some(
        (instance) => instance.instanceId === matchingInstance.instanceId,
      )
        ? normalized.eventInstances.map((instance) =>
            instance.instanceId === matchingInstance.instanceId
              ? { ...instance, resolvedOnDay: normalized.day, chosenOptionId: choiceId }
              : instance,
          )
        : [
            ...normalized.eventInstances,
            { ...matchingInstance, resolvedOnDay: normalized.day, chosenOptionId: choiceId },
          ],
    }
    const context: OutcomeContext = {
      npcId: matchingInstance?.sourceNpcId ?? null,
      contextId: matchingInstance?.contextId ?? null,
    }
    const seeded = createRng(state.rngSeed)
    const resolved = applyOutcomes(next, choice.outcomes, context, seeded)
    return appendEventChronicleEntry(
      resolved,
      eventId,
      choiceId,
      matchingInstance?.sourceNpcId ?? template.sourceNpcId ?? null,
      matchingInstance?.sourceDistrictId ?? template.sourceDistrictId ?? null,
    )
  },

  resolveInformationalEvents(state: GameState, action: PayloadAction<{ instanceIds: string[] }>) {
    const seeded = createRng(state.rngSeed)
    let next = normalizePendingEventInstances(state)

    for (const instanceId of action.payload.instanceIds) {
      const matchingInstance = next.eventInstances.find(
        (instance) => instance.instanceId === instanceId && instance.resolvedOnDay === null,
      )
      if (!matchingInstance) continue

      const template = contentCatalog.eventsById.get(matchingInstance.eventId)
      const choice = template?.choices[0]
      if (!template || !choice) continue

      next = {
        ...next,
        pendingEvents: next.pendingEvents.filter((event) => event.instanceId !== instanceId),
        eventInstances: next.eventInstances.map((instance) =>
          instance.instanceId === matchingInstance.instanceId
            ? { ...instance, resolvedOnDay: next.day, chosenOptionId: choice.id }
            : instance,
        ),
      }

      const context: OutcomeContext = {
        npcId: matchingInstance?.sourceNpcId ?? null,
        contextId: matchingInstance?.contextId ?? null,
      }
      const resolved = applyOutcomes(next, choice.outcomes, context, seeded)
      next = appendEventChronicleEntry(
        resolved,
        matchingInstance.eventId,
        choice.id,
        matchingInstance?.sourceNpcId ?? template.sourceNpcId ?? null,
        matchingInstance?.sourceDistrictId ?? template.sourceDistrictId ?? null,
        { autoResolved: true },
      )
    }

    return { ...next, rngSeed: seeded.getSeed() }
  },

  dismissResolvedEventSummary(state: GameState) {
    state.lastResolvedEventSummary = null
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
        message: `House Valdris has been blacklisted by ${factionId}. Enforcement will follow.`,
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
    const snap = current(state) as GameState
    const vote = snap.activeCouncilVotes.find((v) => v.id === voteId)
    if (!vote) return

    const logMessage = `Council vote: "${vote.title}" — ${passes ? 'passed' : 'failed'}.${passes ? ` ${vote.effect}` : ''}`
    let next: GameState = {
      ...snap,
      activeCouncilVotes: snap.activeCouncilVotes.filter((v) => v.id !== voteId),
      activityLog: [
        {
          id: `log-${snap.day}-${snap.timeSlot}-${snap.activityLog.length + 1}`,
          day: snap.day,
          timeSlot: snap.timeSlot,
          category: 'system' as const,
          message: logMessage,
        },
        ...snap.activityLog.slice(0, MAX_ACTIVITY_ENTRIES - 1),
      ],
    }
    if (passes) {
      next = applyVoteEffects(next, vote)
    }
    return next
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
          ? `House Valdris casts a ${stance} ward vote on "${vote.title}".`
          : `House Valdris leans on chamber sponsors to ${stance} "${vote.title}".`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
  },

  proposeCouncilVote(
    state: GameState,
    action: PayloadAction<{
      voteTemplate: CouncilVoteEvent
      mode: 'direct' | 'sponsored'
      sponsorFactionId?: string
    }>,
  ) {
    const { voteTemplate, mode, sponsorFactionId } = action.payload
    return proposeCouncilVoteCommand(state, voteTemplate, mode, sponsorFactionId, () => state.rngSeed / 1000000)
  },
}
