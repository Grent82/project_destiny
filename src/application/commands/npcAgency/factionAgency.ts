import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'
import { contentCatalog } from '../../content/contentCatalog'
import { getJobForNpc } from '../../content/jobCatalog'
import { appendActivityLogEntry } from '../activityLog'

/** NPC faction agency: ambitious NPCs quietly do favors for factions, shifting standing. */
export function applyFactionAgency(state: GameState, rng: Rng): GameState {
  let next = state
  const workingNpcs = next.npcRuntimeStates.filter((r) => r.playerRosterMember && r.assignment === 'working')

  for (const npc of workingNpcs) {
    if (rng() >= 0.15) continue

    const job = getJobForNpc(npc.skills)
    const district = job.districtHint
    const npcName = npc.name
    const isAmbitious = npc.traits.ambition > 50

    // Only trigger faction favor for ambitious NPCs
    if (!isAmbitious) continue
    if (rng() >= 0.5) continue // 50% chance within the agency pool

    const factionIds = contentCatalog.factions.map((f: { id: string }) => f.id)
    const factionId = factionIds[Math.floor(rng() * factionIds.length)]!
    const factionName = contentCatalog.factionsById.get(factionId)?.name ?? factionId
    const delta = 1 + Math.floor(rng() * 2)

    if (next.factionStandings[factionId] !== undefined) {
      next = {
        ...next,
        factionStandings: {
          ...next.factionStandings,
          [factionId]: Math.min(100, (next.factionStandings[factionId] ?? 0) + delta),
        },
      }
      next = appendActivityLogEntry(
        next,
        'system',
        `${npcName} did a quiet favour for ${factionName} while working in ${district}. Your standing with them shifts.`,
      )
    }
  }

  return next
}
