import { createSelector } from '@reduxjs/toolkit'

import { contentCatalog } from '../content/contentCatalog'
import type { RootState } from '../store/gameStore'

const selectMoney = (state: RootState) => state.game.money
const selectInventory = (state: RootState) => state.game.inventory
const selectDistrictStates = (state: RootState) => state.game.districts
const selectCurrentDistrictId = (state: RootState) => state.game.currentDistrictId
const selectFactionStandings = (state: RootState) => state.game.factionStandings
const selectCorridorStatus = (state: RootState) => state.game.cityResources.corridorStatus

export const selectShopsInCurrentDistrict = (state: RootState) => {
  const districtId = state.game.currentDistrictId
  if (!districtId) return []
  return contentCatalog.shops.filter((s) => s.districtId === districtId)
}

export const selectShopOverview = createSelector(
  [selectMoney, selectInventory, selectDistrictStates, selectCurrentDistrictId, selectFactionStandings, selectCorridorStatus],
  (money, inventory, districtStates, currentDistrictId, factionStandings, corridorStatus) => {
    const quantities = new Map(inventory.map((entry) => [entry.itemId, entry.quantity]))
    const lowestPriceByItem = new Map<string, number>()
    const districtStateById = new Map(districtStates.map((d) => [d.districtId, d]))

    const priceModifier =
      corridorStatus === 'blocked' ? 1.3
      : corridorStatus === 'disrupted' ? 1.15
      : 1.0

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
      priceModifier,
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

        return {
          id: shop.id,
          name: shop.name,
          districtId: shop.districtId,
          districtName: district?.name ?? shop.districtId,
          shopType: shop.shopType,
          summary: shop.summary,
          controllingFactionName: controllingFaction?.name ?? null,
          danger: districtState?.danger ?? null,
          marketPressure: districtState?.marketPressure ?? null,
          accessDenied,
          offers: accessDenied
            ? []
            : shop.offers
                .slice()
                .sort((left, right) => left.order - right.order)
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
