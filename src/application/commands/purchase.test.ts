import { describe, expect, it } from 'vitest'
import type { ContainerType } from '../../domain/inventory/contracts'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { resolveShopPricingBreakdown } from '../content/shopPricing'
import { purchaseItemFromShop } from './purchase'

// Use a rich starting state so purchase tests are independent of starting balance
const richState = { ...initialGameStateSnapshot, money: 500 }

function createInventoryWithExistingItem(instanceId: string, itemId: string, quantity: number) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [{
        containerId: 'container-player-bag',
        containerType: 'backpack' as ContainerType,
        ownerId: 'player',
        maxSlots: 20,
        slots: [{
          slotId: `slot-${instanceId}`,
          itemInstanceId: instanceId,
          quantity,
        }],
        locked: false,
      }],
      usedBagSlots: 1,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: [],
    itemRegistry: { [instanceId]: { itemId, uniqueId: instanceId, quantity, locationType: 'player_inventory' as const, acquiredDay: 1, flags: [] } },
  }
}

describe('purchaseItemFromShop', () => {
  it('deducts the effective shop price, adds inventory, and logs a readable purchase message', () => {
    const expectedPrice = resolveShopPricingBreakdown(
      { ...richState, currentDistrictId: 'district-ironworks' },
      'shop-ironworks-supply',
      'item-spare-parts',
    )?.finalPrice ?? 70

    // Start with 3 spare parts in inventory
    const stateWithItems = {
      ...richState,
      currentDistrictId: 'district-ironworks',
      inventoryState: createInventoryWithExistingItem('inst-spare-parts-1', 'item-spare-parts', 3),
    }

    const nextState = purchaseItemFromShop(stateWithItems, 'shop-ironworks-supply', 'item-spare-parts')

    expect(nextState.money).toBe(500 - expectedPrice)

    // Check that the item was added to inventory (new instance created)
    const playerSlots = nextState.inventoryState.player.bagContainers.flatMap(c => c.slots)
    const sparePartsSlots = playerSlots.filter(s => {
      const def = nextState.inventoryState.itemRegistry[s.itemInstanceId!]
      return def?.itemId === 'item-spare-parts'
    })
    const totalQuantity = sparePartsSlots.reduce((sum, s) => sum + s.quantity, 0)
    expect(totalQuantity).toBe(4) // 3 existing + 1 purchased

    expect(nextState.activityLog[0]?.message).toBe(
      `Purchased Spare Parts Crate from Foundry Supply Cage for ${expectedPrice} Marks.`,
    )
  })

  it('uses the same effective price modifiers as the shop overview', () => {
    const pressuredState = {
      ...initialGameStateSnapshot,
      money: 200,
      currentDistrictId: 'district-harbor' as const,
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'blocked' as const },
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-civic-compact': 75,
      },
      districtTension: {
        ...initialGameStateSnapshot.districtTension,
        'district-harbor': 50,
      },
      districts: initialGameStateSnapshot.districts.map((district) =>
        district.districtId === 'district-harbor'
          ? { ...district, marketPressure: 80 }
          : district,
      ),
    }

    const nextState = purchaseItemFromShop(
      pressuredState,
      'shop-harbor-provisions',
      'item-medkit-field',
    )

    const expectedPrice = resolveShopPricingBreakdown(
      pressuredState,
      'shop-harbor-provisions',
      'item-medkit-field',
    )?.finalPrice ?? 0

    expect(nextState.money).toBe(200 - expectedPrice)
    expect(nextState.activityLog[0]?.message).toBe(
      `Purchased Field Medkit from Harbor Provisions for ${expectedPrice} Marks.`,
    )
  })

  it('does not change state when the player lacks funds', () => {
    const poorState = {
      ...initialGameStateSnapshot,
      money: 40,
    }

    const nextState = purchaseItemFromShop(
      poorState,
      'shop-harbor-provisions',
      'item-medkit-field',
    )

    expect(nextState).toEqual(poorState)
  })

  it('does not change state when the requested item is not offered', () => {
    const nextState = purchaseItemFromShop(
      richState,
      'shop-heights-ledger-house',
      'item-spare-parts',
    )

    expect(nextState).toEqual(richState)
  })

  it('does not change state when the shopId does not exist', () => {
    const nextState = purchaseItemFromShop(
      richState,
      'shop-does-not-exist',
      'item-spare-parts',
    )

    expect(nextState).toEqual(richState)
  })
})
