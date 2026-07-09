import type { GameState } from '../../domain/game/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { formatMarks } from '../../domain/game/currency'
import { findPlayerItem, removePlayerItem } from './inventory/inventoryHelpers'
import { transferItem } from './inventory/transferItem'
import type { TransferItemParams } from '../../domain/inventory/contracts'

/**
 * Computes the sell price for an owned item at the current district.
 * Base price comes from the item's tradeValue effect (or 50% of item value as fallback).
 * District marketPressure scales the price: 0 → ×0.7, 50 → ×1.0, 100 → ×1.3.
 */
export function computeSellPrice(state: GameState, instanceId: string): number {
  const item = findPlayerItem(state, instanceId)
  if (!item) return 0

  const def = contentCatalog.itemsById.get(item.instance.itemId)
  if (!def) return 0

  const tradeEffect = def.effects?.find((e) => e['type'] === 'tradeValue')
  const baseValue = tradeEffect ? Number(tradeEffect['value']) : Math.floor(def.value * 0.5)

  const districtState = state.districts.find((d) => d.districtId === state.currentDistrictId)
  const marketPressure = districtState?.marketPressure ?? 50
  const multiplier = 0.7 + (marketPressure / 100) * 0.6

  return Math.max(1, Math.floor(baseValue * multiplier))
}

/**
 * Find the shop in the current district that buys this item type.
 * Returns the shopId or null if no shop buys this item.
 */
function findShopForItem(state: GameState, itemId: string): string | null {
  const currentDistrictId = state.currentDistrictId
  if (!currentDistrictId) return null

  // Find shops in the current district
  const districtShops = contentCatalog.shops.filter((s) => s.districtId === currentDistrictId)

  for (const shop of districtShops) {
    // Check if this shop offers this item type
    const offersItem = shop.offers.some((offer) => offer.itemId === itemId)
    if (offersItem) {
      return shop.id
    }
  }

  return null
}

export function sellItem(state: GameState, instanceId: string): GameState {
  const item = findPlayerItem(state, instanceId)
  if (!item) return state

  const def = contentCatalog.itemsById.get(item.instance.itemId)
  if (!def) return state

  const sellPrice = computeSellPrice(state, instanceId)

  // Find a shop in the current district to sell to
  const shopId = findShopForItem(state, def.id)
  if (!shopId) {
    // No shop in current district buys this item - just remove it and give money
    // This is a fallback for edge cases
    const newState = findPlayerItem(state, instanceId)
      ? removePlayerItem(state, instanceId)
      : state

    return {
      ...newState,
      money: newState.money + sellPrice,
      activityLog: [
        {
          id: `log-${state.day}-${state.timeSlot}-sell-${instanceId}`,
          day: state.day,
          timeSlot: state.timeSlot,
          category: 'economy' as const,
          message: `Sold ${def.name} for ${formatMarks(sellPrice)}.`,
        },
        ...newState.activityLog,
      ].slice(0, 50),
    }
  }

  // Transfer item to shop stock using canonical transfer. fromType/fromId must reflect
  // wherever findPlayerItem actually located the item -- hardcoding player_inventory here
  // silently failed (transferItem returns state unchanged) for items sitting in House
  // Storage/Mission Pack (destiny-sqyd).
  const shopStockContainerId = `shop:${shopId}:stock`
  const transferParams: TransferItemParams =
    item.location === 'player'
      ? {
          fromType: 'player_inventory',
          fromId: 'player',
          toType: 'shop_stock',
          toId: shopStockContainerId,
          itemInstanceId: instanceId,
          quantity: 1,
        }
      : {
          fromType: 'container',
          fromId: item.container.containerId,
          toType: 'shop_stock',
          toId: shopStockContainerId,
          itemInstanceId: instanceId,
          quantity: 1,
        }

  let nextState = transferItem(state, transferParams)
  if (nextState === state) {
    // Transfer failed - item not found or other error
    return state
  }

  // Add money to player
  nextState = { ...nextState, money: nextState.money + sellPrice }

  return {
    ...nextState,
    activityLog: [
      {
        id: `log-${state.day}-${state.timeSlot}-sell-${instanceId}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'economy' as const,
        message: `Sold ${def.name} for ${formatMarks(sellPrice)}.`,
      },
      ...nextState.activityLog,
    ].slice(0, 50),
  }
}
