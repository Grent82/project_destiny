/**
 * Beg for Coin Command
 *
 * NPC begs on the streets for coins.
 * Success based on Presence + Stress level (desperation).
 * Reward: 0-2 Mk
 *
 * Guards:
 * - NPC must be idle (no assignment/directive)
 * - NPC must have presence >= 30 OR stress > 60 (desperate)
 */

import type { GameState } from '../../../../domain'
import { appendActivityLogEntry } from '../../activityLog'
import { createRng } from '../../seededRng'

export interface BegForCoinParams {
  npcId: string
  districtId: string
}

export function begForCoin(state: GameState, params: BegForCoinParams): GameState {
  const { npcId, districtId } = params

  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  // Check guard: requires presence >= 30 OR stress > 60
  if (npc.attributes.presence < 30 && npc.states.stress <= 60) {
    return state
  }

  const { rng, getSeed } = createRng(state.rngSeed)
  // Desperation (high stress) increases success chance
  const desperationBonus = npc.states.stress > 60 ? (npc.states.stress - 60) / 200 : 0
  const successChance = npc.attributes.presence / 200 + desperationBonus
  void districtId // Suppress unused variable warning

  if (rng() > successChance) {
    // Failed to get anything
    return appendActivityLogEntry(
      state,
      'system',
      `${npc.name} begs but receives nothing today.`,
    )
  }

  // Success: earn 0-2 Mk based on presence and desperation
  const baseReward = rng() < 0.5 ? 0 : 1
  const bonus = npc.states.stress > 70 ? 1 : 0
  const reward = Math.min(2, baseReward + bonus)

  if (reward === 0) {
    return appendActivityLogEntry(
      state,
      'system',
      `${npc.name} begs but only receives scraps.`,
    )
  }

  const newState = {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) =>
      n.npcId === npcId
        ? {
            ...n,
            personalFunds: {
              ...n.personalFunds,
              carriedCash: n.personalFunds.carriedCash + reward,
            },
          }
        : n,
    ),
    rngSeed: getSeed(),
  }

  return appendActivityLogEntry(
    newState,
    'economy',
    `${npc.name} begs and receives ${reward} Mk.`,
  )
}
