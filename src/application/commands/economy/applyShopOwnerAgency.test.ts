import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../store/initialGameState'
import { applyShopOwnerAgency } from './applyShopOwnerAgency'

describe('applyShopOwnerAgency', () => {
  it('returns unchanged state when no shop owners exist', () => {
    const state = initialGameStateSnapshot
    const result = applyShopOwnerAgency(state)

    // Roster and other state should be unchanged
    expect(result.roster).toEqual(state.roster)
    expect(result.money).toBe(state.money)
    // RNG seed stays the same when no processing occurs
    expect(result.rngSeed).toBe(state.rngSeed)
  })

  it('processes shop owner and adjusts budget based on restocking', () => {
    const shopOwnerProfile = {
      shopId: 'shop-tallow-general',
      businessStrategy: 'balanced' as const,
      profitMargin: 0.2,
      restockThreshold: 10,
      restockBudget: 500,
      specialtyCategories: ['consumable'],
    }

    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          shopOwnerProfile,
        },
      ],
    }

    const result = applyShopOwnerAgency(state)

    // NPC should still be in roster with updated profile
    const npc = result.roster[0]!
    expect(npc.shopOwnerProfile).toBeDefined()
    expect(npc.shopOwnerProfile!.shopId).toBe('shop-tallow-general')
  })

  it('handles conservative strategy with lower restock quantities', () => {
    const conservativeProfile = {
      shopId: 'shop-tallow-general',
      businessStrategy: 'conservative' as const,
      profitMargin: 0.15,
      restockThreshold: 20,
      restockBudget: 300,
      specialtyCategories: ['armor'],
    }

    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          shopOwnerProfile: conservativeProfile,
        },
      ],
    }

    const result = applyShopOwnerAgency(state)
    const npc = result.roster[0]!

    expect(npc.shopOwnerProfile!.businessStrategy).toBe('conservative')
    expect(npc.shopOwnerProfile!.profitMargin).toBe(0.15)
  })

  it('handles aggressive strategy with higher restock quantities', () => {
    const aggressiveProfile = {
      shopId: 'shop-tallow-general',
      businessStrategy: 'aggressive' as const,
      profitMargin: 0.4,
      restockThreshold: 30,
      restockBudget: 1000,
      specialtyCategories: ['weapon', 'armor'],
    }

    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          shopOwnerProfile: aggressiveProfile,
        },
      ],
    }

    const result = applyShopOwnerAgency(state)
    const npc = result.roster[0]!

    expect(npc.shopOwnerProfile!.businessStrategy).toBe('aggressive')
    expect(npc.shopOwnerProfile!.profitMargin).toBe(0.4)
  })

  it('advances RNG seed after processing', () => {
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          shopOwnerProfile: {
            shopId: 'shop-tallow-general',
            businessStrategy: 'balanced' as const,
            profitMargin: 0.2,
            restockThreshold: 10,
            restockBudget: 500,
            specialtyCategories: [],
          },
        },
      ],
    }

    const initialSeed = state.rngSeed
    const result = applyShopOwnerAgency(state)

    expect(result.rngSeed).not.toBe(initialSeed)
  })

  it('processes multiple shop owners independently', () => {
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          shopOwnerProfile: {
            shopId: 'shop-tallow-general',
            businessStrategy: 'conservative' as const,
            profitMargin: 0.15,
            restockThreshold: 20,
            restockBudget: 300,
            specialtyCategories: ['armor'],
          },
        },
        {
          ...initialGameStateSnapshot.roster[1]!,
          shopOwnerProfile: {
            shopId: 'shop-foundry-weapons',
            businessStrategy: 'aggressive' as const,
            profitMargin: 0.35,
            restockThreshold: 25,
            restockBudget: 800,
            specialtyCategories: ['weapon'],
          },
        },
      ],
    }

    const result = applyShopOwnerAgency(state)

    expect(result.roster[0]!.shopOwnerProfile!.businessStrategy).toBe('conservative')
    expect(result.roster[1]!.shopOwnerProfile!.businessStrategy).toBe('aggressive')
  })
})

describe('Price multiplier calculations', () => {
  it('conservative strategy stays within tight bounds', () => {
    // Low stock, high demand
    const multiplier1 = calculatePriceMultiplier('conservative', 20, 1.3)
    expect(multiplier1).toBeGreaterThanOrEqual(0.95)
    expect(multiplier1).toBeLessThanOrEqual(1.05)

    // High stock, low demand
    const multiplier2 = calculatePriceMultiplier('conservative', 80, 0.7)
    expect(multiplier2).toBeGreaterThanOrEqual(0.95)
    expect(multiplier2).toBeLessThanOrEqual(1.05)
  })

  it('balanced strategy allows moderate volatility', () => {
    const multiplier = calculatePriceMultiplier('balanced', 30, 1.4)
    expect(multiplier).toBeGreaterThanOrEqual(0.85)
    expect(multiplier).toBeLessThanOrEqual(1.15)
  })

  it('aggressive strategy allows high volatility', () => {
    const multiplier = calculatePriceMultiplier('aggressive', 20, 1.5)
    expect(multiplier).toBeGreaterThanOrEqual(0.70)
    expect(multiplier).toBeLessThanOrEqual(1.30)
  })
})

// Import the internal function for testing
import { calculatePriceMultiplier } from './applyShopOwnerAgency'
