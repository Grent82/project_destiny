import { z } from 'zod'

import { activeCombatStateSchema } from '../combat/contracts'
import { rumorSchema, bondVisibilitySchema } from '../rumors/contracts'
import { correspondenceMessageSchema } from '../correspondence/contracts'
import { expeditionStateSchema, corridorGroupSchema } from '../expedition/contracts'
import { worldEventSchema } from '../world/events'
import { councilSeatCountSchema, councilVoteEventSchema, institutionalTierSchema } from '../governance/contracts'
import { intimacyStageSchema, relationshipAxesSchema as gameRelationshipAxesSchema } from '../relationships/contracts'
import { districtDefinitionSchema } from '../districts/contracts'
import { eventInstanceSchema, pendingEventSchema } from '../events/contracts'
import { factionDefinitionSchema, factionRuntimeStateSchema, politicalDialsSchema, factionDirectiveSchema } from '../factions/contracts'
import {
  armorDefinitionSchema,
  installedModuleSchema,
  itemDefinitionSchema,
  weaponDefinitionSchema,
} from '../items/contracts'
import { attributesSchema, bondStatusSchema, captivityStateSchema, npcDefinitionSchema, npcRuntimeStateSchema, skillsSchema, traitsSchema, worldNpcRuntimeStateSchema } from '../npc/contracts'
import { questLeadRuntimeSchema, questRuntimeSchema } from '../quests/contracts'
import { shopDefinitionSchema } from '../shops/contracts'
import { entityIdSchema, nonNegativeIntegerSchema, positiveIntegerSchema, timeSlotSchema, timeSlotStateSchema } from '../shared/contracts'
import { npcSitePresenceSchema, siteRuntimeSchema } from '../world/runtime'
import { chronicleSchema } from '../chronicle/contracts'
import { inventoryStateSchema } from '../inventory/contracts'

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
    foodStock: nonNegativeIntegerSchema,
    foodCapacity: nonNegativeIntegerSchema,
    waterAccess: z.number().min(0).max(100),
    materialStock: z.number().min(0).max(100),
    corridorStatus: corridorStatusSchema,
    corridorClearanceProgressDays: nonNegativeIntegerSchema.default(0),
    activeGroups: z.array(corridorGroupSchema).default([]),
    groupHistory: z.array(corridorGroupSchema).default([]),
  })
  .strict()

export const roomStateSchema = z.enum(['intact', 'damaged', 'stripped', 'destroyed', 'locked', 'collapsed'])

export const roomUpgradeTierSchema = z.enum(['basic', 'improved', 'refined', 'luxurious'])
export type RoomUpgradeTier = z.infer<typeof roomUpgradeTierSchema>

export const relationshipMilestoneSchema = z
  .object({
    intimacyStage: intimacyStageSchema,
    unlockedDay: positiveIntegerSchema,
    roomId: z.string().nullable().default(null),
    description: z.string().min(1),
  })
  .strict()
export type RelationshipMilestone = z.infer<typeof relationshipMilestoneSchema>

export const dateProposalStateSchema = z.enum(['pending', 'accepted', 'rejected'])
export const dateRejectionReasonSchema = z.enum(['too-soon', 'wrong-time', 'wrong-location', 'not-ready', 'busy', 'incompatibility'])

export const dateProposalSchema = z
  .object({
    proposalId: entityIdSchema,
    proposerNpcId: entityIdSchema,
    targetNpcId: entityIdSchema,
    dateTemplateId: z.string(),
    proposedDay: positiveIntegerSchema,
    proposedTimeSlot: timeSlotSchema,
    proposedLocation: z.string().nullable().default(null),
    status: dateProposalStateSchema.default('pending'),
    rejectionReason: dateRejectionReasonSchema.nullable().default(null),
    proposedAtDay: positiveIntegerSchema,
  })
  .strict()

export const dateLocationSchema = z
  .object({
    districtId: entityIdSchema,
    poiId: z.string().optional(),
    label: z.string().optional(),
  })
  .strict()
export type DateLocation = z.infer<typeof dateLocationSchema>

export const scheduledDateSchema = z
  .object({
    dateId: entityIdSchema,
    npcIds: z.array(entityIdSchema).length(2),
    dateTemplateId: z.string(),
    scheduledDay: positiveIntegerSchema,
    scheduledTimeSlot: timeSlotSchema,
    location: dateLocationSchema.nullable().default(null),
    status: z.enum(['scheduled', 'completed', 'cancelled']).default('scheduled'),
    outcomeId: z.string().nullable().default(null),
  })
  .strict()

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
    repairDaysRemaining: z.number().int().nonnegative().default(0),
    searched: z.boolean().default(false),
    roomFunction: roomFunctionSchema.nullable().default(null),
    upgradeTier: roomUpgradeTierSchema.default('basic'),
    decorStyle: z.string().nullable().default(null),
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

