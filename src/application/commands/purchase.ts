import type { GameState } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'

function addInventoryEntry(state: GameState, itemId: string): GameState['inventory'] {
  const existingEntry = state.inventory.find((entry) => entry.itemId === itemId)

  if (!existingEntry) {
    return [...state.inventory, { itemId, quantity: 1 }]
  }

  return state.inventory.map((entry) =>
    entry.itemId === itemId
      ? { ...entry, quantity: entry.quantity + 1 }
      : entry,
  )
}

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
    inventory: addInventoryEntry(state, itemId),
  }, 'economy', `Purchased ${offer.itemId} from ${shop.name} for ${offer.price} credits.`)
}
