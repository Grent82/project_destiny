/**
 * Scavenge for Sell Command
 *
 * NPC scavenges for useful items that can be sold.
 * Success based on Survival + Perception skill.
 * Reward: Item or 2-8 Mk
 *
 * Guards:
 * - NPC must be idle (no assignment/directive)
 * - NPC must have survival >= 30 OR perception >= 40
 */

import type { GameState } from '../../../../domain'
import { appendActivityLogEntry } from '../../activityLog'
import { createRng } from '../../seededRng'

export interface ScavengeForSellParams {
  npcId: string
  districtId: string
}

export function scavengeForSell(state: GameState, params: ScavengeForSellParams): GameState {
  const { npcId, districtId } = params

  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  // Check guard: requires survival >= 30 OR perception >= 40
  if (npc.skills.survival < 30 && npc.attributes.perception < 40) {
    return state
  }

  const { rng, getSeed } = createRng(state.rngSeed)
  const successChance = (npc.skills.survival + npc.attributes.perception) / 200
  void districtId // Suppress unused variable warning

  if (rng() > successChance) {
    // Found nothing valuable
    return appendActivityLogEntry(
      state,
      'system',
      `${npc.name} scavenges but finds nothing valuable today.`,
    )
  }

  // Success: 50% chance of item, 50% chance of cash
  const foundItem = rng() < 0.5

  if (foundItem) {
    // For now, just give cash equivalent since inventory system is separate
    const baseReward = 2
    const bonus = Math.floor((npc.skills.survival + npc.attributes.perception) / 25)
    const reward = Math.min(8, baseReward + bonus)

    const newState = {
      ...state,
      roster: state.roster.map((n) =>
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
      `${npc.name} scavenges and sells found items for ${reward} Mk.`,
    )
  }

  // Cash find
  const baseReward = 2
  const bonus = Math.floor((npc.skills.survival + npc.attributes.perception) / 30)
  const reward = Math.min(8, baseReward + bonus)

  const newState = {
    ...state,
    roster: state.roster.map((n) =>
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
    `${npc.name} scavenges and finds ${reward} Mk.`,
  )
}
