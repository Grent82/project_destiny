import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'
import { buildRelationshipKey } from '../../../domain/relationships/contracts'
import { appendActivityLogEntry } from '../activityLog'
import { applyRelationshipDelta } from '../adjustRelationship'

/** NPC bond agency: NPCs build loyalty with fellow roster members through shared work. */
export function applyBondAgency(state: GameState, rng: Rng): GameState {
  let next = state
  const workingNpcs = next.roster.filter((r) => r.assignment === 'working')

  for (const npc of workingNpcs) {
    if (rng() >= 0.15) continue

    const npcName = npc.name
    const others = next.roster.filter((r) => r.npcId !== npc.npcId)

    // Only trigger bond-building for a subset of NPCs
    if (rng() >= 0.5) continue

    if (others.length > 0) {
      const other = others[Math.floor(rng() * others.length)]!
      const relKey = buildRelationshipKey(npc.npcId, other.npcId)
      const existing = next.relationships[relKey]
      if (!existing || existing.loyalty < 30) {
        const delta = 5 + Math.floor(rng() * 10)
        next = { ...next, relationships: { ...next.relationships } }
        applyRelationshipDelta(next, npc.npcId, other.npcId, 'loyalty', delta)
        next = appendActivityLogEntry(
          next,
          'system',
          `${npcName} and ${other.name} grew closer — shared time in the field has built some trust between them.`,
        )
      }
    }
  }

  return next
}
