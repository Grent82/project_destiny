import threatsData from '../../../data/definitions/threats.json'
import { threatProfileSchema } from '../../domain/expedition/contracts'
import type { ThreatProfile, ThreatType } from '../../domain/expedition/contracts'

const threats = threatProfileSchema.array().parse(threatsData)

/**
 * Catalog of all threat profiles for corridor expeditions.
 */
export const threatsById = new Map<string, ThreatProfile>(
  threats.map((t) => [t.id, t])
)

/**
 * Get a threat profile by ID.
 * @param threatId - The threat ID to look up
 * @returns The threat profile or undefined if not found
 */
export function getThreatProfile(threatId: string): ThreatProfile | undefined {
  return threatsById.get(threatId)
}

/**
 * Get all threats of a specific type.
 * @param threatType - The threat type to filter by
 * @returns Array of threat profiles matching the type
 */
export function getThreatsByType(threatType: ThreatType): ThreatProfile[] {
  return threats.filter((t) => t.threatType === threatType)
}

/**
 * Get all threat profiles in the catalog.
 * @returns Array of all threat profiles
 */
export function getAllThreats(): ThreatProfile[] {
  return [...threats]
}

/**
 * Generate a random threat encounter based on difficulty.
 * Uses the provided seeded RNG for determinism.
 * @param rng - Seeded RNG function
 * @param difficulty - Difficulty level (1-10, higher = harder)
 * @returns Array of threat profiles for the encounter
 */
export function generateThreatEncounter(rng: () => number, difficulty: number): ThreatProfile[] {
  // Clamp difficulty to valid range
  const clampedDifficulty = Math.max(1, Math.min(10, difficulty))

  // Number of threats based on difficulty
  const threatCount = Math.ceil(clampedDifficulty / 2)

  // Filter threats by difficulty tier
  const easyThreats = threats.filter((t) => t.experienceValue <= 6)
  const mediumThreats = threats.filter((t) => t.experienceValue > 6 && t.experienceValue <= 18)
  const hardThreats = threats.filter((t) => t.experienceValue > 18)

  const availableThreats: ThreatProfile[] = []

  if (clampedDifficulty <= 3) {
    // Mostly easy threats
    availableThreats.push(...easyThreats)
    if (clampedDifficulty === 3) {
      availableThreats.push(...mediumThreats.slice(0, 2))
    }
  } else if (clampedDifficulty <= 7) {
    // Mix of easy and medium
    availableThreats.push(...easyThreats, ...mediumThreats)
    if (clampedDifficulty >= 6) {
      availableThreats.push(...hardThreats.slice(0, 1))
    }
  } else {
    // All tiers, weighted toward hard
    availableThreats.push(...easyThreats, ...mediumThreats, ...hardThreats)
  }

  // Select random threats
  const encounter: ThreatProfile[] = []
  const shuffled = [...availableThreats].sort(() => rng() - 0.5)

  for (let i = 0; i < threatCount && i < shuffled.length; i++) {
    encounter.push(shuffled[i])
  }

  return encounter
}
