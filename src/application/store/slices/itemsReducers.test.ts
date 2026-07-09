import { describe, expect, it } from 'vitest'
import type { ContainerType } from '../../../domain/inventory/contracts'
import { createGameStore } from '../gameStore'
import { initialGameStateSnapshot } from '../initialGameState'
import { gameActions } from '../gameSlice'

const WEAPON_ITEM_ID = 'weapon-dagger-wasterunner'

function stateWithPlayerBag(instanceId: string | null) {
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      player: {
        ...initialGameStateSnapshot.inventoryState.player,
        bagContainers: [
          {
            containerId: 'player:inventory:bag-1',
            containerType: 'backpack' as ContainerType,
            ownerId: 'player',
            maxSlots: 20,
            slots: instanceId ? [{ slotId: `slot-${instanceId}`, itemInstanceId: instanceId, quantity: 1 }] : [],
            locked: false,
          },
        ],
        usedBagSlots: instanceId ? 1 : 0,
      },
      sharedContainers: [],
      itemRegistry: instanceId
        ? { [instanceId]: { itemId: WEAPON_ITEM_ID, uniqueId: instanceId, quantity: 1, locationType: 'container' as const, acquiredDay: 1, flags: [] } }
        : {},
    },
  }
}

function stateWithMissionPackItem(instanceId: string) {
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      // A player already has their default, non-full backpack -- the realistic day-1 case.
      player: {
        ...initialGameStateSnapshot.inventoryState.player,
        bagContainers: [
          {
            containerId: 'player:inventory:bag-1',
            containerType: 'backpack' as ContainerType,
            ownerId: 'player',
            maxSlots: 20,
            slots: [],
            locked: false,
          },
        ],
        usedBagSlots: 0,
      },
      sharedContainers: [
        {
          containerId: 'container-mission-pack',
          containerType: 'supply_pack' as ContainerType,
          ownerId: 'mission_pack',
          maxSlots: 20,
          slots: [{ slotId: `slot-${instanceId}`, itemInstanceId: instanceId, quantity: 1 }],
          locked: false,
        },
      ],
      itemRegistry: {
        [instanceId]: { itemId: WEAPON_ITEM_ID, uniqueId: instanceId, quantity: 1, locationType: 'container' as const, acquiredDay: 1, flags: [] },
      },
    },
  }
}

