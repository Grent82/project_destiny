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
// the LIVE code path (wired via itemsReducers.ts's equipItem reducer for ownerId !== 'player').
// A separate, entirely unreferenced economy/npcEquipItem.ts used to duplicate this with the same
// discard bug; confirmed dead (zero importers, not reachable from any UI) and deleted alongside
// its test file as part of the 2026-07-10 test-quality pass (destiny-ukh4e).
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

  // User report, live-reproduced: a roster NPC set to "Recovering" (the duty button whose own
  // panel text reads "Resting in proper quarters" -- i.e. physically still in the house) could not
  // equip anything from House Storage. Root cause: isHouseholdMember's allowlist omitted
  // 'recovering', so getAccessibleContainersForNpc granted no access to shared containers and the
  // equip silently no-op'd with zero UI feedback -- exactly "items are visible but equip does
  // nothing." 'deployed'/'transferred' correctly stay excluded (those NPCs are not in the house).
  it('equips armor from household storage onto an NPC whose assignment is "recovering"', () => {
    const instanceId = 'inst-work-coat-panel-002'
    const state = stateWithArmorInPanelHouseStorage(instanceId)
    const npcIndex = state.npcRuntimeStates.findIndex((n) => n.npcId === NPC_ID)
    const recoveringState = {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((n, i) => i === npcIndex ? { ...n, assignment: 'recovering' as const } : n),
    }
    const result = equipItem(recoveringState, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'armor' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.armor).toBe(instanceId)
  })

  it('still denies household storage access to an NPC whose assignment is "deployed"', () => {
    const instanceId = 'inst-work-coat-panel-003'
    const state = stateWithArmorInPanelHouseStorage(instanceId)
    const npcIndex = state.npcRuntimeStates.findIndex((n) => n.npcId === NPC_ID)
    const deployedState = {
      ...state,
      npcRuntimeStates: state.npcRuntimeStates.map((n, i) => i === npcIndex ? { ...n, assignment: 'deployed' as const } : n),
    }
    const result = equipItem(deployedState, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'armor' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.armor).toBeNull()
  })
})

