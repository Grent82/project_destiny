import type { Attributes, Traits } from './contracts'

type Rng = () => number

const TRAIT_KEYS: (keyof Traits)[] = [
  'discipline', 'ambition', 'empathy', 'ruthlessness',
  'prudence', 'curiosity', 'dominance', 'loyalty', 'vanity', 'zeal',
]

const ATTRIBUTE_KEYS: (keyof Attributes)[] = [
  'might', 'agility', 'endurance', 'intellect', 'perception', 'presence', 'resolve',
]

type TraitModifiers = Partial<Record<keyof Traits, number>>

const APPRENTICESHIP_MODIFIERS: Record<string, TraitModifiers> = {
  combat:       { discipline: 15, ruthlessness: 10 },
  diplomatic:   { empathy: 15 },
  trade:        { prudence: 15, ambition: 10 },
  scholarly:    { curiosity: 15 },
  criminal:     { ruthlessness: 10, loyalty: -10 },
  civic:        { zeal: 15, discipline: 10 },
}

/**
 * Calculates inherited trait values for a ward being promoted to the roster.
 *
 * Formula per trait:
 *   midpoint = average of parent values (falls back to 40 if no parents)
 *   variance = rng() × 30 - 15  (range -15 to +15)
 *   result = clamp(round(midpoint + variance + apprenticeshipBonus), 0, 100)
 */
export function calculateInheritedTraits(
  parents: Traits[],
  apprenticeship: string | null,
  raisedInHouse: boolean,
  rng: Rng,
): Traits {
  const envMods = apprenticeship ? (APPRENTICESHIP_MODIFIERS[apprenticeship] ?? {}) : {}

  const result: Record<string, number> = {}
  for (const key of TRAIT_KEYS) {
    const midpoint =
      parents.length > 0
        ? parents.reduce((sum, p) => sum + p[key], 0) / parents.length
        : 40
    const variance = rng() * 30 - 15
    const envBonus = (envMods as Record<string, number>)[key] ?? 0
    result[key] = Math.max(0, Math.min(100, Math.round(midpoint + variance + envBonus)))
  }

  if (raisedInHouse) {
    result['loyalty'] = Math.min(100, result['loyalty']! + 10)
  }

  return result as Traits
}

/**
 * Calculates inherited base attributes for a ward being promoted to the roster.
 * Narrower variance than traits (±7.5) since physiology is less environmentally malleable.
 * Clamped to [30, 80].
 */
export function calculateInheritedAttributes(
  parents: Attributes[],
  rng: Rng,
): Attributes {
  const result: Record<string, number> = {}
  for (const key of ATTRIBUTE_KEYS) {
    const midpoint =
      parents.length > 0
        ? parents.reduce((sum, p) => sum + p[key], 0) / parents.length
        : 40
    const variance = rng() * 15 - 7.5
    result[key] = Math.max(30, Math.min(80, Math.round(midpoint + variance)))
  }
  return result as Attributes
}

/**
 * Baseline skill values by apprenticeship domain.
 * All unspecified skills start at 10 (household exposure baseline).
 */
const BASE_SKILL = 10

const APPRENTICESHIP_SKILLS: Record<string, Record<string, number>> = {
  combat:     { melee: 25, ranged: 20 },
  diplomatic: { negotiation: 25, performance: 15 },
  trade:      { administration: 25, negotiation: 15 },
  scholarly:  { academics: 25, administration: 15 },
  criminal:   { intrigue: 25, security: 15 },
  civic:      { administration: 25, academics: 15 },
}

export function buildInheritedSkills(apprenticeship: string | null): Record<string, number> {
  const base: Record<string, number> = {
    melee: BASE_SKILL, ranged: BASE_SKILL, medicine: BASE_SKILL,
    administration: BASE_SKILL, engineering: BASE_SKILL, negotiation: BASE_SKILL,
    survival: BASE_SKILL, security: BASE_SKILL, crafting: BASE_SKILL,
    performance: BASE_SKILL, academics: BASE_SKILL, intrigue: BASE_SKILL,
  }
  const bonuses = apprenticeship ? (APPRENTICESHIP_SKILLS[apprenticeship] ?? {}) : {}
  for (const [skill, val] of Object.entries(bonuses)) {
    base[skill] = val
  }
  return base
}