describe('moveItem — regression: removing from Mission Pack silently deleted the item', () => {
  it('moves an item from mission_pack into an existing, non-full player bag (destiny bug repro)', () => {
    const instanceId = 'inst-repro-dagger'
    const store = createGameStore(stateWithMissionPackItem(instanceId))

    store.dispatch(gameActions.moveItem({ instanceId, location: 'inventory' }))

    const inv = store.getState().game.inventoryState
    // Previously: the item vanished from every container while itemRegistry kept an orphaned entry.
    expect(inv.itemRegistry[instanceId]).toBeDefined()
    const inPlayerBag = inv.player.bagContainers.some((c) => c.slots.some((s) => s.itemInstanceId === instanceId))
    expect(inPlayerBag).toBe(true)
    expect(inv.sharedContainers.find((c) => c.ownerId === 'mission_pack')?.slots).toHaveLength(0)
  })

  it('updates usedBagSlots after adding into an existing container (previously stayed stale)', () => {
    const instanceId = 'inst-repro-dagger'
    const store = createGameStore(stateWithMissionPackItem(instanceId))

    store.dispatch(gameActions.moveItem({ instanceId, location: 'inventory' }))

    expect(store.getState().game.inventoryState.player.usedBagSlots).toBe(1)
  })

  it('creates a fresh bag container when the player has none yet (already-working fallback path)', () => {
    const instanceId = 'inst-repro-dagger'
    const state = stateWithMissionPackItem(instanceId)
    const noBagState = {
      ...state,
      inventoryState: { ...state.inventoryState, player: { ...state.inventoryState.player, bagContainers: [] } },
    }
    const store = createGameStore(noBagState)

    store.dispatch(gameActions.moveItem({ instanceId, location: 'inventory' }))

    const inv = store.getState().game.inventoryState
    expect(inv.player.bagContainers.some((c) => c.slots.some((s) => s.itemInstanceId === instanceId))).toBe(true)
  })

  it('round-trips: packs from inventory into a new mission_pack container, then unpacks back', () => {
    const instanceId = 'inst-roundtrip'
    const store = createGameStore(stateWithPlayerBag(instanceId))

    store.dispatch(gameActions.moveItem({ instanceId, location: 'mission_pack' }))
    let inv = store.getState().game.inventoryState
    expect(inv.player.bagContainers.flatMap((c) => c.slots)).toHaveLength(0)
    expect(inv.sharedContainers.find((c) => c.ownerId === 'mission_pack')?.slots).toHaveLength(1)

    store.dispatch(gameActions.moveItem({ instanceId, location: 'inventory' }))
    inv = store.getState().game.inventoryState
    expect(inv.player.bagContainers.some((c) => c.slots.some((s) => s.itemInstanceId === instanceId))).toBe(true)
    expect(inv.itemRegistry[instanceId]).toBeDefined()
  })

  it('packs into an existing, non-full mission_pack container without discarding the item already there', () => {
    const existingId = 'inst-already-packed'
    const incomingId = 'inst-incoming'
    const baseState = stateWithMissionPackItem(existingId)
    const state = {
      ...baseState,
      inventoryState: {
        ...baseState.inventoryState,
        player: {
          ...baseState.inventoryState.player,
          bagContainers: [
            {
              containerId: 'player:inventory:bag-1',
              containerType: 'backpack' as ContainerType,
              ownerId: 'player',
              maxSlots: 20,
              slots: [{ slotId: `slot-${incomingId}`, itemInstanceId: incomingId, quantity: 1 }],
              locked: false,
            },
          ],
        },
        itemRegistry: {
          ...baseState.inventoryState.itemRegistry,
          [incomingId]: { itemId: WEAPON_ITEM_ID, uniqueId: incomingId, quantity: 1, locationType: 'container' as const, acquiredDay: 1, flags: [] },
        },
      },
    }
    const store = createGameStore(state)

    store.dispatch(gameActions.moveItem({ instanceId: incomingId, location: 'mission_pack' }))

    const packSlots = store.getState().game.inventoryState.sharedContainers.find((c) => c.ownerId === 'mission_pack')?.slots ?? []
    expect(packSlots.map((s) => s.itemInstanceId).sort()).toEqual([existingId, incomingId].sort())
  })

  it('creates an additional mission_pack container instead of dropping the item when the existing one is full', () => {
    const instanceId = 'inst-overflow'
    const baseState = stateWithPlayerBag(instanceId)
    const fullSlots = Array.from({ length: 1 }, (_, i) => ({
      slotId: `slot-filler-${i}`,
      itemInstanceId: `inst-filler-${i}`,
      quantity: 1,
    }))
    const state = {
      ...baseState,
      inventoryState: {
        ...baseState.inventoryState,
        sharedContainers: [
          {
            containerId: 'container-mission-pack-full',
            containerType: 'supply_pack' as ContainerType,
            ownerId: 'mission_pack',
            maxSlots: 1,
            slots: fullSlots,
            locked: false,
          },
        ],
      },
    }
    const store = createGameStore(state)

    store.dispatch(gameActions.moveItem({ instanceId, location: 'mission_pack' }))

    const inv = store.getState().game.inventoryState
    const missionPackContainers = inv.sharedContainers.filter((c) => c.ownerId === 'mission_pack')
    const allPackedIds = missionPackContainers.flatMap((c) => c.slots.map((s) => s.itemInstanceId))
    expect(allPackedIds).toContain(instanceId)
    expect(inv.itemRegistry[instanceId]).toBeDefined()
  })

  it('house_storage round trip: pack to house_storage then unpack back to inventory', () => {
    const instanceId = 'inst-house-roundtrip'
    const store = createGameStore(stateWithPlayerBag(instanceId))

    store.dispatch(gameActions.moveItem({ instanceId, location: 'house_storage' }))
    let inv = store.getState().game.inventoryState
    expect(inv.sharedContainers.find((c) => c.ownerId === 'house_storage')?.slots).toHaveLength(1)

    store.dispatch(gameActions.moveItem({ instanceId, location: 'inventory' }))
    inv = store.getState().game.inventoryState
    expect(inv.player.bagContainers.some((c) => c.slots.some((s) => s.itemInstanceId === instanceId))).toBe(true)
  })
})
