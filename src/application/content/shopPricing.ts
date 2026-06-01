import type { GameState } from '../../domain'
import { contentCatalog } from './contentCatalog'

export function computeFactionPriceMod(standing: number): number {
  if (standing >= 75) return 0.85
  if (standing >= 50) return 0.90
  if (standing <= -30) return 1.10
  return 1.0
}

export function computeMarketPressureMod(pressure: number): number {
  if (pressure >= 70) return 1.15
  if (pressure >= 50) return 1.05
  if (pressure <= 30) return 0.92
  return 1.0
}

export function computeCorridorPriceMod(corridorStatus: GameState['cityResources']['corridorStatus']): number {
  return corridorStatus === 'blocked'
    ? 1.3
    : corridorStatus === 'disrupted'
      ? 1.15
      : 1.0
}

export function computeDistrictTensionPriceMod(tension: number): number {
  return 1 + (tension / 100) * 0.2
}

export type ShopPricingBreakdown = {
  basePrice: number
  corridorMod: number
  tensionMod: number
  factionMod: number
  marketMod: number
  finalPrice: number
}

export function describeMarketPressureModifier(modifier: number): string | null {
  if (modifier === 1.0) return null
  return modifier < 1.0
    ? `${Math.round((1 - modifier) * 100)}% low-demand discount`
    : `+${Math.round((modifier - 1) * 100)}% high-demand surcharge`
}

export function describeFactionPriceModifier(modifier: number): string | null {
  if (modifier === 1.0) return null
  return modifier < 1.0
    ? `${Math.round((1 - modifier) * 100)}% faction discount`
    : `+${Math.round((modifier - 1) * 100)}% faction surcharge`
}

export function buildShopPricingBreakdown(
  basePrice: number,
  corridorMod: number,
  tensionMod: number,
  factionMod: number,
  marketMod: number,
): ShopPricingBreakdown {
  return {
    basePrice,
    corridorMod,
    tensionMod,
    factionMod,
    marketMod,
    finalPrice: Math.ceil(basePrice * corridorMod * tensionMod * factionMod * marketMod),
  }
}

export function resolveShopPricingBreakdown(
  state: GameState,
  shopId: string,
  itemId: string,
): ShopPricingBreakdown | null {
  const shop = contentCatalog.shopsById.get(shopId)
  if (!shop) return null

  const offer = shop.offers.find((entry) => entry.itemId === itemId)
  if (!offer) return null

  const districtState = state.districts.find((district) => district.districtId === shop.districtId)
  const districtControlFactionId = districtState?.controllingFactionId
    ?? contentCatalog.districtsById.get(shop.districtId)?.controllingFactionId
    ?? null
  const controlStanding = districtControlFactionId
    ? (state.factionStandings[districtControlFactionId] ?? 0)
    : 0

  return buildShopPricingBreakdown(
    offer.price,
    computeCorridorPriceMod(state.cityResources.corridorStatus),
    computeDistrictTensionPriceMod(state.districtTension[shop.districtId] ?? 0),
    computeFactionPriceMod(controlStanding),
    computeMarketPressureMod(districtState?.marketPressure ?? 50),
  )
}
