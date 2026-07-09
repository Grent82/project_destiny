import { describe, expect, it } from 'vitest'
import { selectHouseholdStorageInfo, selectHouseStorageWeapons, selectHouseStorageArmors } from './household'
import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { HOUSEHOLD_STORAGE_CONTAINER_ID } from '../commands/inventory/householdStorage'
import type { GameState } from '../../domain/game/contracts'
import type { ContainerType } from '../../domain/inventory/contracts'

const WEAPON_ITEM_ID = 'weapon-dagger-wasterunner'
const ARMOR_ITEM_ID = 'armor-light-tallow-work-coat'

function stateWithPurchasedWeapon(instanceId: string): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      sharedContainers: [{
        containerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
        containerType: 'chest' as ContainerType,
        ownerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
        maxSlots: 50,
        slots: [{ slotId: `slot-${instanceId}`, itemInstanceId: instanceId, quantity: 1 }],
        locked: false,
      }],
      itemRegistry: {
        [instanceId]: { uniqueId: instanceId, itemId: WEAPON_ITEM_ID, quantity: 1, locationType: 'container', locationId: HOUSEHOLD_STORAGE_CONTAINER_ID, acquiredDay: 1, flags: [] },
      },
    },
  }
}

function stateWithPanelStoredArmor(instanceId: string): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      sharedContainers: [{
        containerId: 'house-storage-main',
        containerType: 'vault' as ContainerType,
        ownerId: 'house_storage',
        maxSlots: 40,
        slots: [{ slotId: `slot-${instanceId}`, itemInstanceId: instanceId, quantity: 1 }],
        locked: false,
      }],
      itemRegistry: {
        [instanceId]: { uniqueId: instanceId, itemId: ARMOR_ITEM_ID, quantity: 1, locationType: 'container', locationId: 'house-storage-main', acquiredDay: 1, flags: [] },
      },
    },
  }
}

describe('selectHouseStorageWeapons/Armors — house-storage split (destiny root cause: parallel storage containers)', () => {
  it('sees a weapon bought via the shop/equipmentPurchase container', () => {
    const instanceId = 'inst-dagger-001'
    const store = createGameStore(stateWithPurchasedWeapon(instanceId))
    const weapons = selectHouseStorageWeapons(store.getState())
    expect(weapons.some((w) => w.instanceId === instanceId)).toBe(true)
  })

  it('sees armor sitting in the House Storage panel container (ownerId:house_storage) -- previously invisible to the NPC equip picker', () => {
    const instanceId = 'inst-work-coat-001'
    const store = createGameStore(stateWithPanelStoredArmor(instanceId))
    const armors = selectHouseStorageArmors(store.getState())
    expect(armors.some((a) => a.instanceId === instanceId)).toBe(true)
  })

  it('sees both a shop-purchased weapon and a panel-stored armor at once', () => {
    const weaponInstanceId = 'inst-dagger-001'
    const armorInstanceId = 'inst-work-coat-001'
    const merged: GameState = {
      ...initialGameStateSnapshot,
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        sharedContainers: [
          ...stateWithPurchasedWeapon(weaponInstanceId).inventoryState.sharedContainers,
          ...stateWithPanelStoredArmor(armorInstanceId).inventoryState.sharedContainers,
        ],
        itemRegistry: {
          ...stateWithPurchasedWeapon(weaponInstanceId).inventoryState.itemRegistry,
          ...stateWithPanelStoredArmor(armorInstanceId).inventoryState.itemRegistry,
        },
      },
    }
    const store = createGameStore(merged)
    const weapons = selectHouseStorageWeapons(store.getState())
    const armors = selectHouseStorageArmors(store.getState())
    expect(weapons.some((w) => w.instanceId === weaponInstanceId)).toBe(true)
    expect(armors.some((a) => a.instanceId === armorInstanceId)).toBe(true)
  })
})

describe('selectHouseholdStorageInfo — house-storage split', () => {
  it('counts capacity across both containers, not just HOUSEHOLD_STORAGE_CONTAINER_ID', () => {
    const weaponInstanceId = 'inst-dagger-001'
    const armorInstanceId = 'inst-work-coat-001'
    const merged: GameState = {
      ...initialGameStateSnapshot,
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        sharedContainers: [
          ...stateWithPurchasedWeapon(weaponInstanceId).inventoryState.sharedContainers, // maxSlots 50
          ...stateWithPanelStoredArmor(armorInstanceId).inventoryState.sharedContainers, // maxSlots 40
        ],
        itemRegistry: {
          ...stateWithPurchasedWeapon(weaponInstanceId).inventoryState.itemRegistry,
          ...stateWithPanelStoredArmor(armorInstanceId).inventoryState.itemRegistry,
        },
      },
    }
    const store = createGameStore(merged)
    const info = selectHouseholdStorageInfo(store.getState())
    // Previously this would report used:0/total:50 (or whichever single container it happened
    // to find first), silently ignoring the other -- exactly what showed as "Stored: 0 / 40" in
    // a live save that actually had 2 items stored, live-reproduced via Playwright.
    expect(info.used).toBe(2)
    expect(info.total).toBe(90)
  })

  it('reports zero used when the (empty, pre-seeded) storage container has no items yet', () => {
    const store = createGameStore(initialGameStateSnapshot)
    const info = selectHouseholdStorageInfo(store.getState())
    expect(info.used).toBe(0)
    expect(info.total).toBe(40) // initialGameStateSnapshot pre-seeds an empty household:house-blackthorn:storage container (maxSlots 40)
  })

  it('returns the zero-state default when truly no storage container exists', () => {
    const noStorageState: GameState = {
      ...initialGameStateSnapshot,
      inventoryState: { ...initialGameStateSnapshot.inventoryState, sharedContainers: [] },
    }
    const store = createGameStore(noStorageState)
    const info = selectHouseholdStorageInfo(store.getState())
    expect(info.used).toBe(0)
    expect(info.total).toBe(50)
  })
})
