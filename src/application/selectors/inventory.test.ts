import { describe, it, expect } from 'vitest'
import { selectItemsByLocation, selectItemActions, selectFiledEvidence, selectUnlockedActions, equipSlotForCategory, selectNpcInventoryItems } from './inventory'
import { createGameStore } from '../store/gameStore'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { HOUSEHOLD_STORAGE_CONTAINER_ID } from '../commands/inventory/householdStorage'
import type { GameState } from '../../domain/game/contracts'
import type { ContainerType } from '../../domain/inventory/contracts'

// Test item definitions - these need to exist in contentCatalog
const herbalTonicInstanceId = 'inst-tonic-01'
const herbalTonicItemId = 'item-medkit-field'

const suspiciousLetterInstanceId = 'inst-letter-01'
const suspiciousLetterItemId = 'item-ledger-bureau'

const packedToolInstanceId = 'inst-tool-01'
const packedToolItemId = 'item-lockpick-ringcut'

function createInventoryWithPlayerItems(itemInstances: Array<{ instanceId: string; itemId: string; quantity: number }>) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: itemInstances.length > 0 ? [{
        containerId: 'container-player-bag',
        containerType: 'backpack' as ContainerType,
        ownerId: 'player',
        maxSlots: 20,
        slots: itemInstances.map((item) => ({
          slotId: `slot-${item.instanceId}`,
          itemInstanceId: item.instanceId,
          quantity: item.quantity,
        })),
        locked: false,
      }] : [],
      usedBagSlots: itemInstances.length,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: [],
    itemRegistry: Object.fromEntries(itemInstances.map((item) => [item.instanceId, { itemId: item.itemId, uniqueId: item.instanceId, quantity: item.quantity, locationType: 'player_inventory' as const, acquiredDay: 1, flags: [] }])),
  }
}

function createInventoryWithHouseStorageItems(itemInstances: Array<{ instanceId: string; itemId: string; quantity: number }>) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [],
      usedBagSlots: 0,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: itemInstances.length > 0 ? [{
      containerId: 'container-house-storage',
      containerType: 'vault' as ContainerType,
      ownerId: 'house_storage',
      maxSlots: 50,
      slots: itemInstances.map((item) => ({
        slotId: `slot-${item.instanceId}`,
        itemInstanceId: item.instanceId,
        quantity: item.quantity,
      })),
      locked: false,
    }] : [],
    itemRegistry: Object.fromEntries(itemInstances.map((item) => [item.instanceId, { itemId: item.itemId, uniqueId: item.instanceId, quantity: item.quantity, locationType: 'container' as const, acquiredDay: 1, flags: [] }])),
  }
}

function createInventoryWithMissionPackItems(itemInstances: Array<{ instanceId: string; itemId: string; quantity: number }>) {
  return {
    ...initialGameStateSnapshot.inventoryState,
    player: {
      ...initialGameStateSnapshot.inventoryState.player,
      bagContainers: [],
      usedBagSlots: 0,
      equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
    },
    sharedContainers: itemInstances.length > 0 ? [{
      containerId: 'container-mission-pack',
      containerType: 'supply_pack' as ContainerType,
      ownerId: 'mission_pack',
      maxSlots: 20,
      slots: itemInstances.map((item) => ({
        slotId: `slot-${item.instanceId}`,
        itemInstanceId: item.instanceId,
        quantity: item.quantity,
      })),
      locked: false,
    }] : [],
    itemRegistry: Object.fromEntries(itemInstances.map((item) => [item.instanceId, { itemId: item.itemId, uniqueId: item.instanceId, quantity: item.quantity, locationType: 'container' as const, acquiredDay: 1, flags: [] }])),
  }
}

function stateWithPlayerItems(items: Array<{ instanceId: string; itemId: string; quantity: number }>): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: createInventoryWithPlayerItems(items),
  }
}

function stateWithHouseStorageItems(items: Array<{ instanceId: string; itemId: string; quantity: number }>): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: createInventoryWithHouseStorageItems(items),
  }
}

function stateWithMissionPackItems(items: Array<{ instanceId: string; itemId: string; quantity: number }>): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: createInventoryWithMissionPackItems(items),
  }
}

