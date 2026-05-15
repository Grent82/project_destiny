import type { Traits, NpcDefinition } from './contracts'

/**
 * Pure domain function: computes baseline compatibility score from two NPC trait profiles.
 * Implements the 7-rule system with curiosity bridge and +10 warmth baseline.
 * Range: [-25, 50]. Positive = natural chemistry; negative = friction.
 */
export function calculateBaseCompatibility(a: Traits, b: Traits): number {
  let score = 0

  // R1 — Dominance Hierarchy
  if (a.dominance > 65 && b.dominance > 65) {
    score -= 10
  } else if (Math.abs(a.dominance - b.dominance) > 40) {
    score += 8
  } else if (a.dominance < 35 && b.dominance < 35) {
    score += 10
  }

  // R2 — Empathy Resonance
  if (a.empathy > 60 && b.empathy > 60) {
    score += 12
  } else if (Math.abs(a.empathy - b.empathy) > 40) {
    score -= 3
  }

  // R3 — Ruthlessness × Empathy Moral Friction
  if ((a.ruthlessness > 60 && b.empathy > 60) || (b.ruthlessness > 60 && a.empathy > 60)) {
    score -= 7
  }

  // R4 — Ambition Rivalry
  if (a.ambition > 65 && b.ambition > 65) {
    score -= 8
  }

  // R5 — Discipline Respect
  if (a.discipline > 65 && b.discipline > 65) {
    score += 10
  } else if (Math.abs(a.discipline - b.discipline) > 40) {
    score -= 3
  }

  // R6 — Loyalty Bond
  if (a.loyalty > 65 && b.loyalty > 65) {
    score += 8
  }

  // R7 — Zeal Alignment
  if (a.zeal > 60 && b.zeal > 60) {
    score += 6
  }

  // Curiosity Bridge — dampens negative scores only
  if (score < 0) {
    const maxCuriosity = Math.max(a.curiosity, b.curiosity)
    if (maxCuriosity > 65) {
      score = score * 0.35
    } else if (maxCuriosity > 55) {
      score = score * 0.6
    }
  }

  // Baseline warmth: shared professional co-existence (+10)
  score += 10

  return Math.max(-25, Math.min(50, score))
}

/** +8 for same faction; +12 for small tight-knit factions (faction-restored). */
export function getFactionFamiliarityBonus(a: NpcDefinition, b: NpcDefinition): number {
  if (
    a.factionAffinityId !== null &&
    b.factionAffinityId !== null &&
    a.factionAffinityId === b.factionAffinityId
  ) {
    return a.factionAffinityId === 'faction-restored' ? 12 : 8
  }
  return 0
}

/** +5 for same origin district (same text in NpcDefinition.origin). */
export function getOriginProximityBonus(a: NpcDefinition, b: NpcDefinition): number {
  return a.origin && b.origin && a.origin === b.origin ? 5 : 0
}