export const domesticRelationshipBeatSchema = z
  .object({
    day: positiveIntegerSchema,
    npcIds: z.array(z.string()).length(2),
    npcNames: z.array(z.string()).length(2),
    roomId: z.string(),
    roomName: z.string(),
    policy: npcPairingPolicySchema,
    intimacyStage: intimacyStageSchema,
    summary: z.string().min(1),
    effects: z.array(z.string()).default([]),
  })
  .strict()
export type DomesticRelationshipBeat = z.infer<typeof domesticRelationshipBeatSchema>

export const houseStateSchema = z
  .object({
    rooms: z.array(houseRoomSchema),
    vaultUnlocked: z.boolean().default(false),
    rosterBonus: z.number().int().nonnegative().default(0),
    exteriorState: houseExteriorTierSchema.default('ruined'),
    fortificationLevel: z.number().int().min(0).max(5).default(0),
    houseHeirs: z.array(heirSchema).max(2).default([]),
    npcPairingPolicy: npcPairingPolicySchema.default('open'),
    lastDomesticRelationshipBeat: domesticRelationshipBeatSchema.nullable().default(null),
    relationshipMilestones: z.array(relationshipMilestoneSchema).default([]),
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

const investigationOperativeResultSchema = z
  .object({
    npcId: z.string(),
    operativeName: z.string(),
    skillUsed: z.string(),
    skillValue: z.number(),
    rollValue: z.number(),
    effectiveRoll: z.number(),
    outcome: z.enum(['success', 'partial', 'failure']),
  })
  .strict()

const lastInvestigationResultSchema = z
  .object({
    questId: z.string(),
    districtId: z.string().nullable(),
    outcome: z.enum(['success', 'partial', 'failure']),
    chosenApproachId: z.string().nullable().default(null),
    clueText: z.string().nullable().default(null),
    operativeResults: z.array(investigationOperativeResultSchema).default([]),
  })
  .strict()

const lastResolvedEventSummarySchema = z
  .object({
    eventId: z.string(),
    title: z.string(),
    choiceLabel: z.string(),
    day: z.number().int().positive(),
    timeSlot: timeSlotSchema,
    sourceNpcName: z.string().nullable().default(null),
    narrativeOutcome: z.string().nullable().default(null),
    playerEffects: z.array(z.string()).default([]),
    npcEffects: z.array(z.string()).default([]),
    worldEffects: z.array(z.string()).default([]),
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
    // inventory removed - legacy ownedItems system fully deprecated
    // ownedItems removed - migrated to inventoryState.player.bagContainers
    inventoryState: inventoryStateSchema.default(() => ({
      player: {
        equipmentSlots: {
          weapon: null,
          armor: null,
          accessory_1: null,
          accessory_2: null,
        },
        bagContainers: [],
        totalBagSlots: 40,
        usedBagSlots: 0,
      },
      npcInventories: {},
      sharedContainers: [],
      itemRegistry: {},
    })),
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
    lastResolvedEventSummary: lastResolvedEventSummarySchema.nullable().default(null),
    pendingEvents: z.array(pendingEventSchema).default([]),
    eventInstances: z.array(eventInstanceSchema).default([]),
    currentDistrictId: z.string().nullable().default(null),
    availableForHire: z.array(hireOfferSchema).default([]),
    availableQuestLeads: z.array(questLeadRuntimeSchema).default([]),
    activeQuests: z.array(questRuntimeSchema).default([]),
    completedQuestIds: z.array(z.string()).default([]),
    failedQuestIds: z.array(z.string()).default([]),
    questHistory: z.array(questRuntimeSchema).default([]),
    councilSeats: councilSeatCountSchema.default({}),
    houseWardSeats: z.number().min(0).default(0),
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
    lastInvestigationResult: lastInvestigationResultSchema.nullable().default(null),
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
    debtAmount: z.number().int().nonnegative().default(800),
    debtClaimantNpcId: z.string().default('npc-enemy-harlen-voss'),
    debtEnforcementFactionId: z.string().default('faction-gilded-court'),
    debtBeneficiaryFactionId: z.string().default('faction-house-merrow'),
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
        { roomId: 'room-entrance-hall', name: 'Entrance Hall', state: 'intact' as const, repairCost: 0, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic' as const, decorStyle: null },
        { roomId: 'room-quarters', name: 'Quarters', state: 'intact' as const, repairCost: 0, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic' as const, decorStyle: null },
        { roomId: 'room-bureau', name: 'Bureau', state: 'damaged' as const, repairCost: 15, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic' as const, decorStyle: null },
        { roomId: 'room-kitchen', name: 'Kitchen', state: 'damaged' as const, repairCost: 20, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic' as const, decorStyle: null },
        { roomId: 'room-study', name: 'Study', state: 'stripped' as const, repairCost: 35, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic' as const, decorStyle: null },
        { roomId: 'room-master-chamber', name: "Master's Chamber", state: 'stripped' as const, repairCost: 45, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic' as const, decorStyle: null },
        { roomId: 'room-servant-quarters', name: 'Servant Quarters', state: 'collapsed' as const, repairCost: 60, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic' as const, decorStyle: null },
        { roomId: 'room-barracks', name: 'Barracks', state: 'stripped' as const, repairCost: 80, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic' as const, decorStyle: null },
        { roomId: 'room-vault', name: 'Cellar / Vault', state: 'locked' as const, repairCost: 0, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic' as const, decorStyle: null },
        { roomId: 'room-garret', name: 'Garret', state: 'collapsed' as const, repairCost: 130, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic' as const, decorStyle: null },
        { roomId: 'room-east-wing', name: 'East Wing', state: 'destroyed' as const, repairCost: 200, repairDaysRemaining: 0, searched: false, roomFunction: null, upgradeTier: 'basic' as const, decorStyle: null },
      ],
      vaultUnlocked: false,
      rosterBonus: 0,
      exteriorState: 'ruined' as const,
      fortificationLevel: 0,
      houseHeirs: [],
      npcPairingPolicy: 'open' as const,
      lastDomesticRelationshipBeat: null,
      relationshipMilestones: [],
    })),
    pendingDateProposals: z.array(dateProposalSchema).default([]),
    scheduledDates: z.array(scheduledDateSchema).default([]),
    npcDateCooldowns: z.record(z.string(), z.number().int().nonnegative()).default({}),
    saveVersion: z.number().int().min(1).default(6),
    timeSlotState: timeSlotStateSchema.default({
      currentSlot: 'morning',
      slotQueue: [],
      completedTasks: [],
      skippedTasks: [],
      slotHistory: [],
      lastProcessedSeed: 42,
    }),
    rngSeed: z.number().int().nonnegative().default(42),
    chronicle: chronicleSchema.default(() => ({
      entriesByDay: {},
      version: 1,
    })),
    rumors: z.array(rumorSchema).default([]),
    bondVisibility: z.record(z.string(), bondVisibilitySchema).default({}),
    worldNpcStates: z.array(worldNpcRuntimeStateSchema).default([]),
    siteRuntimes: z.record(z.string(), siteRuntimeSchema).default({}),
    npcCaptivityStates: z.record(z.string(), captivityStateSchema).default({}),
    npcSitePresences: z.array(npcSitePresenceSchema).default([]),
    bondedPersonsRegistry: z.record(z.string(), z.array(z.string())).default({}),
    worldEvents: z.array(worldEventSchema).max(100).default([]),
    activeDirectives: z.array(factionDirectiveSchema).default([]),
    privateCorrespondence: z.array(correspondenceMessageSchema).default([]),
  })
  .strict()

export type ActivityCategory = z.infer<typeof activityCategorySchema>
export type ActivityLogEntry = z.infer<typeof activityLogEntrySchema>
export type CityDials = z.infer<typeof politicalDialsSchema>
export type CityResources = z.infer<typeof cityResourcesSchema>
export type CorridorStatus = z.infer<typeof corridorStatusSchema>
export type DateProposal = z.infer<typeof dateProposalSchema>
export type DateProposalState = z.infer<typeof dateProposalStateSchema>
export type DateRejectionReason = z.infer<typeof dateRejectionReasonSchema>
export type DistrictRuntimeState = z.infer<typeof districtRuntimeStateSchema>
export type GameContentCatalog = z.infer<typeof gameContentCatalogSchema>
export type GameState = z.infer<typeof gameStateSchema>
export type HireOffer = z.infer<typeof hireOfferSchema>
export type HouseRoom = z.infer<typeof houseRoomSchema>
export type HouseState = z.infer<typeof houseStateSchema>
export type PlayerCharacter = z.infer<typeof gameStateSchema>['playerCharacter']
export type RoomFunction = z.infer<typeof roomFunctionSchema>
export type RoomState = z.infer<typeof roomStateSchema>
export type ScheduledDate = z.infer<typeof scheduledDateSchema>

export type EquippedItemDurabilities = z.infer<typeof gameStateSchema>['equippedItemDurabilities']

// Re-export NPC schemas used for playerCharacter for consumer convenience
export type { Attributes, Skills, Traits } from '../npc/contracts'

// Re-export faction directive types
export type {
  FactionDirective,
  FactionDirectiveType,
  FactionDirectiveStatus,
  FactionDirectiveTargetType,
} from '../factions/contracts'
