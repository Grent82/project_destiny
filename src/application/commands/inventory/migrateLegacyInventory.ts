/**
 * migrateLegacyInventoryToNew command
 *
 * One-time migration from legacy inventory system to new inventoryState-based system.
 *
 * Migrates:
 * 1. ownedItems → inventoryState.player.bagContainers (inventory, house_storage locations)
 * 2. ownedItems → inventoryState.player.equipmentSlots (equipped location)
 * 3. roster[n].equipment → inventoryState.npcInventories[npcId].equipmentSlots
 * 4. roster[n].inventory → inventoryState.npcInventories[npcId].bagContainers
 *
 * This command should only be run once during save migration (v2 → v3).
 */

import type { GameState } from '../../../domain/game/contracts'
import type { InventoryContainer, InventorySlot, ItemInstance } from '../../../domain/inventory/contracts'
import { contentCatalog } from '../../content/contentCatalog'

/**
 * Result of migration with summary statistics.
 */
export interface MigrationResult {
  success: boolean
  playerItemsMigrated: number
  playerEquipmentMigrated: number
  npcInventoriesMigrated: number
  npcEquipmentMigrated: number
  errors: string[]
}

/**
 * Migrate legacy inventory system to new inventoryState-based system.
 *
 * @param state - Current game state with legacy inventory
 * @param migrationDay - The day of migration (used for acquiredDay field)
 * @returns Updated state with migrated inventory
 */
export function migrateLegacyInventoryToNew(state: GameState, migrationDay: number): GameState {
  // Create deep copy of state
  const newState: GameState = {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      player: {
        ...state.inventoryState.player,
        bagContainers: [],
        equipmentSlots: {
          weapon: null,
          armor: null,
          accessory_1: null,
          accessory_2: null,
        },
      },
      npcInventories: {},
      sharedContainers: [],
      itemRegistry: {},
    },
  }

  // ─── Phase 1: Migrate player ownedItems ─────────────────────────────────────

  // Track which items have been migrated to avoid duplicates
  const migratedInstanceIds = new Set<string>()

  for (const item of state.ownedItems) {
    if (migratedInstanceIds.has(item.instanceId)) {
      continue
    }

    migratedInstanceIds.add(item.instanceId)

    // Create ItemInstance from OwnedItem
    const itemInstance: ItemInstance = {
      uniqueId: item.instanceId,
      itemId: item.itemId,
      quantity: item.quantity,
      locationType: getItemLocationType(item.location),
      locationId: 'player',
      equippedSlot: getEquippedSlot(item.location),
      acquiredDay: migrationDay,
      acquiredFrom: 'migrated',
      flags: [],
    }

    if (item.location === 'inventory') {
      // Add to player bagContainers
      newState.inventoryState.player.bagContainers.push(createContainerWithSlot(itemInstance))
    } else if (item.location === 'house_storage') {
      // Add to sharedContainers (house vault)
      newState.inventoryState.sharedContainers.push(createContainerWithSlot(itemInstance))
    } else if (item.location === 'equipped') {
      // Determine slot from item category
      const slot = determineEquipmentSlot(item.itemId)
      if (slot) {
        newState.inventoryState.player.equipmentSlots[slot] = item.instanceId
      }
    } else if (item.location === 'mission_pack') {
      // Create a mission container for expedition items
      const missionContainer: InventoryContainer = {
        containerId: `mission-pack-${migrationDay}`,
        containerType: 'supply_pack',
        ownerId: 'player',
        name: 'Mission Pack',
        maxSlots: 20,
        slots: [createSlotFromInstance(itemInstance)],
        locked: false,
      }
      newState.inventoryState.player.bagContainers.push(missionContainer)
    } else if (item.location === 'archived') {
      // Archived items go to a separate container
      const archiveContainer: InventoryContainer = {
        containerId: `archive-${migrationDay}`,
        containerType: 'chest',
        ownerId: 'player',
        name: 'Archive',
        maxSlots: 50,
        slots: [createSlotFromInstance(itemInstance)],
        locked: false,
      }
      newState.inventoryState.player.bagContainers.push(archiveContainer)
    }
  }

  // Update usedBagSlots
  newState.inventoryState.player.usedBagSlots = calculateUsedBagSlots(newState.inventoryState.player.bagContainers)

  // ─── Phase 2: Migrate NPC equipment and inventory ───────────────────────────

  for (const npc of state.roster) {
    const npcId = npc.npcId

    // Initialize NPC inventory containers
    newState.inventoryState.npcInventories[npcId] = []

    // Migrate NPC equipment
    if (npc.equipment.weapon) {
      const itemInstance: ItemInstance = {
        uniqueId: npc.equipment.weapon,
        itemId: npc.equipment.weapon,
        quantity: 1,
        locationType: 'npc_equipment',
        locationId: npcId,
        equippedSlot: 'weapon',
        acquiredDay: migrationDay,
        acquiredFrom: 'migrated',
        flags: [],
      }
      newState.inventoryState.npcInventories[npcId].push(createContainerWithSlot(itemInstance))
    }

    if (npc.equipment.armor) {
      const itemInstance: ItemInstance = {
        uniqueId: npc.equipment.armor,
        itemId: npc.equipment.armor,
        quantity: 1,
        locationType: 'npc_equipment',
        locationId: npcId,
        equippedSlot: 'armor',
        acquiredDay: migrationDay,
        acquiredFrom: 'migrated',
        flags: [],
      }
      newState.inventoryState.npcInventories[npcId].push(createContainerWithSlot(itemInstance))
    }

    for (let i = 0; i < (npc.equipment.accessory?.length ?? 0); i++) {
      const accessoryId = npc.equipment.accessory?.[i]
      if (accessoryId) {
        const slot: 'accessory_1' | 'accessory_2' = i === 0 ? 'accessory_1' : 'accessory_2'
        const itemInstance: ItemInstance = {
          uniqueId: accessoryId,
          itemId: accessoryId,
          quantity: 1,
          locationType: 'npc_equipment',
          locationId: npcId,
          equippedSlot: slot,
          acquiredDay: migrationDay,
          acquiredFrom: 'migrated',
          flags: [],
        }
        newState.inventoryState.npcInventories[npcId].push(createContainerWithSlot(itemInstance))
      }
    }

    // Migrate NPC inventory
    if (npc.inventory.length > 0) {
      const container: InventoryContainer = {
        containerId: `npc-inventory-${npcId}-${migrationDay}`,
        containerType: 'backpack',
        ownerId: npcId,
        name: `${npc.name}'s Backpack`,
        maxSlots: Math.max(20, npc.inventory.length),
        slots: npc.inventory.map((invItem, index) => ({
          slotId: `slot-${index}`,
          itemInstanceId: invItem.itemId, // Legacy: itemId used as instanceId
          quantity: invItem.quantity,
        })),
        locked: false,
      }
      newState.inventoryState.npcInventories[npcId].push(container)
    }
  }

  // Build itemRegistry from migrated items
  newState.inventoryState.itemRegistry = buildItemRegistry(newState.inventoryState)

  return newState
}

