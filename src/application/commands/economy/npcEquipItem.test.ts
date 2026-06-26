import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../../store/initialGameState'
import { npcEquipItem, npcUnequipItem } from './npcEquipItem'

describe('npcEquipItem', () => {
  it('equips a weapon in the weapon slot', () => {
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          inventory: [{ itemId: 'weapon-dagger-wasterunner', quantity: 1 }],
          equipment: { weapon: null, armor: null, accessory: [] },
        },
      ],
    }

    const result = npcEquipItem(state, {
      npcId: state.roster[0]!.npcId,
      itemId: 'weapon-dagger-wasterunner',
      slot: 'weapon',
    })

    const npc = result.roster[0]!
    expect(npc.equipment?.weapon).toBe('weapon-dagger-wasterunner')
    expect(npc.inventory).toHaveLength(0)
  })

  it('equips armor in the armor slot', () => {
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          inventory: [{ itemId: 'armor-light-tallow-work-coat', quantity: 1 }],
          equipment: { weapon: null, armor: null, accessory: [] },
        },
      ],
    }

    const result = npcEquipItem(state, {
      npcId: state.roster[0]!.npcId,
      itemId: 'armor-light-tallow-work-coat',
      slot: 'armor',
    })

    const npc = result.roster[0]!
    expect(npc.equipment?.armor).toBe('armor-light-tallow-work-coat')
    expect(npc.inventory).toHaveLength(0)
  })

  it('equips an accessory with accessory tag', () => {
    // Using item-medkit-field which has 'accessory' tag
    const accessoryItemId = 'item-medkit-field'
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          inventory: [{ itemId: accessoryItemId, quantity: 1 }],
          equipment: { weapon: null, armor: null, accessory: [] },
        },
      ],
    }

    const result = npcEquipItem(state, {
      npcId: state.roster[0]!.npcId,
      itemId: accessoryItemId,
      slot: 'accessory',
    })

    const npc = result.roster[0]!
    expect(npc.equipment?.accessory).toContain(accessoryItemId)
    expect(npc.inventory).toHaveLength(0)
  })

  it('unequips current item when equipping new item in same slot', () => {
    const newWeapon = 'weapon-dagger-ring-flicker'
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          inventory: [
            { itemId: 'weapon-dagger-wasterunner', quantity: 1 },
            { itemId: newWeapon, quantity: 1 },
          ],
          equipment: { weapon: 'weapon-dagger-wasterunner', armor: null, accessory: [] },
        },
      ],
    }

    const result = npcEquipItem(state, {
      npcId: state.roster[0]!.npcId,
      itemId: newWeapon,
      slot: 'weapon',
    })

    const npc = result.roster[0]!
    expect(npc.equipment?.weapon).toBe(newWeapon)
    // Old weapon should be back in inventory
    expect(npc.inventory.some((inv) => inv.itemId === 'weapon-dagger-wasterunner')).toBe(true)
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
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          inventory: [],
          equipment: { weapon: null, armor: null, accessory: [] },
        },
      ],
    }

    const result = npcEquipItem(state, {
      npcId: state.roster[0]!.npcId,
      itemId: 'weapon-dagger-wasterunner',
      slot: 'weapon',
    })

    const npc = result.roster[0]!
    expect(npc.equipment?.weapon).toBeNull()
  })

  it('returns state unchanged if item is wrong category for slot', () => {
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          inventory: [{ itemId: 'armor-light-tallow-work-coat', quantity: 1 }],
          equipment: { weapon: null, armor: null, accessory: [] },
        },
      ],
    }

    const result = npcEquipItem(state, {
      npcId: state.roster[0]!.npcId,
      itemId: 'armor-light-tallow-work-coat',
      slot: 'weapon',
    })

    const npc = result.roster[0]!
    expect(npc.equipment?.weapon).toBeNull()
  })

  it('supports up to 2 accessories', () => {
    const accessory1 = 'item-medkit-field'
    const accessory2 = 'item-ledger-house-debt'
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          inventory: [
            { itemId: accessory1, quantity: 1 },
            { itemId: accessory2, quantity: 1 },
          ],
          equipment: { weapon: null, armor: null, accessory: [] },
        },
      ],
    }

    const stateWithFirst = npcEquipItem(state, {
      npcId: state.roster[0]!.npcId,
      itemId: accessory1,
      slot: 'accessory',
    })

    const result = npcEquipItem(stateWithFirst, {
      npcId: stateWithFirst.roster[0]!.npcId,
      itemId: accessory2,
      slot: 'accessory',
    })

    const npc = result.roster[0]!
    expect(npc.equipment?.accessory).toHaveLength(2)
  })

  it('replaces oldest accessory when equipping third', () => {
    const accessory1 = 'item-medkit-field'
    const accessory2 = 'item-ledger-house-debt'
    const accessory3 = 'item-ledger-bureau'
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          inventory: [
            { itemId: accessory1, quantity: 1 },
            { itemId: accessory2, quantity: 1 },
            { itemId: accessory3, quantity: 1 },
          ],
          equipment: { weapon: null, armor: null, accessory: [accessory1, accessory2] },
        },
      ],
    }

    const result = npcEquipItem(state, {
      npcId: state.roster[0]!.npcId,
      itemId: accessory3,
      slot: 'accessory',
    })

    const npc = result.roster[0]!
    expect(npc.equipment?.accessory).toHaveLength(2)
    expect(npc.equipment?.accessory[0]).toBe(accessory2)
    expect(npc.equipment?.accessory[1]).toBe(accessory3)
    // accessory1 should be back in inventory
    expect(npc.inventory.some((inv) => inv.itemId === accessory1)).toBe(true)
  })
})

describe('npcUnequipItem', () => {
  it('unequips weapon and returns it to inventory', () => {
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          inventory: [],
          equipment: { weapon: 'weapon-dagger-wasterunner', armor: null, accessory: [] },
        },
      ],
    }

    const result = npcUnequipItem(state, {
      npcId: state.roster[0]!.npcId,
      slot: 'weapon',
    })

    const npc = result.roster[0]!
    expect(npc.equipment?.weapon).toBeNull()
    expect(npc.inventory.some((inv) => inv.itemId === 'weapon-dagger-wasterunner')).toBe(true)
  })

  it('returns state unchanged if nothing equipped in slot', () => {
    const state = {
      ...initialGameStateSnapshot,
      roster: [
        {
          ...initialGameStateSnapshot.roster[0]!,
          inventory: [],
          equipment: { weapon: null, armor: null, accessory: [] },
        },
      ],
    }

    const result = npcUnequipItem(state, {
      npcId: state.roster[0]!.npcId,
      slot: 'weapon',
    })

    expect(result).toEqual(state)
  })
})
