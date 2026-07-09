import type { Attributes, GameState, Skills } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { createRng, type Rng } from './seededRng'

export type SkillName = keyof Skills
type AttributeName = keyof Attributes

/**
 * destiny-p8sb: no shared skill-check function existed anywhere in the codebase before this --
 * equippedTools/activeTrainingBonuses/tempStatBoosts were written by useItem.ts/equipItem.ts but
 * never read by anything. This is the first consumer.
 *
 * tempStatBoosts.stat holds an ATTRIBUTE name (e.g. 'might'), not a skill -- there is no existing
 * attribute-affects-skill mapping in the domain model. This is a first-pass, simple design: each
 * skill is governed by exactly one attribute (several skills can share the same attribute), and an
 * active boost to that attribute contributes at half its value to the skill check (a tool or
 * training bonus is a direct, deliberate investment in the skill itself and counts at full value;
 * an attribute boost is indirect support and counts for less). Revisit if playtesting shows this
 * balance is wrong -- it is not meant to be an authoritative rulebook, just a working default.
 */
const SKILL_GOVERNING_ATTRIBUTE: Record<SkillName, AttributeName> = {
  melee: 'might',
  ranged: 'agility',
  crafting: 'agility',
  medicine: 'resolve',
  administration: 'intellect',
  engineering: 'intellect',
  academics: 'intellect',
  negotiation: 'presence',
  performance: 'presence',
  survival: 'endurance',
  security: 'perception',
  intrigue: 'perception',
}

const ATTRIBUTE_CONTRIBUTION_FACTOR = 0.5

export interface SkillCheckBreakdown {
  base: number
  toolBonus: number
  toolItemId: string | null
  trainingBonus: number
  trainingSource: string | null
  attributeBonus: number
  governingAttribute: AttributeName
  total: number
}

export interface SkillCheckResult {
  skill: SkillName
  difficulty: number
  chance: number
  success: boolean
  breakdown: SkillCheckBreakdown
}

/**
 * Sums every source of skill bonus the player currently has for `skill`: base skill value,
 * an equipped tool granting that skill, an active training bonus for that skill, and (at half
 * value) an active temporary boost to the skill's governing attribute. Pure -- does not mutate
 * or log anything, safe to call for preview/UI purposes before committing to a check.
 */
export function computeSkillCheckBreakdown(state: GameState, skill: SkillName): SkillCheckBreakdown {
  const base = state.playerCharacter.skills[skill]

  const tool = state.equippedTools.find((t) => t.skill === skill)
  const toolBonus = tool?.value ?? 0

  const training = state.activeTrainingBonuses.find((t) => t.skill === skill)
  const trainingBonus = training?.value ?? 0

  const governingAttribute = SKILL_GOVERNING_ATTRIBUTE[skill]
  // tempStatBoosts persist across days until expiresDay is reached (handleItemEffectsPhase.ts
  // clears them at endDay once expiresDay <= day) -- filter the same way here.
  const activeBoost = state.tempStatBoosts.find((b) => b.stat === governingAttribute && b.expiresDay > state.day)
  const attributeBonus = activeBoost ? Math.round(activeBoost.value * ATTRIBUTE_CONTRIBUTION_FACTOR) : 0

  const total = Math.max(0, Math.min(100, base + toolBonus + trainingBonus + attributeBonus))

  return {
    base,
    toolBonus,
    toolItemId: tool?.itemId ?? null,
    trainingBonus,
    trainingSource: training?.source ?? null,
    attributeBonus,
    governingAttribute,
    total,
  }
}

/**
 * Rolls a skill check against `difficulty` (0-100, defaults to 50 -- a moderate challenge),
 * using the same "roll under a clamped chance" pattern as npcAggressionActions.ts. Appends an
 * activity log entry naming every non-zero bonus that contributed, so the player can see why a
 * check succeeded or failed rather than just the outcome.
 */
export function performSkillCheck(
  state: GameState,
  skill: SkillName,
  rng: Rng,
  options?: { difficulty?: number; label?: string },
): { result: SkillCheckResult; nextState: GameState } {
  const difficulty = options?.difficulty ?? 50
  const breakdown = computeSkillCheckBreakdown(state, skill)
  const chance = Math.max(0.05, Math.min(0.95, 0.5 + (breakdown.total - difficulty) / 100))
  const success = rng() < chance

  const bonusParts: string[] = []
  if (breakdown.toolBonus !== 0) bonusParts.push(`tool +${breakdown.toolBonus}`)
  if (breakdown.trainingBonus !== 0) bonusParts.push(`training +${breakdown.trainingBonus}`)
  if (breakdown.attributeBonus !== 0) bonusParts.push(`${breakdown.governingAttribute} boost +${breakdown.attributeBonus}`)
  const bonusText = bonusParts.length > 0 ? ` (${bonusParts.join(', ')})` : ''

  const label = options?.label ?? `${skill} check`
  const message = `${label}: ${success ? 'succeeded' : 'failed'} -- ${skill} ${breakdown.total}${bonusText} vs difficulty ${difficulty}.`

  const nextState = appendActivityLogEntry(state, 'system', message)

  return {
    result: { skill, difficulty, chance, success, breakdown },
    nextState,
  }
}

/**
 * Convenience wrapper deriving the Rng from state.rngSeed and advancing the seed on the
 * returned state, matching this project's determinism convention (never call rng() without
 * threading the seed through). Prefer this over performSkillCheck directly from callers that
 * don't already hold an Rng.
 */
export function rollSkillCheck(
  state: GameState,
  skill: SkillName,
  options?: { difficulty?: number; label?: string },
): { result: SkillCheckResult; nextState: GameState } {
  const { rng, getSeed } = createRng(state.rngSeed)
  const { result, nextState } = performSkillCheck(state, skill, rng, options)
  return { result, nextState: { ...nextState, rngSeed: getSeed() } }
}
