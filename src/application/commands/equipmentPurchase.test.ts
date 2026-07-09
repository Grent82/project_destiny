import { describe, expect, it } from 'vitest'
import { sellWeaponFromHouseStorage, sellArmorFromHouseStorage } from './equipmentPurchase'
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
