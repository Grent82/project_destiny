/**
 * NPC Nakedness Check
 *
 * Determines if an NPC is considered naked based on their clothing state.
 * An NPC is naked if they have no clothing equipped on any layer.
 *
 * This is used for:
 * - Morale/stress consequences
 * - Rumor generation (naked NPCs in public)
 * - Social consequences
 */

import type { NpcRuntimeState } from '../../../domain'

/**
 * Checks if an NPC is completely naked (no clothing equipped on any layer).
 */
export function isNpcNaked(npc: NpcRuntimeState): boolean {
  const { clothing } = npc

  return (
    clothing.head === null &&
    clothing.torso === null &&
    clothing.arms === null &&
    clothing.legs === null &&
    clothing.feet === null &&
    clothing.full === null &&
    clothing.undergarments === null
  )
}

/**
 * Checks if an NPC is partially clothed (has some clothing but not complete coverage).
 */
export function isNpcPartiallyClothed(npc: NpcRuntimeState): boolean {
  const equippedCount = countEquippedClothing(npc)
  return equippedCount > 0 && equippedCount < 4 // Less than half of layers covered
}

/**
 * Counts how many clothing layers are currently equipped.
 */
export function countEquippedClothing(npc: NpcRuntimeState): number {
  const { clothing } = npc
  let count = 0

  if (clothing.head) count++
  if (clothing.torso) count++
  if (clothing.arms) count++
  if (clothing.legs) count++
  if (clothing.feet) count++
  if (clothing.full) count++
  if (clothing.undergarments) count++

  return count
}

/**
 * Gets a description of the NPC's clothing state for display/dialogue.
 */
export function getClothingDescription(npc: NpcRuntimeState): string {
  if (isNpcNaked(npc)) {
    return 'completely naked'
  }

  const equippedCount = countEquippedClothing(npc)
  const totalLayers = 7

  if (equippedCount === totalLayers) {
    return 'fully clothed'
  }

  if (isNpcPartiallyClothed(npc)) {
    return 'partially clothed'
  }

  return 'lightly clothed'
}

/**
 * Calculates morale/stress penalty for being naked in inappropriate situations.
 * Returns the delta to apply to morale and stress.
 */
export interface NakednessPenalty {
  moraleDelta: number
  stressDelta: number
}

export function calculateNakednessPenalty(npc: NpcRuntimeState, isInPublic: boolean): NakednessPenalty {
  if (!isNpcNaked(npc)) {
    return { moraleDelta: 0, stressDelta: 0 }
  }

  if (isInPublic) {
    // Severe penalty for being naked in public
    return {
      moraleDelta: -20,
      stressDelta: 15,
    }
  }

  // Minor stress for being naked even in private (hygiene concerns)
  return {
    moraleDelta: -2,
    stressDelta: 3,
  }
}