// User-reported live bug (2026-07-09): NPCs hydrated with authored startingEquipment but no backing
// equipment[slot]/itemRegistry instance (world/enemy/story persons via createRuntimeStateFromDefinition,
// which has no state.inventoryState access to register one) displayed loadout.armorId as equipped
// (EquipmentSection reads loadout, not equipment) but clicking "Unequip" silently did nothing --
// unequipItemFromNpc read npc.equipment.armor (null), found no instance, and no-op'd, leaving the
// item still shown as equipped. Same failure shape as every other bug fixed this session.
describe('unequipItem — defensive fallback for loadout-only armor with no backing instance', () => {
  function stateWithLoadoutOnlyArmor(): GameState {
    const npcIndex = initialGameStateSnapshot.npcRuntimeStates.findIndex((n) => n.npcId === NPC_ID)
    return {
      ...initialGameStateSnapshot,
      npcRuntimeStates: initialGameStateSnapshot.npcRuntimeStates.map((n, i) =>
        i === npcIndex
          ? { ...n, loadout: { ...n.loadout, armorId: 'armor-light-tallow-work-coat' }, equipment: { weapon: null, armor: null, accessory: [] } }
          : n,
      ),
    }
  }

  it('clears loadout.armorId when unequipping armor with no backing equipment instance', () => {
    const state = stateWithLoadoutOnlyArmor()
    const result = unequipItem(state, { ownerId: NPC_ID, slot: 'armor' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.loadout.armorId).toBeNull()
  })

  it('logs the unequip so the player gets feedback instead of a silent no-op', () => {
    const state = stateWithLoadoutOnlyArmor()
    const result = unequipItem(state, { ownerId: NPC_ID, slot: 'armor' })
    expect(result.activityLog[0]?.message).toContain('unequipped')
    expect(result.activityLog[0]?.message).toContain('Tallow Ring Work Coat')
  })

  it('is a true no-op when there is nothing in the slot at all (not even a loadout id)', () => {
    const state = initialGameStateSnapshot
    const result = unequipItem(state, { ownerId: NPC_ID, slot: 'armor' })
    expect(result).toBe(state)
  })
})

// Test-quality pass (destiny-ukh4e): equipItemToNpc/unequipItemFromNpcInternal derive attribute
// bonuses via Math.floor(x / 20), but no existing test asserted the resulting attributes value --
// only that loadout/equipment slots changed. A regression that silently changed the divisor (e.g.
// back to the deleted dead module's /10) would have passed every test above.
describe('equipItem — attribute bonus math on equip/unequip', () => {
  const BASE_MIGHT = 38
  const BASE_AGILITY = 47
  const BASE_ENDURANCE = 44

  it('applies Math.floor((damageMin+damageMax)/20) to might and Math.floor(accuracy/20) to agility for a heavy weapon', () => {
    // weapon-hammer-foundry-maul: damageMin 12, damageMax 17, accuracy 58 -> floor(29/20)=1, floor(58/20)=2
    const heavyWeaponId = 'weapon-hammer-foundry-maul'
    const instanceId = 'inst-foundry-maul-test'
    const state = stateWithNpcInventoryItemDistinctIds(heavyWeaponId, instanceId)
    const result = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'weapon' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.attributes.might).toBe(BASE_MIGHT + 1)
    expect(npc.attributes.agility).toBe(BASE_AGILITY + 2)
  })

  it('rounds down to +0 for a light weapon whose bonus is below the /20 threshold (boundary case)', () => {
    // weapon-dagger-wasterunner: damageMin 3, damageMax 6 -> floor(9/20)=0 might; accuracy 72 -> floor(72/20)=3 agility
    const instanceId = 'inst-dagger-wasterunner-boundary'
    const state = stateWithNpcInventoryItemDistinctIds(WEAPON_ID, instanceId)
    const result = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'weapon' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.attributes.might).toBe(BASE_MIGHT)
    expect(npc.attributes.agility).toBe(BASE_AGILITY + 3)
  })

  it('reverses the exact might/agility bonus on unequip, returning attributes to baseline', () => {
    const heavyWeaponId = 'weapon-hammer-foundry-maul'
    const instanceId = 'inst-foundry-maul-unequip'
    const state = stateWithNpcInventoryItemDistinctIds(heavyWeaponId, instanceId)
    const equipped = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'weapon' })
    const result = unequipItem(equipped, { ownerId: NPC_ID, slot: 'weapon' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.attributes.might).toBe(BASE_MIGHT)
    expect(npc.attributes.agility).toBe(BASE_AGILITY)
  })

  // Every armor definition in the current content catalog has soak <= 18 (the heaviest, "The
  // Lord's Panoply", is soak 18) -- Math.floor(soak / 20) is therefore 0 for every piece of armor
  // in the game today. This is not a test gap, it's a real content-balance finding: the
  // soak-driven endurance bonus on armor equip is currently dead weight under the existing catalog
  // (would need soak >= 20 to ever produce +1). Documented here rather than silently "fixed" --
  // flagged for a design decision, not a code change, since this test's job is to prove current
  // behavior, not to second-guess game balance.
  it('applies +0 endurance for the heaviest armor in the catalog (soak 18 stays below the /20 threshold)', () => {
    const heaviestArmorId = 'armor-heavy-lords-panoply'
    const instanceId = 'inst-lords-panoply-test'
    const state = stateWithNpcInventoryItemDistinctIds(heaviestArmorId, instanceId)
    const result = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'armor' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.attributes.endurance).toBe(BASE_ENDURANCE)
  })
})

describe('equipItem — NPC path rejects an item whose category does not match the requested slot', () => {
  it('does not equip armor into the weapon slot', () => {
    const armorId = 'armor-light-tallow-work-coat'
    const instanceId = 'inst-coat-wrong-slot'
    const state = stateWithNpcInventoryItemDistinctIds(armorId, instanceId)
    const result = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'weapon' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.weapon).toBeNull()
    expect(npc.loadout.primaryWeaponId).toBeNull()
  })

  it('does not equip a weapon into the armor slot', () => {
    const instanceId = 'inst-weapon-wrong-slot'
    const state = stateWithNpcInventoryItemDistinctIds(WEAPON_ID, instanceId)
    const result = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'armor' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.armor).toBeNull()
  })

  it('does not equip armor into accessory_1 or accessory_2', () => {
    const armorId = 'armor-light-tallow-work-coat'
    const instanceId = 'inst-coat-accessory-attempt'
    const state = stateWithNpcInventoryItemDistinctIds(armorId, instanceId)
    const resultAccessory1 = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'accessory_1' })
    const resultAccessory2 = equipItem(state, { ownerId: NPC_ID, itemInstanceId: instanceId, slot: 'accessory_2' })
    expect(resultAccessory1.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!.equipment.accessory).toEqual([])
    expect(resultAccessory2.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!.equipment.accessory).toEqual([])
  })
})

