import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { resolveShopPricingBreakdown } from '../content/shopPricing'
import { purchaseItemFromShop } from './purchase'

// Use a rich starting state so purchase tests are independent of starting balance
const richState = { ...initialGameStateSnapshot, money: 500 }

describe('purchaseItemFromShop', () => {
  it('deducts the effective shop price, adds inventory, and logs a readable purchase message', () => {
    const expectedPrice = resolveShopPricingBreakdown(
      { ...richState, currentDistrictId: 'district-ironworks' },
      'shop-ironworks-supply',
      'item-spare-parts',
    )?.finalPrice ?? 70
    const nextState = purchaseItemFromShop(
      { ...richState, currentDistrictId: 'district-ironworks' },
      'shop-ironworks-supply',
      'item-spare-parts',
    )

    expect(nextState.money).toBe(500 - expectedPrice)
    expect(
      nextState.ownedItems.find((o) => o.itemId === 'item-spare-parts' && o.location === 'inventory')
        ?.quantity,
    ).toBe(4)
    expect(nextState.activityLog[0]?.message).toBe(
      `Purchased Spare Parts Crate from Foundry Supply Cage for ${expectedPrice} Marks.`,
    )
  })

  it('uses the same effective price modifiers as the shop overview', () => {
    const pressuredState = {
      ...initialGameStateSnapshot,
      money: 200,
      currentDistrictId: 'district-harbor' as const,
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'blocked' as const },
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-civic-compact': 75,
      },
      districtTension: {
        ...initialGameStateSnapshot.districtTension,
        'district-harbor': 50,
      },
      districts: initialGameStateSnapshot.districts.map((district) =>
        district.districtId === 'district-harbor'
          ? { ...district, marketPressure: 80 }
          : district,
      ),
    }

    const nextState = purchaseItemFromShop(
      pressuredState,
      'shop-harbor-provisions',
      'item-medkit-field',
    )

    const expectedPrice = resolveShopPricingBreakdown(
      pressuredState,
      'shop-harbor-provisions',
      'item-medkit-field',
    )?.finalPrice ?? 0

    expect(nextState.money).toBe(200 - expectedPrice)
    expect(nextState.activityLog[0]?.message).toBe(
      `Purchased Field Medkit from Harbor Provisions for ${expectedPrice} Marks.`,
    )
  })

  it('does not change state when the player lacks funds', () => {
    const poorState = {
      ...initialGameStateSnapshot,
      money: 40,
    }

    const nextState = purchaseItemFromShop(
      poorState,
      'shop-harbor-provisions',
      'item-medkit-field',
    )

    expect(nextState).toEqual(poorState)
  })

  it('does not change state when the requested item is not offered', () => {
    const nextState = purchaseItemFromShop(
      richState,
      'shop-heights-ledger-house',
      'item-spare-parts',
    )

    expect(nextState).toEqual(richState)
  })

  it('does not change state when the shopId does not exist', () => {
    const nextState = purchaseItemFromShop(
      richState,
      'shop-does-not-exist',
      'item-spare-parts',
    )

    expect(nextState).toEqual(richState)
  })
})
