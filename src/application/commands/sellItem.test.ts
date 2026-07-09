import { describe, it, expect } from 'vitest'
import { computeSellPrice, sellItem } from './sellItem'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'

const BASE_STATE: GameState = {
  ...initialGameStateSnapshot,
  currentDistrictId: 'district-ironworks',
  inventoryState: {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [
        {
          containerId: 'bag-main',
          containerType: 'backpack',
          ownerId: 'player',
          maxSlots: 20,
          slots: [
            {
              slotId: 'slot-1',
              itemInstanceId: 'item-spare-parts',
              quantity: 1,
            },
            {
              slotId: 'slot-2',
              itemInstanceId: 'item-mechanism-pre-breach',
              quantity: 1,
            },
          ],
          locked: false,
        },
      ],
    },
  },
}

describe('computeSellPrice', () => {
  it('returns 0 for unknown instance', () => {
    expect(computeSellPrice(BASE_STATE, 'unknown-id')).toBe(0)
  })

  it('uses tradeValue effect as base when present', () => {
    // item-spare-parts has value:65, no tradeValue effect, so fallback is value*0.5 = 32
    // district-ironworks marketPressure:62 → multiplier = 0.7 + (62/100)*0.6 = 1.072
    // price = floor(32 * 1.072) = floor(34.3) = 34
    const price = computeSellPrice(BASE_STATE, 'item-spare-parts')
    expect(price).toBeGreaterThan(0)
    expect(price).toBeGreaterThanOrEqual(30)
  })

  it('scales price with district marketPressure', () => {
    const highPressureState: GameState = {
      ...BASE_STATE,
      districts: BASE_STATE.districts.map((d) =>
        d.districtId === 'district-ironworks' ? { ...d, marketPressure: 90 } : d,
      ),
    }
    const lowPressureState: GameState = {
      ...BASE_STATE,
      districts: BASE_STATE.districts.map((d) =>
        d.districtId === 'district-ironworks' ? { ...d, marketPressure: 10 } : d,
      ),
    }
    const high = computeSellPrice(highPressureState, 'item-spare-parts')
    const low = computeSellPrice(lowPressureState, 'item-spare-parts')
    expect(high).toBeGreaterThan(low)
  })

  it('returns at least 1 even at zero marketPressure', () => {
    const zeroState: GameState = {
      ...BASE_STATE,
      districts: BASE_STATE.districts.map((d) =>
        d.districtId === 'district-ironworks' ? { ...d, marketPressure: 0 } : d,
      ),
    }
    expect(computeSellPrice(zeroState, 'item-spare-parts')).toBeGreaterThanOrEqual(1)
  })

  it('handles high-value items correctly', () => {
    // item-mechanism-pre-breach has value:380, no tradeValue effect, fallback is 380*0.5 = 190
    // ironworks marketPressure:62 → multiplier = 1.072
    // price = floor(190 * 1.072) = floor(203.7) = 203
    const price = computeSellPrice(BASE_STATE, 'item-mechanism-pre-breach')
    expect(price).toBeGreaterThan(150)
  })
})