/**
 * Helper: Convert OwnedItemLocation to ItemLocationType
 */
function getItemLocationType(location: string): 'player_inventory' | 'npc_inventory' | 'npc_equipment' | 'container' | 'player_equipment' {
  switch (location) {
    case 'inventory':
      return 'player_inventory'
    case 'house_storage':
      return 'container'
    case 'equipped':
      return 'player_equipment'
    case 'mission_pack':
      return 'player_inventory'
    case 'archived':
      return 'player_inventory'
    default:
      return 'player_inventory'
  }
}

/**
 * Helper: Get equipped slot from location
 */
function getEquippedSlot(location: string): 'weapon' | 'armor' | 'accessory_1' | 'accessory_2' | undefined {
  if (location === 'equipped') {
    // Will be determined by item category
    return undefined
  }
  return undefined
}

/**
 * Helper: Determine equipment slot based on item category
 */
function determineEquipmentSlot(itemId: string): 'weapon' | 'armor' | 'accessory_1' | 'accessory_2' | null {
  const itemDef = contentCatalog.itemsById.get(itemId)
  if (!itemDef) return null

  if (itemDef.category === 'weapon') return 'weapon'
  if (itemDef.category === 'armor') return 'armor'
  if (itemDef.category !== 'consumable' && itemDef.category !== 'tradeGood' && itemDef.category !== 'material') {
    return 'accessory_1' // Default to accessory for non-weapon/armor items
  }
  return null
}

