import type { NpcRuntimeState } from '../npc/contracts'

/**
 * Checks if an NPC is currently naked (wearing no clothing or armor).
 *
 * An NPC is considered naked when:
 * - No clothing items are equipped (head, torso, arms, legs, feet, full, undergarments all null)
 * - No armor pieces are equipped (lightTorso, heavyTorso, lightLegs, heavyLegs, shield all null)
 * - No accessories are worn
 *
 * @param npc - The NPC runtime state to check
 * @returns true if the NPC is naked, false otherwise
 */
export function isNpcNaked(npc: NpcRuntimeState): boolean {
  const { clothing, armor } = npc

  // Check if any clothing layer is equipped
  const hasClothing =
    clothing.head !== null ||
    clothing.torso !== null ||
    clothing.arms !== null ||
    clothing.legs !== null ||
    clothing.feet !== null ||
    clothing.full !== null ||
    clothing.undergarments !== null ||
    (clothing.accessories && clothing.accessories.length > 0)

  // Check if any armor piece is equipped
  const hasArmor =
    armor.lightTorso !== null ||
    armor.heavyTorso !== null ||
    armor.lightLegs !== null ||
    armor.heavyLegs !== null ||
    armor.shield !== null

  // Note: equipment.weapon doesn't affect nakedness - an NPC can be naked but armed

  // NPC is naked if they have no clothing AND no armor
  // (weapon doesn't affect nakedness)
  return !hasClothing && !hasArmor
}
