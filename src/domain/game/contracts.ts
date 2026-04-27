import { z } from 'zod'

import { districtDefinitionSchema } from '../districts/contracts'
import { factionDefinitionSchema, factionRuntimeStateSchema, politicalDialsSchema } from '../factions/contracts'
import {
  armorDefinitionSchema,
  inventoryEntrySchema,
  itemDefinitionSchema,
  weaponDefinitionSchema,
} from '../items/contracts'
import { npcDefinitionSchema, npcRuntimeStateSchema } from '../npc/contracts'
import { entityIdSchema, nonNegativeIntegerSchema, positiveIntegerSchema, timeSlotSchema } from '../shared/contracts'

export const districtRuntimeStateSchema = z
  .object({
    districtId: entityIdSchema,
    controllingFactionId: entityIdSchema,
    danger: z.number().finite().min(0).max(100),
    marketPressure: z.number().finite().min(0).max(100),
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
  })
  .strict()

export const gameStateSchema = z
  .object({
    day: positiveIntegerSchema,
    timeSlot: timeSlotSchema,
    money: nonNegativeIntegerSchema,
    politicalDials: politicalDialsSchema,
    factionStates: z.array(factionRuntimeStateSchema),
    districts: z.array(districtRuntimeStateSchema),
    roster: z.array(npcRuntimeStateSchema),
    inventory: z.array(inventoryEntrySchema),
    activeQuestIds: z.array(entityIdSchema),
    selectedSquadNpcIds: z.array(entityIdSchema).max(6),
  })
  .strict()

export type DistrictRuntimeState = z.infer<typeof districtRuntimeStateSchema>
export type GameContentCatalog = z.infer<typeof gameContentCatalogSchema>
export type GameState = z.infer<typeof gameStateSchema>
