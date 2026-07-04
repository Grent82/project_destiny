import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'
import { contentCatalog } from '../../content/contentCatalog'
import { getJobForNpc } from '../../content/jobCatalog'
import { appendActivityLogEntry } from '../activityLog'
import { matchQuirkToContext } from '../../../domain/npc/matchQuirkToContext'
import { TRAIT_DOMINANT, TRAIT_LOW } from '../../../domain/npc/traitThresholds'
import { writeNpcMemory } from '../adjustRelationship'

/** NPC incident agency: reckless/ambitious NPCs cause confrontations that raise district tension. */
export function applyIncidentAgency(state: GameState, rng: Rng): GameState {
  let next = state
  const workingNpcs = next.npcRuntimeStates.filter((r) => r.assignment === 'working')

  for (const npc of workingNpcs) {
    if (rng() >= 0.15) continue

    const job = getJobForNpc(npc.skills)
    const district = job.districtHint
    const districtId = contentCatalog.districtNameToId.get(district)
      ?? `district-${district.toLowerCase().replace(/\s+/g, '-')}`
    const npcName = npc.name
    const isReckless = npc.traits.ruthlessness > TRAIT_DOMINANT || npc.traits.prudence < TRAIT_LOW
    const isAmbitious = npc.traits.ambition > TRAIT_DOMINANT

    // Only trigger incidents for reckless/ambitious NPCs
    if (!isReckless && !isAmbitious) continue
    if (rng() >= 0.5) continue // 50% chance within the agency pool

    const npcDef = contentCatalog.npcsById.get(npc.npcId)
    const cautionQuirk = npcDef
      ? matchQuirkToContext(npcDef, ['danger', 'hazard', 'trust', 'threat', 'conflict'])
      : null
    const tensionGain = cautionQuirk ? 1 : 3

    next = { ...next, relationships: { ...next.relationships } }

    if (cautionQuirk) {
      next = appendActivityLogEntry(
        next,
        'system',
        `${npcName} sensed trouble in ${district} early and stepped back. ${cautionQuirk.text.charAt(0).toUpperCase() + cautionQuirk.text.slice(1)}.`,
      )
      next = writeNpcMemory(next, npc.npcId, `Sensed trouble in ${district} and withdrew`, [districtId])
    } else {
      next = appendActivityLogEntry(
        next,
        'system',
        `${npcName} got into a confrontation at ${district}. Tension is running higher there.`,
      )
      next = writeNpcMemory(next, npc.npcId, `Got into a confrontation in ${district}`, [districtId])
    }

    if (next.districtTension[districtId] !== undefined) {
      next = {
        ...next,
        districtTension: {
          ...next.districtTension,
          [districtId]: Math.min(100, (next.districtTension[districtId] ?? 0) + tensionGain),
        },
      }
    }

    if (isReckless) {
      const affectedFaction = contentCatalog.districtsById.get(districtId)?.controllingFactionId
      if (affectedFaction && next.factionStandings[affectedFaction] !== undefined) {
        next = {
          ...next,
          factionStandings: {
            ...next.factionStandings,
            [affectedFaction]: Math.max(-100, (next.factionStandings[affectedFaction] ?? 0) - 2),
          },
        }
      }
    }
  }

  return next
}
