import { describe, expect, it } from 'vitest'
import type { ContainerType } from '../../domain/inventory/contracts'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { resolveShopPricingBreakdown } from '../content/shopPricing'
import { purchaseItemFromShop } from './purchase'
import { equipItem } from './inventory/equipItem'
import { HOUSEHOLD_STORAGE_CONTAINER_ID } from './inventory/householdStorage'

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
    // Keep the sharedContainers from initial state (includes shop stock)
    sharedContainers: initialGameStateSnapshot.inventoryState.sharedContainers,
    itemRegistry: {
      ...initialGameStateSnapshot.inventoryState.itemRegistry,
      [instanceId]: { itemId, uniqueId: instanceId, quantity, locationType: 'player_inventory' as const, acquiredDay: 1, flags: [] }
    },
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

  it('routes weapon/armor purchases from an ordinary shop into House Storage, not player inventory (destiny-yx750)', () => {
    const stateWithDistrict = { ...richState, currentDistrictId: 'district-the-pale' as const }

    const nextState = purchaseItemFromShop(stateWithDistrict, 'shop-pale-provisions', 'armor-light-tallow-work-coat')

    // Not stranded in the player's personal bag -- this was the reported bug: an equipped-looking
    // item that no NPC equip path could ever find.
    const playerSlots = nextState.inventoryState.player.bagContainers.flatMap((c) => c.slots)
    expect(playerSlots.some((s) => {
      const def = nextState.inventoryState.itemRegistry[s.itemInstanceId!]
      return def?.itemId === 'armor-light-tallow-work-coat'
    })).toBe(false)

    const storageContainer = nextState.inventoryState.sharedContainers.find(
      (c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID,
    )
    expect(storageContainer).toBeDefined()
    const storedInstanceId = storageContainer!.slots.find((s) => {
      const def = nextState.inventoryState.itemRegistry[s.itemInstanceId!]
      return def?.itemId === 'armor-light-tallow-work-coat'
    })?.itemInstanceId
    expect(storedInstanceId).toBeTruthy()

    expect(nextState.activityLog[0]?.message).toMatch(/Added to House Storage\.$/)

    // The whole point: the purchased armor must now actually be equippable on a roster NPC.
    const equippedState = equipItem(nextState, {
      ownerId: 'npc-marion-vale',
      itemInstanceId: storedInstanceId!,
      slot: 'armor',
    })
    const marion = equippedState.npcRuntimeStates.find((n) => n.npcId === 'npc-marion-vale')
    expect(marion?.equipment.armor).toBe(storedInstanceId)
    expect(marion?.loadout.armorId).toBe('armor-light-tallow-work-coat')
  })

  it('leaves non-gear purchases routed to player inventory unchanged (regression guard)', () => {
    const nextState = purchaseItemFromShop(richState, 'shop-pale-provisions', 'item-ration-compact-brick')

    expect(nextState.activityLog[0]?.message).not.toMatch(/House Storage/)
    const playerSlots = nextState.inventoryState.player.bagContainers.flatMap((c) => c.slots)
    expect(playerSlots.some((s) => {
      const def = nextState.inventoryState.itemRegistry[s.itemInstanceId!]
      return def?.itemId === 'item-ration-compact-brick'
    })).toBe(true)
  })

  // Test-quality pass (destiny-ukh4e): edge cases the original test set didn't cover.
  describe('edge cases', () => {
    function stateWithLimitedStock(quantity: number) {
      return {
        ...richState,
        inventoryState: {
          ...richState.inventoryState,
          sharedContainers: [
            ...richState.inventoryState.sharedContainers.filter((c) => c.containerId !== 'shop:shop-pale-provisions:stock'),
            {
              containerId: 'shop:shop-pale-provisions:stock',
              containerType: 'vault' as const,
              ownerId: 'shop-pale-provisions',
              maxSlots: 50,
              slots: [{ slotId: 'slot-limited-coat', itemInstanceId: 'inst-limited-coat', quantity }],
              locked: false,
            },
          ],
          itemRegistry: {
            ...richState.inventoryState.itemRegistry,
            'inst-limited-coat': { uniqueId: 'inst-limited-coat', itemId: 'armor-light-tallow-work-coat', quantity, locationType: 'shop_stock' as const, acquiredDay: 1, flags: [] },
          },
        },
      }
    }

    it('logs "out of stock" and makes no money/inventory change once the last unit has been bought', () => {
      const oneLeft = stateWithLimitedStock(1)
      const afterFirstBuy = purchaseItemFromShop(oneLeft, 'shop-pale-provisions', 'armor-light-tallow-work-coat')
      // Confirm the first purchase actually succeeded and consumed the last unit.
      const stockAfterFirst = afterFirstBuy.inventoryState.sharedContainers.find((c) => c.containerId === 'shop:shop-pale-provisions:stock')
      expect(stockAfterFirst?.slots).toHaveLength(0)

      const secondAttempt = purchaseItemFromShop(afterFirstBuy, 'shop-pale-provisions', 'armor-light-tallow-work-coat')
      expect(secondAttempt.money).toBe(afterFirstBuy.money)
      expect(secondAttempt.activityLog[0]?.message).toMatch(/out of stock/i)
    })

    it('succeeds at the exact money-equals-price boundary', () => {
      const oneLeft = stateWithLimitedStock(1)
      const price = resolveShopPricingBreakdown(oneLeft, 'shop-pale-provisions', 'armor-light-tallow-work-coat')?.finalPrice
      expect(price).toBeGreaterThan(0)
      const exactState = { ...oneLeft, money: price! }

      const result = purchaseItemFromShop(exactState, 'shop-pale-provisions', 'armor-light-tallow-work-coat')
      expect(result.money).toBe(0)
      const storage = result.inventoryState.sharedContainers.find((c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID)
      expect(storage?.slots).toHaveLength(1)
    })

    it('returns state unchanged when money is exactly one Mark short of the price', () => {
      const oneLeft = stateWithLimitedStock(1)
      const price = resolveShopPricingBreakdown(oneLeft, 'shop-pale-provisions', 'armor-light-tallow-work-coat')?.finalPrice
      const shortState = { ...oneLeft, money: price! - 1 }

      const result = purchaseItemFromShop(shortState, 'shop-pale-provisions', 'armor-light-tallow-work-coat')
      expect(result).toBe(shortState)
    })

    it('adds a second gear purchase into the SAME already-existing House Storage container rather than recreating it', () => {
      const oneLeft = stateWithLimitedStock(2)
      const firstBuy = purchaseItemFromShop(oneLeft, 'shop-pale-provisions', 'armor-light-tallow-work-coat')
      const storageAfterFirst = firstBuy.inventoryState.sharedContainers.filter((c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID)
      expect(storageAfterFirst).toHaveLength(1)

      const secondBuy = purchaseItemFromShop(firstBuy, 'shop-pale-provisions', 'armor-light-tallow-work-coat')
      const storageAfterSecond = secondBuy.inventoryState.sharedContainers.filter((c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID)
      expect(storageAfterSecond).toHaveLength(1)
      // Shop stock is a fixed, pre-registered instance whose quantity represents "units left" --
      // purchase.ts never mints a new instance id per sale (unlike equipmentPurchase.ts's
      // Date.now()-suffixed ids). Buying the same shop-stock item twice transfers the SAME
      // registered instance id both times, so the destination correctly recognizes "already have
      // this exact instance" and merges quantity into one slot rather than creating a second one.
      expect(storageAfterSecond[0]!.slots).toHaveLength(1)
      expect(storageAfterSecond[0]!.slots[0]!.quantity).toBe(2)
    })

    it('routes a document-category purchase to player inventory, same as any other non-gear item', () => {
      const nextState = purchaseItemFromShop(richState, 'shop-warrens-supply', 'item-form-ward-petition')
      const playerSlots = nextState.inventoryState.player.bagContainers.flatMap((c) => c.slots)
      expect(playerSlots.some((s) => {
        const def = nextState.inventoryState.itemRegistry[s.itemInstanceId!]
        return def?.itemId === 'item-form-ward-petition'
      })).toBe(true)
      expect(nextState.activityLog[0]?.message).not.toMatch(/House Storage/)
    })

    it('routes a tool-category purchase to player inventory, same as any other non-gear item', () => {
      const nextState = purchaseItemFromShop(richState, 'shop-pale-provisions', 'item-lockpick-ringcut')
      const playerSlots = nextState.inventoryState.player.bagContainers.flatMap((c) => c.slots)
      expect(playerSlots.some((s) => {
        const def = nextState.inventoryState.itemRegistry[s.itemInstanceId!]
        return def?.itemId === 'item-lockpick-ringcut'
      })).toBe(true)
      expect(nextState.activityLog[0]?.message).not.toMatch(/House Storage/)
    })

    // Documents a real gap, not a hypothesis: purchaseItemFromShop has no minStanding/faction-gating
    // check at all (confirmed by reading the full function -- only selectors/shops.ts's UI-facing
    // offer list and npcSpecialActions.ts's NPC-agency path enforce minStanding; the command itself
    // does not). shop-pale-provisions' 'item-restored-compound-healing' offer has minStanding: 75 in
    // shops.json -- calling this command directly with a standing far below that still succeeds
    // today. Filed as a follow-up (destiny-47a6o is unrelated; a new bead is more appropriate) rather
    // than silently adding a guard, since enforcing it might be a deliberate simplification (e.g. an
    // NPC-agency purchase path that's meant to bypass player-facing standing gates).
    it('does not enforce minStanding at the command layer today (known gap, documented not fixed)', () => {
      // item-restored-compound-healing's real shop-pale-provisions offer (minStanding: 75 in
      // shops.json) has no pre-seeded stock in the default initial state at all, which would mask
      // this test behind an unrelated "out of stock" result -- constructing dedicated stock here
      // isolates the minStanding question from that separate, real seeding gap.
      const belowStandingState = {
        ...richState,
        factionStandings: { ...richState.factionStandings, 'faction-restored': -50 },
        inventoryState: {
          ...richState.inventoryState,
          sharedContainers: [
            ...richState.inventoryState.sharedContainers.filter((c) => c.containerId !== 'shop:shop-pale-provisions:stock'),
            {
              containerId: 'shop:shop-pale-provisions:stock',
              containerType: 'vault' as const,
              ownerId: 'shop-pale-provisions',
              maxSlots: 50,
              slots: [{ slotId: 'slot-healing-compound', itemInstanceId: 'inst-healing-compound', quantity: 1 }],
              locked: false,
            },
          ],
          itemRegistry: {
            ...richState.inventoryState.itemRegistry,
            'inst-healing-compound': { uniqueId: 'inst-healing-compound', itemId: 'item-restored-compound-healing', quantity: 1, locationType: 'shop_stock' as const, acquiredDay: 1, flags: [] },
          },
        },
      }
      const result = purchaseItemFromShop(belowStandingState, 'shop-pale-provisions', 'item-restored-compound-healing')
      const playerSlots = result.inventoryState.player.bagContainers.flatMap((c) => c.slots)
      expect(playerSlots.some((s) => {
        const def = result.inventoryState.itemRegistry[s.itemInstanceId!]
        return def?.itemId === 'item-restored-compound-healing'
      })).toBe(true)
    })
  })
})
