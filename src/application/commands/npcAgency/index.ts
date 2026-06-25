import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'
import { TRAIT_DOMINANT, TRAIT_LOW, TRAIT_NEUTRAL } from '../../../domain/npc/traitThresholds'
import { applyRumorAgency } from './rumorAgency'
import { applyIncidentAgency } from './incidentAgency'
import { applyContactAgency } from './contactAgency'
import { applyFactionAgency } from './factionAgency'
import { applyBondAgency } from './bondAgency'
import { applySpendingAgency } from './spendingAgency'
import { applyMovementAgency } from './movementAgency'

/**
 * Orchestration module for NPC agency.
 * Collects eligible NPCs and applies agency modules in sequence.
 */

/** Determine which agency actions an NPC is eligible for based on traits. */
function buildAgencyPool(npc: { traits: { ruthlessness: number; prudence: number; ambition: number; empathy: number; vanity: number; discipline: number } }, rng: Rng): string[] {
  const isReckless = npc.traits.ruthlessness > TRAIT_DOMINANT || npc.traits.prudence < TRAIT_LOW
  const isAmbitious = npc.traits.ambition > TRAIT_DOMINANT
  const isDiplomatic = npc.traits.empathy > TRAIT_DOMINANT
  const isCharming = npc.traits.vanity > TRAIT_DOMINANT
  const isGreedy = npc.traits.ambition > TRAIT_NEUTRAL && npc.traits.discipline < TRAIT_NEUTRAL

  const pool: string[] = ['rumor', 'rumor', 'rumor']
  if (isReckless || isAmbitious) pool.push('incident', 'incident')
  if (isDiplomatic || isCharming) pool.push('contact', 'contact', 'bond')
  if (isAmbitious) pool.push('faction')
  if (isGreedy) pool.push('spend')
  if (isAmbitious && rng() >= 0.7) pool.push('move')

  return pool
}

/** Apply all NPC agency actions in a single pass. */
export function applyAllNpcAgency(state: GameState, rng: Rng = Math.random): GameState {
  let next = state
  const workingNpcs = next.roster.filter((r) => r.assignment === 'working')

  for (const npc of workingNpcs) {
    if (rng() >= 0.15) continue

    // Build trait-based action pool
    const pool = buildAgencyPool(npc, rng)
    const action = pool[Math.floor(rng() * pool.length)]!

    // Execute the selected action
    switch (action) {
      case 'rumor':
        next = applyRumorAgency(next, rng)
        break
      case 'incident':
        next = applyIncidentAgency(next, rng)
        break
      case 'contact':
        next = applyContactAgency(next, rng)
        break
      case 'faction':
        next = applyFactionAgency(next, rng)
        break
      case 'bond':
        next = applyBondAgency(next, rng)
        break
      case 'spend':
        next = applySpendingAgency(next, rng)
        break
      case 'move':
        next = applyMovementAgency(next, rng)
        break
    }
  }

  return next
}

export { applyRumorAgency, applyIncidentAgency, applyContactAgency }
export { applyFactionAgency, applyBondAgency, applySpendingAgency, applyMovementAgency }
