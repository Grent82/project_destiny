import { createSelector } from '@reduxjs/toolkit'

import { contentCatalog } from '../content/contentCatalog'
import type { RootState } from '../store/gameStore'

const selectMoney = (state: RootState) => state.game.money
const selectInventory = (state: RootState) => state.game.inventory
const selectDistrictStates = (state: RootState) => state.game.districts

export const selectShopOverview = createSelector(
  [selectMoney, selectInventory, selectDistrictStates],
  (money, inventory, districtStates) => {
    const quantities = new Map(inventory.map((entry) => [entry.itemId, entry.quantity]))
    const lowestPriceByItem = new Map<string, number>()
    const districtStateById = new Map(districtStates.map((d) => [d.districtId, d]))

    for (const shop of contentCatalog.shops) {
      for (const offer of shop.offers) {
        const currentLowest = lowestPriceByItem.get(offer.itemId)

        if (currentLowest === undefined || offer.price < currentLowest) {
          lowestPriceByItem.set(offer.itemId, offer.price)
        }
      }
    }

    return {
      money,
      shops: contentCatalog.shops.map((shop) => {
        const district = contentCatalog.districtsById.get(shop.districtId)
        const districtState = districtStateById.get(shop.districtId)
        const controllingFaction = districtState
          ? contentCatalog.factionsById.get(districtState.controllingFactionId)
          : null

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
          offers: shop.offers
            .slice()
            .sort((left, right) => left.order - right.order)
            .map((offer) => {
              const item = contentCatalog.itemsById.get(offer.itemId)

              return {
                itemId: offer.itemId,
                itemName: item?.name ?? offer.itemId,
                category: item?.category ?? 'unknown',
                price: offer.price,
                ownedQuantity: quantities.get(offer.itemId) ?? 0,
                affordable: money >= offer.price,
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