/**
 * Helper: Create a container with a single slot
 */
function createContainerWithSlot(instance: ItemInstance): InventoryContainer {
  return {
    containerId: `container-${instance.uniqueId}`,
    containerType: 'backpack',
    ownerId: instance.locationId ?? 'player',
    slots: [createSlotFromInstance(instance)],
    maxSlots: 20,
    locked: false,
  }
}

/**
 * Helper: Create a slot from an item instance
 */
function createSlotFromInstance(instance: ItemInstance): InventorySlot {
  return {
    slotId: `slot-${instance.uniqueId}`,
    itemInstanceId: instance.uniqueId,
    quantity: instance.quantity,
  }
}

/**
 * Helper: Calculate used bag slots
 */
function calculateUsedBagSlots(containers: InventoryContainer[]): number {
  return containers.reduce((sum, container) => sum + container.slots.length, 0)
}

/**
 * Helper: Build itemRegistry from inventoryState
 */
function buildItemRegistry(inventoryState: GameState['inventoryState']): Record<string, ItemInstance> {
  const registry: Record<string, ItemInstance> = {}

  // Process player inventory
  for (const container of inventoryState.player.bagContainers) {
    for (const slot of container.slots) {
      if (!slot.itemInstanceId) continue
      registry[slot.itemInstanceId] = {
        uniqueId: slot.itemInstanceId,
        itemId: slot.itemInstanceId, // Will need to be looked up from definitions
        quantity: slot.quantity,
        locationType: 'player_inventory',
        locationId: 'player',
        acquiredDay: 1,
        flags: [],
      }
    }
  }

  // Process player equipment
  const equipmentSlots = inventoryState.player.equipmentSlots
  if (equipmentSlots.weapon) {
    registry[equipmentSlots.weapon] = {
      uniqueId: equipmentSlots.weapon,
      itemId: equipmentSlots.weapon,
      quantity: 1,
      locationType: 'player_equipment',
      locationId: 'player',
      equippedSlot: 'weapon',
      acquiredDay: 1,
      flags: [],
    }
  }
  if (equipmentSlots.armor) {
    registry[equipmentSlots.armor] = {
      uniqueId: equipmentSlots.armor,
      itemId: equipmentSlots.armor,
      quantity: 1,
      locationType: 'player_equipment',
      locationId: 'player',
      equippedSlot: 'armor',
      acquiredDay: 1,
      flags: [],
    }
  }
  if (equipmentSlots.accessory_1) {
    registry[equipmentSlots.accessory_1] = {
      uniqueId: equipmentSlots.accessory_1,
      itemId: equipmentSlots.accessory_1,
      quantity: 1,
      locationType: 'player_equipment',
      locationId: 'player',
      equippedSlot: 'accessory_1',
      acquiredDay: 1,
      flags: [],
    }
  }
  if (equipmentSlots.accessory_2) {
    registry[equipmentSlots.accessory_2] = {
      uniqueId: equipmentSlots.accessory_2,
      itemId: equipmentSlots.accessory_2,
      quantity: 1,
      locationType: 'player_equipment',
      locationId: 'player',
      equippedSlot: 'accessory_2',
      acquiredDay: 1,
      flags: [],
    }
  }

  // Process NPC inventories
  for (const [npcId, containers] of Object.entries(inventoryState.npcInventories)) {
    for (const container of containers) {
      for (const slot of container.slots) {
        if (!slot.itemInstanceId) continue
        registry[slot.itemInstanceId] = {
          uniqueId: slot.itemInstanceId,
          itemId: slot.itemInstanceId,
          quantity: slot.quantity,
          locationType: container.containerType === 'backpack' ? 'npc_inventory' : 'npc_equipment',
          locationId: npcId,
          acquiredDay: 1,
          flags: [],
        }
      }
    }
  }

  // Process shared containers
  for (const container of inventoryState.sharedContainers) {
    for (const slot of container.slots) {
      if (!slot.itemInstanceId) continue
      registry[slot.itemInstanceId] = {
        uniqueId: slot.itemInstanceId,
        itemId: slot.itemInstanceId,
        quantity: slot.quantity,
        locationType: 'container',
        locationId: container.containerId,
        acquiredDay: 1,
        flags: [],
      }
    }
  }

  return registry
}
