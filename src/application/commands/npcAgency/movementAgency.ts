import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'
import { contentCatalog } from '../../content/contentCatalog'
import { getJobForNpc } from '../../content/jobCatalog'
import { appendActivityLogEntry } from '../activityLog'
import { writeNpcMemory } from '../adjustRelationship'

/** NPC movement agency: ambitious NPCs relocate to adjacent districts for new opportunities. */
export function applyMovementAgency(state: GameState, rng: Rng): GameState {
  let next = state
  const workingNpcs = next.roster.filter((r) => r.assignment === 'working')

  for (const npc of workingNpcs) {
    if (rng() >= 0.15) continue

    const job = getJobForNpc(npc.skills)
    const district = job.districtHint
    const currentDistrictId = contentCatalog.districtNameToId.get(district)
    const npcName = npc.name

    // Only trigger movement for ambitious NPCs
    const isAmbitious = npc.traits.ambition > 60
    if (!isAmbitious) continue
    if (rng() >= 0.5) continue // 50% chance within the agency pool

    if (!currentDistrictId) continue

    const adjacent = contentCatalog.districtsById.get(currentDistrictId)?.adjacentDistrictIds ?? []
    if (adjacent.length === 0) continue

    const newDistrictId = adjacent[Math.floor(rng() * adjacent.length)]!
    const newDistrictName = contentCatalog.districtsById.get(newDistrictId)?.name ?? newDistrictId

    next = { ...next, relationships: { ...next.relationships } }
    next = appendActivityLogEntry(
      next,
      'system',
      `${npcName} moved from ${district} to ${newDistrictName} for new business opportunities.`,
    )
    writeNpcMemory(next, npc.npcId, `Moved business from ${district} to ${newDistrictName}`, [currentDistrictId, newDistrictId])
  }

  return next
}
