import type { GameState } from '../../domain'
import type { Traits } from '../../domain/npc/contracts'
import type { Rng } from './seededRng'

const DRIFT_TRAITS: (keyof Traits)[] = [
  'empathy',
  'discipline',
  'ruthlessness',
  'curiosity',
  'loyalty',
]

const DRIFT_COEFFICIENT = 0.002
const DRIFT_CHANCE = 0.15

// Drift multiplier by arc-becoming stage: 'set' means drift stops entirely.
const STAGE_MULTIPLIERS: Record<string, number> = {
  forming: 2.0,
  crystallizing: 1.5,
  set: 0,
}

/** Step 9b: Experiential trait drift for arc-enabled NPCs.
 *  Only NPCs with npcArc.arcId === 'arc-becoming' receive drift — most people don't change
 *  their fundamental nature from proximity. Young or fractured NPCs in specific arcs do. */
export function applyNpcTraitDrift(state: GameState, rng: Rng = Math.random): GameState {
  const learners = state.roster.filter(
    (npc) => npc.npcArc != null && npc.npcArc.arcId === 'arc-becoming',
  )
  if (learners.length === 0) return state

  const influencers = state.roster.filter((npc) => npc.npcArc == null || npc.npcArc.arcId !== 'arc-becoming')

  let next = state

  for (const learner of learners) {
    const arc = learner.npcArc!
    const multiplier = STAGE_MULTIPLIERS[arc.stage] ?? 1.0
    if (multiplier === 0) continue

    let updatedTraits = { ...learner.traits }
    const newDriftEntries = [...arc.driftHistory]

    for (const influencer of influencers) {
      if (influencer.npcId === learner.npcId) continue

      for (const trait of DRIFT_TRAITS) {
        if (rng() >= DRIFT_CHANCE) continue

        const delta = (influencer.traits[trait] - updatedTraits[trait]) * DRIFT_COEFFICIENT * multiplier
        if (delta === 0) continue

        const newValue = Math.max(0, Math.min(100, updatedTraits[trait] + delta))
        updatedTraits = { ...updatedTraits, [trait]: newValue }

        newDriftEntries.push({
          day: state.day,
          trait,
          delta,
          source: `proximity-${influencer.npcId}`,
        })
      }
    }

    const updatedNpc = {
      ...learner,
      traits: updatedTraits,
      npcArc: { ...arc, driftHistory: newDriftEntries },
    }

    next = {
      ...next,
      roster: next.roster.map((n) => (n.npcId === learner.npcId ? updatedNpc : n)),
    }
  }

  return next
}
