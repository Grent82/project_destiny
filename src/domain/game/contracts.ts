import { z } from 'zod'

import { activeCombatStateSchema } from '../combat/contracts'
import { rumorSchema, bondVisibilitySchema } from '../rumors/contracts'
import { expeditionStateSchema } from '../expedition/contracts'
import { councilSeatCountSchema, councilVoteEventSchema, institutionalTierSchema } from '../governance/contracts'
import { relationshipAxesSchema as gameRelationshipAxesSchema } from '../relationships/contracts'
import { districtDefinitionSchema } from '../districts/contracts'
import { eventInstanceSchema, pendingEventSchema } from '../events/contracts'
import { factionDefinitionSchema, factionRuntimeStateSchema, politicalDialsSchema } from '../factions/contracts'
import {
  armorDefinitionSchema,
  installedModuleSchema,
  inventoryEntrySchema,
  itemDefinitionSchema,
  ownedItemSchema,
  weaponDefinitionSchema,
} from '../items/contracts'
import { attributesSchema, bondStatusSchema, npcDefinitionSchema, npcRuntimeStateSchema, skillsSchema, traitsSchema, worldNpcRuntimeStateSchema } from '../npc/contracts'
import { questLeadRuntimeSchema, questRuntimeSchema } from '../quests/contracts'
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

export const roomStateSchema = z.enum(['intact', 'damaged', 'stripped', 'destroyed', 'locked', 'collapsed'])

export const roomFunctionSchema = z.enum([
  'quarters',
  'barracks',
  'kitchen',
  'study',
  'workshop',
  'archive',
  'infirmary',
  'vault',
  'reception',
])

export const houseRoomSchema = z
  .object({
    roomId: z.string(),
    name: z.string(),
    state: roomStateSchema,
    repairCost: z.number().int().nonnegative(),
    searched: z.boolean().default(false),
    roomFunction: roomFunctionSchema.nullable().default(null),
  })
  .strict()

export const houseExteriorTierSchema = z.enum(['ruined', 'patched', 'maintained', 'restored', 'grand'])
export type HouseExteriorTier = z.infer<typeof houseExteriorTierSchema>

export const heirStageSchema = z.enum(['child', 'ward', 'apprentice', 'adult'])
export type HeirStage = z.infer<typeof heirStageSchema>

export const heirOriginSchema = z.enum(['fostered', 'biological', 'ward'])
export type HeirOrigin = z.infer<typeof heirOriginSchema>

export const heirLegitimacySchema = z.enum(['recognized', 'contested', 'hidden', 'unknown'])
export type HeirLegitimacy = z.infer<typeof heirLegitimacySchema>

export const heirSchema = z.object({
  id: z.string(),
  name: z.string(),
  originStory: z.string(),
  stage: heirStageSchema.default('child'),
  arrivalDay: z.number().int(),
  origin: heirOriginSchema.optional(),
  parentRefs: z.array(z.string()).optional(),
  legitimacyStatus: heirLegitimacySchema.default('unknown'),
  birthContext: z.string().nullable().default(null),
})
export type Heir = z.infer<typeof heirSchema>

export const wardStageSchema = z.enum(['infant', 'child', 'teenager', 'young_adult'])
export type WardStage = z.infer<typeof wardStageSchema>

export const wardOriginSchema = z.enum(['biological', 'adopted', 'rescued'])
export type WardOrigin = z.infer<typeof wardOriginSchema>

export const wardSchema = z.object({
  wardId: z.string(),
  name: z.string(),
  parentNpcId: z.string().nullable().default(null),
  parentNpcIds: z.array(z.string()).default([]),
  origin: wardOriginSchema.optional(),
  birthDay: z.number().int().nonnegative().nullable().default(null),
  stage: wardStageSchema.default('child'),
  bondStatus: bondStatusSchema.nullable().default(null),
  freedOnDay: z.number().int().nonnegative().nullable().default(null),
  promotedToNpcId: z.string().nullable().default(null),
  shapingTraits: z.record(z.string(), z.number().int().min(0).max(100)).optional(),
})
export type Ward = z.infer<typeof wardSchema>

