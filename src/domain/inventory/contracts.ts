import { z } from 'zod'

import { entityIdSchema, nonNegativeIntegerSchema, positiveIntegerSchema } from '../shared/contracts'

/**
 * Item location - where an item instance currently resides.
 */
export const itemLocationTypeSchema = z.enum([
  'player_inventory',
  'npc_inventory',
  'npc_equipment',
  'container',
  'player_equipment',
  'shop_stock',
  'equipment',
])

export type ItemLocationType = z.infer<typeof itemLocationTypeSchema>

/**
 * Container types for storage.
 */
export const containerTypeSchema = z.enum([
  'backpack',
  'chest',
  'crate',
  'satchel',
  'vault',
  'wardrobe',
  'toolkit',
  'supply_pack',
])

export type ContainerType = z.infer<typeof containerTypeSchema>

/**
 * Equipment slot types.
 */
export const equipmentSlotTypeSchema = z.enum(['weapon', 'armor', 'accessory_1', 'accessory_2'])

export type EquipmentSlotType = z.infer<typeof equipmentSlotTypeSchema>

/**
 * Item instance - a unique, trackable item with identity.
 * Unlike ItemDefinition (template), this represents a specific item object.
 */
export const itemInstanceSchema = z
  .object({
    uniqueId: entityIdSchema, // Unique instance identifier (e.g., 'item-iron-sword-001')
    itemId: entityIdSchema, // References ItemDefinition (e.g., 'item-iron-sword')
    quantity: positiveIntegerSchema.default(1), // Stackable items (consumables, trade goods)
    locationType: itemLocationTypeSchema, // Where it currently is
    locationId: z.string().optional(), // Specific containerId, npcId, or 'player'
    equippedSlot: equipmentSlotTypeSchema.optional(), // If equipped, which slot
    acquiredDay: positiveIntegerSchema, // When player/Npc acquired it
    acquiredFrom: z.string().optional(), // Source (shop, loot, gift, quest)
    flags: z.array(z.string()).default([]), // Custom flags (e.g., 'quest_item', 'sentimental')
  })
  .strict()

export type ItemInstance = z.infer<typeof itemInstanceSchema>

/**
 * Inventory slot - a single slot that can hold an item instance.
 */
export const inventorySlotSchema = z
  .object({
    slotId: z.string().min(1), // Unique slot identifier within container
    itemInstanceId: entityIdSchema.nullable().default(null), // null = empty slot
    quantity: positiveIntegerSchema.default(1), // For stackable items
  })
  .strict()

export type InventorySlot = z.infer<typeof inventorySlotSchema>

/**
 * Container - a storage entity with multiple slots.
 */
export const inventoryContainerSchema = z
  .object({
    containerId: entityIdSchema, // Unique container identifier
    containerType: containerTypeSchema,
    ownerId: z.string().min(1), // Owner identifier: 'player', 'npc:<npcId>', 'household:<houseId>', 'organization:<orgId>', 'shop:<shopId>', 'site:<siteId>'
    name: z.string().min(1).optional(), // Custom name (e.g., 'Marion\'s Backpack')
    maxSlots: positiveIntegerSchema.default(20),
    slots: z.array(inventorySlotSchema).default([]),
    locked: z.boolean().default(false),
    lockedBy: z.string().optional(), // Who locked it (for story purposes)
  })
  .strict()

export type InventoryContainer = z.infer<typeof inventoryContainerSchema>

/**
 * Player inventory state.
 */
export const playerInventoryStateSchema = z
  .object({
    equipmentSlots: z.object({
      weapon: z.string().nullable().default(null), // uniqueId of equipped weapon
      armor: z.string().nullable().default(null), // uniqueId of equipped armor
      accessory_1: z.string().nullable().default(null),
      accessory_2: z.string().nullable().default(null),
    }),
    bagContainers: z.array(inventoryContainerSchema).default([]), // Player's backpacks/bags
    totalBagSlots: positiveIntegerSchema.default(40), // Total bag capacity
    usedBagSlots: nonNegativeIntegerSchema.default(0), // Currently used
  })
  .strict()

export type PlayerInventoryState = z.infer<typeof playerInventoryStateSchema>

/**
 * Full inventory state for the game.
 */
export const inventoryStateSchema = z
  .object({
    player: playerInventoryStateSchema,
    npcInventories: z.record(entityIdSchema, z.array(inventoryContainerSchema)).default({}), // npcId -> containers (e.g., 'npc:marion-vale' -> [npc:marion-vale:inventory])
    sharedContainers: z.array(inventoryContainerSchema).default([]), // House vault, shop stock, organization storage, site containers
    itemRegistry: z.record(entityIdSchema, itemInstanceSchema).default({}), // uniqueId -> ItemInstance
  })
  .strict()

export type InventoryState = z.infer<typeof inventoryStateSchema>

// ─── Command parameter schemas ──────────────────────────────────────────────

export const transferItemParamsSchema = z
  .object({
    fromType: itemLocationTypeSchema,
    fromId: z.string().min(1), // containerId, npcId, or 'player'
    toType: itemLocationTypeSchema,
    toId: z.string().min(1),
    itemInstanceId: entityIdSchema,
    quantity: positiveIntegerSchema.default(1),
  })
  .strict()

export type TransferItemParams = z.infer<typeof transferItemParamsSchema>

export const equipItemParamsSchema = z
  .object({
    ownerId: z.string().min(1), // Owner identifier: 'player', 'npc:<npcId>', 'household:<houseId>', 'organization:<orgId>', 'shop:<shopId>', 'site:<siteId>'
    itemInstanceId: entityIdSchema,
    slot: equipmentSlotTypeSchema,
  })
  .strict()

export type EquipItemParams = z.infer<typeof equipItemParamsSchema>

export const unequipItemParamsSchema = z
  .object({
    ownerId: z.string().min(1),
    slot: equipmentSlotTypeSchema,
  })
  .strict()

export type UnequipItemParams = z.infer<typeof unequipItemParamsSchema>

export const createContainerParamsSchema = z
  .object({
    ownerId: z.string().min(1),
    containerType: containerTypeSchema,
    name: z.string().min(1).optional(),
    maxSlots: positiveIntegerSchema.default(20),
  })
  .strict()

export type CreateContainerParams = z.infer<typeof createContainerParamsSchema>

export const openContainerParamsSchema = z
  .object({
    containerId: entityIdSchema,
    accessorId: z.string().min(1), // Who is opening (for permission checks)
  })
  .strict()

export type OpenContainerParams = z.infer<typeof openContainerParamsSchema>