// User report, live-reproduced (2026-07-09): a weapon/armor item bought via the shop's Equipment
// Stash (equipmentPurchase.ts's purchaseWeaponToHouseStorage/purchaseArmorToHouseStorage) lands in
// the container keyed by HOUSEHOLD_STORAGE_CONTAINER_ID, NOT ownerId:'house_storage' -- the panel
// still displayed these items (selectItemsByLocation already matched both), but selectItemActions
// only ever checked ownerId:'house_storage' here, so `owned` stayed null and every such item got
// zero actions: no Equip button, no Sell, no Add to Pack, nothing clickable but rendered as if normal.
function stateWithHouseholdStorageContainerItems(items: Array<{ instanceId: string; itemId: string; quantity: number }>): GameState {
  return {
    ...initialGameStateSnapshot,
    inventoryState: {
      ...initialGameStateSnapshot.inventoryState,
      player: {
        ...initialGameStateSnapshot.inventoryState.player,
        bagContainers: [],
        usedBagSlots: 0,
        equipmentSlots: { weapon: null, armor: null, accessory_1: null, accessory_2: null },
      },
      sharedContainers: [{
        containerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
        containerType: 'chest' as ContainerType,
        ownerId: HOUSEHOLD_STORAGE_CONTAINER_ID,
        maxSlots: 50,
        slots: items.map((item) => ({ slotId: `slot-${item.instanceId}`, itemInstanceId: item.instanceId, quantity: item.quantity })),
        locked: false,
      }],
      itemRegistry: Object.fromEntries(items.map((item) => [item.instanceId, { itemId: item.itemId, uniqueId: item.instanceId, quantity: item.quantity, locationType: 'container' as const, acquiredDay: 1, flags: [] }])),
    },
  }
}

describe('selectItemsByLocation', () => {
  it('returns only items with matching location', () => {
    const state = stateWithPlayerItems([{ instanceId: herbalTonicInstanceId, itemId: herbalTonicItemId, quantity: 2 }])
    const store = createGameStore(state)
    const inventoryItems = selectItemsByLocation(store.getState(), 'inventory')
    expect(inventoryItems).toHaveLength(1)
    expect(inventoryItems[0].instanceId).toBe('inst-tonic-01')
  })

  it('returns house_storage items separately', () => {
    const state = stateWithHouseStorageItems([{ instanceId: suspiciousLetterInstanceId, itemId: suspiciousLetterItemId, quantity: 1 }])
    const store = createGameStore(state)
    const houseItems = selectItemsByLocation(store.getState(), 'house_storage')
    expect(houseItems).toHaveLength(1)
    expect(houseItems[0].instanceId).toBe('inst-letter-01')
  })

  it('returns empty array when location has no items', () => {
    const state = stateWithPlayerItems([{ instanceId: herbalTonicInstanceId, itemId: herbalTonicItemId, quantity: 2 }])
    const store = createGameStore(state)
    const result = selectItemsByLocation(store.getState(), 'mission_pack')
    expect(result).toHaveLength(0)
  })

  it('returns multiple items for same location', () => {
    const tonic2 = { instanceId: 'inst-tonic-02', itemId: herbalTonicItemId, quantity: 1 }
    const state = stateWithPlayerItems([
      { instanceId: herbalTonicInstanceId, itemId: herbalTonicItemId, quantity: 2 },
      tonic2,
    ])
    const store = createGameStore(state)
    const result = selectItemsByLocation(store.getState(), 'inventory')
    expect(result).toHaveLength(2)
  })
})

