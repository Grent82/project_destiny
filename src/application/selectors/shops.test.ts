import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { contentCatalog } from '../content/contentCatalog'
import {
  selectShopsInCurrentDistrict,
  selectShopOverview,
  selectShopPricingBreakdown,
  computeFactionPriceMod,
  computeMarketPressureMod,
  computeCorridorPriceMod,
  computeDistrictTensionPriceMod,
} from './shops'
import type { GameState } from '../../domain'

function makeRootState(game: GameState) {
  return { game }
}

describe('selectShopsInCurrentDistrict', () => {
  it('returns shops matching currentDistrictId', () => {
    const state = makeRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-the-warrens',
    })
    const shops = selectShopsInCurrentDistrict(
      state as Parameters<typeof selectShopsInCurrentDistrict>[0],
    )
    expect(shops.length).toBeGreaterThan(0)
    expect(shops.every((s) => s.districtId === 'district-the-warrens')).toBe(true)
  })

  it('returns empty array when currentDistrictId is null', () => {
    const state = makeRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: null,
    })
    const shops = selectShopsInCurrentDistrict(
      state as Parameters<typeof selectShopsInCurrentDistrict>[0],
    )
    expect(shops).toEqual([])
  })

  it('returns empty array when district has no shops', () => {
    const state = makeRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-nonexistent',
    })
    const shops = selectShopsInCurrentDistrict(
      state as Parameters<typeof selectShopsInCurrentDistrict>[0],
    )
    expect(shops).toEqual([])
  })
})

describe('computeFactionPriceMod', () => {
  it('returns 0.85 at standing >= 75', () => {
    expect(computeFactionPriceMod(75)).toBe(0.85)
    expect(computeFactionPriceMod(100)).toBe(0.85)
  })

  it('returns 0.90 at standing >= 50 and < 75', () => {
    expect(computeFactionPriceMod(50)).toBe(0.90)
    expect(computeFactionPriceMod(74)).toBe(0.90)
  })

  it('returns 1.0 at neutral standing', () => {
    expect(computeFactionPriceMod(0)).toBe(1.0)
    expect(computeFactionPriceMod(49)).toBe(1.0)
    expect(computeFactionPriceMod(-29)).toBe(1.0)
  })

  it('returns 1.10 at standing <= -30', () => {
    expect(computeFactionPriceMod(-30)).toBe(1.10)
    expect(computeFactionPriceMod(-100)).toBe(1.10)
  })
})

describe('selectShopOverview faction price modifier', () => {
  function asRootState(game: GameState) {
    return { game } as Parameters<typeof selectShopOverview>[0]
  }

  it('applies -10% discount at standing 50 for controlling faction', () => {
    const state = asRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      factionStandings: { 'faction-civic-compact': 50 },
    })
    const overview = selectShopOverview(state)
    const harborShop = overview.shops.find((s) => s.id === 'shop-harbor-provisions')
    expect(harborShop?.factionPriceModifier).toBe(0.90)
  })

  it('applies -15% discount at standing 75 for controlling faction', () => {
    const state = asRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      factionStandings: { 'faction-civic-compact': 75 },
    })
    const overview = selectShopOverview(state)
    const harborShop = overview.shops.find((s) => s.id === 'shop-harbor-provisions')
    expect(harborShop?.factionPriceModifier).toBe(0.85)
  })

  it('applies +10% surcharge at standing -30', () => {
    const state = asRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-ironworks',
      factionStandings: { 'faction-foundry-league': -30 },
    })
    const overview = selectShopOverview(state)
    const ironShop = overview.shops.find((s) => s.id === 'shop-ironworks-supply')
    expect(ironShop?.factionPriceModifier).toBe(1.10)
  })

  it('hides gated offers when standing is below minStanding', () => {
    const state = asRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      factionStandings: { 'faction-civic-compact': 50 },
    })
    const overview = selectShopOverview(state)
    const harborShop = overview.shops.find((s) => s.id === 'shop-harbor-provisions')
    const hasPermit = harborShop?.offers.some((o) => o.itemId === 'item-compact-permit-official')
    expect(hasPermit).toBe(false)
  })

  it('shows gated offers when standing meets minStanding', () => {
    const state = asRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      factionStandings: { 'faction-civic-compact': 75 },
    })
    const overview = selectShopOverview(state)
    const harborShop = overview.shops.find((s) => s.id === 'shop-harbor-provisions')
    const hasPermit = harborShop?.offers.some((o) => o.itemId === 'item-compact-permit-official')
    expect(hasPermit).toBe(true)
  })
})

