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

    const corridorMod =
      corridorStatus === 'blocked' ? 1.3
      : corridorStatus === 'disrupted' ? 1.15
      : 1.0

    // District tension increases local prices (up to +20% at max tension)
    const currentTension = currentDistrictId ? (districtTension[currentDistrictId] ?? 0) : 0
    const tensionMod = 1 + (currentTension / 100) * 0.2

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
        const priceModifier = basePriceMod * factionMod

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
                  const modifiedPrice = Math.ceil(offer.price * priceModifier)

                  return {
                    itemId: offer.itemId,
                    itemName: item?.name ?? offer.itemId,
                    category: item?.category ?? 'unknown',
                    price: modifiedPrice,
                    ownedQuantity: quantities.get(offer.itemId) ?? 0,
                    affordable: money >= modifiedPrice,
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
