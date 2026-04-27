import { z } from 'zod'

import { activeCombatStateSchema } from '../combat/contracts'
import { districtDefinitionSchema } from '../districts/contracts'
import { factionDefinitionSchema, factionRuntimeStateSchema, politicalDialsSchema } from '../factions/contracts'
import {
  armorDefinitionSchema,
  inventoryEntrySchema,
  itemDefinitionSchema,
  weaponDefinitionSchema,
} from '../items/contracts'
import { npcDefinitionSchema, npcRuntimeStateSchema } from '../npc/contracts'
import { shopDefinitionSchema } from '../shops/contracts'
import { entityIdSchema, nonNegativeIntegerSchema, positiveIntegerSchema, timeSlotSchema } from '../shared/contracts'

export const districtRuntimeStateSchema = z
  .object({
    districtId: entityIdSchema,
    controllingFactionId: entityIdSchema,
    danger: z.number().finite().min(0).max(100),
    marketPressure: z.number().finite().min(0).max(100),
  })
  .strict()

export const activityCategorySchema = z.enum(['economy', 'combat', 'system'])

export const activityLogEntrySchema = z
  .object({
    id: entityIdSchema,
    day: positiveIntegerSchema,
    timeSlot: timeSlotSchema,
    category: activityCategorySchema,
    message: z.string().min(1),
  })
  .strict()

export const gameContentCatalogSchema = z
  .object({
    districts: z.array(districtDefinitionSchema),
    npcs: z.array(npcDefinitionSchema),
    items: z.array(itemDefinitionSchema),
    weapons: z.array(weaponDefinitionSchema),
    armor: z.array(armorDefinitionSchema),
    factions: z.array(factionDefinitionSchema),
    shops: z.array(shopDefinitionSchema),
  })
  .strict()

export const corridorStatusSchema = z.enum(['open', 'disrupted', 'blocked'])

export const cityResourcesSchema = z
  .object({
    foodSecurity: z.number().min(0).max(100),
    waterAccess: z.number().min(0).max(100),
    materialStock: z.number().min(0).max(100),
    corridorStatus: corridorStatusSchema,
  })
  .strict()

export const gameStateSchema = z
  .object({
    day: positiveIntegerSchema,
    timeSlot: timeSlotSchema,
    money: nonNegativeIntegerSchema,
    protagonistName: z.string().min(1),
    hasSeenOpening: z.boolean(),
    politicalDials: politicalDialsSchema,
    cityDials: politicalDialsSchema,
    factionStandings: z.record(z.string(), z.number().min(-100).max(100)),
    factionStates: z.array(factionRuntimeStateSchema),
    districts: z.array(districtRuntimeStateSchema),
    roster: z.array(npcRuntimeStateSchema),
    inventory: z.array(inventoryEntrySchema),
    cityResources: cityResourcesSchema,
    activityLog: z.array(activityLogEntrySchema).max(100),
    activeQuestIds: z.array(entityIdSchema),
    selectedSquadNpcIds: z.array(entityIdSchema).max(6),
    activeCombat: activeCombatStateSchema.nullable(),
  })
  .strict()

export type ActivityCategory = z.infer<typeof activityCategorySchema>
export type ActivityLogEntry = z.infer<typeof activityLogEntrySchema>
export type CityDials = z.infer<typeof politicalDialsSchema>
export type CityResources = z.infer<typeof cityResourcesSchema>
export type CorridorStatus = z.infer<typeof corridorStatusSchema>
export type DistrictRuntimeState = z.infer<typeof districtRuntimeStateSchema>
export type GameContentCatalog = z.infer<typeof gameContentCatalogSchema>
export type GameState = z.infer<typeof gameStateSchema>
