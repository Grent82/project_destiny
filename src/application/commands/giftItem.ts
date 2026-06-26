import type { GameState } from '../../domain'
import type { ItemDefinition, ItemEffect } from '../../domain/items/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { applyRelationshipDelta } from './adjustRelationship'
import { MAX_ACTIVITY_ENTRIES } from './activityLog'
import { findPlayerItem, removePlayerItem } from './inventory/inventoryHelpers'

type GiftEffect = Extract<ItemEffect, { type: 'relationship_gift' }>

function isNpcColocatedForGift(state: GameState, npc: NpcRuntimeState) {
  const captivityStatus = npc.captivityState?.status
  if (captivityStatus === 'captive' || captivityStatus === 'missing') return false
  if (npc.assignment === 'deployed') return false
  return state.currentDistrictId === state.houseDistrictId
}

function bestScholarSkill(npc: NpcRuntimeState) {
  return Math.max(npc.skills.academics, npc.skills.administration, npc.skills.intrigue)
}

function isScholarNpc(npc: NpcRuntimeState) {
  return bestScholarSkill(npc) >= 40
}

function isWorkingDistrictNpc(npc: NpcRuntimeState) {
  return Math.max(npc.skills.security, npc.skills.crafting, npc.skills.medicine, npc.skills.survival) >= 35
}

function isStatusNpc(npc: NpcRuntimeState, item: ItemDefinition) {
  if (item.id === 'item-gift-calling-token') return npc.traits.vanity >= 55 || npc.attributes.presence >= 55
  return npc.attributes.presence >= 50
}

function resolveTargetMultiplier(effect: GiftEffect, item: ItemDefinition, npc: NpcRuntimeState) {
  switch (effect.target) {
    case 'scholar-npc':
      return isScholarNpc(npc) ? 1.2 : 0.55
    case 'working-district-npc':
      return isWorkingDistrictNpc(npc) ? 1.15 : 0.75
    case 'noble-npc':
      return isStatusNpc(npc, item) ? 1.2 : 0.6
    case 'any-npc':
    default:
      return 1
  }
}

type GiftDelta = {
  affinity: number
  respect: number
  trust: number
  loyalty: number
  reaction: string
}

export function resolveGiftOutcome(item: ItemDefinition, npc: NpcRuntimeState): GiftDelta {
  const effect = item.typedEffects.find((entry): entry is GiftEffect => entry.type === 'relationship_gift')
  if (!effect) {
    return {
      affinity: 0,
      respect: 0,
      trust: 0,
      loyalty: 0,
      reaction: `${npc.name} accepts the item, but it does not seem to mean much yet.`,
    }
  }

  const statusGift = item.tags.includes('status') || item.tags.includes('social') || item.tags.includes('luxury')
  const personalGift = item.tags.includes('sentimental') || item.tags.includes('charm') || item.tags.includes('luck') || item.tags.includes('rarity')
  const scholarGift = item.tags.includes('scholar') || item.tags.includes('scribe')
  const base = Math.max(1, Math.round(effect.value * resolveTargetMultiplier(effect, item, npc)))

  let affinity = 0
  let respect = 0
  let trust = 0
  let loyalty = 0

  if (scholarGift) {
    respect += base
    trust += Math.max(1, Math.round(base / 2))
  } else if (statusGift) {
    respect += base
    affinity += Math.max(1, Math.round(base / 2))
  } else {
    affinity += base
    trust += Math.max(1, Math.round(base / 3))
  }

  if (statusGift && npc.traits.vanity >= 60) {
    affinity += 3
    respect += 3
  }

  if (personalGift && npc.traits.empathy >= 60) {
    affinity += 2
    trust += 3
    loyalty += 1
  }

  if (scholarGift && isScholarNpc(npc)) {
    trust += 2
    respect += 2
  }

  if (statusGift && npc.traits.prudence >= 60) {
    affinity = Math.max(0, affinity - 2)
    trust -= 2
  }

  let reaction = `${npc.name} accepts the gift with measured thanks.`
  if (statusGift && npc.traits.prudence >= 60) {
    reaction = `${npc.name} weighs the ostentation before accepting. "Useful, perhaps. Loud, certainly."`
  } else if (statusGift && npc.traits.vanity >= 60) {
    reaction = `${npc.name}'s expression brightens at once. "You do know how to make an entrance."`
  } else if (personalGift && npc.traits.empathy >= 60) {
    reaction = `${npc.name} softens around the gesture. "That was kind. I'll keep it."`
  } else if (scholarGift && isScholarNpc(npc)) {
    reaction = `${npc.name} turns the piece in their hand with clear approval. "This will not be wasted."`
  } else if (affinity + respect + trust + loyalty >= 12) {
    reaction = `${npc.name} accepts it with visible warmth. "You chose well."`
  }

  return { affinity, respect, trust, loyalty, reaction }
}

export function giftItemToNpc(state: GameState, payload: { instanceId: string; npcId: string }): GameState {
  const { instanceId, npcId } = payload
  const itemInstance = findPlayerItem(state, instanceId)
  if (!itemInstance) return state

  const item = contentCatalog.itemsById.get(itemInstance.instance.itemId)
  if (!item) return state
  if (item.category !== 'gift') {
    return removePlayerItem(state, instanceId)
  }

  const npc = state.roster.find((entry) => entry.npcId === npcId)
  if (!npc || !isNpcColocatedForGift(state, npc)) return state

  const next: GameState = removePlayerItem(state, instanceId)

  const outcome = resolveGiftOutcome(item, npc)
  if (outcome.affinity !== 0) applyRelationshipDelta(next, 'player', npcId, 'affinity', outcome.affinity)
  if (outcome.respect !== 0) applyRelationshipDelta(next, 'player', npcId, 'respect', outcome.respect)
  if (outcome.trust !== 0) applyRelationshipDelta(next, 'player', npcId, 'trust', outcome.trust)
  if (outcome.loyalty !== 0) applyRelationshipDelta(next, 'player', npcId, 'loyalty', outcome.loyalty)

  next.activityLog.unshift({
    id: `gift::${npcId}::${item.id}::${state.day}::${state.timeSlot}`,
    day: state.day,
    timeSlot: state.timeSlot,
    category: 'system',
    message: `You gave ${item.name} to ${npc.name}. ${outcome.reaction}`,
  })
  if (next.activityLog.length > MAX_ACTIVITY_ENTRIES) next.activityLog.pop()

  return next
}
