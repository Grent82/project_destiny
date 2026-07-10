import { describe, expect, it } from 'vitest'
import type { ContainerType } from '../../domain/inventory/contracts'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameSliceReducer, gameActions } from '../store/gameSlice'
import { endDay } from './endDay'

// Test-quality pass (destiny-ukh4e): this describe block overlaps in subject matter with
// inventory/equipItem.test.ts's "loadout sync" describe block -- both assert that equipping syncs
// npc.loadout. Intentionally NOT consolidated: this file exercises the REDUCER layer
// (gameSliceReducer + gameActions.equipItem, the actual Redux wiring a real dispatch goes through),
// while equipItem.test.ts exercises the bare COMMAND function directly. A bug in the reducer's own
// payload mapping (e.g. itemsReducers.ts's slot-name translation) would only be caught here; a bug
// in the command's own logic would only be caught there. Keep both.
describe('equipItem reducer', () => {
  const npcId = initialGameStateSnapshot.npcRuntimeStates[0]?.npcId ?? 'npc-marion-vale'

  function createStateWithNpcItem(itemId: string, instanceId: string) {
    return {
      ...initialGameStateSnapshot,
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        npcInventories: {
          ...initialGameStateSnapshot.inventoryState.npcInventories,
          [npcId]: [
            {
              containerId: `npc:${npcId}:inventory`,
              containerType: 'backpack' as ContainerType,
              ownerId: npcId,
              maxSlots: 20,
              slots: [
                {
                  slotId: `slot-${instanceId}`,
                  itemInstanceId: instanceId,
                  quantity: 1,
                },
              ],
              locked: false,
            },
          ],
        },
        itemRegistry: {
          ...initialGameStateSnapshot.inventoryState.itemRegistry,
          [instanceId]: {
            uniqueId: instanceId,
            itemId,
            quantity: 1,
            locationType: 'npc_inventory' as const,
            locationId: npcId,
            acquiredDay: 1,
            acquiredFrom: npcId,
            flags: [],
          },
        },
      },
    }
  }

  it('equips weapon from NPC inventory to primaryWeapon slot and keeps loadout in sync (destiny-x27g)', () => {
    const state = createStateWithNpcItem('weapon-dagger-wasterunner', 'inst-weapon-dagger-wasterunner-001')
    const action = gameActions.equipItem({ npcId, slot: 'primaryWeaponId', itemId: 'inst-weapon-dagger-wasterunner-001' })
    const next = gameSliceReducer(state, action)
    const npc = next.npcRuntimeStates.find((r) => r.npcId === npcId)
    expect(npc?.equipment.weapon).toBe('inst-weapon-dagger-wasterunner-001')
    // destiny-x27g: combat.ts/combatants.ts and the Roster screen read loadout, not equipment --
    // this used to stay null forever, so equipping via the UI had no visible effect anywhere.
    // Previously this test only checked `equipment` and its own comment rationalized the gap
    // ("updates equipment, not loadout directly") instead of treating it as the bug it was.
    expect(npc?.loadout.primaryWeaponId).toBe('weapon-dagger-wasterunner')
  })

  it('equips armor from NPC inventory to armor slot and keeps loadout in sync (destiny-x27g)', () => {
    const state = createStateWithNpcItem('armor-light-tallow-work-coat', 'inst-armor-light-tallow-work-coat-001')
    const action = gameActions.equipItem({ npcId, slot: 'armorId', itemId: 'inst-armor-light-tallow-work-coat-001' })
    const next = gameSliceReducer(state, action)
    const npc = next.npcRuntimeStates.find((r) => r.npcId === npcId)
    expect(npc?.equipment.armor).toBe('inst-armor-light-tallow-work-coat-001')
    expect(npc?.loadout.armorId).toBe('armor-light-tallow-work-coat')
  })

  it('unequips weapon from primaryWeapon slot and clears loadout (destiny-x27g)', () => {
    const instanceId = 'inst-weapon-dagger-wasterunner-001'
    const stateWithWeapon = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((npc, i) =>
        i === 0
          ? { ...npc, equipment: { ...npc.equipment, weapon: instanceId }, loadout: { ...npc.loadout, primaryWeaponId: 'weapon-dagger-wasterunner' } }
          : npc,
      ),
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        npcInventories: {
          ...initialGameStateSnapshot.inventoryState.npcInventories,
          [npcId]: [
            {
              containerId: `npc:${npcId}:inventory`,
              containerType: 'backpack' as ContainerType,
              ownerId: npcId,
              maxSlots: 20,
              slots: [],
              locked: false,
            },
          ],
        },
        itemRegistry: {
          ...initialGameStateSnapshot.inventoryState.itemRegistry,
          [instanceId]: {
            uniqueId: instanceId,
            itemId: 'weapon-dagger-wasterunner',
            quantity: 1,
            locationType: 'equipment' as const,
            locationId: npcId,
            equippedSlot: 'weapon' as const,
            acquiredDay: 1,
            acquiredFrom: npcId,
            flags: [],
          },
        },
      },
    }
    const action = gameActions.equipItem({ npcId, slot: 'primaryWeaponId', itemId: null })
    const next = gameSliceReducer(stateWithWeapon, action)
    const npc = next.npcRuntimeStates.find((r) => r.npcId === npcId)
    expect(npc?.equipment.weapon).toBeNull()
    expect(npc?.loadout.primaryWeaponId).toBeNull()
  })

  it('does nothing when npcId is not found', () => {
    const state = initialGameStateSnapshot
    const action = gameActions.equipItem({ npcId: 'npc-does-not-exist', slot: 'primaryWeaponId', itemId: 'weapon-dagger-wasterunner' })
    const next = gameSliceReducer(state, action)
    expect(next.npcRuntimeStates).toEqual(state.npcRuntimeStates)
  })

  it('does nothing when item is not found in accessible inventory', () => {
    const state = initialGameStateSnapshot
    const action = gameActions.equipItem({ npcId, slot: 'primaryWeaponId', itemId: 'inst-nonexistent-weapon' })
    const next = gameSliceReducer(state, action)
    expect(next).toEqual(state)
  })
})

describe('isFirstRun flag', () => {
  it('starts as true in the initial game state', () => {
    expect(initialGameStateSnapshot.isFirstRun).toBe(true)
  })

  it('becomes false after endDay is called', () => {
    const next = gameSliceReducer(initialGameStateSnapshot, gameActions.endDay())
    expect(next.isFirstRun).toBe(false)
  })

  it('remains false on subsequent endDay calls', () => {
    const afterFirst = gameSliceReducer(initialGameStateSnapshot, gameActions.endDay())
    const afterSecond = gameSliceReducer(afterFirst, gameActions.endDay())
    expect(afterSecond.isFirstRun).toBe(false)
  })

  it('endDay command sets isFirstRun false via direct command', () => {
    const stateWithFirstRun = { ...initialGameStateSnapshot, isFirstRun: true }
    const next = endDay(stateWithFirstRun)
    // endDay command returns a new state; isFirstRun is set in the reducer
    // So we verify via the reducer path
    const viaReducer = gameSliceReducer(stateWithFirstRun, gameActions.endDay())
    expect(viaReducer.isFirstRun).toBe(false)
    // The raw command doesn't set isFirstRun (that's the reducer's job)
    expect(next.isFirstRun).toBe(true)
  })
})
