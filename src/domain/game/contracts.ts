import { z } from 'zod'

import { activeCombatStateSchema } from '../combat/contracts'
import { expeditionStateSchema } from '../expedition/contracts'
import { councilSeatCountSchema, councilVoteEventSchema, institutionalTierSchema } from '../governance/contracts'
import { relationshipAxesSchema as gameRelationshipAxesSchema } from '../relationships/contracts'
import { districtDefinitionSchema } from '../districts/contracts'
import { pendingEventSchema } from '../events/contracts'
import { factionDefinitionSchema, factionRuntimeStateSchema, politicalDialsSchema } from '../factions/contracts'
import {
  armorDefinitionSchema,
  inventoryEntrySchema,
  itemDefinitionSchema,
  weaponDefinitionSchema,
} from '../items/contracts'
import { npcDefinitionSchema, npcRuntimeStateSchema } from '../npc/contracts'
import { questRuntimeSchema } from '../quests/contracts'
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

export const hireOfferSchema = z
  .object({
    npcId: z.string(),
    discoveredInDistrictId: z.string().nullable(),
    wagePerDay: z.number(),
    signingBonus: z.number().default(0),
    requiredFactionId: z.string().nullable().default(null),
    requiredFactionStanding: z.number().default(0),
    turnsAvailable: z.number().default(3),
    source: z.enum(['district', 'combat']).optional(),
  })
  .strict()

export const gameStateSchema = z
  .object({
    day: positiveIntegerSchema,
    timeSlot: timeSlotSchema,
    money: nonNegativeIntegerSchema,
    protagonistName: z.string(),
    hasSeenOpening: z.boolean(),
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
    activeMissionId: entityIdSchema.nullable(),
    pendingEvents: z.array(pendingEventSchema).default([]),
    currentDistrictId: z.string().nullable().default(null),
    availableForHire: z.array(hireOfferSchema).default([]),
    availableQuests: z.array(z.string()).default([]),
    activeQuests: z.array(questRuntimeSchema).default([]),
    completedQuestIds: z.array(z.string()).default([]),
    councilSeats: councilSeatCountSchema.default({}),
    institutionalStanding: z.record(z.string(), institutionalTierSchema).default({}),
    activeCouncilVotes: z.array(councilVoteEventSchema).default([]),
    relationships: z.record(z.string(), gameRelationshipAxesSchema).default({}),
    equippedItemDurabilities: z.record(
      z.string(),
      z.record(z.enum(['weapon', 'armor']), z.number().min(0).max(200))
    ).default({}),
    activeInvestigation: z.object({
      questId: z.string(),
      districtId: z.string().nullable(),
      rollResult: z.enum(['pending', 'success', 'partial', 'failure']).default('pending'),
    }).nullable().default(null),
    lastFiredDay: z.record(z.string(), z.number()).default({}),
    rivalOrgActions: z.array(z.object({
      orgId: z.string(),
      actionType: z.enum(['expand', 'recruit', 'pressure', 'bribe']),
      targetFactionId: z.string().optional(),
      day: z.number(),
    })).default([]),
    cityStability: z.number().min(0).max(100).default(60),
    expeditionState: expeditionStateSchema.default(() => ({
      status: 'idle' as const,
      destinationId: null,
      squadNpcIds: [],
      suppliesRemaining: 0,
      daysDeparted: 0,
      totalDays: 0,
      encounters: [],
      discoveries: [],
      cityDayAtDeparture: 0,
    })),
    householdLore: z.object({
      houseName: z.string().default('House Valdris'),
      founderName: z.string().default('Edric Valdris'),
      founderGeneration: z.number().default(2),
      antagonistFactionId: z.string().default('faction-gilded-court'),
      missingRelatives: z.array(z.object({
        name: z.string(),
        relation: z.string(),
        lastKnownLocation: z.string().optional(),
      })).default([]),
    }).default(() => ({
      houseName: 'House Valdris',
      founderName: 'Edric Valdris',
      founderGeneration: 2,
      antagonistFactionId: 'faction-gilded-court',
      missingRelatives: [],
    })),
    stash: z.object({
      weapons: z.array(z.string()),
      armors: z.array(z.string()),
    }).default(() => ({ weapons: [], armors: [] })),
    isFirstRun: z.boolean().default(true),
    debtAmount: z.number().int().nonnegative().default(500),
    debtDueDay: z.number().int().positive().default(30),
    debtPaid: z.boolean().default(false),
    debtCrisisTriggered: z.boolean().default(false),
    houseDistrictId: z.string().default('district-the-pale'),
    playerCharacter: z.object({
      name: z.string().default(''),
      stats: z.object({
        strength: z.number().int().min(1).max(10).default(5),
        cunning: z.number().int().min(1).max(10).default(5),
        authority: z.number().int().min(1).max(10).default(5),
      }),
      traits: z.array(z.string()).default([]),
      level: z.number().int().default(1),
    }).default(() => ({
      name: '',
      stats: { strength: 5, cunning: 5, authority: 5 },
      traits: [],
      level: 1,
    })),
    mainQuest: z.object({
      stage: z.enum(['searching', 'lead-found', 'location-known', 'rescued']).default('searching'),
      lastClue: z.string().default(''),
    }).default(() => ({ stage: 'searching' as const, lastClue: '' })),
    districtTension: z.record(z.string(), z.number().int().min(0).max(100)).default({}),
    activeDialogueId: z.string().nullable().default(null),
    activeDialogueNodeId: z.string().nullable().default(null),
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
export type HireOffer = z.infer<typeof hireOfferSchema>

export type EquippedItemDurabilities = z.infer<typeof gameStateSchema>['equippedItemDurabilities']
