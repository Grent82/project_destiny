import { describe, it, expect } from 'vitest'
import { npcCraftItem, npcCanCraftItem, MIN_CRAFTING_SKILL_TO_ATTEMPT } from './npcCraftItem'
import { initialStateWithIda, idaRhysRosterEntry } from '../testFixtures'
import type { GameState } from '../../../domain/game/contracts'
import type { InventoryContainer } from '../../../domain/inventory/contracts'

const NPC_ID = idaRhysRosterEntry.npcId

function withMaterials(state: GameState, npcId: string, materials: Array<{ itemId: string; quantity: number }>): GameState {
  const stacked = materials.map((m, i) => ({
    slotId: `slot-${npcId}-stack-${i}`,
    itemInstanceId: m.itemId,
    quantity: m.quantity,
  }))
  const container: InventoryContainer = {
    containerId: `container-${npcId}`,
    containerType: 'satchel',
    ownerId: npcId,
    maxSlots: 10,
    slots: stacked,
    locked: false,
  }
  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      npcInventories: { ...state.inventoryState.npcInventories, [npcId]: [container] },
      itemRegistry: {
        ...state.inventoryState.itemRegistry,
        ...Object.fromEntries(
          materials.map((m) => [
            m.itemId,
            {
              uniqueId: m.itemId,
              itemId: m.itemId,
              quantity: m.quantity,
              locationType: 'npc_inventory' as const,
              locationId: npcId,
              acquiredDay: 1,
              flags: [],
            },
          ]),
        ),
      },
    },
  }
}

function withCraftingSkill(state: GameState, npcId: string, crafting: number): GameState {
  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) => (n.npcId === npcId ? { ...n, skills: { ...n.skills, crafting } } : n)),
  }
}

describe('npcCanCraftItem', () => {
  it('is false below the minimum crafting skill even with materials present', () => {
    let state = withCraftingSkill(initialStateWithIda, NPC_ID, MIN_CRAFTING_SKILL_TO_ATTEMPT - 1)
    state = withMaterials(state, NPC_ID, [{ itemId: 'item-spare-parts', quantity: 1 }, { itemId: 'item-material-scrap-cloth', quantity: 1 }])
    const npc = state.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npcCanCraftItem(state, npc)).toBe(false)
  })

  it('is false with sufficient skill but missing materials', () => {
    const state = withCraftingSkill(initialStateWithIda, NPC_ID, 100)
    const npc = state.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npcCanCraftItem(state, npc)).toBe(false)
  })

  it('is true with sufficient skill and materials for a recipe', () => {
    let state = withCraftingSkill(initialStateWithIda, NPC_ID, 100)
    state = withMaterials(state, NPC_ID, [{ itemId: 'item-spare-parts', quantity: 1 }, { itemId: 'item-material-scrap-cloth', quantity: 1 }])
    const npc = state.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npcCanCraftItem(state, npc)).toBe(true)
  })
})

describe('npcCraftItem', () => {
  it('no-ops when crafting skill is below threshold', () => {
    let state = withCraftingSkill(initialStateWithIda, NPC_ID, MIN_CRAFTING_SKILL_TO_ATTEMPT - 1)
    state = withMaterials(state, NPC_ID, [{ itemId: 'item-spare-parts', quantity: 1 }, { itemId: 'item-material-scrap-cloth', quantity: 1 }])
    const result = npcCraftItem(state, NPC_ID)
    expect(result).toBe(state)
  })

  it('no-ops when materials are missing', () => {
    const state = withCraftingSkill(initialStateWithIda, NPC_ID, 100)
    const result = npcCraftItem(state, NPC_ID)
    expect(result).toBe(state)
  })

  it('consumes materials and produces the recipe output', () => {
    let state = withCraftingSkill(initialStateWithIda, NPC_ID, 100)
    state = withMaterials(state, NPC_ID, [{ itemId: 'item-spare-parts', quantity: 1 }, { itemId: 'item-material-scrap-cloth', quantity: 1 }])

    const result = npcCraftItem(state, NPC_ID)

    const slots = result.inventoryState.npcInventories[NPC_ID]!.flatMap((c) => c.slots)
    expect(slots.some((s) => s.itemInstanceId === 'item-spare-parts')).toBe(false)
    expect(slots.some((s) => s.itemInstanceId === 'item-material-scrap-cloth')).toBe(false)
    expect(slots.some((s) => s.itemInstanceId === 'item-lamp-signal-expedition')).toBe(true)
    expect(result.activityLog[0]!.message).toContain('crafts')
  })

  it('picks the higher-skill recipe when a lower-skill NPC only qualifies for one', () => {
    let state = withCraftingSkill(initialStateWithIda, NPC_ID, 35) // below the 50-skill caliper recipe
    state = withMaterials(state, NPC_ID, [
      { itemId: 'item-spare-parts', quantity: 3 },
      { itemId: 'item-material-scrap-cloth', quantity: 1 },
    ])
    const result = npcCraftItem(state, NPC_ID)
    const slots = result.inventoryState.npcInventories[NPC_ID]!.flatMap((c) => c.slots)
    expect(slots.some((s) => s.itemInstanceId === 'item-lamp-signal-expedition')).toBe(true)
  })
})