// Test-quality pass (destiny-ukh4e): selectNpcInventoryItems is the exact selector
// ItemSelectionModal.tsx now depends on to merge an NPC's own personal inventory into the Roster
// equip picker (the second bug fixed this session) -- it had zero direct test coverage anywhere.
describe('selectNpcInventoryItems', () => {
  const NPC_ID = 'npc-marion-vale'
  const OTHER_NPC_ID = 'npc-ida-rhys'

  function stateWithNpcItems(npcId: string, items: Array<{ instanceId: string; itemId: string; quantity: number }>): GameState {
    return {
      ...initialGameStateSnapshot,
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        npcInventories: {
          [npcId]: items.length > 0 ? [{
            containerId: `container-${npcId}`,
            containerType: 'backpack' as ContainerType,
            ownerId: npcId,
            maxSlots: 20,
            slots: items.map((item) => ({ slotId: `slot-${item.instanceId}`, itemInstanceId: item.instanceId, quantity: item.quantity })),
            locked: false,
          }] : [],
        },
        itemRegistry: Object.fromEntries(items.map((item) => [item.instanceId, { itemId: item.itemId, uniqueId: item.instanceId, quantity: item.quantity, locationType: 'npc_inventory' as const, acquiredDay: 1, flags: [] }])),
      },
    }
  }

  it('returns the items sitting in the given NPC\'s own personal inventory', () => {
    const state = stateWithNpcItems(NPC_ID, [{ instanceId: 'inst-coat-01', itemId: 'armor-light-tallow-work-coat', quantity: 1 }])
    const store = createGameStore(state)
    const items = selectNpcInventoryItems(store.getState(), NPC_ID)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ instanceId: 'inst-coat-01', itemId: 'armor-light-tallow-work-coat', quantity: 1 })
  })

  it('returns an empty array for an NPC with no personal inventory entry at all', () => {
    const state = stateWithNpcItems(NPC_ID, [])
    const store = createGameStore(state)
    expect(selectNpcInventoryItems(store.getState(), OTHER_NPC_ID)).toEqual([])
  })

  it('returns an empty array when the NPC has a container but it is empty', () => {
    const state = stateWithNpcItems(NPC_ID, [])
    const store = createGameStore(state)
    expect(selectNpcInventoryItems(store.getState(), NPC_ID)).toEqual([])
  })

  it('does not return another NPC\'s items', () => {
    const state = stateWithNpcItems(NPC_ID, [{ instanceId: 'inst-coat-01', itemId: 'armor-light-tallow-work-coat', quantity: 1 }])
    const store = createGameStore(state)
    expect(selectNpcInventoryItems(store.getState(), OTHER_NPC_ID)).toEqual([])
  })

  it('aggregates items across multiple containers belonging to the same NPC', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        npcInventories: {
          [NPC_ID]: [
            { containerId: `container-${NPC_ID}-a`, containerType: 'backpack' as ContainerType, ownerId: NPC_ID, maxSlots: 20, slots: [{ slotId: 'slot-a', itemInstanceId: 'inst-coat-01', quantity: 1 }], locked: false },
            { containerId: `container-${NPC_ID}-b`, containerType: 'backpack' as ContainerType, ownerId: NPC_ID, maxSlots: 20, slots: [{ slotId: 'slot-b', itemInstanceId: 'inst-dagger-01', quantity: 1 }], locked: false },
          ],
        },
        itemRegistry: {
          'inst-coat-01': { itemId: 'armor-light-tallow-work-coat', uniqueId: 'inst-coat-01', quantity: 1, locationType: 'npc_inventory', acquiredDay: 1, flags: [] },
          'inst-dagger-01': { itemId: 'weapon-dagger-wasterunner', uniqueId: 'inst-dagger-01', quantity: 1, locationType: 'npc_inventory', acquiredDay: 1, flags: [] },
        },
      },
    }
    const store = createGameStore(state)
    const items = selectNpcInventoryItems(store.getState(), NPC_ID)
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.instanceId).sort()).toEqual(['inst-coat-01', 'inst-dagger-01'])
  })

  it('reports the real stack quantity for a stacked consumable', () => {
    const state = stateWithNpcItems(NPC_ID, [{ instanceId: 'inst-medkit-01', itemId: 'item-medkit-field', quantity: 3 }])
    const store = createGameStore(state)
    const items = selectNpcInventoryItems(store.getState(), NPC_ID)
    expect(items[0]?.quantity).toBe(3)
  })

  it('skips a slot whose itemInstanceId has no itemRegistry entry rather than throwing', () => {
    const state: GameState = {
      ...initialGameStateSnapshot,
      inventoryState: {
        ...initialGameStateSnapshot.inventoryState,
        npcInventories: {
          [NPC_ID]: [{
            containerId: `container-${NPC_ID}`,
            containerType: 'backpack' as ContainerType,
            ownerId: NPC_ID,
            maxSlots: 20,
            slots: [{ slotId: 'slot-orphan', itemInstanceId: 'inst-orphan-no-registry-entry', quantity: 1 }],
            locked: false,
          }],
        },
      },
    }
    const store = createGameStore(state)
    expect(() => selectNpcInventoryItems(store.getState(), NPC_ID)).not.toThrow()
    expect(selectNpcInventoryItems(store.getState(), NPC_ID)).toEqual([])
  })
})

