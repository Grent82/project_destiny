import { describe, expect, it } from 'vitest'
import { equipItem, unequipItem } from './equipItem'
import type { GameState } from '../../../domain/game/contracts'
import type { InventoryContainer } from '../../../domain/inventory/contracts'
import { initialGameStateSnapshot } from '../../store/initialGameState'

const NPC_ID = 'npc-marion-vale'

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

function stateWithNpcInventoryItem(itemId: string): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      npcInventories: {
        [NPC_ID]: [{
          containerId: `container-${NPC_ID}`,
          containerType: 'backpack',
          ownerId: NPC_ID,
          maxSlots: 20,
          slots: [{ slotId: `slot-${itemId}`, itemInstanceId: itemId, quantity: 1 }],
          locked: false,
        }],
      },
      itemRegistry: {
        [itemId]: { uniqueId: itemId, itemId, quantity: 1, locationType: 'npc_inventory', locationId: NPC_ID, acquiredDay: 1, flags: [] },
      },
    },
  }
}

// A realistic acquired item: the instance id is NOT the same string as the item definition id
// (unlike stateWithNpcInventoryItem's instanceId===itemId shortcut above). This is the shape
// every item actually gets once tracked through itemRegistry (see e.g. real save data:
// inst-dagger-wasterunner-001 -> itemId weapon-dagger-wasterunner) -- and it's the exact
// distinction that hid the destiny-mv8n loadout-sync bug, since transferItem's own loadout
// side effect only "worked" by accident when instanceId happened to equal itemId.
function stateWithNpcInventoryItemDistinctIds(itemId: string, instanceId: string): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      npcInventories: {
        [NPC_ID]: [{
          containerId: `container-${NPC_ID}`,
          containerType: 'backpack',
          ownerId: NPC_ID,
          maxSlots: 20,
          slots: [{ slotId: `slot-${instanceId}`, itemInstanceId: instanceId, quantity: 1 }],
          locked: false,
        }],
      },
      itemRegistry: {
        [instanceId]: { uniqueId: instanceId, itemId, quantity: 1, locationType: 'npc_inventory', locationId: NPC_ID, acquiredDay: 1, flags: [] },
      },
    },
  }
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

  // destiny-1g74: item-lamp-signal-expedition's enableAction effect was never processed by any
  // equip/give path -- equipItemToPlayer only handled skillBonus. Wired the same tool-effect loop
  // to also process enableAction, populating enabledActions on equip.
  it('populates enabledActions when equipping a tool with an enableAction effect (destiny-1g74)', () => {
    const state = stateWithPlayerBagItem(TOOL_WITHOUT_SKILL_BONUS_ID)
    const result = equipItem(state, { ownerId: 'player', itemInstanceId: TOOL_WITHOUT_SKILL_BONUS_ID, slot: 'weapon' })
    expect(result.enabledActions).toContain('long-range-signal')
  })

  it('does not add the same enabledAction twice if the tool is unequipped and re-equipped', () => {
    const state = { ...stateWithPlayerBagItem(TOOL_WITHOUT_SKILL_BONUS_ID), enabledActions: ['long-range-signal'] }
    const result = equipItem(state, { ownerId: 'player', itemInstanceId: TOOL_WITHOUT_SKILL_BONUS_ID, slot: 'weapon' })
    expect(result.enabledActions).toEqual(['long-range-signal'])
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

// Found while investigating a user question about whether the inventory fixes made elsewhere
// this session also cover NPC-owned inventories: equipItemToNpc/unequipItemFromNpcInternal are
// the LIVE code path (wired via itemsReducers.ts's equipItem reducer for ownerId !== 'player');
// a separate, entirely unreferenced economy/npcEquipItem.ts has the same discard bug but is dead
// code (zero importers), not reachable from any UI.
describe('equipItem — NPC equip/unequip (bug fix regression, found investigating destiny-i08x follow-up)', () => {
  it('moves the item into the NPC equipment slot and out of their personal inventory', () => {
    const state = stateWithNpcInventoryItem(WEAPON_ID)
    const result = equipItem(state, { ownerId: NPC_ID, itemInstanceId: WEAPON_ID, slot: 'weapon' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.weapon).toBe(WEAPON_ID)
    expect(result.inventoryState.npcInventories[NPC_ID]?.flatMap((c) => c.slots)).toHaveLength(0)
  })

  it('records an activity log entry for the NPC equip (previously discarded: appendActivityLogEntry return value was never applied)', () => {
    const state = stateWithNpcInventoryItem(WEAPON_ID)
    const result = equipItem(state, { ownerId: NPC_ID, itemInstanceId: WEAPON_ID, slot: 'weapon' })
    expect(result.activityLog[0]?.message).toContain('Marion Vale')
    expect(result.activityLog[0]?.message).toContain('equipped')
  })

  it('records an activity log entry when unequipping from an NPC (previously missing entirely, not just discarded)', () => {
    const equipped = equipItem(stateWithNpcInventoryItem(WEAPON_ID), { ownerId: NPC_ID, itemInstanceId: WEAPON_ID, slot: 'weapon' })
    const result = unequipItem(equipped, { ownerId: NPC_ID, slot: 'weapon' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.weapon).toBeNull()
    expect(result.activityLog[0]?.message).toContain('Marion Vale')
    expect(result.activityLog[0]?.message).toContain('unequipped')
  })

  it('logs both the unequip and the equip when swapping an NPC weapon slot', () => {
    const firstInstanceId = 'inst-flicker-001'
    const secondInstanceId = WEAPON_ID
    const state: GameState = {
      ...initialGameStateSnapshot,
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        npcInventories: {
          [NPC_ID]: [{
            containerId: `container-${NPC_ID}`,
            containerType: 'backpack',
            ownerId: NPC_ID,
            maxSlots: 20,
            slots: [
              { slotId: `slot-${firstInstanceId}`, itemInstanceId: firstInstanceId, quantity: 1 },
              { slotId: `slot-${secondInstanceId}`, itemInstanceId: secondInstanceId, quantity: 1 },
            ],
            locked: false,
          }],
        },
        itemRegistry: {
          [firstInstanceId]: { uniqueId: firstInstanceId, itemId: 'weapon-dagger-ring-flicker', quantity: 1, locationType: 'npc_inventory', locationId: NPC_ID, acquiredDay: 1, flags: [] },
          [secondInstanceId]: { uniqueId: secondInstanceId, itemId: WEAPON_ID, quantity: 1, locationType: 'npc_inventory', locationId: NPC_ID, acquiredDay: 1, flags: [] },
        },
      },
    }
    const equipped = equipItem(state, { ownerId: NPC_ID, itemInstanceId: firstInstanceId, slot: 'weapon' })
    const result = equipItem(equipped, { ownerId: NPC_ID, itemInstanceId: secondInstanceId, slot: 'weapon' })

    // Two equipItem calls happened (one per weapon), so two "equipped" entries are expected in
    // total across the whole log -- only the second call's internal swap produces an "unequipped"
    // entry, since the first call had nothing in the slot to unequip.
    const unequipEntries = result.activityLog.filter((entry) => entry.message.includes('unequipped'))
    const equipEntries = result.activityLog.filter((entry) => entry.message.includes('equipped') && !entry.message.includes('unequipped'))
    expect(unequipEntries).toHaveLength(1)
    expect(equipEntries).toHaveLength(2)
  })

  it('does not mutate the input state npc object (equipItemToNpc used to write updatedNpc.equipment[slot] in place)', () => {
    const state = stateWithNpcInventoryItem(WEAPON_ID)
    const npcBefore = state.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    const equipmentSnapshotBefore = { ...npcBefore.equipment }

    equipItem(state, { ownerId: NPC_ID, itemInstanceId: WEAPON_ID, slot: 'weapon' })

    // The exact same npc object reference from the ORIGINAL state must be untouched.
    expect(state.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!.equipment).toEqual(equipmentSnapshotBefore)
  })
})

// destiny-mv8n root cause: combat.ts/combatants.ts and selectors/roster.ts (the roster screen)
// read npc.loadout.primaryWeaponId/secondaryWeaponId/armorId -- NOT npc.equipment, which is what
// equipItemToNpc/unequipItemFromNpcInternal wrote to exclusively. Equipping via the live UI
// (ItemSelectionModal -> gameActions.equipItem) updated a field nothing else in the game reads,
// so the roster card and combat stats never changed. This was masked in the ABOVE describe
// block's fixtures, all of which used instanceId === itemId (a common test shortcut) -- with
// realistic distinct ids (the shape every acquired item actually has), transferItem's own
// best-effort loadout side effect fails silently, since it resolves the item definition from an
// id that is never the real itemId for these source types.
describe('equipItem — loadout sync for combat/roster (destiny-mv8n root cause)', () => {
  it('sets loadout.primaryWeaponId to the item definition id when equipping a weapon with a distinct instance id', () => {
    const instanceId = 'inst-dagger-wasterunner-001'
    const state = stateWithNpcInventoryItemDistinctIds(WEAPON_ID, instanceId)
    const result = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'weapon' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.loadout.primaryWeaponId).toBe(WEAPON_ID)
    expect(npc.equipment.weapon).toBe(instanceId)
  })

  it('sets loadout.armorId when equipping armor with a distinct instance id', () => {
    const armorItemId = 'armor-light-tallow-work-coat'
    const instanceId = 'inst-work-coat-001'
    const state = stateWithNpcInventoryItemDistinctIds(armorItemId, instanceId)
    const result = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'armor' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.loadout.armorId).toBe(armorItemId)
  })

  it('sets loadout.secondaryWeaponId when equipping into accessory_1 (matches the primaryWeaponId/secondaryWeaponId/armorId UI slot mapping in itemsReducers.ts)', () => {
    const instanceId = 'inst-dagger-wasterunner-002'
    const state = stateWithNpcInventoryItemDistinctIds(WEAPON_ID, instanceId)
    const result = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'accessory_1' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.loadout.secondaryWeaponId).toBe(WEAPON_ID)
  })

  it('clears loadout.primaryWeaponId when unequipping', () => {
    const instanceId = 'inst-dagger-wasterunner-001'
    const state = stateWithNpcInventoryItemDistinctIds(WEAPON_ID, instanceId)
    const equipped = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'weapon' })
    const result = unequipItem(equipped, { ownerId: NPC_ID, slot: 'weapon' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.loadout.primaryWeaponId).toBeNull()
  })
})

