import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { selectShopsInCurrentDistrict, selectShopOverview, computeFactionPriceMod } from './shops'
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
