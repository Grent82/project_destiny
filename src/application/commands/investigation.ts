import type { GameState } from '../../domain'
import { createRng } from './seededRng'

const INVESTIGATION_SKILLS = ['intrigue', 'security', 'administration', 'negotiation'] as const

const INVESTIGATION_DIFFICULTY = 55

export type InvestigationOutcome = 'success' | 'partial' | 'failure'
export type InvestigationBonusType = 'extra_marks' | 'reduce_penalty' | 'none'
export type InvestigationExposureRisk = 'none' | 'low' | 'medium' | 'high'
export interface InvestigationOperativeResult {
  npcId: string
  operativeName: string
  skillUsed: string
  skillValue: number
  rollValue: number
  effectiveRoll: number
  outcome: InvestigationOutcome
}

export interface InvestigationApproach {
  id: string
  label: string
  description: string
  primarySkills: readonly string[]
  exposureRisk: InvestigationExposureRisk
  /** Added to (bestSkill - difficulty) before thresholding. Positive = easier. */
  difficultyModifier: number
  bonusType: InvestigationBonusType
  clueText: string
}

export const INVESTIGATION_APPROACHES: readonly InvestigationApproach[] = [
  {
    id: 'bribe',
    label: 'Bribe & Network',
    description:
      "Work contacts for information. Low exposure; earns goodwill and yields a mark bonus when the work pays off.",
    primarySkills: ['negotiation', 'intrigue'],
    exposureRisk: 'low',
    difficultyModifier: 0,
    bonusType: 'extra_marks',
    clueText:
      "A paid informant tips a name — someone who's been asking the wrong questions in the right places.",
  },
  {
    id: 'surveillance',
    label: 'Covert Surveillance',
    description:
      'Tail suspects and watch for patterns. Skilled operatives gain a decisive edge, but the house risks being noticed.',
    primarySkills: ['security', 'intrigue'],
    exposureRisk: 'medium',
    difficultyModifier: 15,
    bonusType: 'none',
    clueText:
      'Two days of shadowing reveals a pattern — the target moves at predictable times, and rarely alone.',
  },
  {
    id: 'records',
    label: 'Paper Trail',
    description:
      'Search ledgers, manifests, and official records. Completely deniable, but slow and harder to read correctly.',
    primarySkills: ['administration', 'academics'],
    exposureRisk: 'none',
    difficultyModifier: -10,
    bonusType: 'reduce_penalty',
    clueText:
      'A forged entry in the guild manifests points to a holding three districts over — buried, but unmistakable.',
  },
]

export function getInvestigationApproach(approachId: string): InvestigationApproach | undefined {
  return INVESTIGATION_APPROACHES.find((a) => a.id === approachId)
}

const RECORDS_APPROACH_ID = 'records'
const FILED_EVIDENCE_BONUS_PER_ITEM = 5
const FILED_EVIDENCE_BONUS_CAP = 15

/**
 * Filed evidence (state.evidenceInventory, disposition 'filed') strengthens the 'records'
 * (Paper Trail) approach specifically -- thematically the one about ledgers/manifests/official
 * records, which is what gets filed. Resolves destiny-b47h.
 */
export function computeFiledEvidenceBonus(
  state: GameState,
  approachId: string | null | undefined,
): number {
  if (approachId !== RECORDS_APPROACH_ID) return 0
  const filedCount = state.evidenceInventory.filter((entry) => entry.disposition === 'filed').length
  return Math.min(filedCount * FILED_EVIDENCE_BONUS_PER_ITEM, FILED_EVIDENCE_BONUS_CAP)
}

export function computeBestInvestigationSkill(state: GameState, npcIds: string[]) {
  let bestSkillValue = 0

  npcIds.forEach((npcId) => {
    const rosterNpc = state.npcRuntimeStates.find((npc) => npc.npcId === npcId)
    if (!rosterNpc) return

    INVESTIGATION_SKILLS.forEach((skill) => {
      bestSkillValue = Math.max(bestSkillValue, rosterNpc.skills[skill] ?? 0)
    })
  })

  return bestSkillValue
}

export function computeApproachSkillValue(
  state: GameState,
  npcIds: string[],
  primarySkills: readonly string[],
): number {
  let bestSkillValue = 0

  npcIds.forEach((npcId) => {
    const rosterNpc = state.npcRuntimeStates.find((npc) => npc.npcId === npcId)
    if (!rosterNpc) return

    primarySkills.forEach((skill) => {
      bestSkillValue = Math.max(
        bestSkillValue,
        rosterNpc.skills[skill as keyof typeof rosterNpc.skills] ?? 0,
      )
    })
  })

  return bestSkillValue
}

export function rollInvestigationOutcome(
  seed: number,
  bestSkillValue: number,
  difficultyModifier = 0,
) {
  const seeded = createRng(seed)
  const roll = Math.floor(seeded.rng() * 100)
  const effectiveRoll = roll + (bestSkillValue - INVESTIGATION_DIFFICULTY) + difficultyModifier

  let outcome: InvestigationOutcome
  if (effectiveRoll >= 20) {
    outcome = 'success'
  } else if (effectiveRoll >= 0) {
    outcome = 'partial'
  } else {
    outcome = 'failure'
  }

  return {
    outcome,
    roll,
    effectiveRoll,
    nextSeed: seeded.getSeed(),
  }
}

export function buildInvestigationOperativeResults(
  state: GameState,
  npcIds: string[],
  primarySkills: readonly string[],
  rollValue: number,
  difficultyModifier = 0,
): InvestigationOperativeResult[] {
  return npcIds.flatMap((npcId) => {
    const rosterNpc = state.npcRuntimeStates.find((npc) => npc.npcId === npcId)
    if (!rosterNpc) return []

    const rankedSkills = primarySkills
      .map((skill) => ({
        skill,
        value: rosterNpc.skills[skill as keyof typeof rosterNpc.skills] ?? 0,
      }))
      .sort((left, right) => right.value - left.value)

    const best = rankedSkills[0]
    if (!best) return []

    const effectiveRoll =
      rollValue + (best.value - INVESTIGATION_DIFFICULTY) + difficultyModifier

    const outcome: InvestigationOutcome =
      effectiveRoll >= 20 ? 'success' : effectiveRoll >= 0 ? 'partial' : 'failure'

    return [{
      npcId,
      operativeName: rosterNpc.name,
      skillUsed: best.skill,
      skillValue: best.value,
      rollValue,
      effectiveRoll,
      outcome,
    }]
  })
}
