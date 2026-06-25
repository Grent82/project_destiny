import type { GameState, NpcRuntimeState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'

const PLAYER_ID = 'player'

type GatheringType = 'quietConversation' | 'sharedDrink' | 'storytelling' | 'musicNight'

const GATHERING_COSTS: Record<GatheringType, number> = {
  quietConversation: 0,
  sharedDrink: 10,
  storytelling: 5,
  musicNight: 20,
}

const GATHERING_GAINS: Record<GatheringType, { trust: number; affinity: number; loyalty: number }> = {
  quietConversation: { trust: 4, affinity: 2, loyalty: 1 },
  sharedDrink: { trust: 3, affinity: 4, loyalty: 1 },
  storytelling: { trust: 2, affinity: 5, loyalty: 2 },
  musicNight: { trust: 3, affinity: 6, loyalty: 2 },
}

const GATHERING_DESCRIPTIONS: Record<GatheringType, string> = {
  quietConversation: 'a quiet conversation',
  sharedDrink: 'shared drinks',
  storytelling: 'storytelling',
  musicNight: 'a night of music and song',
}

function canHostGathering(state: GameState, _gatheringType: GatheringType, participatingNpcIds: string[]): {
  participatingNpcs: NpcRuntimeState[]
  roomName: string
} | null {
  if (participatingNpcIds.length === 0) return null
  if (participatingNpcIds.length > 4) return null // Max 4 NPCs at a gathering
  if (state.currentDistrictId !== state.houseDistrictId) return null

  const participatingNpcs: NpcRuntimeState[] = []

  for (const npcId of participatingNpcIds) {
    const npc = state.roster.find((entry) => entry.npcId === npcId)
    if (!npc) return null
    if (npc.assignment === 'deployed') return null
    if (npc.captivityState?.status === 'captive') return null
    if (npc.captivityState?.status === 'missing') return null
    if (npc.status === 'ward') return null
    participatingNpcs.push(npc)
  }

  // Find a suitable room for the gathering
  const receptionRoom = state.house.rooms.find(
    (room) => room.roomFunction === 'reception' && room.state === 'intact'
  )
  const livingSpace = state.house.rooms.find(
    (room) =>
      (room.roomFunction === 'quarters' || room.roomFunction === 'study') &&
      room.state === 'intact'
  )
  const room = receptionRoom || livingSpace
  if (!room) return null

  return { participatingNpcs, roomName: room.name }
}

/**
 * Host a gathering with multiple NPCs — domestic intimacy activity.
 *
 * Guards:
 * - At least 1, at most 4 NPCs must participate
 * - All NPCs must be eligible (not deployed, captive, missing, or ward)
 * - Player must be at the house
 * - A suitable room (reception, quarters, or study) must exist and be intact
 * - Sufficient funds for gathering cost
 * - Cooldown: 5 days per gathering type
 *
 * Acceptance Criteria:
 * 1. Command is pure state transformer (GameState -> GameState)
 * 2. Trait-based bonus logic (performance, empathy, curiosity)
 * 3. Writes to activityLog with unique ID
 * 4. Respects cooldowns (5 days per activity type)
 * 5. Returns unchanged state if guards fail
 */
export function hostGathering(state: GameState, gatheringType: GatheringType, participatingNpcIds: string[]): GameState {
  const result = canHostGathering(state, gatheringType, participatingNpcIds)
  if (!result) return state

  const { participatingNpcs, roomName } = result
  const cost = GATHERING_COSTS[gatheringType]

  if (state.money < cost) return state

  const cooldownKey = `hostGathering-${gatheringType}-${state.day}`
  if (state.lastFiredDay[cooldownKey] === state.day) return state

  const playerTraits = state.playerCharacter.traits

  let next: GameState = state

  for (const npc of participatingNpcs) {
    const key = buildRelationshipKey(PLAYER_ID, npc.npcId)
    const reverseKey = buildRelationshipKey(npc.npcId, PLAYER_ID)
    const current = next.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
    const reverse = next.relationships[reverseKey] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }

    // Base gains from gathering type
    let { trust: baseTrust, affinity: baseAffinity, loyalty: baseLoyalty } = GATHERING_GAINS[gatheringType]

    // Trait-based bonuses
    // Player performance skill bonus: better at leading gatherings
    if (state.playerCharacter.skills.performance >= 60 && gatheringType === 'musicNight') {
      baseAffinity += 2
    }

    // Player empathy bonus: connects better in quiet settings
    if (playerTraits.empathy >= 55 && gatheringType === 'quietConversation') {
      baseTrust += 2
    }

    // NPC curiosity bonus: enjoys storytelling
    if (npc.traits.curiosity >= 50 && gatheringType === 'storytelling') {
      baseTrust += 1
    }

    // NPC empathy bonus: appreciates social bonding
    if (npc.traits.empathy >= 50) {
      baseLoyalty += 1
    }

    // Context modifiers
    let gainMultiplier = 1.0
    if (current.respect < -30) {
      gainMultiplier = 0.5
    }

    const trustGain = Math.max(1, Math.round(baseTrust * gainMultiplier))
    const affinityGain = Math.max(1, Math.round(baseAffinity * gainMultiplier))
    const loyaltyGain = Math.max(0, Math.round(baseLoyalty * gainMultiplier))

    next = {
      ...next,
      relationships: {
        ...next.relationships,
        [key]: {
          ...current,
          trust: Math.min(100, current.trust + trustGain),
          affinity: Math.min(100, current.affinity + affinityGain),
        },
        [reverseKey]: {
          ...reverse,
          trust: Math.min(100, reverse.trust + trustGain),
          affinity: Math.min(100, reverse.affinity + affinityGain),
          loyalty: Math.min(100, (reverse.loyalty ?? 0) + loyaltyGain),
        },
      },
    }
  }

  // Deduct cost and update cooldown
  next = {
    ...next,
    money: next.money - cost,
    lastFiredDay: {
      ...next.lastFiredDay,
      [cooldownKey]: state.day,
    },
  }

  // Build context-aware message
  const npcNames = participatingNpcs.map((n) => n.name).join(', ')
  const description = GATHERING_DESCRIPTIONS[gatheringType]

  const message = `You host ${description} in ${roomName} with ${npcNames}.`

  next = appendActivityLogEntry(next, 'system', message)
  next.activityLog[0]!.id = `hostGathering::${gatheringType}::${state.day}::${state.timeSlot}`

  return next
}
