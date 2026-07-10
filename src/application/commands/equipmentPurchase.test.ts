import { describe, expect, it, vi } from 'vitest'
import {
  sellWeaponFromHouseStorage,
  sellArmorFromHouseStorage,
  purchaseWeaponToHouseStorage,
  purchaseArmorToHouseStorage,
} from './equipmentPurchase'
import { HOUSEHOLD_STORAGE_CONTAINER_ID } from './inventory/householdStorage'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'

const WEAPON_ID = 'weapon-dagger-wasterunner' // repairCost 20 -> sellPrice floor(20*2.5)=50
const ARMOR_ID = 'armor-light-tallow-work-coat' // repairCost 10 -> sellPrice floor(10*2.5)=25

function stateWithStoredItem(instanceId: string, itemId: string): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      sharedContainers: [
        {
          containerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
          containerType: 'chest',
          ownerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
          maxSlots: 50,
          slots: [{ slotId: `slot-${instanceId}`, itemInstanceId: instanceId, quantity: 1 }],
          locked: false,
        },
      ],
      itemRegistry: {
        [instanceId]: {
          uniqueId: instanceId,
          itemId,
          quantity: 1,
          locationType: 'container',
          locationId: HOUSEHOLD_STORAGE_CONTAINER_ID,
          acquiredDay: 1,
          flags: [],
        },
      },
    },
  }
}

