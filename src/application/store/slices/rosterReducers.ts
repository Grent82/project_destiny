import { current } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { GameState } from '../../../domain'
import type { Attributes, Skills, Traits, WorldNpcDisposition, CaptivityState } from '../../../domain/npc/contracts'
import { selectNpcCoercionRisk } from '../../selectors/npcs'
import { applyRelationshipDelta } from '../../commands/adjustRelationship'
import { recruitNpc as recruitNpcCommand, dismissNpc as dismissNpcCommand, expireHireOffers as expireHireOffersCommand, acquireBoundHireOffer as acquireBoundHireOfferCommand } from '../../commands/recruitment'
import { freeNpc as freeNpcCommand } from '../../commands/bondService'
import { courtNpc as courtNpcCommand } from '../../commands/courtNpc'
import { deepConversation as deepConversationCommand } from '../../commands/deepConversation'
import { engagePhysicalIntimacy as engagePhysicalIntimacyCommand } from '../../commands/engagePhysicalIntimacy'
import { cookMeal as cookMealCommand } from '../../commands/cookMeal'
import { decorateRoom as decorateRoomCommand } from '../../commands/decorateRoom'
import { hostGathering as hostGatheringCommand } from '../../commands/hostGathering'
import { proposeDateWithPlayer as proposeDateWithPlayerCommand } from '../../commands/proposeDate'
import {
  transferBondedNpc as transferBondedNpcCommand,
  rescueBondedNpcLegal,
  rescueBondedNpcExtraction,
  rescueBondedNpcForce,
} from '../../commands/bondTransfer'
import { addNpcToSelectedSquad, removeNpcFromSelectedSquad } from '../../commands/squad'
import {
  buildCaptivityPregnancyDiscoveryPresentationText,
  CAPTIVITY_PREGNANCY_DISCOVERY_EVENT_ID,
  captivityPregnancyDiscoveryKey,
} from '../../commands/captivityPregnancyDiscovery'
import { createEventInstance, createPendingEvent } from '../../commands/eventInstances'
import { getNpcCaptivityState, setNpcCaptivityState } from '../../commands/captivityRegistry'
import { MAX_ACTIVITY_ENTRIES, generateActivityLogId } from '../../commands/activityLog'
import { contentCatalog } from '../../content/contentCatalog'
import { createRuntimeStateFromDefinition } from '../../commands/createRuntimeStateFromDefinition'

