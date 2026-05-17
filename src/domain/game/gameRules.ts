/**
 * Canonical game rule constants for house mechanics.
 *
 * These constants define scoring weights and tier thresholds used to compute
 * house prestige, exterior tier scores, and defense ratings. Centralising them
 * here prevents drift between selectors, commands, and future balance tools.
 */

/** Minimum prestige score required to enter each prestige tier. */
export const PRESTIGE_TIER_MIN_SCORES = {
  prominent: 75,
  recognized: 50,
  established: 25,
  occupied: 10,
  collapsed: 0,
} as const

/**
 * Base prestige score contributed by each exterior tier.
 * Used in the house prestige selector formula.
 */
export const EXTERIOR_TIER_SCORES = {
  ruined: 0,
  patched: 10,
  maintained: 25,
  restored: 50,
  grand: 80,
} as const

/** Fortification level multiplier for defense rating. */
export const DEFENSE_FORTIFICATION_WEIGHT = 15

/** Defense rating contributed per NPC on 'defense' assignment. */
export const DEFENSE_GUARD_CREW_WEIGHT = 10

/** Defense rating contributed per renown level (derived from prestige). */
export const DEFENSE_RENOWN_DETERRENCE_PER_LEVEL = 5

/** Renown level divisor: prestige score ÷ this = renown level (0–4). */
export const DEFENSE_RENOWN_LEVEL_DIVISOR = 20
