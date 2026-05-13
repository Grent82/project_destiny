/**
 * Grief and bereavement system (destiny-m0p1)
 *
 * When an NPC is lost (dismissed, dead, expelled), a loss memory entry is written
 * on every roster NPC with a significant relationship to them (trust ≥ 30).
 *
 * GriefState: { lostNpcId, lostOnDay, intensity }
 * Grief fades over time via endDay — see applyGriefDecay.
 * Grief modifier: reduces morale recovery rate in applyStateDecay.
 */

import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { buildRelationshipKey } from '../../domain/relationships/contracts'

/** Minimum trust score to trigger grief on NPC loss. */
const GRIEF_TRUST_THRESHOLD = 30

/** Starting grief intensity. Decays by GRIEF_DECAY_PER_DAY per day. */
export const GRIEF_INITIAL_INTENSITY = 80
export const GRIEF_DECAY_PER_DAY = 5

export type GriefState = {
  lostNpcId: string
  lostOnDay: number
  intensity: number
}

/**
 * Derive current grief state for an NPC from their memory entries.
 * Returns the strongest active grief (intensity > 0), or null.
 */
export function deriveGriefState(
  npc: NpcRuntimeState,
  currentDay: number,
  _relationships: Record<string, unknown>,
): GriefState | null {
  const lossMemories = npc.npcMemory.filter((m) => m.event === 'loss')
  if (lossMemories.length === 0) return null

  // Find the most recent loss with intensity > 0
  const active = lossMemories
    .map((m) => {
      const daysSince = currentDay - m.day
      const intensity = Math.max(0, GRIEF_INITIAL_INTENSITY - daysSince * GRIEF_DECAY_PER_DAY)
      const lostNpcId = m.participants?.[0] ?? 'unknown'
      return { lostNpcId, lostOnDay: m.day, intensity }
    })
    .filter((g) => g.intensity > 0)
    .sort((a, b) => b.intensity - a.intensity)[0]

  return active ?? null
}

/**
 * Derive the grief morale modifier for an NPC.
 * Active grief reduces morale recovery by a fraction of its intensity.
 * Returns a value in [-25, 0].
 */
export function deriveGriefMoraleModifier(grief: GriefState | null): number {
  if (!grief || grief.intensity <= 0) return 0
  return -Math.round((grief.intensity / GRIEF_INITIAL_INTENSITY) * 25)
}

/**
 * Write loss memory entries on all roster NPCs who had a significant relationship
 * with the lost NPC (trust ≥ GRIEF_TRUST_THRESHOLD).
 */
export function writeLossMemories(
  state: GameState,
  lostNpcId: string,
  lostOnDay: number,
): GameState {
  return {
    ...state,
    roster: state.roster.map((npc) => {
      if (npc.npcId === lostNpcId) return npc

      const relKey = buildRelationshipKey(npc.npcId, lostNpcId)
      const rel = state.relationships[relKey]
      const trust = (rel as { trust?: number } | undefined)?.trust ?? 0

      if (trust < GRIEF_TRUST_THRESHOLD) return npc

      return {
        ...npc,
        npcMemory: [
          ...npc.npcMemory,
          {
            day: lostOnDay,
            event: 'loss',
            participants: [lostNpcId],
          },
        ].slice(-20), // keep max 20 entries (MAX_NPC_MEMORY_ENTRIES)
      }
    }),
  }
}
