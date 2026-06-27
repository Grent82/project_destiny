/**
 * Apply daily consequences for naked NPCs.
 *
 * - Naked NPCs in public: -20 morale, +15 stress
 * - Naked NPCs in private: -2 morale, +3 stress
 *
 * Called from endDay pipeline (consequences phase).
 *
 * Note: Rumor generation for naked NPCs in public is deferred to a future
 * story/rumor system implementation.
 */

import type { GameState } from '../../../domain/game/contracts'
import { appendActivityLogEntry } from '../activityLog'
import { isNpcNaked, calculateNakednessPenalty } from './isNpcNaked'

/**
 * Apply daily morale/stress penalties for naked NPCs.
 */
export function applyNakednessConsequences(state: GameState): GameState {
  let next = state

  for (const npc of state.roster) {
    if (!isNpcNaked(npc)) continue

    // Determine if NPC is in public (not in player house)
    const isInPublic = npc.roomAssignment === null

    const penalty = calculateNakednessPenalty(npc, isInPublic)

    // Apply morale penalty
    if (penalty.moraleDelta !== 0) {
      next = {
        ...next,
        roster: next.roster.map((r) =>
          r.npcId === npc.npcId
            ? { ...r, states: { ...r.states, morale: Math.max(0, r.states.morale + penalty.moraleDelta) } }
            : r,
        ),
      }
    }

    // Apply stress penalty
    if (penalty.stressDelta !== 0) {
      next = {
        ...next,
        roster: next.roster.map((r) =>
          r.npcId === npc.npcId
            ? { ...r, states: { ...r.states, stress: Math.min(100, r.states.stress + penalty.stressDelta) } }
            : r,
        ),
      }
    }

    // Log the consequence
    const context = isInPublic ? 'in public' : 'without clothes'
    next = appendActivityLogEntry(
      next,
      'system',
      `${npc.name} is naked ${context}. Morale ${penalty.moraleDelta > 0 ? '+' : ''}${penalty.moraleDelta}, stress ${penalty.stressDelta > 0 ? '+' : ''}${penalty.stressDelta}.`,
    )
  }

  return next
}
