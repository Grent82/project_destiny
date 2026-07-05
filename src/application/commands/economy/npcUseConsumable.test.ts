import { describe, it, expect } from 'vitest'
import { npcUseConsumable, npcCanUseConsumable, LOW_HEALTH_THRESHOLD, HIGH_HUNGER_THRESHOLD } from './npcUseConsumable'
import { initialStateWithIda, idaRhysRosterEntry } from '../testFixtures'
import type { GameState } from '../../../domain/game/contracts'
import type { InventoryContainer } from '../../../domain/inventory/contracts'

const NPC_ID = idaRhysRosterEntry.npcId

function withNpcItem(state: GameState, npcId: string, itemId: string, uniqueId: string): GameState {
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
          itemId,
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

function withNpcStates(state: GameState, npcId: string, states: Partial<typeof idaRhysRosterEntry.states>): GameState {
  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) => (n.npcId === npcId ? { ...n, states: { ...n.states, ...states } } : n)),
  }
}

describe('npcCanUseConsumable', () => {
  it('is false with no need and no item', () => {
    const npc = initialStateWithIda.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npcCanUseConsumable(initialStateWithIda, npc)).toBe(false)
  })

  it('is false when the need exists but no matching item is present', () => {
    const state = withNpcStates(initialStateWithIda, NPC_ID, { health: LOW_HEALTH_THRESHOLD - 1 })
    const npc = state.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npcCanUseConsumable(state, npc)).toBe(false)
  })
})

describe('npcUseConsumable', () => {
  it('no-ops when nothing is needed', () => {
    const result = npcUseConsumable(initialStateWithIda, NPC_ID)
    expect(result).toBe(initialStateWithIda)
  })

  it('heals using a healing-tagged item when health is low, prioritized over hunger', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { health: 20, hunger: 80 })
    state = withNpcItem(state, NPC_ID, 'item-medkit-field', 'inst-medkit-1')

    const result = npcUseConsumable(state, NPC_ID)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.health).toBe(45) // 20 + 25 (item-medkit-field's real heal value)
    expect(npc.states.hunger).toBe(80) // untouched — health took priority
    expect(result.inventoryState.npcInventories[NPC_ID]![0]!.slots).toHaveLength(0)
  })

  it('eases hunger using a food-tagged item when hunger is high and health is fine', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { health: 90, hunger: HIGH_HUNGER_THRESHOLD + 1 })
    state = withNpcItem(state, NPC_ID, 'item-ration-compact-brick', 'inst-ration-1')

    const result = npcUseConsumable(state, NPC_ID)

    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.hunger).toBe(HIGH_HUNGER_THRESHOLD + 1 - 30) // item's real reduceStat value
    expect(result.inventoryState.npcInventories[NPC_ID]![0]!.slots).toHaveLength(0)
  })

  it('no-ops when health is low but no healing item is present', () => {
    const state = withNpcStates(initialStateWithIda, NPC_ID, { health: 10 })
    const result = npcUseConsumable(state, NPC_ID)
    expect(result).toBe(state)
  })

  it('clamps health at 100', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { health: LOW_HEALTH_THRESHOLD - 1 })
    state = withNpcItem(state, NPC_ID, 'item-restored-compound-healing', 'inst-heal-1') // heal: 40
    const result = npcUseConsumable(state, NPC_ID)
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.health).toBeLessThanOrEqual(100)
  })
})
