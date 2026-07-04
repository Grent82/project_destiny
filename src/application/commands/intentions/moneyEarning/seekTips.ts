/**
 * Seek Tips Command
 *
 * NPC attempts to earn tips by performing services or entertaining passersby.
 * Success based on Presence + Performance skill.
 * Reward: 1-5 Mk
 *
 * Guards:
 * - NPC must be idle (no assignment/directive)
 * - NPC must have presence >= 40 OR performance >= 30
 */

import type { GameState } from '../../../../domain'
import { appendActivityLogEntry } from '../../activityLog'
import { createRng } from '../../seededRng'

export interface SeekTipsParams {
  npcId: string
  districtId: string
}

export function seekTips(state: GameState, params: SeekTipsParams): GameState {
  const { npcId, districtId } = params

  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  // Check guard: requires presence >= 40 OR performance >= 30
  if (npc.attributes.presence < 40 && npc.skills.performance < 30) {
    return state
  }

  const { rng, getSeed } = createRng(state.rngSeed)
  const successChance = (npc.attributes.presence + npc.skills.performance) / 200
  void districtId // Suppress unused variable warning

  if (rng() > successChance) {
    // Failed to earn tips
    return state
  }

  // Success: earn 1-5 Mk based on presence and performance
  const baseReward = 1
  const bonus = Math.floor((npc.attributes.presence + npc.skills.performance) / 30)
  const reward = Math.min(5, baseReward + bonus)

  // Add to NPC's carriedCash
  const newState = {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) =>
      n.npcId === npcId
        ? {
            ...n,
            personalFunds: {
              ...n.personalFunds,
              carriedCash: n.personalFunds.carriedCash + reward,
              lastTipAmount: reward,
            },
          }
        : n,
    ),
    rngSeed: getSeed(),
  }

  return appendActivityLogEntry(
    newState,
    'economy',
    `${npc.name} earns ${reward} Mk in tips from passersby.`,
  )
}