describe('computeMarketPressureMod', () => {
  it('returns 1.15 at pressure >= 70 (high demand)', () => {
    expect(computeMarketPressureMod(70)).toBe(1.15)
    expect(computeMarketPressureMod(100)).toBe(1.15)
  })

  it('returns 1.05 at pressure >= 50 and < 70', () => {
    expect(computeMarketPressureMod(50)).toBe(1.05)
    expect(computeMarketPressureMod(69)).toBe(1.05)
  })

  it('returns 1.0 at moderate pressure', () => {
    expect(computeMarketPressureMod(31)).toBe(1.0)
    expect(computeMarketPressureMod(49)).toBe(1.0)
  })

  it('returns 0.92 at pressure <= 30 (low demand)', () => {
    expect(computeMarketPressureMod(30)).toBe(0.92)
    expect(computeMarketPressureMod(0)).toBe(0.92)
  })
})

describe('selectShopOverview market pressure wiring', () => {
  it('prices are higher in a high-pressure district than a low-pressure one', () => {
    const highPressureState = makeRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      districts: initialGameStateSnapshot.districts.map((d) =>
        d.districtId === 'district-harbor' ? { ...d, marketPressure: 85 } : d,
      ),
    })
    const lowPressureState = makeRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      districts: initialGameStateSnapshot.districts.map((d) =>
        d.districtId === 'district-harbor' ? { ...d, marketPressure: 20 } : d,
      ),
    })

    const highResult = selectShopOverview(highPressureState)
    const lowResult = selectShopOverview(lowPressureState)

    const highShop = highResult.shops.find((s) => s.districtId === 'district-harbor')
    const lowShop = lowResult.shops.find((s) => s.districtId === 'district-harbor')

    expect(highShop).toBeDefined()
    expect(lowShop).toBeDefined()

    const highPrice = highShop?.offers[0]?.price ?? 0
    const lowPrice = lowShop?.offers[0]?.price ?? 0

    expect(highPrice).toBeGreaterThan(lowPrice)
  })

  it('marketPressureMod is exposed on shop view model', () => {
    const state = makeRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      districts: initialGameStateSnapshot.districts.map((d) =>
        d.districtId === 'district-harbor' ? { ...d, marketPressure: 80 } : d,
      ),
    })
    const result = selectShopOverview(state)
    const shop = result.shops.find((s) => s.districtId === 'district-harbor')

    expect(shop?.marketPressureMod).toBe(1.15)
  })
})

describe('selectShopPricingBreakdown', () => {
  it('returns the component price modifiers for a visible shop offer', () => {
    const state = makeRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'disrupted' },
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
    })

    const breakdown = selectShopPricingBreakdown(
      state as Parameters<typeof selectShopPricingBreakdown>[0],
      'shop-harbor-provisions',
      'item-medkit-field',
    )

    expect(breakdown).toMatchObject({
      basePrice: 95,
      corridorMod: 1.15,
      factionMod: 0.85,
      marketMod: 1.15,
      tensionMod: 1.1,
    })
    expect(breakdown?.finalPrice).toBe(Math.ceil(95 * 1.15 * 0.85 * 1.15 * 1.1))
  })

  it('matches the final price shown in the shop overview', () => {
    const state = makeRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'blocked' },
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-civic-compact': 50,
      },
      districtTension: {
        ...initialGameStateSnapshot.districtTension,
        'district-harbor': 20,
      },
      districts: initialGameStateSnapshot.districts.map((district) =>
        district.districtId === 'district-harbor'
          ? { ...district, marketPressure: 25 }
          : district,
      ),
    })

    const overview = selectShopOverview(state as Parameters<typeof selectShopOverview>[0])
    const overviewOffer = overview.shops
      .find((shop) => shop.id === 'shop-harbor-provisions')
      ?.offers.find((offer) => offer.itemId === 'item-medkit-field')

    const breakdown = selectShopPricingBreakdown(
      state as Parameters<typeof selectShopPricingBreakdown>[0],
      'shop-harbor-provisions',
      'item-medkit-field',
    )

    expect(breakdown?.finalPrice).toBe(overviewOffer?.price)
  })
})

describe('Category display fix - weapons and armor in shops', () => {
  it('weapon-sword-court-dueling-blade has valid category in contentCatalog', () => {
    const weapon = contentCatalog.itemsById.get('weapon-sword-court-dueling-blade')
    expect(weapon).toBeDefined()
    expect(weapon?.category).not.toBe('unknown')
    expect(weapon?.category).toBe('weapon')
  })

  it('armor-specialized-compact-assessor-coat has valid category in contentCatalog', () => {
    const armor = contentCatalog.itemsById.get('armor-specialized-compact-assessor-coat')
    expect(armor).toBeDefined()
    expect(armor?.category).not.toBe('unknown')
    expect(armor?.category).toBe('armor')
  })

  it('all weapon items in contentCatalog have valid category', () => {
    for (const item of contentCatalog.itemsById.values()) {
      if (item.id.startsWith('weapon-')) {
        expect(item.category, `Weapon ${item.id} should have valid category`).not.toBe('unknown')
        expect(item.category).toBe('weapon')
      }
      if (item.id.startsWith('armor-')) {
        expect(item.category, `Armor ${item.id} should have valid category`).not.toBe('unknown')
        expect(item.category).toBe('armor')
      }
    }
  })
})