describe('sellItem', () => {
  it('removes the item from inventory', () => {
    const result = sellItem(BASE_STATE, 'item-spare-parts')
    const item = result.inventoryState.player.bagContainers
      .flatMap((c) => c.slots)
      .find((s) => s.itemInstanceId === 'item-spare-parts')
    expect(item).toBeUndefined()
  })

  it('adds sell price to money', () => {
    const result = sellItem(BASE_STATE, 'item-spare-parts')
    // Expected price is around 34, so money should increase by at least 30
    expect(result.money).toBeGreaterThan(BASE_STATE.money + 30)
  })

  it('writes an activity log entry', () => {
    const result = sellItem(BASE_STATE, 'item-spare-parts')
    expect(result.activityLog[0]?.category).toBe('economy')
    expect(result.activityLog[0]?.message).toMatch(/Sold/)
  })

  it('returns unchanged state for unknown instance', () => {
    const result = sellItem(BASE_STATE, 'unknown')
    expect(result.money).toBe(BASE_STATE.money)
    const slotCount = result.inventoryState.player.bagContainers.reduce((sum, c) => sum + c.slots.length, 0)
    const baseSlotCount = BASE_STATE.inventoryState.player.bagContainers.reduce((sum, c) => sum + c.slots.length, 0)
    expect(slotCount).toBe(baseSlotCount)
  })

  it('leaves other items untouched', () => {
    const result = sellItem(BASE_STATE, 'item-spare-parts')
    const item = result.inventoryState.player.bagContainers
      .flatMap((c) => c.slots)
      .find((s) => s.itemInstanceId === 'item-mechanism-pre-breach')
    expect(item).toBeDefined()
  })

  // destiny-yiqa: sellItem calls findPlayerItem/removePlayerItem (inventoryHelpers.ts), which
  // used to only search player.bagContainers -- selling an item sitting in House Storage (the
  // exact location HouseStoragePanel's own 'Sell' button operates on) silently did nothing.
  // currentDistrictId is null here specifically to exercise sellItem's own no-shop-found
  // fallback branch (the one that calls findPlayerItem/removePlayerItem directly) rather than
  // its separate shop-transfer branch, which has its own unrelated fromType:'player_inventory'
  // hardcoding bug -- out of scope for this fix, filed as a follow-up.
  it('sells an item sitting in house_storage, not just the player bag', () => {
    const stateWithHouseStorageItem: GameState = {
      ...BASE_STATE,
      currentDistrictId: null,
      inventoryState: {
        ...BASE_STATE.inventoryState,
        sharedContainers: [{
          containerId: 'container-house-storage',
          containerType: 'vault',
          ownerId: 'house_storage',
          maxSlots: 50,
          slots: [{ slotId: 'slot-stored', itemInstanceId: 'inst-stored-parts', quantity: 1 }],
          locked: false,
        }],
        itemRegistry: { 'inst-stored-parts': { uniqueId: 'inst-stored-parts', itemId: 'item-spare-parts', quantity: 1, locationType: 'container', acquiredDay: 1, flags: [] } },
      },
    }

    const result = sellItem(stateWithHouseStorageItem, 'inst-stored-parts')

    expect(result.money).toBeGreaterThan(stateWithHouseStorageItem.money)
    expect(result.inventoryState.sharedContainers[0]!.slots).toHaveLength(0)
    expect(result.activityLog[0]?.message).toMatch(/Sold/)
  })

  // destiny-sqyd: when a shop in the current district DOES buy the item (the transfer branch,
  // as opposed to the no-shop-found fallback covered above), sellItem hardcoded
  // fromType:'player_inventory'/fromId:'player' regardless of where findPlayerItem actually
  // located the item. transferItem silently failed for house_storage/mission_pack items --
  // no crash, no error, just a no-op sale. district-ironworks's shop-ironworks-supply (Foundry
  // Supply Cage) genuinely offers item-spare-parts, so this exercises the real transfer path.
  it('sells a shop-matched item sitting in house_storage via the shop-transfer branch (destiny-sqyd)', () => {
    const stateWithHouseStorageItem: GameState = {
      ...BASE_STATE,
      currentDistrictId: 'district-ironworks',
      inventoryState: {
        ...BASE_STATE.inventoryState,
        sharedContainers: [{
          containerId: 'container-house-storage',
          containerType: 'vault',
          ownerId: 'house_storage',
          maxSlots: 50,
          slots: [{ slotId: 'slot-stored', itemInstanceId: 'inst-stored-parts', quantity: 1 }],
          locked: false,
        }],
        itemRegistry: { 'inst-stored-parts': { uniqueId: 'inst-stored-parts', itemId: 'item-spare-parts', quantity: 1, locationType: 'container', acquiredDay: 1, flags: [] } },
      },
    }

    const result = sellItem(stateWithHouseStorageItem, 'inst-stored-parts')

    expect(result.money).toBeGreaterThan(stateWithHouseStorageItem.money)
    expect(result.inventoryState.sharedContainers.find((c) => c.ownerId === 'house_storage')?.slots).toHaveLength(0)
    const soldIntoShopStock = result.inventoryState.sharedContainers.some(
      (c) => c.containerId === 'shop:shop-ironworks-supply:stock' && c.slots.some((s) => s.itemInstanceId === 'inst-stored-parts'),
    )
    expect(soldIntoShopStock).toBe(true)
    expect(result.activityLog[0]?.message).toMatch(/Sold/)
  })
})