describe('selectItemActions', () => {
  it('returns empty array for unknown instanceId', () => {
    const store = createGameStore()
    expect(selectItemActions(store.getState(), 'nonexistent')).toHaveLength(0)
  })

  it('returns pack action for inventory consumable', () => {
    const state = stateWithPlayerItems([{ instanceId: herbalTonicInstanceId, itemId: herbalTonicItemId, quantity: 2 }])
    const store = createGameStore(state)
    const actions = selectItemActions(store.getState(), 'inst-tonic-01')
    const types = actions.map((a) => a.type)
    expect(types).toContain('use')
    expect(types).toContain('pack')
  })

  // destiny-yiqa: 'Use' was previously never dispatched anywhere. Wiring it required deciding,
  // per item, whether applyConsume actually processes an effect for it (heal/stat_mod need a
  // target NPC; contraception is a no-op there, handled only by the intimacy proposal flow).
  it('marks Use as requiring a target for a heal-effect consumable (item-medkit-field)', () => {
    const state = stateWithPlayerItems([{ instanceId: 'inst-medkit-01', itemId: 'item-medkit-field', quantity: 1 }])
    const store = createGameStore(state)
    const actions = selectItemActions(store.getState(), 'inst-medkit-01')
    const use = actions.find((a) => a.type === 'use')
    expect(use).toBeDefined()
    expect(use?.requiresTarget).toBe(true)
  })

  it('does not offer a Use action for a contraception-only consumable (destiny-yiqa)', () => {
    const state = stateWithPlayerItems([{ instanceId: 'inst-contra-01', itemId: 'item-contraceptive-tonic', quantity: 1 }])
    const store = createGameStore(state)
    const actions = selectItemActions(store.getState(), 'inst-contra-01')
    const types = actions.map((a) => a.type)
    // Using it here would call applyConsume, which unconditionally removes the item and has no
    // effect for 'contraception' -- the real use path is the intimacy modal's own item picker.
    expect(types).not.toContain('use')
  })

  it('returns unpack action for mission_pack item', () => {
    const state = stateWithMissionPackItems([{ instanceId: packedToolInstanceId, itemId: packedToolItemId, quantity: 1 }])
    const store = createGameStore(state)
    const actions = selectItemActions(store.getState(), 'inst-tool-01')
    const types = actions.map((a) => a.type)
    expect(types).toContain('unpack')
    expect(types).not.toContain('pack')
  })

  // destiny-4d1u: 'open' alone only previews a document, it never writes enabledActions/
  // evidenceInventory -- these documents need an explicit disposal action to be reachable at all.
  it('returns an archive action for a document with an enableAction typedEffect', () => {
    const state = stateWithPlayerItems([{ instanceId: suspiciousLetterInstanceId, itemId: suspiciousLetterItemId, quantity: 1 }])
    const store = createGameStore(state)
    const actions = selectItemActions(store.getState(), suspiciousLetterInstanceId)
    const types = actions.map((a) => a.type)
    expect(types).toContain('open')
    expect(types).toContain('archive')
    expect(types).not.toContain('file-evidence')
  })

  it('returns a file-evidence action for a document with an evidence_use typedEffect', () => {
    const state = stateWithPlayerItems([{ instanceId: 'inst-permit-01', itemId: 'item-permit-reproduction', quantity: 1 }])
    const store = createGameStore(state)
    const actions = selectItemActions(store.getState(), 'inst-permit-01')
    const types = actions.map((a) => a.type)
    expect(types).toContain('open')
    expect(types).toContain('file-evidence')
    expect(types).not.toContain('archive')
  })

  // destiny-1g74: item-ring-unfamiliar-crest was recategorized from 'gift' to 'document' --
  // 'give it away' and 'examine it yourself' were contradictory actions for one item. It should
  // now behave like any other enableAction-bearing document: open/archive, no give.
  it('returns open + archive (not give) for the recategorized crest ring', () => {
    const state = stateWithPlayerItems([{ instanceId: 'inst-ring-01', itemId: 'item-ring-unfamiliar-crest', quantity: 1 }])
    const store = createGameStore(state)
    const actions = selectItemActions(store.getState(), 'inst-ring-01')
    const types = actions.map((a) => a.type)
    expect(types).toContain('open')
    expect(types).toContain('archive')
    expect(types).not.toContain('give')
  })

  // User report, live-reproduced: shop-purchased weapon/armor sat visibly in the House Storage
  // panel but had literally no action buttons -- root cause traced to this gap.
  describe('items in the HOUSEHOLD_STORAGE_CONTAINER_ID container (shop-purchased weapons/armor)', () => {
    it('returns an Equip action requiring a target for a weapon', () => {
      const state = stateWithHouseholdStorageContainerItems([{ instanceId: 'inst-knife-01', itemId: 'weapon-dagger-wasterunner', quantity: 1 }])
      const store = createGameStore(state)
      const actions = selectItemActions(store.getState(), 'inst-knife-01')
      const equip = actions.find((a) => a.type === 'equip')
      expect(equip).toBeDefined()
      expect(equip?.requiresTarget).toBe(true)
      expect(actions.map((a) => a.type)).toContain('pack')
    })

    it('returns an Equip action requiring a target for armor', () => {
      const state = stateWithHouseholdStorageContainerItems([{ instanceId: 'inst-coat-01', itemId: 'armor-light-tallow-work-coat', quantity: 1 }])
      const store = createGameStore(state)
      const actions = selectItemActions(store.getState(), 'inst-coat-01')
      const equip = actions.find((a) => a.type === 'equip')
      expect(equip).toBeDefined()
      expect(equip?.requiresTarget).toBe(true)
      expect(actions.map((a) => a.type)).toContain('pack')
    })

    it('previously returned zero actions for these items (regression guard)', () => {
      const state = stateWithHouseholdStorageContainerItems([{ instanceId: 'inst-coat-02', itemId: 'armor-light-tallow-work-coat', quantity: 1 }])
      const store = createGameStore(state)
      const actions = selectItemActions(store.getState(), 'inst-coat-02')
      expect(actions.length).toBeGreaterThan(0)
    })
  })
})