describe('sellWeaponFromHouseStorage (destiny-wslk)', () => {
  it('sells the correct weapon instance, removing it from storage and the item registry', () => {
    const instanceId = 'inst-dagger-001'
    const state = stateWithStoredItem(instanceId, WEAPON_ID)

    const result = sellWeaponFromHouseStorage(state, WEAPON_ID)

    const storage = result.inventoryState.sharedContainers.find((c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID)
    expect(storage?.slots).toHaveLength(0)
    expect(result.inventoryState.itemRegistry[instanceId]).toBeUndefined()
  })

  it('credits the correct sell price to money', () => {
    const instanceId = 'inst-dagger-001'
    const state = stateWithStoredItem(instanceId, WEAPON_ID)

    const result = sellWeaponFromHouseStorage(state, WEAPON_ID)

    expect(result.money).toBe(state.money + 50)
  })

  it('appends an economy activity log entry', () => {
    const instanceId = 'inst-dagger-001'
    const state = stateWithStoredItem(instanceId, WEAPON_ID)

    const result = sellWeaponFromHouseStorage(state, WEAPON_ID)

    expect(result.activityLog[0]?.category).toBe('economy')
    expect(result.activityLog[0]?.message).toContain("Waste-Runner's Knife")
    expect(result.activityLog[0]?.message).toContain('+50 Marks')
  })

  it('leaves other stored items untouched', () => {
    const targetId = 'inst-dagger-001'
    const otherId = 'inst-dagger-002'
    const base = stateWithStoredItem(targetId, WEAPON_ID)
    const state: GameState = {
      ...base,
      inventoryState: {
        ...base.inventoryState,
        sharedContainers: [{
          ...base.inventoryState.sharedContainers[0]!,
          slots: [
            ...base.inventoryState.sharedContainers[0]!.slots,
            { slotId: `slot-${otherId}`, itemInstanceId: otherId, quantity: 1 },
          ],
        }],
        itemRegistry: {
          ...base.inventoryState.itemRegistry,
          [otherId]: { uniqueId: otherId, itemId: WEAPON_ID, quantity: 1, locationType: 'container', locationId: HOUSEHOLD_STORAGE_CONTAINER_ID, acquiredDay: 1, flags: [] },
        },
      },
    }

    const result = sellWeaponFromHouseStorage(state, WEAPON_ID)

    // Sells the FIRST matching instance found, leaving the other alone.
    const remainingSlots = result.inventoryState.sharedContainers[0]!.slots
    expect(remainingSlots).toHaveLength(1)
    expect(remainingSlots[0]!.itemInstanceId).toBe(otherId)
    expect(result.inventoryState.itemRegistry[otherId]).toBeDefined()
  })

  it('returns state unchanged when no household storage container exists', () => {
    const result = sellWeaponFromHouseStorage(initialGameStateSnapshot, WEAPON_ID)
    expect(result).toBe(initialGameStateSnapshot)
  })

  it('returns state unchanged when the weaponId is not found in storage', () => {
    const state = stateWithStoredItem('inst-dagger-001', WEAPON_ID)
    const result = sellWeaponFromHouseStorage(state, 'weapon-nonexistent')
    expect(result).toBe(state)
  })
})

describe('sellArmorFromHouseStorage (destiny-wslk)', () => {
  it('sells the correct armor instance, removing it from storage and the item registry', () => {
    const instanceId = 'inst-coat-001'
    const state = stateWithStoredItem(instanceId, ARMOR_ID)

    const result = sellArmorFromHouseStorage(state, ARMOR_ID)

    const storage = result.inventoryState.sharedContainers.find((c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID)
    expect(storage?.slots).toHaveLength(0)
    expect(result.inventoryState.itemRegistry[instanceId]).toBeUndefined()
  })

  it('credits the correct sell price to money', () => {
    const instanceId = 'inst-coat-001'
    const state = stateWithStoredItem(instanceId, ARMOR_ID)

    const result = sellArmorFromHouseStorage(state, ARMOR_ID)

    expect(result.money).toBe(state.money + 25)
  })

  it('appends an economy activity log entry', () => {
    const instanceId = 'inst-coat-001'
    const state = stateWithStoredItem(instanceId, ARMOR_ID)

    const result = sellArmorFromHouseStorage(state, ARMOR_ID)

    expect(result.activityLog[0]?.category).toBe('economy')
    expect(result.activityLog[0]?.message).toContain('Tallow Ring Work Coat')
    expect(result.activityLog[0]?.message).toContain('+25 Marks')
  })

  it('returns state unchanged when no household storage container exists', () => {
    const result = sellArmorFromHouseStorage(initialGameStateSnapshot, ARMOR_ID)
    expect(result).toBe(initialGameStateSnapshot)
  })

  it('returns state unchanged when the armorId is not found in storage', () => {
    const state = stateWithStoredItem('inst-coat-001', ARMOR_ID)
    const result = sellArmorFromHouseStorage(state, 'armor-nonexistent')
    expect(result).toBe(state)
  })
})

// Test-quality pass (destiny-ukh4e): purchaseWeaponToHouseStorage/purchaseArmorToHouseStorage are
// this file's own primary exports -- the canonical "arms dealer" purchase path dispatched live
// from ShopsScreen.tsx's Equipment Stash section (gameActions.purchaseWeapon/purchaseArmor) -- yet
// had ZERO direct tests anywhere before this pass (only reached incidentally through other files'
// fixtures). Mirrors the existing sell-side test shape above.
describe('purchaseWeaponToHouseStorage', () => {
  it('deducts the price, creates the House Storage container, and stores the weapon instance', () => {
    const result = purchaseWeaponToHouseStorage(initialGameStateSnapshot, WEAPON_ID, 75)

    expect(result.money).toBe(initialGameStateSnapshot.money - 75)
    const storage = result.inventoryState.sharedContainers.find((c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID)
    expect(storage?.slots).toHaveLength(1)
    const instanceId = storage!.slots[0]!.itemInstanceId!
    expect(result.inventoryState.itemRegistry[instanceId]?.itemId).toBe(WEAPON_ID)
    expect(result.inventoryState.itemRegistry[instanceId]?.locationType).toBe('container')
    expect(result.inventoryState.itemRegistry[instanceId]?.locationId).toBe(HOUSEHOLD_STORAGE_CONTAINER_ID)
  })

  it('appends an economy activity log entry naming House Storage as the destination', () => {
    const result = purchaseWeaponToHouseStorage(initialGameStateSnapshot, WEAPON_ID, 75)
    expect(result.activityLog[0]?.category).toBe('economy')
    expect(result.activityLog[0]?.message).toContain("Waste-Runner's Knife")
    expect(result.activityLog[0]?.message).toContain('Added to House Storage')
  })

  it('adds a second purchase into the SAME already-existing container rather than creating a duplicate one', () => {
    const richState = { ...initialGameStateSnapshot, money: 1000 }
    const first = purchaseWeaponToHouseStorage(richState, WEAPON_ID, 75)
    const result = purchaseWeaponToHouseStorage(first, WEAPON_ID, 75)

    const containers = result.inventoryState.sharedContainers.filter((c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID)
    expect(containers).toHaveLength(1)
    expect(containers[0]!.slots).toHaveLength(2)
    expect(result.money).toBe(richState.money - 150)
  })

  it('succeeds at the exact money-equals-price boundary', () => {
    const brokeState = { ...initialGameStateSnapshot, money: 75 }
    const result = purchaseWeaponToHouseStorage(brokeState, WEAPON_ID, 75)
    expect(result.money).toBe(0)
    const storage = result.inventoryState.sharedContainers.find((c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID)
    expect(storage?.slots).toHaveLength(1)
  })

  it('returns state unchanged when money is exactly one short of the price', () => {
    const brokeState = { ...initialGameStateSnapshot, money: 74 }
    const result = purchaseWeaponToHouseStorage(brokeState, WEAPON_ID, 75)
    expect(result).toBe(brokeState)
  })

  it('returns state unchanged when the weaponId does not resolve to a weapon-category item', () => {
    const result = purchaseWeaponToHouseStorage(initialGameStateSnapshot, ARMOR_ID, 55)
    expect(result).toBe(initialGameStateSnapshot)
  })

  it('returns state unchanged when the weaponId does not exist in the catalog at all', () => {
    const result = purchaseWeaponToHouseStorage(initialGameStateSnapshot, 'weapon-does-not-exist', 75)
    expect(result).toBe(initialGameStateSnapshot)
  })

  it('returns state unchanged when House Storage is already at capacity', () => {
    const fullContainer = {
      containerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      containerType: 'chest' as const,
      ownerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      maxSlots: 1,
      slots: [{ slotId: 'slot-existing', itemInstanceId: 'inst-existing', quantity: 1 }],
      locked: false,
    }
    const fullState: GameState = {
      ...initialGameStateSnapshot,
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        sharedContainers: [fullContainer],
        itemRegistry: {
          ...initialGameStateSnapshot.inventoryState.itemRegistry,
          'inst-existing': { uniqueId: 'inst-existing', itemId: WEAPON_ID, quantity: 1, locationType: 'container', locationId: HOUSEHOLD_STORAGE_CONTAINER_ID, acquiredDay: 1, flags: [] },
        },
      },
    }
    const result = purchaseWeaponToHouseStorage(fullState, WEAPON_ID, 75)
    expect(result).toBe(fullState)
  })

  // Known limitation, not fixed here (filed separately): instanceId is generated as
  // `${weaponId}-${Date.now()}`. Two purchases of the same weapon within the same millisecond
  // produce the SAME instance id, so the second push adds a slot pointing at an id the registry
  // already describes as a single instance -- two slots silently sharing one registry entry.
  // Documented via a forced Date.now() collision rather than left as an unverified assumption.
  it('documents a known id-collision risk: two purchases in the same millisecond share one instance id', () => {
    const richState = { ...initialGameStateSnapshot, money: 1000 }
    const fixedNow = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow)
    try {
      const first = purchaseWeaponToHouseStorage(richState, WEAPON_ID, 75)
      const result = purchaseWeaponToHouseStorage(first, WEAPON_ID, 75)
      const storage = result.inventoryState.sharedContainers.find((c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID)!
      const instanceIds = new Set(storage.slots.map((s) => s.itemInstanceId))
      // Both purchases succeed (money deducted twice, two slots pushed), but with Date.now() frozen
      // they collapse onto a single registry id -- the collision this test documents, not the
      // intended "two distinct weapon instances" behavior.
      expect(result.money).toBe(richState.money - 150)
      expect(storage.slots).toHaveLength(2)
      expect(instanceIds.size).toBe(1)
    } finally {
      nowSpy.mockRestore()
    }
  })
})

describe('purchaseArmorToHouseStorage', () => {
  it('deducts the price, creates the House Storage container, and stores the armor instance', () => {
    const result = purchaseArmorToHouseStorage(initialGameStateSnapshot, ARMOR_ID, 55)

    expect(result.money).toBe(initialGameStateSnapshot.money - 55)
    const storage = result.inventoryState.sharedContainers.find((c) => c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID)
    expect(storage?.slots).toHaveLength(1)
    const instanceId = storage!.slots[0]!.itemInstanceId!
    expect(result.inventoryState.itemRegistry[instanceId]?.itemId).toBe(ARMOR_ID)
  })

  it('appends an economy activity log entry naming House Storage as the destination', () => {
    const result = purchaseArmorToHouseStorage(initialGameStateSnapshot, ARMOR_ID, 55)
    expect(result.activityLog[0]?.category).toBe('economy')
    expect(result.activityLog[0]?.message).toContain('Added to House Storage')
  })

  it('succeeds at the exact money-equals-price boundary', () => {
    const brokeState = { ...initialGameStateSnapshot, money: 55 }
    const result = purchaseArmorToHouseStorage(brokeState, ARMOR_ID, 55)
    expect(result.money).toBe(0)
  })

  it('returns state unchanged when money is exactly one short of the price', () => {
    const brokeState = { ...initialGameStateSnapshot, money: 54 }
    const result = purchaseArmorToHouseStorage(brokeState, ARMOR_ID, 55)
    expect(result).toBe(brokeState)
  })

  it('returns state unchanged when the armorId does not resolve to an armor-category item', () => {
    const result = purchaseArmorToHouseStorage(initialGameStateSnapshot, WEAPON_ID, 75)
    expect(result).toBe(initialGameStateSnapshot)
  })

  it('returns state unchanged when the armorId does not exist in the catalog at all', () => {
    const result = purchaseArmorToHouseStorage(initialGameStateSnapshot, 'armor-does-not-exist', 55)
    expect(result).toBe(initialGameStateSnapshot)
  })

  it('returns state unchanged when House Storage is already at capacity', () => {
    const fullContainer = {
      containerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      containerType: 'chest' as const,
      ownerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
      maxSlots: 1,
      slots: [{ slotId: 'slot-existing', itemInstanceId: 'inst-existing', quantity: 1 }],
      locked: false,
    }
    const fullState: GameState = {
      ...initialGameStateSnapshot,
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        sharedContainers: [fullContainer],
        itemRegistry: {
          ...initialGameStateSnapshot.inventoryState.itemRegistry,
          'inst-existing': { uniqueId: 'inst-existing', itemId: ARMOR_ID, quantity: 1, locationType: 'container', locationId: HOUSEHOLD_STORAGE_CONTAINER_ID, acquiredDay: 1, flags: [] },
        },
      },
    }
    const result = purchaseArmorToHouseStorage(fullState, ARMOR_ID, 55)
    expect(result).toBe(fullState)
  })
})
