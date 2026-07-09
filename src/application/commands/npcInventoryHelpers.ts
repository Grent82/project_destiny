import type { GameState } from '../../domain/game/contracts'
import type { ItemDefinition } from '../../domain/items/contracts'
import type { ItemInstance } from '../../domain/inventory/contracts'
import type { NpcArmor, NpcClothing } from '../../domain/npc/contracts'
import { contentCatalog } from '../content/contentCatalog'

/**
 * Shared helpers for reading/writing an NPC's own personal inventory
 * (`state.inventoryState.npcInventories[npcId]`). Extracted from npcSurvivalActions.ts
 * (destiny-bkln) so repair/craft/consume/loot commands share one implementation instead of
 * re-deriving container/slot traversal per command.
 */

export interface FoundInventoryItem {
  containerIndex: number
  slotIndex: number
  itemInstanceId: string
  itemDef: ItemDefinition
}

/** Finds the first item tagged with `tag` in an NPC's own personal inventory, if any. */
export function findNpcInventoryItemByTag(state: GameState, npcId: string, tag: string): FoundInventoryItem | null {
  const containers = state.inventoryState.npcInventories[npcId] ?? []
  for (const [containerIndex, container] of containers.entries()) {
    for (const [slotIndex, slot] of container.slots.entries()) {
      if (!slot.itemInstanceId) continue
      const instance = state.inventoryState.itemRegistry[slot.itemInstanceId]
      if (!instance) continue
      const itemDef = contentCatalog.itemsById.get(instance.itemId)
      if (itemDef?.tags.includes(tag)) {
        return { containerIndex, slotIndex, itemInstanceId: slot.itemInstanceId, itemDef }
      }
    }
  }
  return null
}

/** Finds the first item of a given category (e.g. 'gift') in an NPC's own personal inventory. */
export function findNpcInventoryItemByCategory(
  state: GameState,
  npcId: string,
  category: ItemDefinition['category'],
): FoundInventoryItem | null {
  const containers = state.inventoryState.npcInventories[npcId] ?? []
  for (const [containerIndex, container] of containers.entries()) {
    for (const [slotIndex, slot] of container.slots.entries()) {
      if (!slot.itemInstanceId) continue
      const instance = state.inventoryState.itemRegistry[slot.itemInstanceId]
      if (!instance) continue
      const itemDef = contentCatalog.itemsById.get(instance.itemId)
      if (itemDef?.category === category) {
        return { containerIndex, slotIndex, itemInstanceId: slot.itemInstanceId, itemDef }
      }
    }
  }
  return null
}

/** Counts how many units of a specific itemId an NPC currently holds across their containers. */
export function countNpcInventoryItem(state: GameState, npcId: string, itemId: string): number {
  const containers = state.inventoryState.npcInventories[npcId] ?? []
  let total = 0
  for (const container of containers) {
    for (const slot of container.slots) {
      if (!slot.itemInstanceId) continue
      const instance = state.inventoryState.itemRegistry[slot.itemInstanceId]
      if (instance?.itemId === itemId) total += slot.quantity
    }
  }
  return total
}

/** Consumes (decrements/removes) one unit of an item found via findNpcInventoryItemByTag/Category. */
export function consumeNpcInventoryItem(state: GameState, npcId: string, found: FoundInventoryItem): GameState {
  const containers = state.inventoryState.npcInventories[npcId] ?? []
  const container = containers[found.containerIndex]
  if (!container) return state
  const slot = container.slots[found.slotIndex]
  if (!slot?.itemInstanceId) return state

  const newSlots = [...container.slots]
  const stillStacked = slot.quantity > 1
  if (stillStacked) {
    newSlots[found.slotIndex] = { ...slot, quantity: slot.quantity - 1 }
  } else {
    newSlots.splice(found.slotIndex, 1)
  }
  const newContainers = containers.map((c, i) => (i === found.containerIndex ? { ...c, slots: newSlots } : c))

  const newRegistry = { ...state.inventoryState.itemRegistry }
  if (!stillStacked) delete newRegistry[found.itemInstanceId]

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      npcInventories: { ...state.inventoryState.npcInventories, [npcId]: newContainers },
      itemRegistry: newRegistry,
    },
  }
}

