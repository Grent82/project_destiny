import type { GameState } from '../../domain'
import { createRng } from './seededRng'

const INVESTIGATION_SKILLS = ['intrigue', 'security', 'administration', 'negotiation'] as const
const INVESTIGATION_DIFFICULTY = 55

export type InvestigationOutcome = 'success' | 'partial' | 'failure'

export function computeBestInvestigationSkill(state: GameState, npcIds: string[]) {
  let bestSkillValue = 0

  npcIds.forEach((npcId) => {
    const rosterNpc = state.roster.find((npc) => npc.npcId === npcId)
    if (!rosterNpc) return

    INVESTIGATION_SKILLS.forEach((skill) => {
      bestSkillValue = Math.max(bestSkillValue, rosterNpc.skills[skill] ?? 0)
    })
  })

  return bestSkillValue
}

export function rollInvestigationOutcome(seed: number, bestSkillValue: number) {
  const seeded = createRng(seed)
  const roll = Math.floor(seeded.rng() * 100)
  const effectiveRoll = roll + (bestSkillValue - INVESTIGATION_DIFFICULTY)

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
