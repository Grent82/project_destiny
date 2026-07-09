import type { GameState } from '../../domain'
import { formatMarks } from '../../domain/game/currency'
import { resolveShopPricingBreakdown } from '../content/shopPricing'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { transferItem } from './inventory/transferItem'
import { HOUSEHOLD_STORAGE_CONTAINER_ID } from './inventory/householdStorage'
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
  const itemDef = contentCatalog.itemsById.get(itemId)
  const itemName = itemDef?.name ?? itemId

  // Deduct money
  let nextState: GameState = { ...state, money: state.money - purchasePrice }

  // Weapons and armor bought from an ordinary shop's `offers` catalog (as opposed to the district
  // arms-dealer catalog, which uses purchaseWeaponToHouseStorage/purchaseArmorToHouseStorage) must
  // land in the same shared House Storage container that equipItem.ts's
  // getAccessibleContainersForNpc actually searches. Routing them to player_inventory like every
  // other shop good silently stranded them forever: no NPC equip path ever looks at
  // state.inventoryState.player.bagContainers, so the player could buy armor and never be able to
  // equip it on anyone, with zero error feedback (user report, 2026-07-09; destiny-yx750).
  const isGearItem = itemDef?.category === 'weapon' || itemDef?.category === 'armor'

  if (isGearItem) {
    const hasStorageContainer = nextState.inventoryState.sharedContainers.some(
      (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID,
    )
    if (!hasStorageContainer) {
      nextState = {
        ...nextState,
        inventoryState: {
          ...nextState.inventoryState,
          sharedContainers: [
            ...nextState.inventoryState.sharedContainers,
            {
              containerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
              containerType: 'chest',
              ownerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
              name: 'House Storage',
              maxSlots: 50,
              slots: [],
              locked: false,
            },
          ],
        },
      }
    }
  }

  // Transfer item from shop stock to its destination using canonical transfer
  const transferParams: TransferItemParams = {
    fromType: 'shop_stock',
    fromId: shopStockContainerId,
    toType: isGearItem ? 'container' : 'player_inventory',
    toId: isGearItem ? HOUSEHOLD_STORAGE_CONTAINER_ID : 'player',
    itemInstanceId,
    quantity: 1,
  }

  nextState = transferItem(nextState, transferParams)

  return appendActivityLogEntry(
    nextState,
    'economy',
    isGearItem
      ? `Purchased ${itemName} from ${shop.name} for ${formatMarks(purchasePrice)}. Added to House Storage.`
      : `Purchased ${itemName} from ${shop.name} for ${formatMarks(purchasePrice)}.`,
  )
}
