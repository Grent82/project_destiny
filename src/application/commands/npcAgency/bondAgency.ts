import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'
import { buildRelationshipKey } from '../../../domain/relationships/contracts'
import { appendActivityLogEntry } from '../activityLog'
import { applyRelationshipDelta } from '../adjustRelationship'

/**
 * NPC bond agency: NPCs build loyalty with fellow roster members through shared work.
 * playerRosterMember-scoped throughout (destiny-rama.12): `assignment==='working'` is currently
 * reachable only by roster members (the assignment UI is gated to selectRosterEntries), but the
 * bond-partner pick (`others`) had NO population filter at all — a working roster NPC could
 * randomly "grow closer" and gain loyalty with a captive or an enemy-typed person sharing the
 * unified list. Fixed explicitly rather than relying on the workingNpcs gate alone.
 */
export function applyBondAgency(state: GameState, rng: Rng): GameState {
  let next = state
  const workingNpcs = next.npcRuntimeStates.filter((r) => r.playerRosterMember && r.assignment === 'working')

  for (const npc of workingNpcs) {
    if (rng() >= 0.15) continue

    const npcName = npc.name
    const others = next.npcRuntimeStates.filter((r) => r.npcId !== npc.npcId && r.playerRosterMember)

    // Only trigger bond-building for a subset of NPCs
    if (rng() >= 0.5) continue

    if (others.length > 0) {
      const other = others[Math.floor(rng() * others.length)]!
      const relKey = buildRelationshipKey(npc.npcId, other.npcId)
      const existing = next.relationships[relKey]
      if (!existing || existing.loyalty < 30) {
        const delta = 5 + Math.floor(rng() * 10)
        next = { ...next, relationships: { ...next.relationships } }
        const r = applyRelationshipDelta(next, npc.npcId, other.npcId, 'loyalty', delta)
        next = r.state
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
