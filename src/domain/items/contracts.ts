import { z } from 'zod'

import {
  combatRangeSchema,
  entityIdSchema,
  nonNegativeIntegerSchema,
  nonNegativeNumberSchema,
  percentageSchema,
  positiveIntegerSchema,
  raritySchema,
} from '../shared/contracts'

export const itemCategorySchema = z.enum([
  'weapon',
  'armor',
  'accessory',
  'consumable',
  'trade_good',
  'tradeGood',
  'tool',
  'document',
  'module',
  'householdModule',
  'material',
  'gift',
])

export const itemDefinitionSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().min(1),
    category: itemCategorySchema,
    tier: positiveIntegerSchema,
    value: nonNegativeIntegerSchema,
    shopPrice: z.number().min(0).default(0),
    weight: nonNegativeNumberSchema,
    rarity: raritySchema,
    tags: z.array(z.string().min(1)).default([]),
    description: z.string().optional(),
    effects: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .strict()

export const weaponClassSchema = z.enum([
  'dagger',
  'sword',
  'spear',
  'hammer',
  'pistol',
  'rifle',
  'shotgun',
  'crossbow',
  'staff',
  'special',
])

export const weaponDefinitionSchema = itemDefinitionSchema
  .extend({
    category: z.literal('weapon'),
    weaponClass: weaponClassSchema,
    effectiveRange: combatRangeSchema,
    damageMin: nonNegativeIntegerSchema,
    damageMax: nonNegativeIntegerSchema,
    accuracy: percentageSchema,
    armorPiercing: percentageSchema,
    speed: positiveIntegerSchema,
    rangeModifier: z
      .object({
        close: z.number().int().min(-100).max(100),
        distant: z.number().int().min(-100).max(100),
      })
      .strict(),
    critChance: percentageSchema,
    staggerChance: percentageSchema,
    ammoType: z.string().min(1).nullable(),
    durability: positiveIntegerSchema,
    repairCost: nonNegativeIntegerSchema.optional(),
    durabilityMax: positiveIntegerSchema.optional(),
  })
  .strict()
  .superRefine((weapon, context) => {
    if (weapon.damageMax < weapon.damageMin) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'damageMax must be greater than or equal to damageMin',
        path: ['damageMax'],
      })
    }
  })

export const armorClassSchema = z.enum(['light', 'medium', 'heavy', 'specialized'])

export const armorDefinitionSchema = itemDefinitionSchema
  .extend({
    category: z.literal('armor'),
    armorClass: armorClassSchema,
    soak: percentageSchema,
    evasionPenalty: percentageSchema,
    speedPenalty: percentageSchema,
    durability: positiveIntegerSchema,
    repairCost: nonNegativeIntegerSchema,
    durabilityMax: positiveIntegerSchema.optional(),
    slotCoverage: z.array(z.string().min(1)).min(1),
    resistances: z.record(z.string().min(1), percentageSchema).default({}),
  })
  .strict()

export const equipmentDefinitionSchema = z.discriminatedUnion('category', [
  weaponDefinitionSchema,
  armorDefinitionSchema,
])

export const loadoutSchema = z
  .object({
    primaryWeaponId: entityIdSchema.nullable(),
    secondaryWeaponId: entityIdSchema.nullable(),
    armorId: entityIdSchema.nullable(),
    accessoryIds: z.array(entityIdSchema).max(2),
    consumableIds: z.array(entityIdSchema).max(3),
  })
  .strict()

export const inventoryEntrySchema = z
  .object({
    itemId: entityIdSchema,
    quantity: positiveIntegerSchema,
    currentDurability: positiveIntegerSchema.optional(),
  })
  .strict()

export const ownedItemLocationSchema = z.enum([
  'inventory',
  'house_storage',
  'equipped',
  'mission_pack',
  'archived',
])

export const ownedItemSchema = z
  .object({
    instanceId: z.string().min(1),
    itemId: entityIdSchema,
    location: ownedItemLocationSchema,
    quantity: positiveIntegerSchema,
    currentDurability: positiveIntegerSchema.optional(),
  })
  .strict()

export type ArmorDefinition = z.infer<typeof armorDefinitionSchema>
export type EquipmentDefinition = z.infer<typeof equipmentDefinitionSchema>
export type InventoryEntry = z.infer<typeof inventoryEntrySchema>
export type ItemDefinition = z.infer<typeof itemDefinitionSchema>
export type OwnedItem = z.infer<typeof ownedItemSchema>
export type OwnedItemLocation = z.infer<typeof ownedItemLocationSchema>
export type Loadout = z.infer<typeof loadoutSchema>
export type WeaponDefinition = z.infer<typeof weaponDefinitionSchema>

export interface WeaponProfile {
  id: string
  damageMin: number
  damageMax: number
  accuracy: number
  armorPiercing: number
  critChance: number
  staggerChance: number
  rangeTypePreference: 'close' | 'medium' | 'distant'
  rangeModifierClose: number
  rangeModifierMedium: number
  rangeModifierDistant: number
}

export interface ArmorProfile {
  id: string
  soak: number
  evasionPenalty: number
  speedPenalty: number
}
