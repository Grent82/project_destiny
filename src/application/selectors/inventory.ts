import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import type { GameState } from '../../domain'
import { HOUSEHOLD_STORAGE_CONTAINER_ID } from '../commands/inventory/householdStorage'

/**
 * Local item reference type for selectors - uses instanceId for consistency
 * with existing code patterns. Different from domain ItemInstance which uses uniqueId.
 */
type ItemRef = {
  instanceId: string
  itemId: string
  quantity: number
}

export type ItemAction = {
  type: 'use' | 'give' | 'install' | 'sell' | 'open' | 'equip' | 'pack' | 'unpack' | 'archive' | 'file-evidence'
  label: string
  requiresTarget: boolean
}

const CATEGORY_PRIMARY_ACTION: Record<string, ItemAction> = {
  consumable: { type: 'use', label: 'Use', requiresTarget: false },
  document: { type: 'open', label: 'Open', requiresTarget: false },
  gift: { type: 'give', label: 'Give', requiresTarget: true },
  // Tools equip onto the player (self) -- equipItemToPlayer is the only equip path that applies
  // typedEffects skillBonus/enableAction (destiny-1g74); equipItemToNpc never grants those. No NPC
  // choice needed, so requiresTarget stays false; the panel dispatches ownerId:'player' directly.
  tool: { type: 'equip', label: 'Equip', requiresTarget: false },
  householdModule: { type: 'install', label: 'Install in House', requiresTarget: false },
  module: { type: 'install', label: 'Install in House', requiresTarget: false },
  tradeGood: { type: 'sell', label: 'Sell', requiresTarget: false },
  material: { type: 'sell', label: 'Sell', requiresTarget: false },
  // Weapons/armor/accessories equip onto a roster NPC, so which NPC must be chosen -- this was
  // marked requiresTarget:false with no NPC picker ever wired to it, and no dispatchAction case
  // handled 'equip' at all, so the House Storage panel's "Equip" button silently did nothing
  // (user report: item visibly in House Storage, Equip button had zero effect).
  weapon: { type: 'equip', label: 'Equip', requiresTarget: true },
  armor: { type: 'equip', label: 'Equip', requiresTarget: true },
  accessory: { type: 'equip', label: 'Equip', requiresTarget: true },
}

/** Maps an item's content category to the UI equip-slot name equipItem's reducer expects. */
export function equipSlotForCategory(category: string): 'primaryWeaponId' | 'secondaryWeaponId' | 'armorId' {
  if (category === 'weapon') return 'primaryWeaponId'
  if (category === 'armor') return 'armorId'
  return 'secondaryWeaponId'
}

/** Helper to flatten all player bag slots into a list of ItemRef objects */
function getPlayerItemsFromInventory(inventoryState: GameState['inventoryState']): ItemRef[] {
  const items: ItemRef[] = []
  for (const container of inventoryState.player.bagContainers) {
    for (const slot of container.slots) {
      if (slot.itemInstanceId) {
        const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
        if (instanceDef) {
          items.push({
            instanceId: slot.itemInstanceId,
            itemId: instanceDef.itemId,
            quantity: slot.quantity,
          })
        }
      }
    }
  }
  return items
}

/** Helper to get items from house_storage container */
function getHouseStorageItems(inventoryState: GameState['inventoryState']): ItemRef[] {
  const items: ItemRef[] = []
  for (const container of inventoryState.sharedContainers) {
    // destiny (house-storage split, 2026-07-09): weapons/armor bought via equipmentPurchase.ts
    // land in a container keyed by HOUSEHOLD_STORAGE_CONTAINER_ID, while everything routed
    // through moveItem's 'house_storage' location (pack/unpack) uses ownerId:'house_storage' --
    // two disconnected containers players experience as one "House Storage". Match both so items
    // from either path show up here.
    if (container.ownerId === 'house_storage' || container.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID) {
      for (const slot of container.slots) {
        if (slot.itemInstanceId) {
          const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
          if (instanceDef) {
            items.push({
              instanceId: slot.itemInstanceId,
              itemId: instanceDef.itemId,
              quantity: slot.quantity,
            })
          }
        }
      }
    }
  }
  return items
}

