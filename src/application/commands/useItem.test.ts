import { describe, it, expect } from 'vitest'
import { useItem } from './useItem'
import { initialStateWithIda } from './testFixtures'
import type { GameState } from '../../domain/game/contracts'

/**
 * Creates a game state with an item in the new inventory system.
 */
function stateWithItem(itemId: string, quantity = 1) {
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
      npcRuntimeStates: state.npcRuntimeStates.map((n) =>
        n.npcId === targetId ? { ...n, states: { ...n.states, health: 60 } } : n,
      ),
    }
    const result = useItem(s, { instanceId: 'test-inst-item-salve-burngrade', action: 'consume', targetNpcId: targetId })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === targetId)!
    expect(npc.states.health).toBe(66) // 60 + 6
    expect(result.inventoryState.player.bagContainers).toHaveLength(0)
    // Salve also carries a removeStatus(burn) effect (destiny-y7jx content fix) — most recent log entry is first.
    expect(result.activityLog.some((entry) => entry.message.includes('+6 health'))).toBe(true)
    expect(result.activityLog[0]?.message).toContain("Status 'burn' removed")
  })

  it('caps heal at 100', () => {
    const targetId = 'npc-ida-rhys'
    const state = stateWithItem('item-salve-burngrade')
    const s = {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((n) =>
        n.npcId === targetId ? { ...n, states: { ...n.states, health: 98 } } : n,
      ),
    }
    const result = useItem(s, { instanceId: 'test-inst-item-salve-burngrade', action: 'consume', targetNpcId: targetId })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === targetId)!
    expect(npc.states.health).toBe(100)
  })

  it('caps self-healing at the player maximum', () => {
    const state = stateWithItem('item-salve-burngrade')
    const s = {
      ...state,
      playerCharacter: {
        ...state.playerCharacter,
        combatState: {
          health: 79,
          morale: 64,
          injury: 0,
        },
      },
    }

    const result = useItem(s, {
      instanceId: 'test-inst-item-salve-burngrade',
      action: 'consume',
    })

    expect(result.playerCharacter.combatState?.health).toBe(80)
  })
})

describe('useItem — stat_mod effects (destiny-q6vx)', () => {
  it('using item-waterskin-filled reduces both hunger and intoxication', () => {
    const targetId = 'npc-ida-rhys'
    const state = stateWithItem('item-waterskin-filled')
    const s = {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((n) =>
        n.npcId === targetId ? { ...n, states: { ...n.states, hunger: 50, intoxication: 40 } } : n,
      ),
    }
    const result = useItem(s, { instanceId: 'test-inst-item-waterskin-filled', action: 'consume', targetNpcId: targetId })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === targetId)!
    expect(npc.states.hunger).toBe(40) // 50 - 10
    // Previously silently dropped: statMap had no 'intoxication' key (item authored stat:'intoxication'
    // instead of the statMap's 'toxin' key), so this effect never applied.
    expect(npc.states.intoxication).toBe(20) // 40 - 20
  })

  it('using item-soap-bar-plain reduces hygiene', () => {
    const targetId = 'npc-ida-rhys'
    const state = stateWithItem('item-soap-bar-plain')
    const s = {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((n) =>
        n.npcId === targetId ? { ...n, states: { ...n.states, hygiene: 68 } } : n,
      ),
    }
    // Previously silently dropped entirely: statMap had no 'hygiene' key at all.
    const result = useItem(s, { instanceId: 'test-inst-item-soap-bar-plain', action: 'consume', targetNpcId: targetId })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === targetId)!
    expect(npc.states.hygiene).toBe(38) // 68 - 30
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

  // destiny-1g74: item-form-ward-petition's enableAction effect used to live only in the legacy
  // 'effects' field, invisible to applyDocumentDisposition (which reads typedEffects) -- archiving
  // it never unlocked 'file-ward-petition'. Moved into typedEffects alongside its existing
  // evidence_use effect.
  it('unlocks file-ward-petition when item-form-ward-petition is archived (destiny-1g74)', () => {
    const state = stateWithItem('item-form-ward-petition')
    const result = useItem(state, { instanceId: 'test-inst-item-form-ward-petition', action: 'archive' })
    expect(result.enabledActions).toContain('file-ward-petition')
  })
})

describe('useItem — evidence use (destiny-23qg)', () => {
  it('consuming an evidence_use item removes it from inventory and records it in evidenceInventory', () => {
    const state = stateWithItem('item-tally-debt-instrument')
    const result = useItem(state, { instanceId: 'test-inst-item-tally-debt-instrument', action: 'consume' })

    expect(result.inventoryState.player.bagContainers).toHaveLength(0)
    expect(result.evidenceInventory).toHaveLength(1)
    expect(result.evidenceInventory[0]).toEqual({
      instanceId: 'test-inst-item-tally-debt-instrument',
      itemId: 'item-tally-debt-instrument',
      disposition: 'filed',
    })
    expect(result.activityLog[0]?.message).toContain('Used')
    expect(result.activityLog[0]?.message).toContain('as evidence (filed)')
  })

  it('appends to evidenceInventory rather than replacing prior entries', () => {
    const state = stateWithItem('item-tally-debt-instrument')
    const withPriorEntry: GameState = {
      ...state,
      evidenceInventory: [{ instanceId: 'earlier-instance', itemId: 'item-permit-reproduction', disposition: 'presented' }],
    }

    const result = useItem(withPriorEntry, { instanceId: 'test-inst-item-tally-debt-instrument', action: 'consume' })

    expect(result.evidenceInventory).toHaveLength(2)
    expect(result.evidenceInventory[0]?.itemId).toBe('item-permit-reproduction')
    expect(result.evidenceInventory[1]?.itemId).toBe('item-tally-debt-instrument')
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