describe('equipSlotForCategory', () => {
  it('maps weapon to primaryWeaponId', () => {
    expect(equipSlotForCategory('weapon')).toBe('primaryWeaponId')
  })

  it('maps armor to armorId', () => {
    expect(equipSlotForCategory('armor')).toBe('armorId')
  })

  it('maps accessory and tool to secondaryWeaponId', () => {
    expect(equipSlotForCategory('accessory')).toBe('secondaryWeaponId')
    expect(equipSlotForCategory('tool')).toBe('secondaryWeaponId')
  })
})

describe('moveItem action', () => {
  it('moves an item from inventory to mission_pack', () => {
    const state = stateWithPlayerItems([{ instanceId: herbalTonicInstanceId, itemId: herbalTonicItemId, quantity: 2 }])
    const store = createGameStore(state)
    store.dispatch({ type: 'game/moveItem', payload: { instanceId: 'inst-tonic-01', location: 'mission_pack' } })
    const after = selectItemsByLocation(store.getState(), 'mission_pack')
    expect(after).toHaveLength(1)
    expect(after[0].instanceId).toBe('inst-tonic-01')
  })

  it('moves an item back from mission_pack to inventory', () => {
    const state = stateWithMissionPackItems([{ instanceId: herbalTonicInstanceId, itemId: herbalTonicItemId, quantity: 2 }])
    const store = createGameStore(state)
    store.dispatch({ type: 'game/moveItem', payload: { instanceId: 'inst-tonic-01', location: 'inventory' } })
    const after = selectItemsByLocation(store.getState(), 'inventory')
    expect(after).toHaveLength(1)
  })
})

describe('selectFiledEvidence (destiny-23qg)', () => {
  it('returns an empty array when nothing has been filed', () => {
    const store = createGameStore(initialGameStateSnapshot)
    expect(selectFiledEvidence(store.getState())).toEqual([])
  })

  it('resolves the real item name for each filed evidence entry', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      evidenceInventory: [
        { instanceId: 'inst-1', itemId: 'item-tally-debt-instrument', disposition: 'filed' as const },
        { instanceId: 'inst-2', itemId: 'item-papers-false-citizen', disposition: 'burned' as const },
      ],
    })

    const result = selectFiledEvidence(store.getState())
    expect(result).toEqual([
      { instanceId: 'inst-1', itemName: 'Debt Instrument (Tally, Bearer-Payable)', disposition: 'filed' },
      { instanceId: 'inst-2', itemName: 'False Citizen Papers (Compact Seal Forgery)', disposition: 'burned' },
    ])
  })
})

describe('selectUnlockedActions (destiny-vyr6)', () => {
  it('returns an empty array when no actions have been unlocked', () => {
    const store = createGameStore(initialGameStateSnapshot)
    expect(selectUnlockedActions(store.getState())).toEqual([])
  })

  it('humanizes the action id, resolves the granting item name, and uses its description as context', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      enabledActions: ['review-house-accounts'],
    })

    const result = selectUnlockedActions(store.getState())
    expect(result).toEqual([
      {
        action: 'review-house-accounts',
        label: 'Review House Accounts',
        grantedByItemNames: ['House Debt Ledger'],
        context:
          'Your working house ledger: current debts, promised wages, and what still comes in. It keeps House Valdris solvent, but it is not the missing bureau evidence Marion is looking for.',
      },
    ])
  })

  it('falls back to a generic context when no item defines the action (should not happen for real content, but the action list is a flat string array with no other provenance)', () => {
    const store = createGameStore({
      ...initialGameStateSnapshot,
      enabledActions: ['some-unmapped-action'],
    })

    const result = selectUnlockedActions(store.getState())
    expect(result).toEqual([
      {
        action: 'some-unmapped-action',
        label: 'Some Unmapped Action',
        grantedByItemNames: [],
        context: 'Unlocked by a document you used.',
      },
    ])
  })
})
