import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'
import { getJobForNpc } from '../../content/jobCatalog'
import { contentCatalog } from '../../content/contentCatalog'
import { appendActivityLogEntry } from '../activityLog'
import { writeNpcMemory } from '../adjustRelationship'
import { adjustCityDial, adjustDistrictTension } from '../economicConsequences'

/** NPC contact agency: diplomatic/charming NPCs make useful contacts that ease trade friction. */
export function applyContactAgency(state: GameState, rng: Rng): GameState {
  let next = state
  const workingNpcs = next.npcRuntimeStates.filter((r) => r.playerRosterMember && r.assignment === 'working')

  for (const npc of workingNpcs) {
    if (rng() >= 0.15) continue

    const job = getJobForNpc(npc.skills)
    const district = job.districtHint
    const districtId = contentCatalog.districtNameToId.get(district)
      ?? `district-${district.toLowerCase().replace(/\s+/g, '-')}`
    const npcName = npc.name
    const isDiplomatic = npc.traits.empathy > 60
    const isCharming = npc.traits.vanity > 60

    // Only trigger contacts for diplomatic/charming NPCs
    if (!isDiplomatic && !isCharming) continue
    if (rng() >= 0.5) continue // 50% chance within the agency pool

    next = { ...next, relationships: { ...next.relationships } }
    next = adjustCityDial(next, 'prosperity', 1)
    next = adjustDistrictTension(next, districtId, -1)
    next = appendActivityLogEntry(
      next,
      'system',
      `${npcName} made a useful contact in ${district}. Local trade friction eases and new business may follow.`,
    )
    next = writeNpcMemory(next, npc.npcId, `Made a contact in ${district}`)
  }

  return next
}
