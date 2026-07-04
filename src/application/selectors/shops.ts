import { createSelector } from '@reduxjs/toolkit'

import {
  buildShopPricingBreakdown,
  computeCorridorPriceMod,
  computeDistrictTensionPriceMod,
  computeFactionPriceMod,
  computeMarketPressureMod,
  describeFactionPriceModifier,
  describeMarketPressureModifier,
} from '../content/shopPricing'
import { contentCatalog } from '../content/contentCatalog'
import type { RootState } from '../store/gameStore'
import type { GameState } from '../../domain'
export {
  computeFactionPriceMod,
  computeMarketPressureMod,
  computeCorridorPriceMod,
  computeDistrictTensionPriceMod,
  describeFactionPriceModifier,
  describeMarketPressureModifier,
}

const selectMoney = (state: RootState) => state.game.money
const selectInventoryState = (state: RootState) => state.game.inventoryState
const selectDistrictStates = (state: RootState) => state.game.districts
const selectCurrentDistrictId = (state: RootState) => state.game.currentDistrictId
const selectFactionStandings = (state: RootState) => state.game.factionStandings
const selectCorridorStatus = (state: RootState) => state.game.cityResources.corridorStatus
const selectInstitutionalStanding = (state: RootState) => state.game.institutionalStanding
const selectDistrictTension = (state: RootState) => state.game.districtTension

/**
 * Build a map of itemId -> total stock quantity for a specific shop.
 */
function buildShopItemIdStockMap(inventoryState: GameState['inventoryState'], shopId: string): Map<string, number> {
  const quantities = new Map<string, number>()
  const shopStockContainerId = `shop:${shopId}:stock`

  for (const container of inventoryState.sharedContainers) {
    if (container.containerId === shopStockContainerId || container.ownerId === shopStockContainerId || container.ownerId === shopId) {
      for (const slot of container.slots) {
        if (slot.itemInstanceId) {
          const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
          if (instanceDef) {
            quantities.set(instanceDef.itemId, (quantities.get(instanceDef.itemId) ?? 0) + slot.quantity)
          }
        }
      }
    }
  }
  return quantities
}

export const selectShopsInCurrentDistrict = (state: RootState) => {
  const districtId = state.game.currentDistrictId
  if (!districtId) return []
  return contentCatalog.shops.filter((s) => s.districtId === districtId)
}

/** Helper to build a quantity map from player inventory slots */
function buildPlayerInventoryQuantityMap(inventoryState: GameState['inventoryState']): Map<string, number> {
  const quantities = new Map<string, number>()
  for (const container of inventoryState.player.bagContainers) {
    for (const slot of container.slots) {
      if (slot.itemInstanceId) {
        const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
        if (instanceDef) {
          quantities.set(instanceDef.itemId, (quantities.get(instanceDef.itemId) ?? 0) + slot.quantity)
        }
      }
    }
  }
  return quantities
}

export const selectShopOverview = createSelector(
  [selectMoney, selectInventoryState, selectDistrictStates, selectCurrentDistrictId, selectFactionStandings, selectCorridorStatus, selectInstitutionalStanding, selectDistrictTension],
  (money, inventoryState, districtStates, currentDistrictId, factionStandings, corridorStatus, institutionalStanding, districtTension) => {
    const quantities = buildPlayerInventoryQuantityMap(inventoryState)
    const shopStockMap = new Map<string, Map<string, number>>() // shopId -> itemId -> stock quantity
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
      // Build stock map for this shop
      const stockMap = buildShopItemIdStockMap(inventoryState, shop.id)
      shopStockMap.set(shop.id, stockMap)

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

                  const shopStock = shopStockMap.get(shop.id)
                  const stockQuantity = shopStock?.get(offer.itemId) ?? 0

                  return {
                    itemId: offer.itemId,
                    itemName: item?.name ?? offer.itemId,
                    category: item?.category ?? 'unknown',
                    price: pricingBreakdown.finalPrice,
                    pricingBreakdown,
                    ownedQuantity: quantities.get(offer.itemId) ?? 0,
                    stockQuantity,
                    inStock: stockQuantity > 0,
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