/** Helper to get items from mission_pack container */
function getMissionPackItems(inventoryState: GameState['inventoryState']): ItemRef[] {
  const items: ItemRef[] = []
  for (const container of inventoryState.sharedContainers) {
    if (container.ownerId === 'mission_pack') {
      for (const slot of container.slots) {
        if (slot.itemInstanceId) {
          const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
          if (instanceDef) {
            items.push({
              instanceId: slot.itemInstanceId,
              itemId: instanceDef.itemId,
              quantity: slot.quantity,
            })
          }
        }
      }
    }
  }
  return items
}

/** Returns owned items filtered by storage location */
export function selectItemsByLocation(state: RootState, location: 'inventory' | 'house_storage' | 'equipped' | 'mission_pack' | 'archived'): ItemRef[] {
  const inventoryState = state.game.inventoryState
  switch (location) {
    case 'inventory':
      return getPlayerItemsFromInventory(inventoryState)
    case 'house_storage':
      return getHouseStorageItems(inventoryState)
    case 'mission_pack':
      return getMissionPackItems(inventoryState)
    case 'equipped':
    case 'archived':
      // These locations are not yet migrated - return empty for now
      return []
    default:
      return []
  }
}

export const selectGiftInventoryItems = createSelector(
  [(state: RootState) => state.game.inventoryState],
  (inventoryState) => {
    const playerItems = getPlayerItemsFromInventory(inventoryState)
    return playerItems
      .flatMap((owned) => {
        const definition = contentCatalog.itemsById.get(owned.itemId)
        if (!definition || definition.category !== 'gift') return []
        return [{ instanceId: owned.instanceId, itemName: definition.name }]
      })
  },
)

/** Documents the player has used as evidence (filed/presented/burned) via the evidence_use item effect. */
export const selectFiledEvidence = createSelector(
  [(state: RootState) => state.game.evidenceInventory],
  (evidenceInventory) =>
    evidenceInventory.map((entry) => ({
      instanceId: entry.instanceId,
      itemName: contentCatalog.itemsById.get(entry.itemId)?.name ?? entry.itemId,
      disposition: entry.disposition ?? 'filed',
    })),
)

