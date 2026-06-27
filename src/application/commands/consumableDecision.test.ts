import { describe, it, expect } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { gameActions } from '../store/gameSlice'
import { initialGameStateSnapshot } from '../store/initialGameState'
import type { GameState } from '../../domain/game/contracts'
import type { ContainerType } from '../../domain/inventory/contracts'

function createInventoryWithPlayerItem(instanceId: string, itemId: string) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [{
        containerId: 'container-player-bag',
        containerType: 'backpack' as ContainerType,
        ownerId: 'player',
        maxSlots: 20,
        slots: [{
          slotId: `slot-${instanceId}`,
          itemInstanceId: instanceId,
          quantity: 1,
        }],
        locked: false,
      }],
      usedBagSlots: 1,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: [],
    itemRegistry: { [instanceId]: { itemId, uniqueId: instanceId, quantity: 1, locationType: 'player_inventory' as const, acquiredDay: 1, flags: [] } },
  }
}

describe('consumable mission use', () => {
  describe('pendingConsumableDecision initial state', () => {
    it('starts as null', () => {
      const store = createGameStore()
      expect(store.getState().game.pendingConsumableDecision).toBeNull()
    })
  })

  describe('resolveConsumableUse', () => {
    it('applies heal and removes item from inventory', () => {
      const store = createGameStore()
      // Manually set a pending decision
      store.dispatch(
        gameActions.updateWorldNpcState({ npcId: 'npc-test' }) // dummy dispatch to prime
      )
      // Directly set state with a pending decision
      const stateWithDecision: GameState = {
        ...initialGameStateSnapshot,
        inventoryState: createInventoryWithPlayerItem('inst-salve-001', 'item-dressing-league-surplus'),
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
            npcId: 'npc-test',
            name: 'Mara',
            states: { ...initialGameStateSnapshot.roster[0]!.states, health: 60, injury: 20 },
            loadout: {
              primaryWeaponId: null,
              secondaryWeaponId: null,
              armorId: null,
              accessoryIds: [],
              consumableIds: ['inst-salve-001'],
            },
          },
        ],
        pendingConsumableDecision: {
          npcId: 'npc-test',
          npcName: 'Mara',
          instanceId: 'inst-salve-001',
          itemName: 'Field Medkit',
          injuryContext: 'Combat encounter',
        },
      }
      const store2 = createGameStore(stateWithDecision)
      store2.dispatch(gameActions.resolveConsumableUse())
      const state = store2.getState().game
      expect(state.pendingConsumableDecision).toBeNull()
      // Check item is removed from player inventory
      const playerItems = state.inventoryState.player.bagContainers.flatMap(c => c.slots)
      expect(playerItems.some(s => s.itemInstanceId === 'inst-salve-001')).toBe(false)
      // NPC health should have increased
      const npc = state.roster.find((n) => n.npcId === 'npc-test')
      expect(npc!.states.health).toBeGreaterThan(60)
      expect(state.activityLog[0]?.message).toContain('Mara')
    })

    it('does nothing if pendingConsumableDecision is null', () => {
      const store = createGameStore()
      const before = store.getState().game.activityLog.length
      store.dispatch(gameActions.resolveConsumableUse())
      expect(store.getState().game.activityLog.length).toBe(before)
    })
  })

  describe('skipConsumableUse', () => {
    it('logs the skip and clears the decision', () => {
      const stateWithDecision: GameState = {
        ...initialGameStateSnapshot,
        pendingConsumableDecision: {
          npcId: 'npc-test',
          npcName: 'Mara',
          instanceId: 'inst-salve-001',
          itemName: 'Field Medkit',
          injuryContext: 'Combat encounter',
        },
      }
      const store = createGameStore(stateWithDecision)
      store.dispatch(gameActions.skipConsumableUse())
      const state = store.getState().game
      expect(state.pendingConsumableDecision).toBeNull()
      expect(state.activityLog[0]?.message).toContain('Mara')
      expect(state.activityLog[0]?.message).toContain('Field Medkit')
    })

    it('NPC health unchanged when skipping', () => {
      const stateWithDecision: GameState = {
        ...initialGameStateSnapshot,
        roster: [
          {
            ...initialGameStateSnapshot.roster[0]!,
            npcId: 'npc-test',
            name: 'Mara',
            states: { ...initialGameStateSnapshot.roster[0]!.states, health: 65 },
          },
        ],
        pendingConsumableDecision: {
          npcId: 'npc-test',
          npcName: 'Mara',
          instanceId: 'inst-salve-001',
          itemName: 'Field Medkit',
          injuryContext: 'Combat encounter',
        },
      }
      const store = createGameStore(stateWithDecision)
      store.dispatch(gameActions.skipConsumableUse())
      const npc = store.getState().game.roster.find((n) => n.npcId === 'npc-test')
      expect(npc!.states.health).toBe(65) // unchanged
    })
  })
})
