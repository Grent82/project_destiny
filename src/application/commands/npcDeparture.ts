export type DepartureResult =
  | { type: 'none' }
  | { type: 'departed'; npcId: string; npcName: string; reason: string }
  | { type: 'betrayed'; npcId: string; npcName: string; consequence: string }

/**
 * Evaluates whether an NPC departs or betrays.
 * Call from endDay tick AFTER wages and passive drift.
 * Returns pure result — caller applies state mutations.
 *
 * `random` (0–1) is injected for testability. In production, pass Math.random().
 * The random value is split into ranges: [0, 0.10) = departure roll, [0.10, 0.15) = betrayal roll.
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

  if (random < 0.10) {
    // Departure: low loyalty NPC slips away quietly
    if (loyalty < 20 && relLoyalty < 25) {
      return {
        type: 'departed',
        npcId: npc.id,
        npcName: npc.name,
        reason: 'They slipped away in the night. No note. No farewell.',
      }
    }
  } else if (random < 0.15) {
    // Betrayal: very low trust AND low loyalty, but moderate fear keeps them
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
