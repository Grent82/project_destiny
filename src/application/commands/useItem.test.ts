import { describe, it, expect } from 'vitest'
import { useItem } from './useItem'
import { initialStateWithIda } from './testFixtures'
import type { GameState } from '../../domain/game/contracts'

/**
 * Creates a game state with an item in the new inventory system.
 */
function stateWithItem(itemId: string, quantity = 1, location = 'inventory' as const) {
  const instanceId = `test-inst-${itemId}`

  // Create inventory state with the item
  const bagContainer = {
    containerId: `container-${instanceId}`,
    containerType: 'backpack',
    ownerId: 'player',
    maxSlots: 20,
    slots: [
      {
        slotId: `slot-${instanceId}`,
        itemInstanceId: instanceId,
        quantity,
      },
    ],
    locked: false,
  }

  return {
    ...initialStateWithIda,
    // Keep ownedItems for backward compatibility in tests
    ownedItems: [
      ...initialStateWithIda.ownedItems,
      { instanceId, itemId, location, quantity },
    ],
    // Add to new inventory system
    inventoryState: {
      ...initialStateWithIda.inventoryState,
      player: {
        ...initialStateWithIda.inventoryState.player,
        bagContainers: [bagContainer],
        usedBagSlots: 1,
        equipmentSlots: {
          weapon: null,
          armor: null,
          accessory_1: null,
          accessory_2: null,
        },
      },
    },
  } as GameState
}

describe('useItem — consume heal', () => {
  it('applies heal effect to target NPC and removes item', () => {
    const targetId = 'npc-ida-rhys'
    const state = stateWithItem('item-medkit-field')
    const result = useItem(state, { instanceId: 'test-inst-item-medkit-field', action: 'consume', targetNpcId: targetId })
    // Instance removed from inventory
    expect(result.inventoryState.player.bagContainers).toHaveLength(0)
    expect(result.activityLog[0]?.message).toContain('Field Medkit')
  })

  it('applies heal effect from item with typed heal effect', () => {
    const targetId = 'npc-ida-rhys'
    // Use salve (has heal:6)
    const state = stateWithItem('item-salve-burngrade')
    const s = {
      ...state,
      roster: state.roster.map((n) =>
        n.npcId === targetId ? { ...n, states: { ...n.states, health: 60 } } : n,
      ),
    }
    const result = useItem(s, { instanceId: 'test-inst-item-salve-burngrade', action: 'consume', targetNpcId: targetId })
    const npc = result.roster.find((n) => n.npcId === targetId)!
    expect(npc.states.health).toBe(66) // 60 + 6
    expect(result.inventoryState.player.bagContainers).toHaveLength(0)
    expect(result.activityLog[0]?.message).toContain('+6 health')
  })

  it('caps heal at 100', () => {
    const targetId = 'npc-ida-rhys'
    const state = stateWithItem('item-salve-burngrade')
    const s = {
      ...state,
      roster: state.roster.map((n) =>
        n.npcId === targetId ? { ...n, states: { ...n.states, health: 98 } } : n,
      ),
    }
    const result = useItem(s, { instanceId: 'test-inst-item-salve-burngrade', action: 'consume', targetNpcId: targetId })
    const npc = result.roster.find((n) => n.npcId === targetId)!
    expect(npc.states.health).toBe(100)
  })
})

describe('useItem — document disposition', () => {
  it('archives a document (filed) and removes it from inventory', () => {
    const state = stateWithItem('item-ledger-bureau')
    const result = useItem(state, { instanceId: 'test-inst-item-ledger-bureau', action: 'archive' })
    expect(result.inventoryState.player.bagContainers).toHaveLength(0)
    expect(result.activityLog[0]?.message).toContain('filed')
  })

  it('presents a document and removes it from inventory', () => {
    const state = stateWithItem('item-papers-false-citizen')
    const result = useItem(state, { instanceId: 'test-inst-item-papers-false-citizen', action: 'present' })
    expect(result.inventoryState.player.bagContainers).toHaveLength(0)
    expect(result.activityLog[0]?.message).toContain('presented')
  })
})

describe('useItem — invalid / edge cases', () => {
  it('returns unchanged state when instanceId does not exist', () => {
    const result = useItem(initialStateWithIda, { instanceId: 'nonexistent', action: 'consume' })
    expect(result).toBe(initialStateWithIda)
  })

  it('returns unchanged state for unsupported action type', () => {
    const state = stateWithItem('item-salve-burngrade')
    const result = useItem(state, { instanceId: 'test-inst-item-salve-burngrade', action: 'equip' })
    // equip is not yet handled — falls through, state unchanged
    expect(result.inventoryState.player.bagContainers).toHaveLength(1)
  })
})
