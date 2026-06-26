import type { GameState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'

const PLAYER_ID = 'player'

type MealType = 'simple' | 'hearty' | 'feast'

const MEAL_COSTS: Record<MealType, number> = {
  simple: 5,
  hearty: 15,
  feast: 30,
}

const MEAL_GAINS: Record<MealType, { trust: number; affinity: number; loyalty: number }> = {
  simple: { trust: 2, affinity: 2, loyalty: 1 },
  hearty: { trust: 4, affinity: 4, loyalty: 2 },
  feast: { trust: 6, affinity: 6, loyalty: 4 },
}

function canCookMeal(state: GameState, npcId: string): { npcId: string; kitchenRoomId: string } | null {
  const npc = state.roster.find((entry) => entry.npcId === npcId)
  if (!npc) return null
  if (state.currentDistrictId !== state.houseDistrictId) return null
  if (npc.assignment === 'deployed') return null
  if (npc.captivityState?.status === 'captive') return null
  if (npc.captivityState?.status === 'missing') return null
  if (npc.status === 'ward') return null

  // Check if kitchen exists and is intact
  const kitchen = state.house.rooms.find(
    (room) => room.roomFunction === 'kitchen' && room.state === 'intact'
  )
  if (!kitchen) return null

  return { npcId, kitchenRoomId: kitchen.roomId }
}

/**
 * Cook a meal together with an NPC — domestic intimacy activity.
 *
 * Guards:
 * - NPC must exist on roster and be eligible (not deployed, captive, missing, or ward)
 * - Player must be at the house
 * - Kitchen must exist and be intact
 * - Sufficient funds for meal cost
 * - Cooldown: 5 days per meal type
 *
 * Acceptance Criteria:
 * 1. Command is pure state transformer (GameState -> GameState)
 * 2. Trait-based bonus logic (empathy, prudence)
 * 3. Writes to activityLog with unique ID
 * 4. Respects cooldowns (5 days per activity type)
 * 5. Returns unchanged state if guards fail
 */
export function cookMeal(state: GameState, npcId: string, mealType: MealType): GameState {
  const result = canCookMeal(state, npcId)
  if (!result) return state

  const { npcId: validNpcId } = result
  const npc = state.roster.find((entry) => entry.npcId === validNpcId)!

  const cost = MEAL_COSTS[mealType]
  if (state.money < cost) return state

  const cooldownKey = `cookMeal-${validNpcId}-${mealType}-${state.day}`
  if (state.lastFiredDay[cooldownKey] === state.day) return state

  const key = buildRelationshipKey(PLAYER_ID, validNpcId)
  const reverseKey = buildRelationshipKey(validNpcId, PLAYER_ID)
  const current = state.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
  const reverse = state.relationships[reverseKey] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }

  // Base gains from meal type
  let { trust: baseTrust, affinity: baseAffinity, loyalty: baseLoyalty } = MEAL_GAINS[mealType]

  // Trait-based bonuses
  const playerTraits = state.playerCharacter.traits
  const npcTraits = npc.traits

  // Player empathy bonus: better cook when empathetic
  if (playerTraits.empathy >= 60) {
    baseTrust += 1
  }

  // NPC prudence bonus: appreciates well-prepared meals
  if (npcTraits.prudence >= 60) {
    baseAffinity += 1
  }

  // NPC empathy bonus: more grateful for effort
  if (npcTraits.empathy >= 50) {
    baseLoyalty += 1
  }

  // Skill-based bonuses
  const playerSkills = state.playerCharacter.skills
  const npcSkills = npc.skills

  // Player administration skill: better meal planning and resource management
  if ((playerSkills.administration ?? 0) >= 40) {
    baseAffinity += 2
    baseTrust += 1
  }
  if ((playerSkills.administration ?? 0) >= 60) {
    baseLoyalty += 1
  }

  // NPC administration skill: appreciates efficient meal preparation
  if ((npcSkills.administration ?? 0) >= 40) {
    baseTrust += 1
  }

  // NPC performance skill: enjoys the presentation and ritual
  if ((npcSkills.performance ?? 0) >= 40) {
    baseAffinity += 1
  }

  // Context modifiers
  let gainMultiplier = 1.0
  if (current.respect < -30) {
    gainMultiplier = 0.5 // Strained relationship reduces gains
  }

  const trustGain = Math.max(1, Math.round(baseTrust * gainMultiplier))
  const affinityGain = Math.max(1, Math.round(baseAffinity * gainMultiplier))
  const loyaltyGain = Math.max(0, Math.round(baseLoyalty * gainMultiplier))

  let next: GameState = {
    ...state,
    money: state.money - cost,
    relationships: {
      ...state.relationships,
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
    lastFiredDay: {
      ...state.lastFiredDay,
      [cooldownKey]: state.day,
    },
  }

  // Build context-aware message
  const mealLabels: Record<MealType, string> = {
    simple: 'a simple meal',
    hearty: 'a hearty meal',
    feast: 'a feast',
  }

  const contextFlags: string[] = []
  if (current.respect < -30) contextFlags.push('strained relationship')

  let message = `You cook ${mealLabels[mealType]} with ${npc.name} in the kitchen.`
  if (contextFlags.length > 0) {
    message += ` (Context: ${contextFlags.join(', ')})`
  }
  if (gainMultiplier < 1) {
    message += ` The strained atmosphere dulls the experience.`
  }

  next = appendActivityLogEntry(next, 'system', message)
  next.activityLog[0]!.id = `cookMeal::${validNpcId}::${mealType}::${state.day}::${state.timeSlot}`

  return next
}
