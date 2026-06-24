import type { GameState } from '../../../domain/game/contracts'
import type { CorridorExpeditionEncounter } from '../../../domain/expedition/contracts'
import { getAllThreats } from '../../content/threatCatalog'

/**
 * Simulate a single combat round between coalition and threats.
 */
function simulateCombatRound(
  roundNumber: number,
  coalitionPower: number,
  threatPower: number,
  rng: () => number
): {
  round: number
  coalitionDamageDealt: number
  threatDamageDealt: number
  coalitionCasualties: string[]
  threatCasualties: string[]
} {
  // Calculate hit chance based on power ratio
  const powerRatio = coalitionPower / Math.max(1, threatPower)
  const coalitionHitChance = Math.min(0.9, 0.3 + powerRatio * 0.4)
  const threatHitChance = Math.min(0.9, 0.3 + (1 / powerRatio) * 0.4)

  const coalitionRoll = rng()
  const threatRoll = rng()

  const coalitionHits = coalitionRoll > (1 - coalitionHitChance)
  const threatHits = threatRoll > (1 - threatHitChance)

  // Calculate damage (10-30 base + power bonus)
  const coalitionDamage = coalitionHits ? Math.floor(10 + coalitionPower * 0.1 + rng() * 20) : 0
  const threatDamage = threatHits ? Math.floor(10 + threatPower * 0.1 + rng() * 20) : 0

  // Determine casualties based on damage thresholds
  const coalitionCasualties: string[] = []
  const threatCasualties: string[] = []

  // Simplified casualty logic - if damage exceeds threshold, mark casualty
  if (threatDamage > 50 && rng() > 0.5) {
    coalitionCasualties.push(`npc-casualty-${roundNumber}`)
  }
  if (coalitionDamage > 50 && rng() > 0.5) {
    threatCasualties.push(`threat-casualty-${roundNumber}`)
  }

  return {
    round: roundNumber,
    coalitionDamageDealt: coalitionDamage,
    threatDamageDealt: threatDamage,
    coalitionCasualties,
    threatCasualties,
  }
}

/**
 * Calculate total power for a coalition based on member skills.
 */
function calculateCoalitionPower(coalition: GameState['cityResources']['activeCoalitions'][0]): number {
  let power = 0
  for (const member of coalition.members) {
    // Find NPC in roster or worldNpcStates
    const npc = coalition.members.find(m => m.npcId === member.npcId)
    if (npc) {
      // Use role bonus + base stats
      const roleBonus = member.role === 'leader' ? 20 : member.role === 'vanguard' ? 15 : member.role === 'scout' ? 10 : 5
      power += 50 + roleBonus // Base power per member
    }
  }
  return power
}

/**
 * Calculate total power for threats.
 */
function calculateThreatPower(threatIds: string[]): number {
  const allThreats = getAllThreats()
  let power = 0
  for (const threatId of threatIds) {
    const threat = allThreats.find(t => t.id === threatId)
    if (threat) {
      power += threat.combatStats.attack + threat.combatStats.health / 10
    }
  }
  return power > 0 ? power : 50 // Default power if threat not found
}

/**
 * Generate a random encounter for the expedition.
 */
function generateEncounter(
  coalition: GameState['cityResources']['activeCoalitions'][0],
  rng: () => number
): CorridorExpeditionEncounter {
  const allThreats = getAllThreats()
  const difficulty = coalition.difficulty

  // Select 1-3 threats based on difficulty
  const threatCount = Math.min(3, Math.max(1, Math.floor(difficulty / 3) + 1))
  const shuffled = [...allThreats].sort(() => rng() - 0.5)
  const selectedThreats = shuffled.slice(0, threatCount)

  return {
    encounterNumber: 1,
    threatIds: selectedThreats.map(t => t.id),
    difficulty,
    roundResults: [],
  }
}

/**
 * runCorridorExpedition: Simulates a corridor expedition for a coalition.
 *
 * This command runs the expedition simulation, resolving encounters and
 * tracking progress toward corridor clearance.
 *
 * @param state - Current game state
 * @param coalitionId - ID of the coalition to run expedition for
 * @param rng - Seeded RNG function
 * @returns Updated game state with expedition results
 */
export function runCorridorExpedition(
  state: GameState,
  coalitionId: string,
  rng: () => number
): GameState {
  const coalition = state.cityResources.activeCoalitions.find(c => c.id === coalitionId)
  if (!coalition) {
    return state
  }

  // Generate encounter
  const encounter = generateEncounter(coalition, rng)

  // Calculate powers
  const coalitionPower = calculateCoalitionPower(coalition)
  const threatPower = calculateThreatPower(encounter.threatIds)

  // Simulate combat rounds (max 5 rounds)
  const roundResults = []
  let coalitionHealth = 100
  let threatHealth = 100
  let round = 0

  while (coalitionHealth > 0 && threatHealth > 0 && round < 5) {
    round++
    const result = simulateCombatRound(round, coalitionPower, threatPower, rng)
    roundResults.push(result)

    coalitionHealth -= result.threatDamageDealt
    threatHealth -= result.coalitionDamageDealt
  }

  // Determine encounter result
  let result: 'victory' | 'defeat' | 'withdrawal' = 'withdrawal'
  if (coalitionHealth > 0 && threatHealth <= 0) {
    result = 'victory'
  } else if (coalitionHealth <= 0) {
    result = 'defeat'
  }

  encounter.roundResults = roundResults
  encounter.result = result

  // Calculate progress based on result
  const progressGain = result === 'victory' ? 35 : result === 'defeat' ? 10 : 20
  const newProgress = Math.min(100, coalition.progress + progressGain)

  // Update coalition progress
  const updatedCoalitions = state.cityResources.activeCoalitions.map(c =>
    c.id === coalitionId ? { ...c, progress: newProgress } : c
  )

  return {
    ...state,
    cityResources: {
      ...state.cityResources,
      activeCoalitions: updatedCoalitions,
    },
  }
}
