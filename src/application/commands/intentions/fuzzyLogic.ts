/**
 * Fuzzy Logic System for NPC Intention Calculation
 *
 * Provides nuanced decision-making through membership functions and rule-based weighting.
 * Replaces binary "good/bad" thresholds with gradated levels for more lifelike NPC behavior.
 */

export type FuzzyLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high'

export const fuzzyWeights: Record<FuzzyLevel, number> = {
  'very-low': 0.2,
  'low': 0.5,
  'medium': 1.0,
  'high': 1.5,
  'very-high': 2.0,
}

/**
 * Converts a numeric value (0-100) to a fuzzy membership level.
 * Uses overlapping boundaries for smoother transitions.
 */
export function fuzzify(value: number): FuzzyLevel {
  if (value < 20) return 'very-low'
  if (value < 35) return 'low'
  if (value < 55) return 'medium'
  if (value < 70) return 'high'
  return 'very-high'
}

/**
 * Calculates a fuzzy score for a single attribute/skill/trait.
 * Returns value * weight based on fuzzy level.
 */
export function fuzzyScore(value: number): number {
  const level = fuzzify(value)
  return value * fuzzyWeights[level] / 100
}

/**
 * Combines multiple fuzzy scores with custom weights.
 * Example: scoutConfidence = combineFuzzyScores([
 *   { value: perception, weight: 0.4 },
 *   { value: survival, weight: 0.35 },
 *   { value: curiosity, weight: 0.25 },
 * ])
 */
export function combineFuzzyScores(scores: Array<{ value: number; weight: number }>): number {
  const total = scores.reduce((acc, { value, weight }) => {
    return acc + fuzzyScore(value) * weight
  }, 0)
  return Math.min(100, Math.round(total * 100))
}

/**
 * Fuzzy rules for intention confidence calculation.
 * Each rule defines: IF conditions THEN confidence modifier.
 */
export interface FuzzyRule {
  name: string
  conditions: Array<{
    type: 'attribute' | 'skill' | 'trait'
    name: string
    level: FuzzyLevel
  }>
  resultWeight: number
}

/**
 * Applies fuzzy rules to calculate intention confidence.
 * More flexible than linear formulas - captures "good enough" vs "excellent" distinctions.
 */
export function applyFuzzyRules(
  npc: {
    attributes: Record<string, number>
    skills: Record<string, number>
    traits: Record<string, number>
  },
  rules: FuzzyRule[],
): number {
  let totalWeight = 0

  for (const rule of rules) {
    let ruleMatches = true

    for (const condition of rule.conditions) {
      let value: number
      if (condition.type === 'attribute') {
        value = npc.attributes[condition.name] ?? 50
      } else if (condition.type === 'skill') {
        value = npc.skills[condition.name] ?? 50
      } else {
        value = npc.traits[condition.name] ?? 50
      }

      const actualLevel = fuzzify(value)
      if (actualLevel !== condition.level) {
        ruleMatches = false
        break
      }
    }

    if (ruleMatches) {
      totalWeight += rule.resultWeight
    }
  }

  // Normalize to 0-100
  return Math.min(100, Math.round(totalWeight * 20))
}

/**
 * Predefined fuzzy rule sets for common intention types.
 * Can be extended per NPC personality or world context.
 */
export const FUZZY_RULE_SETS: Record<string, FuzzyRule[]> = {
  'scout-ahead': [
    {
      name: 'excellent scout',
      conditions: [
        { type: 'attribute', name: 'perception', level: 'high' },
        { type: 'skill', name: 'survival', level: 'high' },
      ],
      resultWeight: 1.5,
    },
    {
      name: 'adequate scout',
      conditions: [
        { type: 'attribute', name: 'perception', level: 'medium' },
        { type: 'skill', name: 'survival', level: 'medium' },
      ],
      resultWeight: 1.0,
    },
    {
      name: 'curious explorer',
      conditions: [
        { type: 'trait', name: 'curiosity', level: 'very-high' },
        { type: 'skill', name: 'survival', level: 'low' },
      ],
      resultWeight: 0.7,
    },
  ],

  'confront-rival': [
    {
      name: 'fierce warrior',
      conditions: [
        { type: 'attribute', name: 'might', level: 'high' },
        { type: 'skill', name: 'melee', level: 'high' },
      ],
      resultWeight: 1.5,
    },
    {
      name: 'ruthless fighter',
      conditions: [
        { type: 'trait', name: 'ruthlessness', level: 'very-high' },
        { type: 'attribute', name: 'might', level: 'medium' },
      ],
      resultWeight: 1.2,
    },
  ],

  'protect-house': [
    {
      name: 'loyal guardian',
      conditions: [
        { type: 'trait', name: 'loyalty', level: 'very-high' },
        { type: 'trait', name: 'discipline', level: 'high' },
      ],
      resultWeight: 1.5,
    },
    {
      name: 'steady defender',
      conditions: [
        { type: 'attribute', name: 'endurance', level: 'high' },
        { type: 'trait', name: 'discipline', level: 'medium' },
      ],
      resultWeight: 1.0,
    },
  ],

  'socialize': [
    {
      name: 'charismatic host',
      conditions: [
        { type: 'attribute', name: 'presence', level: 'high' },
        { type: 'trait', name: 'empathy', level: 'high' },
      ],
      resultWeight: 1.5,
    },
    {
      name: 'friendly companion',
      conditions: [
        { type: 'skill', name: 'performance', level: 'medium' },
        { type: 'trait', name: 'empathy', level: 'medium' },
      ],
      resultWeight: 1.0,
    },
  ],
}