// User report, live-reproduced via Playwright: an armor item visibly offered by the equip picker
// (ItemSelectionModal, backed by selectHouseStorageArmors) still silently failed to equip. Root
// cause: the item lived in a container with ownerId:'house_storage' (the House Storage panel's
// pack/unpack path), but getAccessibleContainersForNpc only ever exposed the fixed
// HOUSEHOLD_STORAGE_CONTAINER_ID container as accessible -- so findNpcAccessibleItem could never
// locate it, and equipItemToNpc silently returned state unchanged.
describe('equipItem — equipping from the House Storage panel container, not just HOUSEHOLD_STORAGE_CONTAINER_ID', () => {
  function stateWithArmorInPanelHouseStorage(instanceId: string): GameState {
    return {
      ...initialGameStateSnapshot,
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        sharedContainers: [{
          containerId: 'house-storage-main',
          containerType: 'vault' as const,
          ownerId: 'house_storage',
          maxSlots: 40,
          slots: [{ slotId: `slot-${instanceId}`, itemInstanceId: instanceId, quantity: 1 }],
          locked: false,
        }],
        itemRegistry: {
          [instanceId]: { uniqueId: instanceId, itemId: 'armor-light-tallow-work-coat', quantity: 1, locationType: 'container', locationId: 'house-storage-main', acquiredDay: 1, flags: [] },
        },
      },
    }
  }

  it('equips armor sitting in the ownerId:house_storage container onto an NPC', () => {
    const instanceId = 'inst-work-coat-panel-001'
    const state = stateWithArmorInPanelHouseStorage(instanceId)
    const result = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'armor' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.armor).toBe(instanceId)
    expect(npc.loadout.armorId).toBe('armor-light-tallow-work-coat')
    expect(result.activityLog[0]?.message).toContain('equipped')
  })
})
