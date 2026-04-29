export type DepartureResult =
  | { type: 'none' }
  | { type: 'departed'; npcId: string; npcName: string; reason: string }
  | { type: 'betrayed'; npcId: string; npcName: string; consequence: string }

const DEPARTURE_BASE_PROB = 0.10
const BETRAYAL_WINDOW = 0.05

/**
 * Evaluates whether an NPC departs or betrays.
 * Call from endDay tick AFTER wages and passive drift.
 * Returns pure result — caller applies state mutations.
 *
 * `random` (0–1) is injected for testability. In production, pass Math.random().
 * The random value is split into ranges:
 *   [0, departureThreshold) = departure roll
 *   [departureThreshold, departureThreshold + BETRAYAL_WINDOW) = betrayal roll
 *
 * departureThreshold = DEPARTURE_BASE_PROB * loyaltyMultiplier (clamped to [0, 1])
 *   loyalty > 70 → multiplier 0.7 (−30%)
 *   loyalty < 30 → multiplier 1.4 (+40%)
 *   otherwise   → multiplier 1.0
 *
 * Only idle NPCs are eligible for either outcome.
 */
export function evaluateNpcDeparture(
  npc: { id: string; name: string; assignment: string; traits: { loyalty: number } },
  relationship: { loyalty: number; trust: number; fear: number } | undefined,
  random: number,
): DepartureResult {
  if (npc.assignment !== 'idle') return { type: 'none' }

  const loyalty = npc.traits.loyalty
  const relLoyalty = relationship?.loyalty ?? 50
  const trust = relationship?.trust ?? 50
  const fear = relationship?.fear ?? 30

  const loyaltyMultiplier = loyalty > 70 ? 0.7 : loyalty < 30 ? 1.4 : 1.0
  const departureThreshold = Math.min(1, Math.max(0, DEPARTURE_BASE_PROB * loyaltyMultiplier))
  const betrayalThreshold = Math.min(1, departureThreshold + BETRAYAL_WINDOW)

  if (random < departureThreshold) {
    // Departure: low relationship loyalty, NPC slips away quietly
    if (relLoyalty < 25) {
      return {
        type: 'departed',
        npcId: npc.id,
        npcName: npc.name,
        reason: 'They slipped away in the night. No note. No farewell.',
      }
    }
  } else if (random < betrayalThreshold) {
    // Betrayal: very low trust AND low relationship loyalty, moderate fear keeps them
    if (trust < 15 && relLoyalty < 20 && fear < 25) {
      return {
        type: 'betrayed',
        npcId: npc.id,
        npcName: npc.name,
        consequence: 'They have gone to your rivals with what they know.',
      }
    }
  }

  return { type: 'none' }
}