/** Consumes `quantity` units of a specific itemId from an NPC's inventory, across containers/slots as needed. */
export function consumeNpcInventoryItemById(state: GameState, npcId: string, itemId: string, quantity: number): GameState {
  let remaining = quantity
  let next = state
  while (remaining > 0) {
    const containers = next.inventoryState.npcInventories[npcId] ?? []
    let found: FoundInventoryItem | null = null
    outer: for (const [containerIndex, container] of containers.entries()) {
      for (const [slotIndex, slot] of container.slots.entries()) {
        if (!slot.itemInstanceId) continue
        const instance = next.inventoryState.itemRegistry[slot.itemInstanceId]
        if (instance?.itemId === itemId) {
          const itemDef = contentCatalog.itemsById.get(itemId)
          if (!itemDef) continue
          found = { containerIndex, slotIndex, itemInstanceId: slot.itemInstanceId, itemDef }
          break outer
        }
      }
    }
    if (!found) break
    next = consumeNpcInventoryItem(next, npcId, found)
    remaining -= 1
  }
  return next
}

/**
 * Maps an ItemEffect stat-carrying variant (`heal`, `reduceStat`, `stat_mod`) to a magnitude for
 * the given NPC state key. Fixes a pre-existing gap (destiny-bkln): the original
 * npcSurvivalActions.ts `statModValue` only recognized `stat_mod`, so real catalog items using
 * `reduceStat` (e.g. item-ration-compact-brick) or `heal` (e.g. item-medkit-field) were silently
 * ignored and callers always fell back to hardcoded default magnitudes instead of the item's
 * actual defined value.
 */
export function resolveItemStatEffect(itemDef: ItemDefinition, stat: string): number | null {
  for (const effect of itemDef.typedEffects) {
    if (effect.type === 'stat_mod' && effect.stat === stat) return Math.abs(effect.value)
    if (effect.type === 'reduceStat' && effect.stat === stat) return Math.abs(effect.value)
  }
  return null
}

/** Returns the `heal` effect magnitude on an item, if it has one. */
export function resolveItemHealEffect(itemDef: ItemDefinition): number | null {
  const effect = itemDef.typedEffects.find((e) => e.type === 'heal')
  return effect && effect.type === 'heal' ? effect.value : null
}

/**
 * Resolves the single "effective" starting armor item id out of an NPC's granular armor/clothing
 * slots, for use as `loadout.armorId` (the field combat.ts/combatants.ts and the roster UI actually
 * read -- see equipItem.ts's destiny-mv8n comment).
 *
 * NpcDefinition.startingEquipment (and the matching runtime `armor`/`clothing` fields it seeds) is
 * a granular, per-body-part schema (armor.lightTorso/heavyTorso/lightLegs/heavyLegs/shield,
 * clothing.head/torso/arms/legs/feet/full/undergarments) with NO reader anywhere in the codebase --
 * confirmed via a repo-wide search before writing this. Authoring is also inconsistent about which
 * of the two sub-objects a given NPC's actual protective armor lives in: most put it in
 * `armor.lightTorso`/`heavyTorso`, but at least one (npc-sable-wrent) puts a real armor-category
 * item in `clothing.torso` instead. This resolves both, checking each candidate slot against the
 * item catalog and picking the first one that is actually `category:'armor'` (clothing items like
 * 'cloth-tunic-simple' never match, so they're safely skipped).
 */
export function resolveStartingArmorItemId(armor: NpcArmor, clothing: NpcClothing): string | null {
  const candidates = [
    armor.heavyTorso, armor.lightTorso, armor.heavyLegs, armor.lightLegs, armor.shield,
    clothing.torso, clothing.legs, clothing.full,
  ]
  for (const candidate of candidates) {
    if (!candidate) continue
    const itemDef = contentCatalog.itemsById.get(candidate)
    if (itemDef?.category === 'armor') return candidate
  }
  return null
}

