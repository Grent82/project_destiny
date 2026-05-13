/**
 * Combat Fear Model — Separated Architecture (Model B)
 *
 * Design decision (destiny-nyty):
 * Battlefield panic (transient, combat-scoped) and relationship fear (persistent, NPC-to-player)
 * are distinct systems with an explicit bridge rule.
 *
 * BATTLEFIELD PANIC (transient):
 *   - Exists only during combat resolution
 *   - Tracked as panicLevel (0-100) per combatant per encounter
 *   - Drives: chance to refuse advance (checkFearRefuseAdvance), reduced accuracy, morale decay
 *   - Does NOT directly modify relationship.fear
 *
 * RELATIONSHIP FEAR (persistent):
 *   - Stored in relationship state as rel.fear (0-100)
 *   - Drives: loyalty modifiers, deployment refusal, long-term NPC behavior
 *   - Is ONLY updated at encounter resolution, not mid-combat
 *
 * BRIDGE RULE (combat → relationship):
 *   - After combat concludes, for each ally who dropped below LOW_HEALTH_THRESHOLD during combat,
 *     add NEAR_DEATH_FEAR_DELTA to relationship fear (capped at MAX_RELATIONSHIP_FEAR)
 *   - After a victory: fear delta is halved (relief effect)
 *   - After a defeat: full fear delta applies
 *   - This creates the narrative: surviving a near-death experience changes the NPC's relationship
 *     to the player, but mid-combat it's pure tactical panic, not personal fear
 */

/** Ratio of max health below which battlefield panic escalates */
export const BATTLEFIELD_LOW_HEALTH_THRESHOLD = 0.3

/** Fear delta added to relationship.fear when NPC was near death in combat (defeat) */
export const NEAR_DEATH_FEAR_DELTA_DEFEAT = 10

/** Fear delta added to relationship.fear when NPC was near death in combat (victory) */
export const NEAR_DEATH_FEAR_DELTA_VICTORY = 4

/** Maximum relationship fear that can accumulate from combat */
export const MAX_RELATIONSHIP_FEAR = 90

/**
 * Computes the panicLevel for a combatant this round.
 * Higher values → more likely to refuse advance, more accuracy penalty.
 * Pure battlefield state — does not touch relationship fear.
 */
export function computeBattlefieldPanic(npcFear: number, currentHealthRatio: number): number {
  // High relationship fear reduces resolve, making battlefield panic more likely
  const fearCarryOver = Math.floor(npcFear * 0.3) // up to 30 from relationship fear
  // Low health amplifies panic
  const healthPanic = currentHealthRatio < 0.3 ? 50 : currentHealthRatio < 0.5 ? 25 : 0
  return Math.min(100, fearCarryOver + healthPanic)
}

/**
 * Returns true if the NPC should refuse to advance due to battlefield panic.
 * Used mid-combat — pure tactical, not relationship.
 */
export function checkBattlefieldPanic(panicLevel: number, rng: () => number = Math.random): boolean {
  if (panicLevel >= 70) return rng() * 100 < 60  // 60% refuse at high panic
  if (panicLevel >= 50) return rng() * 100 < 30  // 30% refuse at moderate panic
  return false
}

/**
 * Computes the relationship fear delta to apply after combat concludes.
 * This is the only bridge from battlefield panic to relationship fear.
 *
 * @param currentHealth - NPC health at encounter end
 * @param maxHealth - NPC max health
 * @param outcome - 'victory' | 'defeat'
 * @param currentRelFear - Current relationship fear value
 */
export function computePostCombatFearDelta(
  currentHealth: number,
  maxHealth: number,
  outcome: 'victory' | 'defeat',
  currentRelFear: number,
): number {
  const healthRatio = maxHealth > 0 ? currentHealth / maxHealth : 1
  if (healthRatio >= BATTLEFIELD_LOW_HEALTH_THRESHOLD) {
    // NPC was not near death — no lasting fear impact
    return 0
  }
  const baseDelta = outcome === 'defeat' ? NEAR_DEATH_FEAR_DELTA_DEFEAT : NEAR_DEATH_FEAR_DELTA_VICTORY
  return Math.min(baseDelta, MAX_RELATIONSHIP_FEAR - currentRelFear)
}