export const rosterReducers = {
  addNpcToSelectedSquad(state: GameState, action: PayloadAction<string>) {
    return addNpcToSelectedSquad(state, action.payload)
  },

  removeNpcFromSelectedSquad(state: GameState, action: PayloadAction<string>) {
    return removeNpcFromSelectedSquad(state, action.payload)
  },

  recruitNpc(state: GameState, action: PayloadAction<{ npcId: string }>) {
    const nextState = recruitNpcCommand(state, action.payload.npcId)
    const relResult = applyRelationshipDelta(nextState, 'player', action.payload.npcId, 'trust', 5)
    return relResult.state
  },

  acquireBoundHireOffer(state: GameState, action: PayloadAction<{ npcId: string }>) {
    return acquireBoundHireOfferCommand(state, action.payload.npcId)
  },

  dismissNpc(state: GameState, action: PayloadAction<{ npcId: string }>) {
    return dismissNpcCommand(state, action.payload.npcId)
  },

  freeNpc(state: GameState, action: PayloadAction<{ npcId: string }>) {
    return freeNpcCommand(state, action.payload.npcId)
  },

  courtNpc(state: GameState, action: PayloadAction<{ npcId: string }>) {
    return courtNpcCommand(state, action.payload.npcId)
  },

  deepConversation(state: GameState, action: PayloadAction<{ npcId: string }>) {
    return deepConversationCommand(state, action.payload.npcId)
  },

  engagePhysicalIntimacy(state: GameState, action: PayloadAction<{ npcId: string; contraceptionItemId: string | null; intent: 'want-pregnancy' | 'avoid-pregnancy' | 'neutral'; consentGiven: boolean }>) {
    return engagePhysicalIntimacyCommand(state, action.payload.npcId, {
      contraceptionItemId: action.payload.contraceptionItemId,
      intent: action.payload.intent,
      consentGiven: action.payload.consentGiven,
    })
  },

  cookMeal(state: GameState, action: PayloadAction<{ npcId: string; mealType: 'simple' | 'hearty' | 'feast' }>) {
    return cookMealCommand(state, action.payload.npcId, action.payload.mealType)
  },

  decorateRoom(state: GameState, action: PayloadAction<{ roomId: string; npcId: string; decorStyle: 'minimalist' | 'warm' | 'grand' | 'utilitarian' }>) {
    return decorateRoomCommand(state, action.payload.roomId, action.payload.npcId, action.payload.decorStyle)
  },

  hostGathering(state: GameState, action: PayloadAction<{ gatheringType: 'quietConversation' | 'sharedDrink' | 'storytelling' | 'musicNight'; participatingNpcIds: string[] }>) {
    return hostGatheringCommand(state, action.payload.gatheringType, action.payload.participatingNpcIds)
  },

  proposeDateWithPlayer(state: GameState, action: PayloadAction<{ targetNpcId: string; dateTemplateId: string; proposedDay: number; proposedTimeSlot: 'morning' | 'afternoon' | 'evening' | 'night'; proposedLocation: string | null }>) {
    return proposeDateWithPlayerCommand(state, action.payload)
  },

  expireHireOffers(state: GameState) {
    return expireHireOffersCommand(state)
  },

  setNpcAssignment(state: GameState, action: PayloadAction<{ npcId: string; assignment: string }>) {
    const npc = state.npcRuntimeStates.find((r) => r.npcId === action.payload.npcId)
    if (!npc) return
    if (npc.assignment === 'deployed' || npc.assignment === 'assigned_title') return
    npc.assignment = action.payload.assignment as typeof npc.assignment
  },

  setNpcRoomAssignment(state: GameState, action: PayloadAction<{ npcId: string; roomId: string | null }>) {
    const npc = state.npcRuntimeStates.find((r) => r.npcId === action.payload.npcId)
    if (!npc) return
    if (action.payload.roomId === null) {
      npc.roomAssignment = null
      return
    }
    const room = state.house.rooms.find((entry) => entry.roomId === action.payload.roomId)
    if (!room || room.state !== 'intact') return
    npc.roomAssignment = room.roomId
  },

  setNpcDutyPost(state: GameState, action: PayloadAction<{ npcId: string; roomId: string | null }>) {
    const npc = state.npcRuntimeStates.find((r) => r.npcId === action.payload.npcId)
    if (!npc) return
    if (action.payload.roomId === null) {
      npc.dutyPostRoomId = null
      return
    }
    const room = state.house.rooms.find((entry) => entry.roomId === action.payload.roomId)
    if (!room || room.state !== 'intact') return
    npc.dutyPostRoomId = room.roomId
  },

  setNpcTrainingFocus(state: GameState, action: PayloadAction<{ npcId: string; skill: string | null }>) {
    const npc = state.npcRuntimeStates.find((r) => r.npcId === action.payload.npcId)
    if (!npc) return
    npc.trainingFocus = action.payload.skill
  },

  setPlayerCharacter(
    state: GameState,
    action: PayloadAction<{
      name: string
      backgroundId?: string
      attributes: Attributes
      skills: Skills
      traits: Traits
    }>,
  ) {
    state.playerCharacter.name = action.payload.name
    if (action.payload.backgroundId) state.playerCharacter.backgroundId = action.payload.backgroundId
    state.playerCharacter.attributes = action.payload.attributes
    state.playerCharacter.skills = action.payload.skills
    state.playerCharacter.traits = action.payload.traits
  },

  assignTitle(state: GameState, action: PayloadAction<{ npcId: string; titleId: string }>) {
    const { npcId, titleId } = action.payload
    const npc = state.npcRuntimeStates.find((r) => r.npcId === npcId)
    if (!npc) return
    npc.activeTitle = titleId
    const roleLabel = titleId.replace('title-', '').replace('-', ' ')
    state.activityLog.unshift({
      id: generateActivityLogId(state.activityLog, state.day, state.timeSlot),
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'system',
      message: `A title conferred. The house has a new ${roleLabel}.`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    // Direct mutation for Immer compatibility
    const key = `${'player'}-to-${npcId}`
    const existing = state.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
    state.relationships[key] = { ...existing, respect: Math.max(-100, Math.min(100, existing.respect + 8)) }
  },

  revokeTitle(state: GameState, action: PayloadAction<{ npcId: string }>) {
    const { npcId } = action.payload
    const npc = state.npcRuntimeStates.find((r) => r.npcId === npcId)
    if (!npc) return
    npc.activeTitle = null
    state.activityLog.unshift({
      id: generateActivityLogId(state.activityLog, state.day, state.timeSlot),
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'system',
      message: `The title is revoked. The role sits empty.`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()
    // Direct mutation for Immer compatibility
    const key = `${'player'}-to-${npcId}`
    const existing = state.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
    state.relationships[key] = { ...existing, respect: Math.max(-100, Math.min(100, existing.respect - 5)) }
  },

  setCaptivityState(
    state: GameState,
    action: PayloadAction<{ npcId: string; captivityState: CaptivityState | null }>,
  ) {
    const { npcId, captivityState } = action.payload
    setNpcCaptivityState(state, npcId, captivityState)
  },

  rescueNpc(state: GameState, action: PayloadAction<{ npcId: string }>) {
    const { npcId } = action.payload
    const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
    const cap = getNpcCaptivityState(state, npcId)
    if (!npc || !cap) return

    const risk = selectNpcCoercionRisk(npc)
    const riskMultiplier = 1 + risk

    const conditionPenalties: Record<string, number> = {
      healthy: 0, hurt: 10, broken: 25, altered: 20,
    }
    const basePenalty = conditionPenalties[cap.condition] ?? 0
    const penalty = Math.round(basePenalty * riskMultiplier)
    if (penalty > 0) {
      npc.states.health = Math.max(0, npc.states.health - penalty)
      npc.states.stress = Math.min(100, npc.states.stress + penalty * 1.5)
      npc.states.morale = Math.max(0, npc.states.morale - penalty)
    }

    setNpcCaptivityState(state, npcId, { ...cap, status: 'rescued' })
    npc.assignment = 'recovering'

    if (cap.condition === 'broken' || cap.condition === 'altered') {
      const aftermathRoll = (npcId.charCodeAt(npcId.length - 1) + cap.timeHeldDays) % 100 / 100
      if (aftermathRoll < risk * 0.5) {
        npc.pregnancyState = { context: 'unknown', daysElapsed: 0, questTag: null, wanted: null }
      }
    }

    state.activityLog.unshift({
      id: generateActivityLogId(state.activityLog, state.day, state.timeSlot),
      day: state.day,
      timeSlot: state.timeSlot,
      category: 'system',
      message: `${npc.name} has been rescued. Condition at rescue: ${cap.condition}.`,
    })
    if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) state.activityLog.pop()

    if (npc.pregnancyState?.context === 'unknown') {
      const key = captivityPregnancyDiscoveryKey(npcId)
      if (state.lastFiredDay[key] === undefined) {
        const template = contentCatalog.eventsById.get(CAPTIVITY_PREGNANCY_DISCOVERY_EVENT_ID)
        if (!template) return
        const snapshot = current(state) as GameState
        const instance = createEventInstance(snapshot, template, {
          instanceId: `${key}-${state.day}`,
          firedOnDay: state.day,
          sourceDistrictId: state.currentDistrictId,
          sourceNpcId: npcId,
          presentationText: buildCaptivityPregnancyDiscoveryPresentationText(
            snapshot,
            current(npc) as typeof npc,
          ),
          contextId: null,
        })
        state.pendingEvents.push(createPendingEvent(instance))
        state.eventInstances.push(instance)
        state.lastFiredDay[key] = state.day
        state.lastFiredDay[CAPTIVITY_PREGNANCY_DISCOVERY_EVENT_ID] = state.day
      }
    }
  },

  markNpcForSale(
    state: GameState,
    action: PayloadAction<{ npcId: string; marketValue: number; forSale: boolean }>,
  ) {
    const { npcId, marketValue, forSale } = action.payload
    const npc = state.npcRuntimeStates.find((r) => r.npcId === npcId)
    if (!npc || !npc.bondStatus) return
    npc.bondStatus.forSale = forSale
    npc.bondStatus.marketValue = Math.max(0, marketValue)
    if (forSale) {
      npc.bondStatus.bondStartDay = npc.bondStatus.bondStartDay || state.day
    }
  },

  transferBondedNpc(
    state: GameState,
    action: PayloadAction<{ npcId: string; buyerId: string }>,
  ) {
    return transferBondedNpcCommand(state, action.payload.npcId, action.payload.buyerId)
  },

  rescueBondedNpcLegal(state: GameState, action: PayloadAction<{ npcId: string }>) {
    return rescueBondedNpcLegal(state, action.payload.npcId)
  },

  rescueBondedNpcExtraction(state: GameState, action: PayloadAction<{ npcId: string }>) {
    return rescueBondedNpcExtraction(state, action.payload.npcId)
  },

  rescueBondedNpcForce(state: GameState, action: PayloadAction<{ npcId: string }>) {
    return rescueBondedNpcForce(state, action.payload.npcId)
  },

  updateWorldNpcState(
    state: GameState,
    action: PayloadAction<{
      npcId: string
      lastContactDay?: number
      disposition?: WorldNpcDisposition
      locationOverride?: string | null
      addFlags?: string[]
      removeFlags?: string[]
    }>,
  ) {
    // destiny-rama.8: world persons are full NpcRuntimeState entries in the unified npcRuntimeStates
    // list now — hydrate via the definition-driven factory instead of a bare placeholder object.
    const { npcId, lastContactDay, disposition, locationOverride, addFlags, removeFlags } = action.payload
    let entry = state.npcRuntimeStates.find((s) => s.npcId === npcId)
    if (!entry) {
      entry = createRuntimeStateFromDefinition(npcId, {
        clothing: { head: null, torso: 'cloth-tunic-simple', arms: null, legs: 'cloth-trousers-burlap', feet: 'cloth-boots-work', full: null, undergarments: 'cloth-underclothes-simple', accessories: [] },
      })
      state.npcRuntimeStates.push(entry)
    }
    if (lastContactDay !== undefined) entry.lastContactDay = lastContactDay
    if (disposition !== undefined) entry.worldDisposition = disposition
    if (locationOverride !== undefined) entry.locationOverride = locationOverride
    if (addFlags) {
      entry.flags = entry.flags ?? []
      for (const f of addFlags) {
        if (!entry.flags.includes(f)) entry.flags.push(f)
      }
    }
    if (removeFlags) {
      entry.flags = (entry.flags ?? []).filter((f) => !removeFlags.includes(f))
    }
  },
}
