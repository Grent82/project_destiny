import { describe, expect, it } from 'vitest'
import { equipItem } from './equipItem'
import type { GameState } from '../../../domain/game/contracts'
import type { InventoryContainer } from '../../../domain/inventory/contracts'
import { initialGameStateSnapshot } from '../../store/initialGameState'

const WEAPON_ID = 'weapon-dagger-wasterunner'
const TOOL_WITHOUT_SKILL_BONUS_ID = 'item-lamp-signal-expedition'
const TOOL_WITH_SKILL_BONUS_ID = 'item-lockpick-ringcut'

function stateWithPlayerBagItems(itemIds: string[]): GameState {
  const container: InventoryContainer = {
    containerId: 'container-player-bag',
    containerType: 'backpack',
    ownerId: 'player',
    maxSlots: 20,
    slots: itemIds.map((itemId) => ({ slotId: `slot-${itemId}`, itemInstanceId: itemId, quantity: 1 })),
    locked: false,
  }
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      player: {
        ...initialGameStateSnapshot.inventoryState.player,
        bagContainers: [container],
        usedBagSlots: itemIds.length,
        equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
      },
    },
  }
}

function stateWithPlayerBagItem(itemId: string): GameState {
  return stateWithPlayerBagItems([itemId])
}

describe('equipItem — player equip/unequip (bug fix regression, found during destiny-y7jx)', () => {
  it('moves the item into equipmentSlots and out of bagContainers', () => {
    const state = stateWithPlayerBagItem(WEAPON_ID)
    const result = equipItem(state, { ownerId: 'player', itemInstanceId: WEAPON_ID, slot: 'weapon' })
    expect(result.inventoryState.player.equipmentSlots.weapon).toBe(WEAPON_ID)
    expect(result.inventoryState.player.bagContainers.flatMap((c) => c.slots)).toHaveLength(0)
  })

  it('records an activity log entry for the equip (previously discarded: appendActivityLogEntry return value was never applied to the returned state)', () => {
    const state = stateWithPlayerBagItem(WEAPON_ID)
    const result = equipItem(state, { ownerId: 'player', itemInstanceId: WEAPON_ID, slot: 'weapon' })
    expect(result.activityLog[0]?.message).toContain('Equipped')
    expect(result.activityLog[0]?.message).toContain('weapon')
  })

  it('records an activity log entry for the unequip (same discard bug affected the unequip path)', () => {
    const baseState = stateWithPlayerBagItems([WEAPON_ID, TOOL_WITHOUT_SKILL_BONUS_ID])
    const equipped = equipItem(baseState, { ownerId: 'player', itemInstanceId: WEAPON_ID, slot: 'weapon' })
    const result = equipItem(equipped, { ownerId: 'player', itemInstanceId: TOOL_WITHOUT_SKILL_BONUS_ID, slot: 'weapon' })
    // Equipping a second item into the same slot unequips the first — that unequip's log entry must survive.
    expect(result.activityLog.some((entry) => entry.message.includes('Unequipped'))).toBe(true)
  })

  it('does not add to equippedTools when the equipped tool has no skillBonus effect', () => {
    const state = stateWithPlayerBagItem(TOOL_WITHOUT_SKILL_BONUS_ID)
    const result = equipItem(state, { ownerId: 'player', itemInstanceId: TOOL_WITHOUT_SKILL_BONUS_ID, slot: 'weapon' })
    expect(result.equippedTools).toEqual([])
  })

  it('adds to equippedTools when equipping a tool with a skillBonus effect (previously discarded: the finalState computed here was thrown away, the function returned newState instead)', () => {
    const state = stateWithPlayerBagItem(TOOL_WITH_SKILL_BONUS_ID)
    const result = equipItem(state, { ownerId: 'player', itemInstanceId: TOOL_WITH_SKILL_BONUS_ID, slot: 'weapon' })
    expect(result.equippedTools).toEqual([{ itemId: TOOL_WITH_SKILL_BONUS_ID, skill: 'lockpicking', value: 15 }])
  })

  it('removes the tool from equippedTools when unequipped', () => {
    const baseState = stateWithPlayerBagItems([TOOL_WITH_SKILL_BONUS_ID, WEAPON_ID])
    const equipped = equipItem(baseState, { ownerId: 'player', itemInstanceId: TOOL_WITH_SKILL_BONUS_ID, slot: 'weapon' })
    expect(equipped.equippedTools).toHaveLength(1)
    const result = equipItem(equipped, { ownerId: 'player', itemInstanceId: WEAPON_ID, slot: 'weapon' })
    // Swapping the slot forces an unequip of the lockpick set first.
    expect(result.equippedTools).toEqual([])
  })
})