function humanizeActionId(action: string): string {
  return action
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export interface UnlockedActionSummary {
  action: string
  label: string
  grantedByItemNames: string[]
  context: string
}

/**
 * Surfaces state.enabledActions (destiny-vyr6) — actions unlocked by 'enableAction' document
 * effects. Resolves each action id back to whichever item(s) grant it via their own typedEffects,
 * using that item's own authored description as the context text rather than inventing new copy.
 */
export const selectUnlockedActions = createSelector(
  [(state: RootState) => state.game.enabledActions],
  (enabledActions): UnlockedActionSummary[] =>
    enabledActions.map((action) => {
      const grantingItems = contentCatalog.items.filter((item) =>
        item.typedEffects?.some((effect) => effect.type === 'enableAction' && effect.action === action),
      )
      return {
        action,
        label: humanizeActionId(action),
        grantedByItemNames: grantingItems.map((item) => item.name),
        context: grantingItems[0]?.description ?? 'Unlocked by a document you used.',
      }
    }),
)

/** Returns all available actions for a given owned item instance */
export function selectItemActions(state: RootState, instanceId: string): ItemAction[] {
  const inventoryState = state.game.inventoryState
  let owned: ItemRef | null = null

  // Check player inventory
  for (const container of inventoryState.player.bagContainers) {
    for (const slot of container.slots) {
      if (slot.itemInstanceId === instanceId) {
        const instanceDef = inventoryState.itemRegistry[instanceId]
        if (instanceDef) {
          owned = { instanceId: slot.itemInstanceId, itemId: instanceDef.itemId, quantity: slot.quantity }
        }
        break
      }
    }
    if (owned) break
  }

  // Check house storage. Must match both container variants -- weapons/armor bought via
  // equipmentPurchase.ts land in the container keyed by HOUSEHOLD_STORAGE_CONTAINER_ID, while
  // items routed through moveItem's 'house_storage' location (pack/unpack) use ownerId:'house_storage'.
  // This previously only matched the latter, so shop-purchased items -- visibly shown in the House
  // Storage panel via selectItemsByLocation/getHouseStorageItems, which already matched both -- got
  // `owned` staying null here and fell through with zero actions: no Equip, no Sell, no Add to Pack.
  if (!owned) {
    for (const container of inventoryState.sharedContainers) {
      if (container.ownerId === 'house_storage' || container.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID) {
        for (const slot of container.slots) {
          if (slot.itemInstanceId === instanceId) {
            const instanceDef = inventoryState.itemRegistry[instanceId]
            if (instanceDef) {
              owned = { instanceId: slot.itemInstanceId, itemId: instanceDef.itemId, quantity: slot.quantity }
            }
            break
          }
        }
        if (owned) break
      }
    }
  }

  // Check mission pack
  if (!owned) {
    for (const container of inventoryState.sharedContainers) {
      if (container.ownerId === 'mission_pack') {
        for (const slot of container.slots) {
          if (slot.itemInstanceId === instanceId) {
            const instanceDef = inventoryState.itemRegistry[instanceId]
            if (instanceDef) {
              owned = { instanceId: slot.itemInstanceId, itemId: instanceDef.itemId, quantity: slot.quantity }
            }
            break
          }
        }
        if (owned) break
      }
    }
  }

  if (!owned) return []

  const def = contentCatalog.itemsById.get(owned.itemId)
  if (!def) return []

  const actions: ItemAction[] = []
  const primary = CATEGORY_PRIMARY_ACTION[def.category]
  if (primary) {
    if (primary.type === 'use') {
      // Only offer 'Use' when the item has an effect useItem's applyConsume actually processes.
      // Consumables whose only typedEffect is 'contraception' (handled exclusively by the intimacy
      // proposal flow, not the generic consume path) would otherwise be destroyed by
      // removePlayerItem for zero effect if 'Use' were offered unconditionally per category.
      const consumeEffectTypes = new Set([
        'heal', 'stat_mod', 'reduceStat', 'boostStat', 'addStatus', 'removeStatus', 'training_bonus',
      ])
      const hasConsumeEffect = def.typedEffects?.some((effect) => consumeEffectTypes.has(effect.type)) ?? false
      if (hasConsumeEffect) {
        // heal/stat_mod are the only effect types applyConsume actually routes through targetNpcId.
        const needsTarget = def.typedEffects?.some((effect) => effect.type === 'heal' || effect.type === 'stat_mod') ?? false
        actions.push({ ...primary, requiresTarget: needsTarget })
      }
    } else {
      actions.push(primary)
    }
  }

  // Documents that unlock a follow-up action or serve as evidence need an explicit
  // disposal action -- 'open' alone only previews them and never writes enabledActions/evidenceInventory.
  if (def.typedEffects?.some((effect) => effect.type === 'enableAction')) {
    actions.push({ type: 'archive', label: 'Archive', requiresTarget: false })
  }
  if (def.typedEffects?.some((effect) => effect.type === 'evidence_use')) {
    actions.push({ type: 'file-evidence', label: 'File as Evidence', requiresTarget: false })
  }

  // Secondary: pack/unpack between inventory and mission_pack. Same both-container match as above
  // -- omitting HOUSEHOLD_STORAGE_CONTAINER_ID here silently denied 'Add to Pack' to every
  // shop-purchased item even after the primary-action fix, since this check gates independently.
  const isInInventoryOrHouseStorage = inventoryState.player.bagContainers.some((c) =>
    c.slots.some((s) => s.itemInstanceId === instanceId)
  ) || inventoryState.sharedContainers.some((c) =>
    (c.ownerId === 'house_storage' || c.containerId === HOUSEHOLD_STORAGE_CONTAINER_ID) && c.slots.some((s) => s.itemInstanceId === instanceId)
  )
  const isInMissionPack = inventoryState.sharedContainers.some((c) =>
    c.ownerId === 'mission_pack' && c.slots.some((s) => s.itemInstanceId === instanceId)
  )

  if (isInInventoryOrHouseStorage) {
    actions.push({ type: 'pack', label: 'Add to Pack', requiresTarget: false })
  }
  if (isInMissionPack) {
    actions.push({ type: 'unpack', label: 'Remove from Pack', requiresTarget: false })
  }

  return actions
}

// ─── Player Equipment Selectors ─────────────────────────────────────────────

export const selectPlayerEquipment = createSelector(
  [(state: RootState) => state.game.inventoryState.player.equipmentSlots],
  (equipmentSlots) => ({
    weapon: equipmentSlots.weapon,
    armor: equipmentSlots.armor,
    accessory_1: equipmentSlots.accessory_1,
    accessory_2: equipmentSlots.accessory_2,
  }),
)

export const selectPlayerBagContainers = createSelector(
  [(state: RootState) => state.game.inventoryState.player.bagContainers],
  (bagContainers) => bagContainers,
)

export const selectPlayerUsedBagSlots = createSelector(
  [(state: RootState) => state.game.inventoryState.player.usedBagSlots],
  (usedBagSlots) => usedBagSlots,
)

export const selectPlayerTotalBagSlots = createSelector(
  [(state: RootState) => state.game.inventoryState.player.totalBagSlots],
  (totalBagSlots) => totalBagSlots,
)

export const selectItemDefinition = createSelector(
  [(_state: RootState, instanceId: string) => instanceId, (state: RootState) => state.game.inventoryState.itemRegistry, () => contentCatalog.itemsById],
  (instanceId, itemRegistry, itemsById) => {
    if (!instanceId) return null
    const instance = itemRegistry[instanceId]
    if (!instance) return null
    return itemsById.get(instance.itemId) ?? null
  },
)

// ─── Canonical Inventory Access Selectors ───────────────────────────────────

/**
 * Get all item instances in a specific NPC's inventory.
 */
export const selectNpcInventoryItems = createSelector(
  [(_state: RootState, npcId: string) => npcId, (_state: RootState) => _state.game.inventoryState],
  (_npcId: string, inventoryState: GameState['inventoryState']) => {
    const items: ItemRef[] = []
    const npcContainers = inventoryState.npcInventories[_npcId] || []

    for (const container of npcContainers) {
      for (const slot of container.slots) {
        if (slot.itemInstanceId) {
          const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
          if (instanceDef) {
            items.push({
              instanceId: slot.itemInstanceId,
              itemId: instanceDef.itemId,
              quantity: slot.quantity,
            })
          }
        }
      }
    }

    return items
  }
)

/**
 * Get all item instances in a shop's stock container.
 */
export const selectShopStockItems = createSelector(
  [(_state: RootState, shopId: string) => shopId, (_state: RootState) => _state.game.inventoryState],
  (_shopId: string, inventoryState: GameState['inventoryState']) => {
    const items: ItemRef[] = []

    for (const container of inventoryState.sharedContainers) {
      // Match shop containers by containerId or ownerId starting with 'shop:'
      if (container.containerId === _shopId || container.ownerId === _shopId || container.ownerId.startsWith('shop:')) {
        for (const slot of container.slots) {
          if (slot.itemInstanceId) {
            const instanceDef = inventoryState.itemRegistry[slot.itemInstanceId]
            if (instanceDef) {
              items.push({
                instanceId: slot.itemInstanceId,
                itemId: instanceDef.itemId,
                quantity: slot.quantity,
              })
            }
          }
        }
      }
    }

    return items
  }
)

/**
 * Check if player has enough space in inventory.
 */
export const selectPlayerHasSpace = createSelector([(state: RootState) => state.game.inventoryState], (inventoryState: GameState['inventoryState']) => {
  const used = inventoryState.player.usedBagSlots
  const total = inventoryState.player.totalBagSlots
  return { hasSpace: used < total, used, total, available: total - used }
})

/**
 * Check if house storage has enough space.
 */
export const selectHouseStorageHasSpace = createSelector([(state: RootState) => state.game], (game: GameState) => {
  const used = game.inventoryState.sharedContainers
    .filter((c) => c.ownerId === 'house_storage' || c.ownerId.startsWith('household:'))
    .reduce((sum, c) => sum + c.slots.length, 0)
  const capacity = game.houseStorageCapacity
  return { hasSpace: used < capacity, used, capacity, available: capacity - used }
})

/**
 * Get all accessible inventory sources for the player.
 * Returns a list of containers the player can access.
 */
export const selectPlayerAccessibleSources = createSelector([(state: RootState) => state.game], (game: GameState) => {
  const sources: Array<{
    sourceType: 'player_inventory' | 'container' | 'equipment'
    containerId: string
    ownerId: string
    name: string
    itemCount: number
  }> = []

  // Player's own bags
  for (const container of game.inventoryState.player.bagContainers) {
    sources.push({
      sourceType: 'player_inventory',
      containerId: container.containerId,
      ownerId: 'player',
      name: container.name ?? 'My Backpack',
      itemCount: container.slots.length,
    })
  }

  // House storage (if household container exists)
  const houseStorage = game.inventoryState.sharedContainers.find((c) => c.ownerId === 'house_storage' || c.ownerId.startsWith('household:'))
  if (houseStorage) {
    sources.push({
      sourceType: 'container',
      containerId: houseStorage.containerId,
      ownerId: houseStorage.ownerId,
      name: houseStorage.name ?? 'House Storage',
      itemCount: houseStorage.slots.length,
    })
  }

  // Player equipment
  const equippedCount = Object.values(game.inventoryState.player.equipmentSlots).filter(Boolean).length
  if (equippedCount > 0) {
    sources.push({
      sourceType: 'equipment',
      containerId: 'player:equipment',
      ownerId: 'player',
      name: 'My Equipment',
      itemCount: equippedCount,
    })
  }

  return sources
})

/**
 * Get accessible inventory sources for an NPC.
 */
export const selectNpcAccessibleSources = createSelector(
  [(_state: RootState, npcId: string) => npcId, (_state: RootState) => _state.game],
  (_npcId: string, game: GameState) => {
    const sources: Array<{
      sourceType: 'npc_inventory' | 'container' | 'equipment'
      containerId: string
      ownerId: string
      name: string
      itemCount: number
    }> = []

    const npc = game.npcRuntimeStates.find((n) => n.npcId === _npcId)
    if (!npc) return sources

    // NPC's own inventory
    const npcContainers = game.inventoryState.npcInventories[_npcId] || []
    for (const container of npcContainers) {
      sources.push({
        sourceType: 'npc_inventory',
        containerId: container.containerId,
        ownerId: _npcId,
        name: container.name ?? `${npc.name}'s Backpack`,
        itemCount: container.slots.length,
      })
    }

    // Household storage (if NPC is in player household)
    if (npc.roomAssignment) {
      const houseStorage = game.inventoryState.sharedContainers.find((c) => c.ownerId === 'house_storage' || c.ownerId.startsWith('household:'))
      if (houseStorage) {
        sources.push({
          sourceType: 'container',
          containerId: houseStorage.containerId,
          ownerId: houseStorage.ownerId,
          name: houseStorage.name ?? 'House Storage',
          itemCount: houseStorage.slots.length,
        })
      }
    }

    return sources
  }
)

/**
 * Get item instance from registry by ID.
 */
export const selectItemInstance = createSelector(
  [(_state: RootState, instanceId: string) => instanceId, (_state: RootState) => _state.game.inventoryState],
  (_instanceId: string, inventoryState: GameState['inventoryState']) => {
    return inventoryState.itemRegistry[_instanceId] ?? null
  }
)
