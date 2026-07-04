import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'
import { contentCatalog } from '../../content/contentCatalog'
import { appendActivityLogEntry } from '../activityLog'
import { getJobForNpc } from '../../content/jobCatalog'

/** NPC rumor agency: working NPCs overhear and spread rumors in their district. */
export function applyRumorAgency(state: GameState, rng: Rng): GameState {
  let next = state
  const workingNpcs = next.npcRuntimeStates.filter((r) => r.assignment === 'working')

  for (const npc of workingNpcs) {
    if (rng() >= 0.15) continue

    const job = getJobForNpc(npc.skills)
    const district = job.districtHint
    const npcName = npc.name

    next = appendActivityLogEntry(
      next,
      'system',
      `${npcName} overheard something useful while working in ${district}. Word is: ${contentCatalog.rumors[0]?.text ?? 'Whispers in the market'}`,
    )
  }

  return next
}
