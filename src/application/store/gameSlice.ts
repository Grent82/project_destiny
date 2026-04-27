import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { CorridorStatus, CouncilVoteEvent, GameState } from '../../domain'
import {
  concludeCombatEncounter,
  performCombatAction,
  startCombatEncounter,
} from '../commands/combat'
import { purchaseItemFromShop } from '../commands/purchase'
import { addNpcToSelectedSquad, removeNpcFromSelectedSquad } from '../commands/squad'
import { endDay as endDayCommand } from '../commands/endDay'
import { recruitNpc as recruitNpcCommand, dismissNpc as dismissNpcCommand, expireHireOffers as expireHireOffersCommand } from '../commands/recruitment'
import { applyOutcomes } from '../commands/applyEventOutcome'
import { travelToDistrict as travelToDistrictCommand } from '../commands/districtTravel'
import { contentCatalog, getQuestTemplates } from '../content/contentCatalog'
import { initialGameStateSnapshot } from './initialGameState'
import { applyRelationshipDelta } from '../commands/adjustRelationship'

const gameSlice = createSlice({
  name: 'game',
  initialState: initialGameStateSnapshot,
  reducers: {
    addNpcToSelectedSquad(state, action: PayloadAction<string>) {
      return addNpcToSelectedSquad(state, action.payload)
    },
    removeNpcFromSelectedSquad(state, action: PayloadAction<string>) {
      return removeNpcFromSelectedSquad(state, action.payload)
    },
    purchaseItemFromShop(
      state,
      action: PayloadAction<{ shopId: string; itemId: string }>,
    ) {
      return purchaseItemFromShop(
        state,
        action.payload.shopId,
        action.payload.itemId,
      )
    },
    startCombatEncounter(state) {
      return startCombatEncounter(state)
    },
    performCombatAction(
      state,
      action: PayloadAction<'attack' | 'advance' | 'retreat' | 'guard'>,
    ) {
      return performCombatAction(state, action.payload)
    },
    concludeCombatEncounter(state) {
      return concludeCombatEncounter(state)
    },
    endDay(state) {
      const afterDay = endDayCommand(state)
      // Expire timed quests at end of day
      afterDay.activeQuests.forEach((q) => {
        const template = getQuestTemplates().find((t) => t.id === q.questId)
        if (template?.timeLimitDays != null) {
          if (afterDay.day - q.acceptedOnDay >= template.timeLimitDays) {
            q.status = 'failed'
          }
        }
      })
      const failedQuests = afterDay.activeQuests.filter((q) => q.status === 'failed')
      afterDay.activeQuests = afterDay.activeQuests.filter((q) => q.status === 'active')
      for (const failed of failedQuests) {
        const template = getQuestTemplates().find((t) => t.id === failed.questId)
        if (template?.rewardStandingFactionId && afterDay.factionStandings[template.rewardStandingFactionId] !== undefined) {
          afterDay.factionStandings[template.rewardStandingFactionId] = Math.max(
            -100,
            (afterDay.factionStandings[template.rewardStandingFactionId] ?? 0) + template.penaltyStandingDelta,
          )
        }
        afterDay.activityLog.unshift({
          id: `log-${afterDay.day}-${afterDay.timeSlot}-quest-expire-${failed.questId}`,
          day: afterDay.day,
          timeSlot: afterDay.timeSlot,
          category: 'system',
          message: `Contract failed: ${template?.title ?? failed.questId}. The house bears the cost.`,
        })
      }
      return afterDay
    },
    recruitNpc(state, action: PayloadAction<{ npcId: string }>) {
      const nextState = recruitNpcCommand(state, action.payload.npcId)
      // Trust gain: they chose to join
      applyRelationshipDelta(nextState, 'player', action.payload.npcId, 'trust', 5)
      return nextState
    },
    dismissNpc(state, action: PayloadAction<{ npcId: string }>) {
      return dismissNpcCommand(state, action.payload.npcId)
    },
    expireHireOffers(state) {
      return expireHireOffersCommand(state)
    },
    adjustCityResource(
      state,
      action: PayloadAction<{
        resource: 'foodSecurity' | 'waterAccess' | 'materialStock'
        delta: number
      }>,
    ) {
      const { resource, delta } = action.payload
      state.cityResources[resource] = Math.max(
        0,
        Math.min(100, state.cityResources[resource] + delta),
      )
    },
    setCorridorStatus(state, action: PayloadAction<CorridorStatus>) {
      state.cityResources.corridorStatus = action.payload
    },
    replaceGameState(_state, action: PayloadAction<GameState>) {
      return action.payload
    },
    setProtagonistName(state, action: PayloadAction<string>) {
      state.protagonistName = action.payload
    },
    setHasSeenOpening(state, action: PayloadAction<boolean>) {
      state.hasSeenOpening = action.payload
    },
    selectMission(state, action: PayloadAction<string | null>) {
      state.activeMissionId = action.payload
    },
    adjustFactionStanding(
      state,
      action: PayloadAction<{ factionId: string; delta: number }>,
    ) {
      const { factionId, delta } = action.payload
      const current = state.factionStandings[factionId] ?? 0
      state.factionStandings[factionId] = Math.max(-100, Math.min(100, current + delta))
    },
    adjustCityDial(
      state,
      action: PayloadAction<{
        dial: 'control' | 'prosperity' | 'unrest' | 'corruption'
        delta: number
      }>,
    ) {
      const { dial, delta } = action.payload
      state.cityDials[dial] = Math.max(0, Math.min(100, state.cityDials[dial] + delta))
    },
    resolveEvent(state, action: PayloadAction<{ eventId: string; choiceId: string }>) {
      const { eventId, choiceId } = action.payload
      const template = contentCatalog.eventsById.get(eventId)
      if (!template) return state

      const choice = template.choices.find((c) => c.id === choiceId)
      if (!choice) return state

      const next = { ...state, pendingEvents: state.pendingEvents.filter((e) => e.eventId !== eventId) }
      return applyOutcomes(next, choice.outcomes)
    },
    travelToDistrict(state, action: PayloadAction<string>) {
      return travelToDistrictCommand(state, action.payload)
    },
    assignTitle(state, action: PayloadAction<{ npcId: string; titleId: string }>) {
      const { npcId, titleId } = action.payload
      const npc = state.roster.find((r) => r.npcId === npcId)
      if (!npc) return
      npc.activeTitle = titleId
      const roleLabel = titleId.replace('title-', '').replace('-', ' ')
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `A title conferred. The house has a new ${roleLabel}.`,
      })
      if (state.activityLog.length > 100) state.activityLog.pop()
      applyRelationshipDelta(state, 'player', npcId, 'respect', 8)
    },
    revokeTitle(state, action: PayloadAction<{ npcId: string }>) {
      const { npcId } = action.payload
      const npc = state.roster.find((r) => r.npcId === npcId)
      if (!npc) return
      npc.activeTitle = null
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `The title is revoked. The role sits empty.`,
      })
      if (state.activityLog.length > 100) state.activityLog.pop()
      applyRelationshipDelta(state, 'player', npcId, 'respect', -5)
    },

    acceptQuest(state, action: PayloadAction<{ questId: string }>) {
      const { questId } = action.payload
      if (!state.availableQuests.includes(questId)) return
      state.availableQuests = state.availableQuests.filter((id) => id !== questId)
      state.activeQuests.push({ questId, acceptedOnDay: state.day, status: 'active', objectiveMet: false })
      const quest = getQuestTemplates().find((q) => q.id === questId)
      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-accept-${questId}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `Contract accepted: ${quest?.title ?? questId}.`,
      })
      if (state.activityLog.length > 100) state.activityLog.pop()
    },

    completeQuest(state, action: PayloadAction<{ questId: string }>) {
      const { questId } = action.payload
      const idx = state.activeQuests.findIndex((q) => q.questId === questId)
      if (idx === -1) return
      state.activeQuests[idx].status = 'completed'
      state.activeQuests[idx].objectiveMet = true
      state.completedQuestIds.push(questId)
      state.activeQuests.splice(idx, 1)

      const quest = getQuestTemplates().find((q) => q.id === questId)
      if (quest) {
        state.money += quest.rewardMarks
        if (quest.rewardStandingFactionId && state.factionStandings[quest.rewardStandingFactionId] !== undefined) {
          state.factionStandings[quest.rewardStandingFactionId] = Math.min(
            100,
            (state.factionStandings[quest.rewardStandingFactionId] ?? 0) + quest.rewardStandingDelta,
          )
        }
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-complete-${questId}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'economy',
          message: `Contract complete: ${quest.title}. ${quest.rewardMarks} Marks received.`,
        })
        if (state.activityLog.length > 100) state.activityLog.pop()
      }
    },

    failQuest(state, action: PayloadAction<{ questId: string }>) {
      const { questId } = action.payload
      const idx = state.activeQuests.findIndex((q) => q.questId === questId)
      if (idx === -1) return
      state.activeQuests[idx].status = 'failed'
      state.activeQuests.splice(idx, 1)

      const quest = getQuestTemplates().find((q) => q.id === questId)
      if (quest) {
        if (quest.rewardStandingFactionId && state.factionStandings[quest.rewardStandingFactionId] !== undefined) {
          state.factionStandings[quest.rewardStandingFactionId] = Math.max(
            -100,
            (state.factionStandings[quest.rewardStandingFactionId] ?? 0) + quest.penaltyStandingDelta,
          )
        }
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-fail-${questId}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: `Contract failed: ${quest.title}. The house bears the cost.`,
        })
        if (state.activityLog.length > 100) state.activityLog.pop()
      }
    },

    expireTimedQuests(state) {
      const failed: string[] = []
      state.activeQuests.forEach((q) => {
        const template = getQuestTemplates().find((t) => t.id === q.questId)
        if (template?.timeLimitDays != null) {
          if (state.day - q.acceptedOnDay >= template.timeLimitDays) {
            q.status = 'failed'
            failed.push(q.questId)
          }
        }
      })
      state.activeQuests = state.activeQuests.filter((q) => q.status === 'active')
      for (const questId of failed) {
        const quest = getQuestTemplates().find((t) => t.id === questId)
        if (quest?.rewardStandingFactionId && state.factionStandings[quest.rewardStandingFactionId] !== undefined) {
          state.factionStandings[quest.rewardStandingFactionId] = Math.max(
            -100,
            (state.factionStandings[quest.rewardStandingFactionId] ?? 0) + quest.penaltyStandingDelta,
          )
        }
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-expire-${questId}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: `Contract failed: ${quest?.title ?? questId}. The house bears the cost.`,
        })
        if (state.activityLog.length > 100) state.activityLog.pop()
      }
    },
    adjustRelationship(
      state,
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
        if (state.activityLog.length > 100) state.activityLog.pop()
      }
    },

    setInstitutionalStanding(
      state,
      action: PayloadAction<{ factionId: string; tier: string }>,
    ) {
      const { factionId, tier } = action.payload
      state.institutionalStanding[factionId] = tier as any
      if (tier === 'blacklisted') {
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: `House Valdric has been blacklisted by ${factionId}. Enforcement will follow.`,
        })
        if (state.activityLog.length > 100) state.activityLog.pop()
      } else if (tier === 'hostile') {
        state.activityLog.unshift({
          id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'system',
          message: `The institutional arm of ${factionId} has turned against the house.`,
        })
        if (state.activityLog.length > 100) state.activityLog.pop()
      }
    },

    addCouncilVote(state, action: PayloadAction<CouncilVoteEvent>) {
      state.activeCouncilVotes.push(action.payload)
    },

    resolveCouncilVote(
      state,
      action: PayloadAction<{ voteId: string; playerInfluenced: boolean }>,
    ) {
      const { voteId, playerInfluenced } = action.payload
      const vote = state.activeCouncilVotes.find((v) => v.id === voteId)
      if (!vote) return

      const proposingSeats = state.councilSeats[vote.proposingFactionId] ?? 0
      const totalSeats = 8
      const baseProbability = proposingSeats / totalSeats

      const passes = playerInfluenced
        ? (state.factionStandings[vote.proposingFactionId] ?? 0) > vote.playerInfluenceThreshold
        : Math.random() < baseProbability

      vote.outcome = passes ? 'passed' : 'failed'

      state.activityLog.unshift({
        id: `log-${state.day}-${state.timeSlot}-${state.activityLog.length + 1}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'system',
        message: `Council vote: "${vote.title}" — ${passes ? 'passed' : 'failed'}.${passes ? ` ${vote.effect}` : ''}`,
      })
      if (state.activityLog.length > 100) state.activityLog.pop()

      state.activeCouncilVotes = state.activeCouncilVotes.filter((v) => v.id !== voteId)
    },
  },
})

export const gameActions = gameSlice.actions
export const gameSliceReducer = gameSlice.reducer