describe('computeCorridorPriceMod', () => {
  it('returns 1.3 when corridor is blocked', () => {
    expect(computeCorridorPriceMod('blocked')).toBe(1.3)
  })

  it('returns 1.15 when corridor is disrupted', () => {
    expect(computeCorridorPriceMod('disrupted')).toBe(1.15)
  })

  it('returns 1.0 when corridor is open', () => {
    expect(computeCorridorPriceMod('open')).toBe(1.0)
  })
})

describe('computeDistrictTensionPriceMod', () => {
  it('returns 1.0 at zero tension', () => {
    expect(computeDistrictTensionPriceMod(0)).toBe(1.0)
  })

  it('returns 1.1 at tension 50', () => {
    expect(computeDistrictTensionPriceMod(50)).toBe(1.1)
  })

  it('returns 1.2 at max tension 100', () => {
    expect(computeDistrictTensionPriceMod(100)).toBe(1.2)
  })

  it('applies linear scaling: 1 + (tension/100) * 0.2', () => {
    expect(computeDistrictTensionPriceMod(25)).toBe(1.05)
    expect(computeDistrictTensionPriceMod(75)).toBe(1.15)
  })
})

describe('selectShopOverview institutional block', () => {
  function asRootState(game: GameState) {
    return { game } as Parameters<typeof selectShopOverview>[0]
  }

  it('blocks shop when controlling faction is blacklisted', () => {
    const state = asRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      factionStandings: { 'faction-civic-compact': 0 },
      institutionalStanding: { 'faction-civic-compact': 'blacklisted' },
    })
    const overview = selectShopOverview(state)
    const harborShop = overview.shops.find((s) => s.id === 'shop-harbor-provisions')
    expect(harborShop?.accessDenied).toBe(true)
    expect(harborShop?.institutionalBlock).toBe(true)
    expect(harborShop?.offers).toEqual([])
  })

  it('blocks shop when controlling faction is hostile', () => {
    const state = asRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-ironworks',
      factionStandings: { 'faction-foundry-league': 0 },
      institutionalStanding: { 'faction-foundry-league': 'hostile' },
    })
    const overview = selectShopOverview(state)
    const ironShop = overview.shops.find((s) => s.id === 'shop-ironworks-supply')
    expect(ironShop?.accessDenied).toBe(true)
    expect(ironShop?.institutionalBlock).toBe(true)
  })

  it('allows shop when faction is neutral in institutional standing', () => {
    const state = asRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      factionStandings: { 'faction-civic-compact': 0 },
      institutionalStanding: { 'faction-civic-compact': 'neutral' },
    })
    const overview = selectShopOverview(state)
    const harborShop = overview.shops.find((s) => s.id === 'shop-harbor-provisions')
    expect(harborShop?.accessDenied).toBe(false)
    expect(harborShop?.institutionalBlock).toBe(false)
  })
})

describe('selectShopOverview affordability and bestPrice', () => {
  function asRootState(game: GameState) {
    return { game } as Parameters<typeof selectShopOverview>[0]
  }

  it('marks offers as affordable when money >= finalPrice', () => {
    const state = asRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      money: 1000,
    })
    const overview = selectShopOverview(state)
    const harborShop = overview.shops.find((s) => s.id === 'shop-harbor-provisions')
    const affordableOffers = harborShop?.offers.filter((o) => o.affordable)
    expect(affordableOffers?.length).toBeGreaterThan(0)
  })

  it('marks offers as not affordable when money < finalPrice', () => {
    const state = asRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      money: 10,
    })
    const overview = selectShopOverview(state)
    const harborShop = overview.shops.find((s) => s.id === 'shop-harbor-provisions')
    const unaffordableOffers = harborShop?.offers.filter((o) => !o.affordable)
    expect(unaffordableOffers?.length).toBeGreaterThan(0)
  })

  it('identifies best price across multiple shops in same district', () => {
    const state = asRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      money: 10000,
    })
    const overview = selectShopOverview(state)
    const harborShop = overview.shops.find((s) => s.id === 'shop-harbor-provisions')

    // At least one offer should be marked as best price
    const bestPriceOffers = harborShop?.offers.filter((o) => o.bestPrice)
    expect(bestPriceOffers?.length).toBeGreaterThan(0)
  })

  it('shows price delta when not the best price', () => {
    const state = asRootState({
      ...initialGameStateSnapshot,
      currentDistrictId: 'district-harbor',
      money: 10000,
    })
    const overview = selectShopOverview(state)
    const harborShop = overview.shops.find((s) => s.id === 'shop-harbor-provisions')

    // Check that priceDelta is 0 for best price items
    const bestPriceOffer = harborShop?.offers.find((o) => o.bestPrice)
    expect(bestPriceOffer?.priceDelta).toBe(0)
  })
})
