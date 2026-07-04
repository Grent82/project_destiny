import type { GameState } from '../../domain'
import { NPC_STATE_THRESHOLDS } from '../../domain/npcStateThresholds'
import { getLoyaltyDeployStatus, getStressMoraleDecay } from '../../domain/npcStateModifiers'
import { appendActivityLogEntry } from './activityLog'

/** Step 3: threshold event checks — stress morale decay, hunger warnings, loyalty warnings. */
export function applyThresholds(state: GameState): GameState {
  let next = state

  for (const npc of next.npcRuntimeStates) {
    const snap = {
      stress: npc.states.stress,
      morale: npc.states.morale,
      hunger: npc.states.hunger,
      loyalty: npc.traits.loyalty,
    }

    // Stress → extra morale decay
    const moraleDecay = getStressMoraleDecay(snap)
    if (moraleDecay < 0) {
      next = {
        ...next,
        npcRuntimeStates: next.npcRuntimeStates.map((r) =>
          r.npcId === npc.npcId
            ? { ...r, states: { ...r.states, morale: Math.max(0, r.states.morale + moraleDecay) } }
            : r,
        ),
      }
      next = appendActivityLogEntry(next, 'system', `${npc.name} carries the weight. Morale slips.`)
    }

    // Hunger threshold warning
    if (snap.hunger > NPC_STATE_THRESHOLDS.HUNGER_COMBAT_PENALTY_THRESHOLD) {
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name} is hungry. Fighting will cost more than it should.`,
      )
    }

    // Loyalty warning
    const loyaltyStatus = getLoyaltyDeployStatus(snap)
    if (loyaltyStatus === 'warning' || loyaltyStatus === 'blocked') {
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name} is pulling back. Orders may not hold.`,
      )
    }
  }

  return next
}
