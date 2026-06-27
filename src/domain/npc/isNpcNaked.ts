import type { NpcRuntimeState } from '../npc/contracts'

/**
 * Checks if an NPC has any clothing equipped (excluding armor and accessories).
 *
 * @param npc - The NPC runtime state to check
 * @returns true if the NPC has any clothing item equipped, false otherwise
 */
export function hasNpcClothing(npc: NpcRuntimeState): boolean {
  const { clothing } = npc

  return (
    clothing.head !== null ||
    clothing.torso !== null ||
    clothing.arms !== null ||
    clothing.legs !== null ||
    clothing.feet !== null ||
    clothing.full !== null ||
    clothing.undergarments !== null
  )
}

/**
 * Checks if an NPC has any armor equipped.
 *
 * @param npc - The NPC runtime state to check
 * @returns true if the NPC has any armor piece equipped, false otherwise
 */
export function hasNpcArmor(npc: NpcRuntimeState): boolean {
  const { armor } = npc

  return (
    armor.lightTorso !== null ||
    armor.heavyTorso !== null ||
    armor.lightLegs !== null ||
    armor.heavyLegs !== null ||
    armor.shield !== null
  )
}

/**
 * Checks if an NPC is currently naked (wearing no clothing).
 *
 * An NPC is considered naked when no clothing items are equipped.
 * Armor pieces (including shield) and accessories do NOT affect nakedness:
 * - A naked NPC with a shield is still naked
 * - A naked NPC with jewelry/accessories is still naked
 * - Undergarments COUNT as clothing (not naked)
 *
 * @param npc - The NPC runtime state to check
 * @returns true if the NPC is naked, false otherwise
 */
export function isNpcNaked(npc: NpcRuntimeState): boolean {
  return !hasNpcClothing(npc)
}

/**
 * Checks if an NPC should receive no armor protection in combat.
 * NPCs without any clothing (undergarments count as clothing) receive no armor soak,
 * even if they have armor equipped. This represents the social stigma and
 * lack of proper underlayers for armor to function correctly.
 *
 * @param npc - The NPC runtime state to check
 * @returns true if the NPC should receive no armor protection, false otherwise
 */
export function shouldNpcReceiveNoArmorProtection(npc: NpcRuntimeState): boolean {
  return !hasNpcClothing(npc)
}
