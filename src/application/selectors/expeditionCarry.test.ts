/**
 * Tests for expedition carry limits (destiny-xqa6).
 */

import { describe, it, expect } from 'vitest'
import {
  selectExpeditionCarryLoad,
  selectIsExpeditionOverCarryLimit,
  EXPEDITION_CARRY_LIMITS,
} from '../selectors/expeditionCarry'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'
import type { ContainerType } from '../../domain/inventory/contracts'

const SQUAD_NPC = 'npc-marion-vale'
const DEST_ID = 'dest-ashfields' // must exist in catalog

function createInventoryWithMissionPackItems(items: Array<{ instanceId: string; itemId: string; quantity: number }>) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [],
      usedBagSlots: 0,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: items.length > 0 ? [{
      containerId: 'container-mission-pack',
      containerType: 'supply_pack' as ContainerType,
      ownerId: 'mission_pack',
      maxSlots: 20,
      slots: items.map((item) => ({
        slotId: `slot-${item.instanceId}`,
        itemInstanceId: item.instanceId,
        quantity: item.quantity,
      })),
      locked: false,
    }] : [],
    itemRegistry: Object.fromEntries(items.map((item) => [item.instanceId, { itemId: item.itemId, uniqueId: item.instanceId, quantity: item.quantity, locationType: 'container' as const, acquiredDay: 1, flags: [] }])),
  }
}

function stateWithMissionPack(items: Array<{ instanceId: string; itemId: string; quantity: number }>): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: createInventoryWithMissionPackItems(items),
  }
}

describe('selectExpeditionCarryLoad', () => {
  it('returns all carry categories', () => {
    const store = createGameStore()
    const load = selectExpeditionCarryLoad(store.getState())
    const cats = load.map((c) => c.category)
    expect(cats).toContain('document')
    expect(cats).toContain('tradeGood')
    expect(cats).toContain('tool')
    expect(cats).toContain('material')
    expect(cats).toContain('consumable')
  })

  it('counts document items correctly', () => {
    // item-ledger-bureau is a document category
    const state = stateWithMissionPack([
      { instanceId: 'inst-doc-1', itemId: 'item-ledger-bureau', quantity: 2 },
      { instanceId: 'inst-doc-2', itemId: 'item-ledger-bureau', quantity: 1 },
    ])
    const store = createGameStore(state)
    const load = selectExpeditionCarryLoad(store.getState())
    const doc = load.find((c) => c.category === 'document')!
    expect(doc.used).toBe(3)
    expect(doc.limit).toBe(5)
    expect(doc.overLimit).toBe(false)
  })

  it('flags overLimit when document count exceeds 5', () => {
    const state = stateWithMissionPack([
      { instanceId: 'inst-doc-over', itemId: 'item-ledger-bureau', quantity: 6 },
    ])
    const store = createGameStore(state)
    const load = selectExpeditionCarryLoad(store.getState())
    const doc = load.find((c) => c.category === 'document')!
    expect(doc.overLimit).toBe(true)
  })

  it('returns 0 used for categories with no mission_pack items', () => {
    const store = createGameStore()
    const load = selectExpeditionCarryLoad(store.getState())
    load.forEach((c) => expect(c.used).toBe(0))
  })
})

describe('selectIsExpeditionOverCarryLimit', () => {
  it('returns false when pack is empty', () => {
    const store = createGameStore()
    expect(selectIsExpeditionOverCarryLimit(store.getState())).toBe(false)
  })

  it('returns false when within limits', () => {
    const state = stateWithMissionPack([
      { instanceId: 'inst-doc-ok', itemId: 'item-ledger-bureau', quantity: 3 }, // document: 3/5
    ])
    const store = createGameStore(state)
    expect(selectIsExpeditionOverCarryLimit(store.getState())).toBe(false)
  })

  it('returns true when over document limit', () => {
    const state = stateWithMissionPack([
      { instanceId: 'inst-doc-over', itemId: 'item-ledger-bureau', quantity: 6 }, // document: 6 > 5
    ])
    const store = createGameStore(state)
    expect(selectIsExpeditionOverCarryLimit(store.getState())).toBe(true)
  })
})

describe('EXPEDITION_CARRY_LIMITS constants', () => {
  it('has correct document limit', () => {
    expect(EXPEDITION_CARRY_LIMITS.document).toBe(5)
  })

  it('has correct tradeGood limit', () => {
    expect(EXPEDITION_CARRY_LIMITS.tradeGood).toBe(8)
  })

  it('has correct tool limit', () => {
    expect(EXPEDITION_CARRY_LIMITS.tool).toBe(2)
  })

  it('consumable has no hard limit (null)', () => {
    expect(EXPEDITION_CARRY_LIMITS.consumable).toBeNull()
  })
})

describe('startExpedition carry limit gate', () => {
  it('launches expedition when within limits', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      roster: initialGameStateSnapshot.roster.map((n) =>
        n.npcId === SQUAD_NPC ? { ...n, states: { ...n.states, health: 60 } } : n,
      ),
      selectedSquadNpcIds: [SQUAD_NPC],
      inventoryState: createInventoryWithMissionPackItems([
        { instanceId: 'inst-doc-ok', itemId: 'item-ledger-bureau', quantity: 3 },
      ]),
    })
    store.dispatch(
      gameActions.startExpedition({
        destinationId: DEST_ID,
        squadNpcIds: [SQUAD_NPC],
        supplies: 0,
      }),
    )
    expect(store.getState().game.expeditionState.status).toBe('traveling')
  })

  it('blocks expedition when over document limit', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      roster: initialGameStateSnapshot.roster.map((n) =>
        n.npcId === SQUAD_NPC ? { ...n, states: { ...n.states, health: 60 } } : n,
      ),
      selectedSquadNpcIds: [SQUAD_NPC],
      inventoryState: createInventoryWithMissionPackItems([
        { instanceId: 'inst-doc-over', itemId: 'item-ledger-bureau', quantity: 6 },
      ]),
    })
    store.dispatch(
      gameActions.startExpedition({
        destinationId: DEST_ID,
        squadNpcIds: [SQUAD_NPC],
        supplies: 0,
      }),
    )
    // Expedition should NOT have started
    expect(store.getState().game.expeditionState.status).toBe('idle')
  })
})
