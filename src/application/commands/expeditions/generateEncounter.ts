import { generateThreatEncounter } from '../../content/threatCatalog'

/**
 * Minimal GameState shape needed for encounter generation.
 */
export interface EncounterGameState {
  day: number
  npcRuntimeStates: {
    skills: { melee?: number; ranged?: number }
    attributes: { endurance?: number; resolve?: number }
  }[]
}

/**
 * Represents an encounter in an expedition.
 */
export interface Encounter {
  encounterId: string
  day: number
  threats: EncounterThreat[]
  rewardPool: EncounterReward[]
  difficulty: number
}

/**
 * A single threat within an encounter.
 */
export interface EncounterThreat {
  threatId: string
  name: string
  health: number
  attack: number
  defense: number
  evasion: number
  traits: string[]
  isDefeated: boolean
}

/**
 * A potential reward from defeating threats.
 */
export interface EncounterReward {
  itemId: string
  quantity: number
  chance: number
}

/**
 * Generate an expedition encounter based on difficulty and RNG.
 * @param state - Current game state
 * @param difficulty - Difficulty level (1-10)
 * @param rng - Seeded RNG function
 * @returns Generated encounter with threats and rewards
 */
export function generateEncounter(
  state: EncounterGameState,
  difficulty: number,
  rng: () => number
): Encounter {
  // Clamp difficulty to valid range
  const clampedDifficulty = Math.max(1, Math.min(10, difficulty))

  // Generate threat encounter using threat catalog
  const threatProfiles = generateThreatEncounter(rng, clampedDifficulty)

  // Convert threat profiles to encounter threats
  const threats: EncounterThreat[] = threatProfiles.map((profile) => ({
    threatId: profile.id,
    name: profile.name,
    health: profile.combatStats.health,
    attack: profile.combatStats.attack,
    defense: profile.combatStats.defense,
    evasion: profile.combatStats.evasion,
    traits: profile.traits,
    isDefeated: false,
  }))

  // Generate reward pool based on defeated threats
  const rewardPool: EncounterReward[] = []
  for (const profile of threatProfiles) {
    for (const itemId of profile.lootTable) {
      rewardPool.push({
        itemId,
        quantity: 1,
        chance: 0.5 + (clampedDifficulty * 0.05), // Higher difficulty = better loot chance
      })
    }
  }

  return {
    encounterId: crypto.randomUUID(),
    day: state.day,
    threats,
    rewardPool,
    difficulty: clampedDifficulty,
  }
}

/**
 * Resolve an encounter by simulating combat between squad and threats.
 * This is a simplified combat simulation - full combat logic goes in destiny-6rjf.
 * @param encounter - The encounter to resolve
 * @param squadPower - Combined combat power of the squad
 * @param rng - Seeded RNG function
 * @returns Resolution result with defeated threats and rewards
 */
export function resolveEncounter(
  encounter: Encounter,
  squadPower: number,
  rng: () => number
): {
  defeatedThreats: string[]
  remainingThreats: string[]
  rewards: string[]
  encounterPower: number
} {
  // Calculate encounter power (sum of all threat attack values)
  const encounterPower = encounter.threats.reduce((sum, t) => sum + t.attack, 0)

  // Determine outcome based on power comparison and RNG
  const powerRatio = squadPower / Math.max(1, encounterPower)
  const roll = rng()

  // Threshold for victory: need powerRatio > 1.0 and roll > 0.3
  // Adjusted by difficulty (harder encounters need higher ratio)
  const victoryThreshold = 0.3 + (encounter.difficulty * 0.05)
  const isVictory = powerRatio >= 1.0 && roll > victoryThreshold

  const defeatedThreats: string[] = []
  const remainingThreats: string[] = []
  const rewards: string[] = []

  if (isVictory) {
    // Victory: defeat all threats, collect rewards
    for (const threat of encounter.threats) {
      defeatedThreats.push(threat.threatId)
    }

    // Roll for rewards
    for (const reward of encounter.rewardPool) {
      if (rng() < reward.chance) {
        rewards.push(reward.itemId)
      }
    }
  } else {
    // Partial victory or defeat: defeat some threats based on power ratio
    const defeatCount = Math.floor(encounter.threats.length * Math.min(1, powerRatio))

    const shuffled = [...encounter.threats].sort(() => rng() - 0.5)
    for (let i = 0; i < shuffled.length; i++) {
      if (i < defeatCount) {
        defeatedThreats.push(shuffled[i].threatId)
      } else {
        remainingThreats.push(shuffled[i].threatId)
      }
    }

    // Partial rewards for partial victory
    if (defeatCount > 0) {
      const rewardCount = Math.floor(encounter.rewardPool.length * (defeatCount / encounter.threats.length))
      const shuffledRewards = [...encounter.rewardPool].sort(() => rng() - 0.5)
      for (let i = 0; i < rewardCount; i++) {
        rewards.push(shuffledRewards[i].itemId)
      }
    }
  }

  return {
    defeatedThreats,
    remainingThreats,
    rewards,
    encounterPower,
  }
}

/**
 * Calculate the combat power of a squad based on NPC stats.
 * @param roster - The roster of NPCs in the squad
 * @returns Combined combat power value
 */
export function calculateSquadPower(roster: EncounterGameState['npcRuntimeStates']): number {
  return roster.reduce((power: number, npc) => {
    // Simple power calculation: attack = melee + ranged, defense = endurance + resolve
    const attack = (npc.skills.melee ?? 0) + (npc.skills.ranged ?? 0)
    const defense = (npc.attributes.endurance ?? 0) + (npc.attributes.resolve ?? 0)
    const health = 100 // Base health
    return power + (attack + defense + health) / 3
  }, 0)
}
