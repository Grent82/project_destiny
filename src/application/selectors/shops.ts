import { createSelector } from '@reduxjs/toolkit'

import { contentCatalog } from '../content/contentCatalog'
import type { RootState } from '../store/gameStore'

/** Returns a price multiplier based on the player's standing with the faction controlling a shop. */
export function computeFactionPriceMod(standing: number): number {
  if (standing >= 75) return 0.85
  if (standing >= 50) return 0.90
  if (standing <= -30) return 1.10
  return 1.0
}

/** Returns a price multiplier based on the district's current market pressure (0–100). */
export function computeMarketPressureMod(pressure: number): number {
  if (pressure >= 70) return 1.15
  if (pressure >= 50) return 1.05
  if (pressure <= 30) return 0.92
  return 1.0
}

export function computeCorridorPriceMod(corridorStatus: RootState['game']['cityResources']['corridorStatus']): number {
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

function buildShopPricingBreakdown(
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

const selectMoney = (state: RootState) => state.game.money
const selectOwnedItems = (state: RootState) => state.game.ownedItems
const selectDistrictStates = (state: RootState) => state.game.districts
const selectCurrentDistrictId = (state: RootState) => state.game.currentDistrictId
const selectFactionStandings = (state: RootState) => state.game.factionStandings
const selectCorridorStatus = (state: RootState) => state.game.cityResources.corridorStatus
const selectInstitutionalStanding = (state: RootState) => state.game.institutionalStanding
const selectDistrictTension = (state: RootState) => state.game.districtTension

export const selectShopsInCurrentDistrict = (state: RootState) => {
  const districtId = state.game.currentDistrictId
  if (!districtId) return []
  return contentCatalog.shops.filter((s) => s.districtId === districtId)
}

export const selectShopOverview = createSelector(
  [selectMoney, selectOwnedItems, selectDistrictStates, selectCurrentDistrictId, selectFactionStandings, selectCorridorStatus, selectInstitutionalStanding, selectDistrictTension],
  (money, ownedItems, districtStates, currentDistrictId, factionStandings, corridorStatus, institutionalStanding, districtTension) => {
    const quantities = new Map(
      ownedItems.filter((o) => o.location === 'inventory').map((o) => [o.itemId, o.quantity])
    )
    const lowestPriceByItem = new Map<string, number>()
    const districtStateById = new Map(districtStates.map((d) => [d.districtId, d]))

    const corridorMod = computeCorridorPriceMod(corridorStatus)

    // District tension increases local prices (up to +20% at max tension)
    const currentTension = currentDistrictId ? (districtTension[currentDistrictId] ?? 0) : 0
    const tensionMod = computeDistrictTensionPriceMod(currentTension)

    const basePriceMod = corridorMod * tensionMod

    const shopsToShow = currentDistrictId
      ? contentCatalog.shops.filter((s) => s.districtId === currentDistrictId)
      : []

    for (const shop of shopsToShow) {
      for (const offer of shop.offers) {
        const currentLowest = lowestPriceByItem.get(offer.itemId)

        if (currentLowest === undefined || offer.price < currentLowest) {
          lowestPriceByItem.set(offer.itemId, offer.price)
        }
      }
    }

    return {
      money,
      currentDistrictId,
      corridorStatus,
      basePriceMod,
      shops: shopsToShow.map((shop) => {
        const district = contentCatalog.districtsById.get(shop.districtId)
        const districtState = districtStateById.get(shop.districtId)
        const controllingFaction = districtState
          ? contentCatalog.factionsById.get(districtState.controllingFactionId)
          : null

        const accessDenied =
          shop.requiredFactionId != null
            ? (factionStandings[shop.requiredFactionId] ?? 0) < (shop.minFactionStanding ?? 0)
            : false

        const districtControlFactionId = district?.controllingFactionId ?? districtState?.controllingFactionId ?? null
        const isBlocked = districtControlFactionId
          ? (factionStandings[districtControlFactionId] ?? 0) <= -50
          : false

        // Block shops run by factions that have blacklisted or turned hostile to the house
        const shopFactionId = shop.requiredFactionId ?? district?.controllingFactionId ?? null
        const institutionalBlock = shopFactionId
          ? (institutionalStanding[shopFactionId] === 'blacklisted' || institutionalStanding[shopFactionId] === 'hostile')
          : false

        // Faction standing discount/surcharge on this shop's prices
        const controlStanding = districtControlFactionId
          ? (factionStandings[districtControlFactionId] ?? 0)
          : 0
        const factionMod = computeFactionPriceMod(controlStanding)
        const marketPressureValue = districtState?.marketPressure ?? 50
        const marketPressureMod = computeMarketPressureMod(marketPressureValue)

        return {
          id: shop.id,
          name: shop.name,
          districtId: shop.districtId,
          districtName: district?.name ?? shop.districtId,
          shopType: shop.shopType,
          summary: shop.summary,
          controllingFactionName: controllingFaction?.name ?? null,
          controllingFactionId: districtControlFactionId,
          factionPriceModifier: factionMod,
          marketPressureMod,
          danger: districtState?.danger ?? null,
          marketPressure: districtState?.marketPressure ?? null,
          accessDenied: accessDenied || institutionalBlock,
          isBlocked,
          institutionalBlock,
          offers: (accessDenied || isBlocked || institutionalBlock)
            ? []
            : shop.offers
                .slice()
                .sort((left, right) => left.order - right.order)
                .filter((offer) => {
                  if (offer.minStanding === undefined) return true
                  return controlStanding >= offer.minStanding
                })
                .map((offer) => {
                  const item = contentCatalog.itemsById.get(offer.itemId)
                  const pricingBreakdown = buildShopPricingBreakdown(
                    offer.price,
                    corridorMod,
                    tensionMod,
                    factionMod,
                    marketPressureMod,
                  )

                  return {
                    itemId: offer.itemId,
                    itemName: item?.name ?? offer.itemId,
                    category: item?.category ?? 'unknown',
                    price: pricingBreakdown.finalPrice,
                    pricingBreakdown,
                    ownedQuantity: quantities.get(offer.itemId) ?? 0,
                    affordable: money >= pricingBreakdown.finalPrice,
                    bestPrice: lowestPriceByItem.get(offer.itemId) === offer.price,
                    priceDelta:
                      offer.price - (lowestPriceByItem.get(offer.itemId) ?? offer.price),
                  }
                }),
        }
      }),
    }
  },
)

export const selectShopPricingBreakdown = createSelector(
  [
    selectDistrictStates,
    selectCurrentDistrictId,
    selectFactionStandings,
    selectCorridorStatus,
    selectDistrictTension,
    (_state: RootState, shopId: string) => shopId,
    (_state: RootState, _shopId: string, itemId: string) => itemId,
  ],
  (districtStates, currentDistrictId, factionStandings, corridorStatus, districtTension, shopId, itemId) => {
    const shop = contentCatalog.shopsById.get(shopId)
    if (!shop || shop.districtId !== currentDistrictId) return null

    const offer = shop.offers.find((entry) => entry.itemId === itemId)
    if (!offer) return null

    const districtState = districtStates.find((district) => district.districtId === shop.districtId)
    const districtControlFactionId = districtState?.controllingFactionId
      ?? contentCatalog.districtsById.get(shop.districtId)?.controllingFactionId
      ?? null
    const controlStanding = districtControlFactionId
      ? (factionStandings[districtControlFactionId] ?? 0)
      : 0

    return buildShopPricingBreakdown(
      offer.price,
      computeCorridorPriceMod(corridorStatus),
      computeDistrictTensionPriceMod(districtTension[shop.districtId] ?? 0),
      computeFactionPriceMod(controlStanding),
      computeMarketPressureMod(districtState?.marketPressure ?? 50),
    )
  },
)
