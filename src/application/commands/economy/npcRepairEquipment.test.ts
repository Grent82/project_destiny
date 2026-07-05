import { describe, it, expect } from 'vitest'
import { npcRepairEquipment, npcNeedsEquipmentRepair, repairSuccessChance, DURABILITY_REPAIR_THRESHOLD } from './npcRepairEquipment'
import { initialStateWithIda, idaRhysRosterEntry } from '../testFixtures'
import type { GameState } from '../../../domain/game/contracts'
import type { InventoryContainer } from '../../../domain/inventory/contracts'

const NPC_ID = idaRhysRosterEntry.npcId

function withLoadoutWeapon(state: GameState, npcId: string, weaponId: string): GameState {
  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) =>
      n.npcId === npcId ? { ...n, loadout: { ...n.loadout, primaryWeaponId: weaponId } } : n,
    ),
  }
}

function withDurability(state: GameState, npcId: string, slot: 'weapon' | 'armor', value: number): GameState {
  return {
    ...state,
    equippedItemDurabilities: {
      ...state.equippedItemDurabilities,
      [npcId]: { ...state.equippedItemDurabilities[npcId], [slot]: value },
    },
  }
}

function withPersonalFunds(state: GameState, npcId: string, carriedCash: number, savings = 0): GameState {
  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) =>
      n.npcId === npcId ? { ...n, personalFunds: { ...n.personalFunds, carriedCash, savings } } : n,
    ),
  }
}

function withRepairMaterial(state: GameState, npcId: string, uniqueId = 'inst-spare-parts-1'): GameState {
  const container: InventoryContainer = {
    containerId: `container-${npcId}`,
    containerType: 'satchel',
    ownerId: npcId,
    maxSlots: 5,
    slots: [{ slotId: `slot-${uniqueId}`, itemInstanceId: uniqueId, quantity: 1 }],
    locked: false,
  }
  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      npcInventories: { ...state.inventoryState.npcInventories, [npcId]: [container] },
      itemRegistry: {
        ...state.inventoryState.itemRegistry,
        [uniqueId]: {
          uniqueId,
          itemId: 'item-spare-parts',
          quantity: 1,
          locationType: 'npc_inventory',
          locationId: npcId,
          acquiredDay: 1,
          flags: [],
        },
      },
    },
  }
}

describe('npcNeedsEquipmentRepair', () => {
  it('is false with no equipped weapon/armor', () => {
    expect(npcNeedsEquipmentRepair(initialStateWithIda, idaRhysRosterEntry)).toBe(false)
  })

  it('is true once equipped weapon durability drops below the threshold', () => {
    let state = withLoadoutWeapon(initialStateWithIda, NPC_ID, 'item-iron-sword')
    state = withDurability(state, NPC_ID, 'weapon', DURABILITY_REPAIR_THRESHOLD - 1)
    const npc = state.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npcNeedsEquipmentRepair(state, npc)).toBe(true)
  })

  it('is false when durability is at or above the threshold', () => {
    let state = withLoadoutWeapon(initialStateWithIda, NPC_ID, 'item-iron-sword')
    state = withDurability(state, NPC_ID, 'weapon', DURABILITY_REPAIR_THRESHOLD)
    const npc = state.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npcNeedsEquipmentRepair(state, npc)).toBe(false)
  })
})

describe('repairSuccessChance', () => {
  it('scales with the average of crafting/engineering skill, capped at 95', () => {
    const highSkill = { ...idaRhysRosterEntry, skills: { ...idaRhysRosterEntry.skills, crafting: 100, engineering: 100 } }
    const lowSkill = { ...idaRhysRosterEntry, skills: { ...idaRhysRosterEntry.skills, crafting: 0, engineering: 0 } }
    expect(repairSuccessChance(highSkill)).toBeLessThanOrEqual(95)
    expect(repairSuccessChance(highSkill)).toBeGreaterThan(repairSuccessChance(lowSkill))
  })
})

describe('npcRepairEquipment', () => {
  it('no-ops when nothing needs repair', () => {
    const result = npcRepairEquipment(initialStateWithIda, NPC_ID)
    expect(result).toBe(initialStateWithIda)
  })

  it('consumes a repair-material item for free when available, restoring durability on success', () => {
    let state = withLoadoutWeapon(initialStateWithIda, NPC_ID, 'item-iron-sword')
    state = withDurability(state, NPC_ID, 'weapon', 10)
    state = withRepairMaterial(state, NPC_ID)
    // Force success: max crafting/engineering skill
    state = {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((n) =>
        n.npcId === NPC_ID ? { ...n, skills: { ...n.skills, crafting: 100, engineering: 100 } } : n,
      ),
    }

    const result = npcRepairEquipment(state, NPC_ID)

    expect(result.inventoryState.npcInventories[NPC_ID]![0]!.slots).toHaveLength(0)
    expect(result.inventoryState.itemRegistry['inst-spare-parts-1']).toBeUndefined()
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.personalFunds.carriedCash).toBe(0) // material path spends no money
    expect(result.activityLog[0]!.message).toContain('repairs')
  })

  it('pays from carriedCash when no repair material is present', () => {
    let state = withLoadoutWeapon(initialStateWithIda, NPC_ID, 'item-iron-sword')
    state = withDurability(state, NPC_ID, 'weapon', 10)
    state = withPersonalFunds(state, NPC_ID, 1000)

    const result = npcRepairEquipment(state, NPC_ID)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.personalFunds.carriedCash).toBeLessThan(1000)
  })

  it('falls back to savings when carriedCash is insufficient', () => {
    let state = withLoadoutWeapon(initialStateWithIda, NPC_ID, 'item-iron-sword')
    state = withDurability(state, NPC_ID, 'weapon', 10)
    state = withPersonalFunds(state, NPC_ID, 5, 1000)

    const result = npcRepairEquipment(state, NPC_ID)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.personalFunds.carriedCash).toBe(0)
    expect(npc.personalFunds.savings).toBeLessThan(1000)
  })

  it('no-ops when neither materials nor sufficient funds are available', () => {
    let state = withLoadoutWeapon(initialStateWithIda, NPC_ID, 'item-iron-sword')
    state = withDurability(state, NPC_ID, 'weapon', 10)
    state = withPersonalFunds(state, NPC_ID, 0, 0)

    const result = npcRepairEquipment(state, NPC_ID)

    expect(result).toBe(state)
  })

  it('advances rngSeed', () => {
    let state = withLoadoutWeapon(initialStateWithIda, NPC_ID, 'item-iron-sword')
    state = withDurability(state, NPC_ID, 'weapon', 10)
    state = withPersonalFunds(state, NPC_ID, 1000)

    const result = npcRepairEquipment(state, NPC_ID)
    expect(result.rngSeed).not.toBe(state.rngSeed)
  })
})