/**
 * Registers a fresh, real itemRegistry entry for a resolved starting-armor item so it behaves
 * exactly like any other equipped item (findable by unequip, resolvable back to its real
 * definition) instead of being a bare, unbacked loadout.armorId with nothing behind it. Idempotent:
 * a no-op if an entry for this instance id already exists (covers recruitment upserting a
 * previously-hydrated world/story person whose armor instance may already be registered).
 */
export function registerStartingArmorInstance(
  state: GameState,
  npcId: string,
  armorItemId: string | null,
): GameState {
  if (!armorItemId) return state
  const instanceId = `${npcId}:starting-armor`
  if (state.inventoryState.itemRegistry[instanceId]) return state

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      itemRegistry: {
        ...state.inventoryState.itemRegistry,
        [instanceId]: {
          uniqueId: instanceId,
          itemId: armorItemId,
          quantity: 1,
          locationType: 'equipment',
          locationId: npcId,
          acquiredDay: state.day,
          flags: [],
        },
      },
    },
  }
}

/** The deterministic instance id registerStartingArmorInstance uses for a given NPC. */
export function startingArmorInstanceId(npcId: string): string {
  return `${npcId}:starting-armor`
}

/**
 * Creates a fresh ItemInstance (no source location — spawned from nothing, e.g. combat loot or
 * crafting output) and adds it to an NPC's own inventory, registering it in itemRegistry. Treats
 * itemInstanceId === itemId for stackable categories, matching the existing convention used
 * throughout transferItem.ts and inventoryHelpers.ts (only truly unique per-copy equipment uses a
 * suffixed unique id, via equipmentPurchase.ts — not needed for material/consumable/gift/tradeGood
 * items, which stack by itemId).
 */
export function grantNewItemToNpc(
  state: GameState,
  npcId: string,
  itemId: string,
  quantity: number,
  acquiredFrom: string,
): GameState {
  const npcExists = state.npcRuntimeStates.some((n) => n.npcId === npcId)
  if (!npcExists) return state

  const existingContainers = state.inventoryState.npcInventories[npcId] ?? []
  const updatedContainers = existingContainers.map((c) => ({ ...c, slots: [...c.slots] }))

  let added = false
  for (const container of updatedContainers) {
    const existingSlotIndex = container.slots.findIndex((s) => s.itemInstanceId === itemId)
    if (existingSlotIndex !== -1) {
      container.slots[existingSlotIndex] = {
        ...container.slots[existingSlotIndex],
        quantity: container.slots[existingSlotIndex].quantity + quantity,
      }
      added = true
      break
    }
    if (container.slots.length < container.maxSlots) {
      container.slots.push({ slotId: `slot-${itemId}-${Date.now()}`, itemInstanceId: itemId, quantity })
      added = true
      break
    }
  }

  let finalContainers = updatedContainers
  if (!added) {
    finalContainers = [
      ...updatedContainers,
      {
        containerId: `npc-container-${npcId}-${Date.now()}`,
        containerType: 'backpack' as const,
        ownerId: npcId,
        maxSlots: 20,
        slots: [{ slotId: `slot-${itemId}-new`, itemInstanceId: itemId, quantity }],
        locked: false,
      },
    ]
  }

  const existing = state.inventoryState.itemRegistry[itemId]
  const registryEntry: ItemInstance = existing
    ? { ...existing, quantity: existing.quantity + quantity, locationType: 'npc_inventory', locationId: npcId }
    : {
        uniqueId: itemId,
        itemId,
        quantity,
        locationType: 'npc_inventory',
        locationId: npcId,
        acquiredDay: state.day,
        acquiredFrom,
        flags: [],
      }

  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      npcInventories: { ...state.inventoryState.npcInventories, [npcId]: finalContainers },
      itemRegistry: { ...state.inventoryState.itemRegistry, [itemId]: registryEntry },
    },
  }
}
