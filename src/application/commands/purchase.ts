import type { GameState } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { addInventoryEntry } from './inventory'

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

  if (state.money < offer.price) {
    return state
  }

  return appendActivityLogEntry({
    ...state,
    money: state.money - offer.price,
    inventory: addInventoryEntry(state.inventory, itemId),
  }, 'economy', `Purchased ${offer.itemId} from ${shop.name} for ${offer.price} credits.`)
}