export const npcPairingPolicySchema = z.enum(['open', 'discouraged', 'forbidden'])
export type NpcPairingPolicy = z.infer<typeof npcPairingPolicySchema>

export const houseStateSchema = z
  .object({
    rooms: z.array(houseRoomSchema),
    vaultUnlocked: z.boolean().default(false),
    rosterBonus: z.number().int().nonnegative().default(0),
    exteriorState: houseExteriorTierSchema.default('ruined'),
    fortificationLevel: z.number().int().min(0).max(5).default(0),
    houseHeirs: z.array(heirSchema).max(2).default([]),
    npcPairingPolicy: npcPairingPolicySchema.default('open'),
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
    source: z.enum(['district', 'combat', 'event', 'relationship']).optional(),
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
    inventory: z.array(inventoryEntrySchema).default([]),
    ownedItems: z.array(ownedItemSchema).default([]),
    houseStorageCapacity: z.number().int().positive().default(40),
    installedHouseModules: z.array(installedModuleSchema).default([]),
    cityResources: cityResourcesSchema,
    activityLog: z.array(activityLogEntrySchema).max(100),
    selectedSquadNpcIds: z.array(entityIdSchema).max(6),
    activeCombat: activeCombatStateSchema.nullable(),
    lastEncounterSummary: z.object({
      outcome: z.enum(['victory', 'defeat']),
      label: z.string(),
      day: z.number(),
      timeSlot: z.string(),
      linkedQuestId: z.string().nullable(),
      noteLines: z.array(z.string()),
    }).nullable().default(null),
    pendingEvents: z.array(pendingEventSchema).default([]),
    eventInstances: z.array(eventInstanceSchema).default([]),
    currentDistrictId: z.string().nullable().default(null),
    availableForHire: z.array(hireOfferSchema).default([]),
    availableQuestLeads: z.array(questLeadRuntimeSchema).default([]),
    activeQuests: z.array(questRuntimeSchema).default([]),
    completedQuestIds: z.array(z.string()).default([]),
    wards: z.array(wardSchema).default([]),
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
      stage: z.enum(['approach-selection', 'ready-to-resolve']).default('approach-selection'),
      chosenApproachId: z.string().nullable().default(null),
      clueText: z.string().nullable().default(null),
    }).nullable().default(null),
    pendingConsumableDecision: z.object({
      npcId: z.string(),
      npcName: z.string(),
      instanceId: z.string(),
      itemName: z.string(),
      injuryContext: z.string(),
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
      houseName: z.string().default('House Valdric'),
      founderName: z.string().default('Edric Valdric'),
      founderGeneration: z.number().default(2),
      antagonistFactionId: z.string().default('faction-gilded-court'),
      missingRelatives: z.array(z.object({
        name: z.string(),
        relation: z.string(),
        lastKnownLocation: z.string().optional(),
      })).default([]),
    }).default(() => ({
      houseName: 'House Valdric',
      founderName: 'Edric Valdric',
      founderGeneration: 2,
      antagonistFactionId: 'faction-gilded-court',
      missingRelatives: [],
    })),
    stash: z.object({
      weapons: z.array(z.string()),
      armors: z.array(z.string()),
    }).default(() => ({ weapons: [], armors: [] })),
    isFirstRun: z.boolean().default(true),
    debtAmount: z.number().int().nonnegative().default(800),
    debtDueDay: z.number().int().positive().default(30),
    debtPaid: z.boolean().default(false),
    debtCrisisTriggered: z.boolean().default(false),
    houseDistrictId: z.string().default('district-the-pale'),
    playerCharacter: z.object({
      name: z.string().default(''),
      backgroundId: z.string().optional(),
      attributes: attributesSchema,
      skills: skillsSchema,
      traits: traitsSchema,
      combatState: z.object({
        health: z.number().int().min(0).max(100).default(80),
        morale: z.number().int().min(0).max(100).default(70),
        injury: z.number().int().min(0).max(100).default(0),
      }).optional(),
      level: z.number().int().default(1),
      renown: z.number().int().min(0).default(0),
    }).default(() => ({
      name: '',
      attributes: { might: 40, agility: 40, endurance: 40, intellect: 40, perception: 40, presence: 40, resolve: 40 },
      skills: { melee: 15, ranged: 15, medicine: 15, administration: 15, engineering: 15, negotiation: 15, survival: 15, security: 15, crafting: 15, performance: 15, academics: 15, intrigue: 15 },
      traits: { discipline: 40, ambition: 40, empathy: 40, ruthlessness: 40, prudence: 40, curiosity: 40, dominance: 40, loyalty: 40, vanity: 40, zeal: 40 },
      level: 1,
      renown: 0,
    })),
    mainQuest: z.object({
      stage: z.enum(['searching', 'lead-found', 'location-known', 'rescued', 'epilogue']).default('searching'),
      lastClue: z.string().default(''),
    }).default(() => ({ stage: 'searching' as const, lastClue: '' })),
    districtTension: z.record(z.string(), z.number().int().min(0).max(100)).default({}),
    activeDialogueId: z.string().nullable().default(null),
    activeDialogueNodeId: z.string().nullable().default(null),
    visitedDialogueNodes: z.record(z.string(), z.string()).default({}),
    resolvedDialogueChoices: z.record(z.string(), z.array(z.string())).default({}),
    house: houseStateSchema.default(() => ({
      rooms: [
        { roomId: 'room-entrance-hall', name: 'Entrance Hall', state: 'intact' as const, repairCost: 0, searched: false, roomFunction: null },
        { roomId: 'room-marion-quarters', name: "Marion's Quarters", state: 'intact' as const, repairCost: 0, searched: false, roomFunction: null },
        { roomId: 'room-bureau', name: 'Bureau', state: 'damaged' as const, repairCost: 15, searched: false, roomFunction: null },
        { roomId: 'room-kitchen', name: 'Kitchen', state: 'damaged' as const, repairCost: 20, searched: false, roomFunction: null },
        { roomId: 'room-study', name: 'Study', state: 'stripped' as const, repairCost: 35, searched: false, roomFunction: null },
        { roomId: 'room-master-chamber', name: "Master's Chamber", state: 'stripped' as const, repairCost: 45, searched: false, roomFunction: null },
        { roomId: 'room-servant-quarters', name: 'Servant Quarters', state: 'collapsed' as const, repairCost: 60, searched: false, roomFunction: null },
        { roomId: 'room-barracks', name: 'Barracks', state: 'stripped' as const, repairCost: 80, searched: false, roomFunction: null },
        { roomId: 'room-vault', name: 'Cellar / Vault', state: 'locked' as const, repairCost: 0, searched: false, roomFunction: null },
        { roomId: 'room-garret', name: 'Garret', state: 'collapsed' as const, repairCost: 130, searched: false, roomFunction: null },
        { roomId: 'room-east-wing', name: 'East Wing', state: 'destroyed' as const, repairCost: 200, searched: false, roomFunction: null },
      ],
      vaultUnlocked: false,
      rosterBonus: 0,
      exteriorState: 'ruined' as const,
      fortificationLevel: 0,
      houseHeirs: [],
      npcPairingPolicy: 'open' as const,
    })),
    saveVersion: z.number().int().min(1).default(2),
    rngSeed: z.number().int().nonnegative().default(42),
    rumors: z.array(rumorSchema).default([]),
    bondVisibility: z.record(z.string(), bondVisibilitySchema).default({}),
    worldNpcStates: z.array(worldNpcRuntimeStateSchema).default([]),
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
export type HouseRoom = z.infer<typeof houseRoomSchema>
export type HouseState = z.infer<typeof houseStateSchema>
export type PlayerCharacter = z.infer<typeof gameStateSchema>['playerCharacter']
export type RoomFunction = z.infer<typeof roomFunctionSchema>
export type RoomState = z.infer<typeof roomStateSchema>

export type EquippedItemDurabilities = z.infer<typeof gameStateSchema>['equippedItemDurabilities']

// Re-export NPC schemas used for playerCharacter for consumer convenience
export type { Attributes, Skills, Traits } from '../npc/contracts'
