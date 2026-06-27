import type { GameState } from '../../domain'
import { formatMarks } from '../../domain/game/currency'
import { resolveShopPricingBreakdown } from '../content/shopPricing'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { addPlayerItem } from './inventory/inventoryHelpers'

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
  // Generate a unique instance ID for the purchased item
  const instanceId = `inst-${itemId}-${Date.now()}`
  const baseState = { ...state, money: state.money - purchasePrice }
  const afterPurchase = addPlayerItem(baseState, instanceId, 1)
  // Add the item to the registry so it can be looked up by the UI
  const afterRegistry = {
    ...afterPurchase,
    inventoryState: {
      ...afterPurchase.inventoryState,
      itemRegistry: {
        ...afterPurchase.inventoryState.itemRegistry,
        [instanceId]: {
          itemId,
          uniqueId: instanceId,
          quantity: 1,
          locationType: 'player_inventory' as const,
          acquiredDay: afterPurchase.day,
          flags: [],
        },
      },
    },
  }
  return appendActivityLogEntry(
    afterRegistry,
    'economy',
    `Purchased ${itemName} from ${shop.name} for ${formatMarks(purchasePrice)}.`,
  )
}
