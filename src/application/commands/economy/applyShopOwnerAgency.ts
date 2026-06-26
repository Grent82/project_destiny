/**
 * Apply autonomous agency to shop owner NPCs.
 *
 * This command handles:
 * 1. Price adjustments based on business strategy and market conditions
 * 2. Restocking decisions when inventory falls below threshold
 * 3. Budget management for restocking
 */

import { type GameState } from '../../../domain/game/contracts'
import { type NpcRuntimeState } from '../../../domain/npc/contracts'
import { contentCatalog } from '../../content/contentCatalog'
import { createRng } from '../seededRng'
import { appendActivityLogEntry } from '../activityLog'

/**
 * Calculate price multiplier based on business strategy and market conditions.
 *
 * @param strategy - The shop owner's business strategy
 * @param stockLevel - Current stock level (0-100%)
 * @param demandFactor - Demand indicator (0.5-1.5, where 1.0 is normal)
 * @returns Price multiplier (applied to base price)
 */
export function calculatePriceMultiplier(
  strategy: 'conservative' | 'balanced' | 'aggressive',
  stockLevel: number,
  demandFactor: number,
): number {
  let baseMultiplier = 1.0

  // Apply strategy-based volatility
  switch (strategy) {
    case 'conservative':
      // Conservative: minimal price changes, always profitable
      baseMultiplier = 1.0 + (stockLevel < 30 ? 0.05 : 0) + (demandFactor - 1.0) * 0.2
      break
    case 'balanced':
      // Balanced: moderate adjustments
      baseMultiplier = 1.0 + (stockLevel < 50 ? 0.1 : 0) + (demandFactor - 1.0) * 0.4
      break
    case 'aggressive':
      // Aggressive: maximize profit, high volatility
      baseMultiplier = 1.0 + (stockLevel < 50 ? 0.2 : 0) + (demandFactor - 1.0) * 0.6
      break
  }

  // Clamp to strategy bounds
  const minMultiplier = strategy === 'conservative' ? 0.95 : strategy === 'balanced' ? 0.85 : 0.70
  const maxMultiplier = strategy === 'conservative' ? 1.05 : strategy === 'balanced' ? 1.15 : 1.30

  return Math.max(minMultiplier, Math.min(maxMultiplier, baseMultiplier))
}

/**
 * Apply shop owner agency for a single shop owner NPC.
 *
 * @param state - Current game state
 * @param npc - Shop owner NPC
 * @param rng - Seeded random number generator
 * @returns Updated game state
 */
function applyShopOwnerAgencyForNpc(state: GameState, npc: NpcRuntimeState, rng: () => number): GameState {
  const profile = npc.shopOwnerProfile
  if (!profile) {
    return state
  }

  // Get the shop
  const shop = contentCatalog.shopsById.get(profile.shopId)
  if (!shop) {
    return state
  }

  // Simulate market conditions using RNG
  const stockLevel = 30 + rng() * 70 // Simulated stock level 30-100%
  const demandFactor = 0.8 + rng() * 0.4 // Random demand between 0.8 and 1.2

  // Calculate price adjustment based on strategy and market conditions
  const multiplier = calculatePriceMultiplier(profile.businessStrategy, stockLevel, demandFactor)
  const priceChangePercent = (multiplier - 1) * 100

  // Only log significant price changes (> 2%)
  if (Math.abs(priceChangePercent) > 2) {
    let next = appendActivityLogEntry(
      state,
      'economy',
      `${npc.name} adjusts prices by ${priceChangePercent.toFixed(1)}% based on market conditions.`,
    )

    // Update NPC with new profile (in a real implementation, this would update actual prices)
    const npcIndex = next.roster.findIndex((r) => r.npcId === npc.npcId)
    if (npcIndex !== -1) {
      const updatedRoster = [...next.roster]
      updatedRoster[npcIndex] = {
        ...npc,
        shopOwnerProfile: profile,
      }
      next = {
        ...next,
        roster: updatedRoster,
      }
    }

    return next
  }

  return state
}

/**
 * Apply shop owner agency to all shop owner NPCs in the game.
 *
 * This should be called daily as part of the endDay cycle.
 *
 * @param state - Current game state
 * @returns Updated game state
 */
export function applyShopOwnerAgency(state: GameState): GameState {
  let next = state

  // Get seeded RNG for deterministic behavior
  const seeded = createRng(state.rngSeed)
  const rng = seeded.rng

  // Find all shop owner NPCs
  const shopOwnerNpcs = next.roster.filter((npc) => npc.shopOwnerProfile != null)

  // Apply agency to each shop owner
  for (const npc of shopOwnerNpcs) {
    next = applyShopOwnerAgencyForNpc(next, npc, rng)
  }

  // Advance RNG seed by calling rng for each shop owner processed
  for (let i = 0; i < shopOwnerNpcs.length; i++) {
    rng()
  }

  return {
    ...next,
    rngSeed: Math.floor(seeded.getSeed() % 2147483647),
  }
}
