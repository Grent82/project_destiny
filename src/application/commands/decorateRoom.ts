import type { GameState, HouseRoom } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'

const PLAYER_ID = 'player'

type DecorStyle = 'minimalist' | 'warm' | 'grand' | 'utilitarian'

const DECOR_COSTS: Record<DecorStyle, number> = {
  minimalist: 10,
  warm: 20,
  grand: 50,
  utilitarian: 8,
}

const DECOR_GAINS: Record<DecorStyle, { trust: number; affinity: number; loyalty: number; respect?: number }> = {
  minimalist: { trust: 3, affinity: 2, loyalty: 1 },
  warm: { trust: 4, affinity: 5, loyalty: 2 },
  grand: { trust: 5, affinity: 4, loyalty: 3, respect: 2 },
  utilitarian: { trust: 2, affinity: 1, loyalty: 3 },
}

const STYLE_PREFERENCES: Record<DecorStyle, string> = {
  minimalist: 'clean and uncluttered spaces',
  warm: 'cozy, personal touches',
  grand: 'impressive displays of status',
  utilitarian: 'practical, no-nonsense arrangements',
}

function canDecorateRoom(state: GameState, roomId: string, npcId: string): {
  npcId: string
  room: HouseRoom
} | null {
  const npc = state.roster.find((entry) => entry.npcId === npcId)
  if (!npc) return null
  if (state.currentDistrictId !== state.houseDistrictId) return null
  if (npc.assignment === 'deployed') return null
  if (npc.captivityState?.status === 'captive') return null
  if (npc.captivityState?.status === 'missing') return null
  if (npc.status === 'ward') return null

  const room = state.house.rooms.find((r) => r.roomId === roomId)
  if (!room) return null
  if (room.state !== 'intact') return null
  if (room.roomFunction === null) return null // Only functional rooms can be decorated

  return { npcId, room }
}

/**
 * Decorate a room together with an NPC — domestic intimacy activity.
 *
 * Guards:
 * - NPC must exist on roster and be eligible
 * - Player must be at the house
 * - Room must exist, be intact, and have a roomFunction
 * - Sufficient funds for decor cost
 * - Cooldown: 5 days per room
 *
 * Acceptance Criteria:
 * 1. Command is pure state transformer (GameState -> GameState)
 * 2. Trait-based bonus logic (vanity, prudence, ambition)
 * 3. Updates room.decorStyle
 * 4. Writes to activityLog with unique ID
 * 5. Returns unchanged state if guards fail
 */
export function decorateRoom(state: GameState, roomId: string, npcId: string, decorStyle: DecorStyle): GameState {
  const result = canDecorateRoom(state, roomId, npcId)
  if (!result) return state

  const { npcId: validNpcId, room } = result
  const npc = state.roster.find((entry) => entry.npcId === validNpcId)!

  const cost = DECOR_COSTS[decorStyle]
  if (state.money < cost) return state

  const cooldownKey = `decorateRoom-${validNpcId}-${roomId}-${state.day}`
  if (state.lastFiredDay[cooldownKey] === state.day) return state

  const key = buildRelationshipKey(PLAYER_ID, validNpcId)
  const reverseKey = buildRelationshipKey(validNpcId, PLAYER_ID)
  const current = state.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
  const reverse = state.relationships[reverseKey] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }

  // Base gains from decor style
  let { trust: baseTrust, affinity: baseAffinity, loyalty: baseLoyalty, respect: baseRespect } = DECOR_GAINS[decorStyle]
  baseRespect = baseRespect ?? 0

  // Trait-based bonuses
  const playerTraits = state.playerCharacter.traits
  const npcTraits = npc.traits

  // Player vanity bonus: eye for aesthetics
  if (playerTraits.vanity >= 55) {
    baseAffinity += 2
  }

  // NPC ambition bonus: appreciates grand displays
  if (npcTraits.ambition >= 60 && decorStyle === 'grand') {
    baseTrust += 2
  }

  // NPC prudence bonus: appreciates practical choices
  if (npcTraits.prudence >= 55 && decorStyle === 'utilitarian') {
    baseLoyalty += 1
  }

  // Warm decor bonus for empathetic NPCs
  if (npcTraits.empathy >= 50 && decorStyle === 'warm') {
    baseAffinity += 2
  }

  // Skill-based bonuses
  const playerSkills = state.playerCharacter.skills
  const npcSkills = npc.skills

  // Player crafting skill: better execution of decor choices
  if ((playerSkills.crafting ?? 0) >= 40) {
    baseAffinity += 2
    baseTrust += 1
  }
  if ((playerSkills.crafting ?? 0) >= 60) {
    baseLoyalty += 1
  }

  // Player academics skill: knowledge of design principles
  if ((playerSkills.academics ?? 0) >= 50 && decorStyle === 'grand') {
    baseTrust += 2
  }

  // NPC crafting skill: appreciates quality workmanship
  if ((npcSkills.crafting ?? 0) >= 40) {
    baseRespect = (baseRespect ?? 0) + 1
  }

  // NPC performance skill: appreciates the social statement of decor
  if ((npcSkills.performance ?? 0) >= 40 && decorStyle === 'grand') {
    baseAffinity += 1
  }

  // Context modifiers
  let gainMultiplier = 1.0
  if (current.respect < -30) {
    gainMultiplier = 0.5
  }

  const trustGain = Math.max(1, Math.round(baseTrust * gainMultiplier))
  const affinityGain = Math.max(1, Math.round(baseAffinity * gainMultiplier))
  const loyaltyGain = Math.max(0, Math.round(baseLoyalty * gainMultiplier))
  const respectGain = Math.max(0, Math.round(baseRespect * gainMultiplier))

  // Update room decor style
  const updatedRooms = state.house.rooms.map((r) =>
    r.roomId === roomId ? { ...r, decorStyle, upgradeTier: r.upgradeTier } : r
  )

  let next: GameState = {
    ...state,
    money: state.money - cost,
    house: {
      ...state.house,
      rooms: updatedRooms,
    },
    relationships: {
      ...state.relationships,
      [key]: {
        ...current,
        trust: Math.min(100, current.trust + trustGain),
        affinity: Math.min(100, current.affinity + affinityGain),
        respect: Math.min(100, current.respect + respectGain),
      },
      [reverseKey]: {
        ...reverse,
        trust: Math.min(100, reverse.trust + trustGain),
        affinity: Math.min(100, reverse.affinity + affinityGain),
        loyalty: Math.min(100, (reverse.loyalty ?? 0) + loyaltyGain),
      },
    },
    lastFiredDay: {
      ...state.lastFiredDay,
      [cooldownKey]: state.day,
    },
  }

  // Build context-aware message
  const roomName = room.name
  const styleDescription = STYLE_PREFERENCES[decorStyle]

  const contextFlags: string[] = []
  if (current.respect < -30) contextFlags.push('strained relationship')

  let message = `You and ${npc.name} redecorate ${roomName} with ${styleDescription}.`
  if (contextFlags.length > 0) {
    message += ` (Context: ${contextFlags.join(', ')})`
  }
  if (gainMultiplier < 1) {
    message += ` The tension makes the work feel hollow.`
  }

  next = appendActivityLogEntry(next, 'system', message)
  next.activityLog[0]!.id = `decorateRoom::${validNpcId}::${roomId}::${decorStyle}::${state.day}::${state.timeSlot}`

  return next
}
