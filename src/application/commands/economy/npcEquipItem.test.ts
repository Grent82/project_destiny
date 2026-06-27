import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../store/initialGameState'
import { npcEquipItem, npcUnequipItem } from './npcEquipItem'
import type { GameState } from '../../../domain'
import type { InventoryContainer } from '../../../domain/inventory/contracts'

const TEST_NPC_ID = 'npc-test-mercenary'

function createGameStateWithNpcInventory(npcId: string, items: Array<{ itemInstanceId: string; quantity: number }>): GameState {
  const container: InventoryContainer = {
    containerId: 'npc-container-1',
    containerType: 'backpack',
    ownerId: npcId,
    maxSlots: 20,
    slots: items.map((item, idx) => ({
      slotId: `slot-${idx}`,
      itemInstanceId: item.itemInstanceId,
      quantity: item.quantity,
    })),
    locked: false,
  }

  return {
    ...initialGameStateSnapshot,
    roster: [
      {
        ...initialGameStateSnapshot.roster[0]!,
        npcId: TEST_NPC_ID,
        name: 'Test Mercenary',
      },
    ],
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      npcInventories: {
        [npcId]: [container],
      },
    },
  }
}

describe('npcEquipItem', () => {
  it('equips a weapon in the weapon slot', () => {
    const state = createGameStateWithNpcInventory(TEST_NPC_ID, [
      { itemInstanceId: 'weapon-dagger-wasterunner', quantity: 1 },
    ])

    const result = npcEquipItem(state, {
      npcId: TEST_NPC_ID,
      itemId: 'weapon-dagger-wasterunner',
      slot: 'weapon',
    })

    const npc = result.roster.find((n) => n.npcId === TEST_NPC_ID)!
    expect(npc.equipment?.weapon).toBe('weapon-dagger-wasterunner')
    const npcContainers = result.inventoryState.npcInventories[TEST_NPC_ID]
    const hasItem = npcContainers?.some((c) => c.slots.some((s) => s.itemInstanceId === 'weapon-dagger-wasterunner'))
    expect(hasItem).toBe(false)
  })

  it('equips armor in the armor slot', () => {
    const state = createGameStateWithNpcInventory(TEST_NPC_ID, [
      { itemInstanceId: 'armor-light-tallow-work-coat', quantity: 1 },
    ])

    const result = npcEquipItem(state, {
      npcId: TEST_NPC_ID,
      itemId: 'armor-light-tallow-work-coat',
      slot: 'armor',
    })

    const npc = result.roster.find((n) => n.npcId === TEST_NPC_ID)!
    expect(npc.equipment?.armor).toBe('armor-light-tallow-work-coat')
    const npcContainers = result.inventoryState.npcInventories[TEST_NPC_ID]
    const hasItem = npcContainers?.some((c) => c.slots.some((s) => s.itemInstanceId === 'armor-light-tallow-work-coat'))
    expect(hasItem).toBe(false)
  })

  it('equips an accessory with accessory tag', () => {
    const accessoryItemId = 'item-medkit-field'
    const state = createGameStateWithNpcInventory(TEST_NPC_ID, [
      { itemInstanceId: accessoryItemId, quantity: 1 },
    ])

    const result = npcEquipItem(state, {
      npcId: TEST_NPC_ID,
      itemId: accessoryItemId,
      slot: 'accessory',
    })

    const npc = result.roster.find((n) => n.npcId === TEST_NPC_ID)!
    expect(npc.equipment?.accessory).toContain(accessoryItemId)
    const npcContainers = result.inventoryState.npcInventories[TEST_NPC_ID]
    const hasItem = npcContainers?.some((c) => c.slots.some((s) => s.itemInstanceId === accessoryItemId))
    expect(hasItem).toBe(false)
  })

  it('unequips current item when equipping new item in same slot', () => {
    const newWeapon = 'weapon-dagger-ring-flicker'
    const state = createGameStateWithNpcInventory(TEST_NPC_ID, [
      { itemInstanceId: 'weapon-dagger-wasterunner', quantity: 1 },
      { itemInstanceId: newWeapon, quantity: 1 },
    ])
    const npc = state.roster.find((n) => n.npcId === TEST_NPC_ID)!
    npc.equipment = { weapon: 'weapon-dagger-wasterunner', armor: null, accessory: [] }

    const result = npcEquipItem(state, {
      npcId: TEST_NPC_ID,
      itemId: newWeapon,
      slot: 'weapon',
    })

    const updatedNpc = result.roster.find((n) => n.npcId === TEST_NPC_ID)!
    expect(updatedNpc.equipment?.weapon).toBe(newWeapon)
    const npcContainers = result.inventoryState.npcInventories[TEST_NPC_ID]
    const hasOldWeapon = npcContainers?.some((c) => c.slots.some((s) => s.itemInstanceId === 'weapon-dagger-wasterunner'))
    expect(hasOldWeapon).toBe(true)
  })

  it('returns state unchanged if NPC not found', () => {
    const state = initialGameStateSnapshot
    const result = npcEquipItem(state, {
      npcId: 'non-existent-npc',
      itemId: 'weapon-dagger-wasterunner',
      slot: 'weapon',
    })

    expect(result).toEqual(state)
  })

  it('returns state unchanged if item not in inventory', () => {
    const state = createGameStateWithNpcInventory(TEST_NPC_ID, [])

    const result = npcEquipItem(state, {
      npcId: TEST_NPC_ID,
      itemId: 'weapon-dagger-wasterunner',
      slot: 'weapon',
    })

    const npc = result.roster.find((n) => n.npcId === TEST_NPC_ID)!
    expect(npc.equipment?.weapon).toBeNull()
  })

  it('returns state unchanged if item is wrong category for slot', () => {
    const state = createGameStateWithNpcInventory(TEST_NPC_ID, [
      { itemInstanceId: 'armor-light-tallow-work-coat', quantity: 1 },
    ])

    const result = npcEquipItem(state, {
      npcId: TEST_NPC_ID,
      itemId: 'armor-light-tallow-work-coat',
      slot: 'weapon',
    })

    const npc = result.roster.find((n) => n.npcId === TEST_NPC_ID)!
    expect(npc.equipment?.weapon).toBeNull()
  })

  it.skip('supports up to 2 accessories', () => {
    const accessory1 = 'item-medkit-field'
    const accessory2 = 'item-ledger-house-debt'
    const state = createGameStateWithNpcInventory(TEST_NPC_ID, [
      { itemInstanceId: accessory1, quantity: 1 },
      { itemInstanceId: accessory2, quantity: 1 },
    ])

    const stateWithFirst = npcEquipItem(state, {
      npcId: TEST_NPC_ID,
      itemId: accessory1,
      slot: 'accessory',
    })

    const result = npcEquipItem(stateWithFirst, {
      npcId: TEST_NPC_ID,
      itemId: accessory2,
      slot: 'accessory',
    })

    const npc = result.roster.find((n) => n.npcId === TEST_NPC_ID)!
    expect(npc.equipment?.accessory).toHaveLength(2)
  })

  it.skip('replaces oldest accessory when equipping third', () => {
    const accessory1 = 'item-medkit-field'
    const accessory2 = 'item-ledger-house-debt'
    const accessory3 = 'item-ledger-bureau'
    // Only accessory3 is in inventory - accessory1 and accessory2 are already equipped
    const state = createGameStateWithNpcInventory(TEST_NPC_ID, [
      { itemInstanceId: accessory3, quantity: 1 },
    ])
    // Simulate state where accessory1 and accessory2 are already equipped
    const npc = state.roster.find((n) => n.npcId === TEST_NPC_ID)!
    npc.equipment = { weapon: null, armor: null, accessory: [accessory1, accessory2] }

    const result = npcEquipItem(state, {
      npcId: TEST_NPC_ID,
      itemId: accessory3,
      slot: 'accessory',
    })

    const updatedNpc = result.roster.find((n) => n.npcId === TEST_NPC_ID)!
    // When equipping 3rd accessory, oldest (accessory1) is unequipped and returned to inventory
    // New accessory (accessory3) is added, keeping accessory2 and accessory3
    expect(updatedNpc.equipment?.accessory).toHaveLength(2)
    expect(updatedNpc.equipment?.accessory).toContain(accessory2)
    expect(updatedNpc.equipment?.accessory).toContain(accessory3)
    const npcContainers = result.inventoryState.npcInventories[TEST_NPC_ID]
    const hasAccessory1 = npcContainers?.some((c) => c.slots.some((s) => s.itemInstanceId === accessory1))
    expect(hasAccessory1).toBe(true)
  })
})

describe('npcUnequipItem', () => {
  it('unequips weapon and returns it to inventory', () => {
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          npcId: TEST_NPC_ID,
          equipment: { weapon: 'weapon-dagger-wasterunner', armor: null, accessory: [] },
        },
      ],
    }

    const result = npcUnequipItem(state, {
      npcId: TEST_NPC_ID,
      slot: 'weapon',
    })

    const npc = result.roster.find((n) => n.npcId === TEST_NPC_ID)!
    expect(npc.equipment?.weapon).toBeNull()
    const npcContainers = result.inventoryState.npcInventories[TEST_NPC_ID]
    const hasItem = npcContainers?.some((c) => c.slots.some((s) => s.itemInstanceId === 'weapon-dagger-wasterunner'))
    expect(hasItem).toBe(true)
  })

  it('returns state unchanged if nothing equipped in slot', () => {
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          npcId: TEST_NPC_ID,
          equipment: { weapon: null, armor: null, accessory: [] },
        },
      ],
    }

    const result = npcUnequipItem(state, {
      npcId: TEST_NPC_ID,
      slot: 'weapon',
    })

    expect(result).toEqual(state)
  })
})
