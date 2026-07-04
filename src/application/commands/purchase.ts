import type { GameState } from '../../domain'
import { formatMarks } from '../../domain/game/currency'
import { resolveShopPricingBreakdown } from '../content/shopPricing'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { transferItem } from './inventory/transferItem'
import type { TransferItemParams } from '../../domain/inventory/contracts'

export function purchaseItemFromShop(
  state: GameState,
  shopId: string,
  itemId: string,
): GameState {
  const shop = contentCatalog.shopsById.get(shopId)

  if (!shop) {
    return state
  }

  const offer = shop.offers.find((entry) => entry.itemId === itemId)

  if (!offer) {
    return state
  }

  const pricingBreakdown = resolveShopPricingBreakdown(state, shopId, itemId)
  const purchasePrice = pricingBreakdown?.finalPrice ?? offer.price

  if (state.money < purchasePrice) {
    return state
  }

  // Find an item instance in the shop's stock
  const shopStockContainerId = `shop:${shopId}:stock`
  const shopStock = state.inventoryState.sharedContainers.find(
    (c) => c.containerId === shopStockContainerId || c.ownerId === shopStockContainerId || c.ownerId === shopId
  )

  if (!shopStock) {
    return state
  }

  // Find an available item instance in shop stock
  const availableSlot = shopStock.slots.find((slot) => {
    if (!slot.itemInstanceId) return false
    const instanceDef = state.inventoryState.itemRegistry[slot.itemInstanceId]
    return instanceDef?.itemId === itemId && slot.quantity > 0
  })

  if (!availableSlot || !availableSlot.itemInstanceId) {
    // Shop is out of stock - no item instance available
    const itemName = contentCatalog.itemsById.get(itemId)?.name ?? itemId
    return appendActivityLogEntry(
      state,
      'economy',
      `${shop.name} is out of stock for ${itemName}.`,
    )
  }

  const itemInstanceId = availableSlot.itemInstanceId
  const itemName = contentCatalog.itemsById.get(itemId)?.name ?? itemId

  // Deduct money
  let nextState: GameState = { ...state, money: state.money - purchasePrice }

  // Transfer item from shop stock to player inventory using canonical transfer
  const transferParams: TransferItemParams = {
    fromType: 'shop_stock',
    fromId: shopStockContainerId,
    toType: 'player_inventory',
    toId: 'player',
    itemInstanceId,
    quantity: 1,
  }

  nextState = transferItem(nextState, transferParams)

  return appendActivityLogEntry(
    nextState,
    'economy',
    `Purchased ${itemName} from ${shop.name} for ${formatMarks(purchasePrice)}.`,
  )
}
