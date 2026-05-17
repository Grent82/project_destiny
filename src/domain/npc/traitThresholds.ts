/**
 * Canonical trait threshold constants used across commands, selectors, and UI.
 *
 * Traits are scored 0–100. These thresholds define semantically meaningful
 * bands for game rule evaluation:
 *
 *   ≥ TRAIT_HIGH        → trait is dominant / highly expressive
 *   ≥ TRAIT_DOMINANT    → trait strongly influences behaviour
 *   ≥ TRAIT_MODERATE    → trait is present but not defining
 *   ~  TRAIT_NEUTRAL    → midpoint; no strong pull in either direction
 *   ≤ TRAIT_LOW         → trait is notably weak
 *   ≤ TRAIT_NOTABLY_LOW → trait is suppressed / very weak
 */
export const TRAIT_HIGH = 65
export const TRAIT_DOMINANT = 60
export const TRAIT_MODERATE = 55
export const TRAIT_NEUTRAL = 50
export const TRAIT_LOW = 40
export const TRAIT_NOTABLY_LOW = 35
