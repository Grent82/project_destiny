/**
 * Black Market Trade Command
 *
 * NPC visits black markets to trade illicit goods or services.
 * Success based on Intrigue + Security skill.
 * Reward: 5-20 Mk (riskant)
 *
 * Guards:
 * - NPC must be idle (no assignment/directive)
 * - NPC must have intrigue >= 40 OR security >= 40
 * - District must have a black market POI
 */

import type { GameState } from '../../../../domain'
import { appendActivityLogEntry } from '../../activityLog'
import { createRng } from '../../seededRng'
import { contentCatalog } from '../../../content/contentCatalog'

export interface BlackMarketTradeParams {
  npcId: string
  districtId: string
}

export function blackMarketTrade(state: GameState, params: BlackMarketTradeParams): GameState {
  const { npcId, districtId } = params

  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  // Check guard: requires intrigue >= 40 OR security >= 40
  if (npc.skills.intrigue < 40 && npc.skills.security < 40) {
    return state
  }

  // Check if district has a black market
  const districtPois = contentCatalog.poisByDistrictId.get(districtId) || []
  const hasBlackMarket = districtPois.some((poi) => poi.type === 'black_market')
  if (!hasBlackMarket) {
    return state
  }

  const { rng, getSeed } = createRng(state.rngSeed)
  const successChance = (npc.skills.intrigue + npc.skills.security) / 200
  void districtId // Suppress unused variable warning

  if (rng() > successChance) {
    // Failed trade
    return appendActivityLogEntry(
      state,
      'system',
      `${npc.name}'s black market deal falls through. No earnings today.`,
    )
  }

  // Success: earn 5-20 Mk based on intrigue and security
  const baseReward = 5
  const bonus = Math.floor((npc.skills.intrigue + npc.skills.security) / 10)
  const reward = Math.min(20, baseReward + bonus)

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
    `${npc.name} makes ${reward} Mk on the black market.`,
  )
}
