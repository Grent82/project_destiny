/**
 * Apply Money-Earning Intentions
 *
 * Processes NPCs who have active money-earning intentions and executes their
 * corresponding handlers. Called from endDay social simulation phase.
 *
 * Intention types handled:
 * - seek-tips: NPC performs for passersby (1-5 Mk)
 * - black-market-trade: NPC trades illicit goods (5-20 Mk, risky)
 * - beg-for-coin: NPC begs on streets (0-2 Mk, desperation bonus)
 * - scavenge-for-sell: NPC scavenges items to sell (2-8 Mk or item)
 */

import type { GameState } from '../../../../domain/game/contracts'
import type { NpcIntentionType } from '../../../../domain/npc/contracts'
import { createRng } from '../../seededRng'
import { clearNpcIntention } from '../../intentions'
import { seekTips } from './seekTips'
import { blackMarketTrade } from './blackMarketTrade'
import { begForCoin } from './begForCoin'
import { scavengeForSell } from './scavengeForSell'

type MoneyEarningIntention = 'seek-tips' | 'black-market-trade' | 'beg-for-coin' | 'scavenge-for-sell'

const MONEY_EARNING_INTENTIONS: MoneyEarningIntention[] = [
  'seek-tips',
  'black-market-trade',
  'beg-for-coin',
  'scavenge-for-sell',
]

function isMoneyEarningIntention(type: NpcIntentionType): type is MoneyEarningIntention {
  return MONEY_EARNING_INTENTIONS.includes(type as MoneyEarningIntention)
}

/**
 * Execute a money-earning intention handler for an NPC.
 */
function executeMoneyEarningIntention(
  state: GameState,
  npcId: string,
  intentionType: MoneyEarningIntention,
  districtId: string,
): GameState {
  const params = { npcId, districtId }

  switch (intentionType) {
    case 'seek-tips':
      return seekTips(state, params)
    case 'black-market-trade':
      return blackMarketTrade(state, params)
    case 'beg-for-coin':
      return begForCoin(state, params)
    case 'scavenge-for-sell':
      return scavengeForSell(state, params)
    default:
      return state
  }
}

/**
 * Process all NPCs with money-earning intentions.
 * Each NPC has a chance (based on RNG) to attempt their intention.
 */
export function applyMoneyEarningIntentions(state: GameState): GameState {
  let next = state
  const { rng, getSeed } = createRng(state.rngSeed)

  for (const npc of state.roster) {
    // Skip NPCs with active directives or assignments
    if (npc.currentDirectiveId !== null) continue
    if (npc.assignment !== 'idle') continue

    // Check if NPC has a money-earning intention
    if (!npc.currentIntention) continue
    const intentionType = npc.currentIntention.type

    if (!isMoneyEarningIntention(intentionType)) continue

    // Determine district (assigned district, falling back to The Pale)
    const districtId = npc.assignedDistrictId ?? 'district-the-pale'

    // Random chance to attempt (70% base chance)
    const attemptChance = 0.7
    if (rng() <= attemptChance) {
      // Execute the intention (each sub-command has its own internal success/failure roll)
      next = executeMoneyEarningIntention(next, npc.npcId, intentionType, districtId)
    }

    // The intention is spent for today either way — clear it so generation can produce a new
    // one tomorrow, matching every other intention handler's one-attempt-per-day pattern.
    next = clearNpcIntention(next, npc.npcId)
  }

  return { ...next, rngSeed: getSeed() }
}