describe('equipItem — missing itemRegistry instance', () => {
  it('no-ops when the item instance id has no entry in itemRegistry at all', () => {
    const state = stateWithNpcInventoryItemDistinctIds(WEAPON_ID, 'inst-real')
    const result = equipItem(state, { ownerId: NPC_ID, itemInstanceId: 'inst-does-not-exist', slot: 'weapon' })
    expect(result).toBe(state)
  })
})

// accessory_1/accessory_2 rotation: equipItemToNpc keeps at most 2 accessory instance ids, and
// unequipItemFromNpcInternal slices by array position (index 0 for accessory_1, index 1 for
// accessory_2). itemsReducers.ts's live UI slot mapping only ever dispatches 'accessory_1' (as
// the NPC "Secondary" loadout slot) -- there is no fourth loadout-slot name that maps to
// accessory_2, so accessory_2 is currently unreachable from the Roster equip picker. These tests
// exercise the equipItem/unequipItem commands directly (the only way accessory_2 is reachable
// today) so a future UI wiring for it inherits verified, not merely assumed, behavior.
describe('equipItem — accessory_1/accessory_2 rotation', () => {
  function stateWithTwoNpcItems(itemA: { itemId: string; instanceId: string }, itemB: { itemId: string; instanceId: string }): GameState {
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
            slots: [
              { slotId: `slot-${itemA.instanceId}`, itemInstanceId: itemA.instanceId, quantity: 1 },
              { slotId: `slot-${itemB.instanceId}`, itemInstanceId: itemB.instanceId, quantity: 1 },
            ],
            locked: false,
          }],
        },
        itemRegistry: {
          [itemA.instanceId]: { uniqueId: itemA.instanceId, itemId: itemA.itemId, quantity: 1, locationType: 'npc_inventory', locationId: NPC_ID, acquiredDay: 1, flags: [] },
          [itemB.instanceId]: { uniqueId: itemB.instanceId, itemId: itemB.itemId, quantity: 1, locationType: 'npc_inventory', locationId: NPC_ID, acquiredDay: 1, flags: [] },
        },
      },
    }
  }

  it('equips a tool into accessory_2 without disturbing an existing accessory_1', () => {
    const itemA = { itemId: 'item-lockpick-ringcut', instanceId: 'inst-lockpick-acc1' }
    const itemB = { itemId: 'item-lamp-signal-expedition', instanceId: 'inst-lamp-acc2' }
    const state = stateWithTwoNpcItems(itemA, itemB)
    const withAcc1 = equipItem(state, { ownerId: NPC_ID, itemInstanceId: itemA.instanceId, slot: 'accessory_1' })
    const result = equipItem(withAcc1, { ownerId: NPC_ID, itemInstanceId: itemB.instanceId, slot: 'accessory_2' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.accessory).toEqual([itemA.instanceId, itemB.instanceId])
  })

  // Traced precisely against equipItemToNpc's two-stage logic (lines 262-274 then 306-316), not
  // assumed: equipping into accessory_2 while accessory_2 already holds something first triggers
  // the generic "unequip current item in this slot" preprocessing (currentEquipped = accessory[1]
  // is truthy), which shrinks the array to length 1 BEFORE the accessory_2 branch's own
  // `currentAccessories.length >= 2 ? slice(1) : push` ternary ever runs. That ternary's `>= 2`
  // (rotate) arm is therefore unreachable through equipItemToNpc's own normal call path -- the
  // preceding auto-unequip always leaves it at length <= 1, so it always takes the push arm. This
  // test proves that actual (not the intuitively-expected "rotate two survivors") behavior: the
  // OLDER accessory_1 item survives untouched, and the new item takes accessory_2's freed slot.
  it('equipping a second time into accessory_2 auto-unequips its current occupant first, leaving accessory_1 untouched', () => {
    const itemA = { itemId: 'item-lockpick-ringcut', instanceId: 'inst-lockpick-rotate' }
    const itemB = { itemId: 'item-lamp-signal-expedition', instanceId: 'inst-lamp-rotate' }
    const state = stateWithTwoNpcItems(itemA, itemB)
    const withAcc1 = equipItem(state, { ownerId: NPC_ID, itemInstanceId: itemA.instanceId, slot: 'accessory_1' })
    const withAcc2First = equipItem(withAcc1, { ownerId: NPC_ID, itemInstanceId: itemB.instanceId, slot: 'accessory_2' })
    // Must be a non-weapon/non-armor category -- isValidSlotForItem rejects weapons/armor for
    // accessory_2, same as accessory_1's own carve-out.
    const thirdItemId = 'item-caliper-league-engineering'
    const thirdInstanceId = 'inst-caliper-rotate'
    const withThirdItem: GameState = {
      ...withAcc2First,
      inventoryState: {
        ...withAcc2First.inventoryState,
        npcInventories: {
          [NPC_ID]: [{
            containerId: `container-${NPC_ID}`,
            containerType: 'backpack',
            ownerId: NPC_ID,
            maxSlots: 20,
            slots: [{ slotId: `slot-${thirdInstanceId}`, itemInstanceId: thirdInstanceId, quantity: 1 }],
            locked: false,
          }],
        },
        itemRegistry: {
          ...withAcc2First.inventoryState.itemRegistry,
          [thirdInstanceId]: { uniqueId: thirdInstanceId, itemId: thirdItemId, quantity: 1, locationType: 'npc_inventory', locationId: NPC_ID, acquiredDay: 1, flags: [] },
        },
      },
    }
    const result = equipItem(withThirdItem, { ownerId: NPC_ID, itemInstanceId: thirdInstanceId, slot: 'accessory_2' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.accessory).toEqual([itemA.instanceId, thirdInstanceId])
    // itemB (bumped out of accessory_2) must land back in the NPC's own inventory, not vanish.
    const npcInventorySlots = result.inventoryState.npcInventories[NPC_ID]?.flatMap((c) => c.slots) ?? []
    expect(npcInventorySlots.some((s) => s.itemInstanceId === itemB.instanceId)).toBe(true)
  })

  // Genuine quirk found while tracing the above, NOT a hypothesis: re-equipping accessory_1 while
  // BOTH accessory slots are already occupied auto-unequips accessory_1's own occupant first
  // (shrinking [X, Y] to [Y] via slice(1) in unequipItemFromNpcInternal), then the accessory_1
  // branch's `[...currentAccessories.slice(0, 1), itemInstanceId]` keeps that survivor (Y, which
  // was semantically "accessory_2") at index 0 and appends the new item at index 1 -- so Y is now
  // read as accessory_1 (equipment.accessory[0]) and the newly-equipped item as accessory_2
  // (equipment.accessory[1]), even though the caller asked to equip specifically into accessory_1.
  // Currently unreachable from the live UI (itemsReducers.ts never dispatches accessory_2), so no
  // player can hit this today -- documented here rather than silently patched, and filed as
  // destiny follow-up so it's fixed if/when accessory_2 ever gets a real UI slot.
  it('documents a slot-identity quirk: re-equipping accessory_1 while both slots are full shifts the survivor into accessory_1\'s position', () => {
    const itemA = { itemId: 'item-lockpick-ringcut', instanceId: 'inst-lockpick-quirk' }
    const itemB = { itemId: 'item-lamp-signal-expedition', instanceId: 'inst-lamp-quirk' }
    const state = stateWithTwoNpcItems(itemA, itemB)
    const withBoth = equipItem(
      equipItem(state, { ownerId: NPC_ID, itemInstanceId: itemA.instanceId, slot: 'accessory_1' }),
      { ownerId: NPC_ID, itemInstanceId: itemB.instanceId, slot: 'accessory_2' },
    )
    const thirdInstanceId = 'inst-flicker-quirk'
    const withThirdItem: GameState = {
      ...withBoth,
      inventoryState: {
        ...withBoth.inventoryState,
        npcInventories: {
          [NPC_ID]: [{
            containerId: `container-${NPC_ID}`,
            containerType: 'backpack',
            ownerId: NPC_ID,
            maxSlots: 20,
            slots: [{ slotId: `slot-${thirdInstanceId}`, itemInstanceId: thirdInstanceId, quantity: 1 }],
            locked: false,
          }],
        },
        itemRegistry: {
          ...withBoth.inventoryState.itemRegistry,
          [thirdInstanceId]: { uniqueId: thirdInstanceId, itemId: 'weapon-dagger-ring-flicker', quantity: 1, locationType: 'npc_inventory', locationId: NPC_ID, acquiredDay: 1, flags: [] },
        },
      },
    }
    const result = equipItem(withThirdItem, { ownerId: NPC_ID, itemInstanceId: thirdInstanceId, slot: 'accessory_1' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    // itemB (originally accessory_2) is now at index 0 -- read as accessory_1 elsewhere in the
    // codebase -- and the newly-equipped item sits at index 1, NOT index 0 as the caller requested.
    expect(npc.equipment.accessory).toEqual([itemB.instanceId, thirdInstanceId])
  })

  it('unequips accessory_1 leaving a single accessory_2 entry shifted down (0-and-1-entry guards)', () => {
    const itemA = { itemId: 'item-lockpick-ringcut', instanceId: 'inst-lockpick-unequip1' }
    const itemB = { itemId: 'item-lamp-signal-expedition', instanceId: 'inst-lamp-unequip1' }
    const state = stateWithTwoNpcItems(itemA, itemB)
    const withBoth = equipItem(
      equipItem(state, { ownerId: NPC_ID, itemInstanceId: itemA.instanceId, slot: 'accessory_1' }),
      { ownerId: NPC_ID, itemInstanceId: itemB.instanceId, slot: 'accessory_2' },
    )
    const result = unequipItem(withBoth, { ownerId: NPC_ID, slot: 'accessory_1' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.accessory).toEqual([itemB.instanceId])
  })

  it('unequipping accessory_1 when only one accessory is equipped empties the array (0-entry guard)', () => {
    const itemA = { itemId: 'item-lockpick-ringcut', instanceId: 'inst-lockpick-solo' }
    const itemB = { itemId: 'item-lamp-signal-expedition', instanceId: 'inst-lamp-unused' }
    const state = stateWithTwoNpcItems(itemA, itemB)
    const withAcc1 = equipItem(state, { ownerId: NPC_ID, itemInstanceId: itemA.instanceId, slot: 'accessory_1' })
    const result = unequipItem(withAcc1, { ownerId: NPC_ID, slot: 'accessory_1' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.accessory).toEqual([])
  })

  it('unequipping accessory_2 when nothing is equipped there at all is a no-op on the accessory array', () => {
    const itemA = { itemId: 'item-lockpick-ringcut', instanceId: 'inst-lockpick-noop-acc2' }
    const itemB = { itemId: 'item-lamp-signal-expedition', instanceId: 'inst-lamp-noop-acc2' }
    const state = stateWithTwoNpcItems(itemA, itemB)
    const withAcc1Only = equipItem(state, { ownerId: NPC_ID, itemInstanceId: itemA.instanceId, slot: 'accessory_1' })
    const result = unequipItem(withAcc1Only, { ownerId: NPC_ID, slot: 'accessory_2' })
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.accessory).toEqual([itemA.instanceId])
  })
})

// User report follow-up: slot-swap tests above only checked activity-log text ("logs both the
// unequip and the equip when swapping"). This verifies the actual data movement -- the displaced
// item must be a real, findable entry back in the NPC's own personal inventory, not just implied
// by a log line.
describe('equipItem — slot swap returns the displaced item to the NPC\'s own inventory', () => {
  it('places the previously equipped weapon back into npcInventories when swapped out', () => {
    const firstInstanceId = 'inst-flicker-swap-data'
    const secondInstanceId = 'inst-maul-swap-data'
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
          [secondInstanceId]: { uniqueId: secondInstanceId, itemId: 'weapon-hammer-foundry-maul', quantity: 1, locationType: 'npc_inventory', locationId: NPC_ID, acquiredDay: 1, flags: [] },
        },
      },
    }
    const firstEquipped = equipItem(state, { ownerId: NPC_ID, itemInstanceId: firstInstanceId, slot: 'weapon' })
    const result = equipItem(firstEquipped, { ownerId: NPC_ID, itemInstanceId: secondInstanceId, slot: 'weapon' })

    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.equipment.weapon).toBe(secondInstanceId)
    const npcInventorySlots = result.inventoryState.npcInventories[NPC_ID]?.flatMap((c) => c.slots) ?? []
    expect(npcInventorySlots.some((s) => s.itemInstanceId === firstInstanceId)).toBe(true)
  })
})
