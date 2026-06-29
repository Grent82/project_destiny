import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'
import { getJobForNpc } from '../../content/jobCatalog'
import { appendActivityLogEntry } from '../activityLog'
import { adjustCityDial } from '../economicConsequences'
import { applyRelationshipDelta } from '../adjustRelationship'

/** NPC spending agency: greedy NPCs spend marks on personal business, benefiting local markets. */
export function applySpendingAgency(state: GameState, rng: Rng): GameState {
  let next = state
  const workingNpcs = next.roster.filter((r) => r.assignment === 'working')

  for (const npc of workingNpcs) {
    if (rng() >= 0.15) continue

    const job = getJobForNpc(npc.skills)
    const district = job.districtHint
    const npcName = npc.name
    const isGreedy = npc.traits.ambition > 50 && npc.traits.discipline < 50

    // Only trigger spending for greedy NPCs
    if (!isGreedy) continue
    if (rng() >= 0.5) continue // 50% chance within the agency pool

    const cost = 5 + Math.floor(rng() * 10)
    if (next.money >= cost) {
      next = { ...next, money: next.money - cost }
      next = { ...next, relationships: { ...next.relationships } }
      next = adjustCityDial(next, 'prosperity', 1)
      next = appendActivityLogEntry(
        next,
        'economy',
        `${npcName} spent ${cost} marks on personal business while working in ${district}. Deducted from house funds, but the local market benefits.`,
      )
      const r = applyRelationshipDelta(next, 'player', npc.npcId, 'loyalty', 1)
      next = r.state
    }
  }

  return next
}
