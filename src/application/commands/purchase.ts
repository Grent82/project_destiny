import type { GameState } from '../../domain'
import { formatMarks } from '../../domain/game/currency'
import { resolveShopPricingBreakdown } from '../content/shopPricing'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { addOwnedItem } from './inventory'

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

  const itemName = contentCatalog.itemsById.get(itemId)?.name ?? itemId
  const afterPurchase = addOwnedItem(
    { ...state, money: state.money - purchasePrice },
    itemId,
  )
  return appendActivityLogEntry(
    afterPurchase,
    'economy',
    `Purchased ${itemName} from ${shop.name} for ${formatMarks(purchasePrice)}.`,
  )
}
