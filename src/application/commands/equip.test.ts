import { describe, expect, it } from 'vitest'
import type { ContainerType } from '../../domain/inventory/contracts'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameSliceReducer, gameActions } from '../store/gameSlice'
import { endDay } from './endDay'

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

  it('equips weapon from NPC inventory to primaryWeapon slot', () => {
    const state = createStateWithNpcItem('weapon-dagger-wasterunner', 'inst-weapon-dagger-wasterunner-001')
    const action = gameActions.equipItem({ npcId, slot: 'primaryWeaponId', itemId: 'inst-weapon-dagger-wasterunner-001' })
    const next = gameSliceReducer(state, action)
    const npc = next.npcRuntimeStates.find((r) => r.npcId === npcId)
    // The equip command updates equipment, not loadout directly
    expect(npc?.equipment.weapon).toBe('inst-weapon-dagger-wasterunner-001')
  })

  it('equips armor from NPC inventory to armor slot', () => {
    const state = createStateWithNpcItem('armor-light-tallow-work-coat', 'inst-armor-light-tallow-work-coat-001')
    const action = gameActions.equipItem({ npcId, slot: 'armorId', itemId: 'inst-armor-light-tallow-work-coat-001' })
    const next = gameSliceReducer(state, action)
    const npc = next.npcRuntimeStates.find((r) => r.npcId === npcId)
    expect(npc?.equipment.armor).toBe('inst-armor-light-tallow-work-coat-001')
  })

  it('unequips weapon from primaryWeapon slot', () => {
    const instanceId = 'inst-weapon-dagger-wasterunner-001'
    const stateWithWeapon = {
      ...initialGameStateSnapshot,
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((npc, i) =>
        i === 0 ? { ...npc, equipment: { ...npc.equipment, weapon: instanceId } } : npc,
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
