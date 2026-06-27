import { z } from 'zod'

import { loadoutSchema } from '../items/contracts'
import {
  entityIdSchema,
  nonNegativeIntegerSchema,
  percentageSchema,
  positiveIntegerSchema,
  raritySchema,
  signedStandingSchema,
} from '../shared/contracts'

export const npcStatusSchema = z.enum([
  'citizen',
  'mercenary',
  'servant',
  'apprentice',
  'retainer',
  'noble',
  'criminal',
  'prisoner',
  'family',
  'ward',
])

export const npcAssignmentSchema = z.enum([
  'idle',
  'training',
  'working',
  'assigned_title',
  'deployed',
  'recovering',
  'defense',
  'transferred',
])

export const attributesSchema = z
  .object({
    might: percentageSchema,
    agility: percentageSchema,
    endurance: percentageSchema,
    intellect: percentageSchema,
    perception: percentageSchema,
    presence: percentageSchema,
    resolve: percentageSchema,
  })
  .strict()

export const skillsSchema = z
  .object({
    melee: percentageSchema,
    ranged: percentageSchema,
    medicine: percentageSchema,
    administration: percentageSchema,
    engineering: percentageSchema,
    negotiation: percentageSchema,
    survival: percentageSchema,
    security: percentageSchema,
    crafting: percentageSchema,
    performance: percentageSchema,
    academics: percentageSchema,
    intrigue: percentageSchema,
  })
  .strict()

export const traitsSchema = z
  .object({
    discipline: percentageSchema,
    ambition: percentageSchema,
    empathy: percentageSchema,
    ruthlessness: percentageSchema,
    prudence: percentageSchema,
    curiosity: percentageSchema,
    dominance: percentageSchema,
    loyalty: percentageSchema,
    vanity: percentageSchema,
    zeal: percentageSchema,
  })
  .strict()

export const statesSchema = z
  .object({
    health: percentageSchema,
    fatigue: percentageSchema,
    stress: percentageSchema,
    morale: percentageSchema,
    fear: percentageSchema,
    anger: percentageSchema,
    hunger: percentageSchema,
    injury: percentageSchema,
    intoxication: percentageSchema,
    hygiene: percentageSchema,
  })
  .strict()

export const relationshipAxesSchema = z
  .object({
    affinity: percentageSchema,
    respect: percentageSchema,
    fear: percentageSchema,
    loyalty: percentageSchema,
    trust: percentageSchema,
  })
  .strict()

export const factionRelationshipSchema = z
  .object({
    factionId: entityIdSchema,
    standing: signedStandingSchema,
  })
  .strict()

export const npcAgeBandSchema = z.enum(['child', 'young', 'adult', 'middle', 'elder'])

export const quirkTagSchema = z.enum([
  'cautious',
  'superstitious',
  'protective',
  'vengeful',
  'compulsive',
  'loyal',
  'secretive',
  'volatile',
  'grief-prone',
  'meticulous',
  'paranoid',
  'principled',
  'nostalgic',
  'ambitious',
])

export const npcQuirkSchema = z.object({
  text: z.string().min(1),
  tags: z.array(quirkTagSchema).default([]),
  triggerKeywords: z.array(z.string()).default([]),
})

export const npcMotivationSchema = z.object({
  publicGoal: z.string().optional(),
  privateNeed: z.string().optional(),
  immediatePressure: z.string().optional(),
  lineTheyWontCross: z.string().optional(),
})

export const npcLoyaltyTypeSchema = z.enum([
  'sibling',
  'ex-lover',
  'creditor',
  'debtor',
  'rival',
  'fosterling',
  'handler',
  'dead-spouse',
  'old-comrade',
  'hated-foreman',
  'missing-child',
  'favored-animal',
  'parent',
  'child',
  'bastard-kin',
  'witness',
  'romantic',
])

export const npcLoyaltySchema = z.object({
  type: npcLoyaltyTypeSchema,
  targetId: z.string().min(1),
  note: z.string().optional(),
  visibility: z.enum(['hidden', 'rumored', 'known']).optional(),
})

export const consentPreferencesSchema = z.object({
  requiredStage: z.enum(['affinity', 'attachment', 'committed']).default('committed'),
  requiresExplicitConsent: z.boolean().default(false),
  opennessLevel: z.enum(['reserved', 'moderate', 'open']).default('moderate'),
  boundaries: z.array(z.string()).default([]),
}).default({
  requiredStage: 'committed',
  requiresExplicitConsent: false,
  opennessLevel: 'moderate',
  boundaries: [],
})

/**
 * Memory visibility levels - who can see this memory.
 */
export const npcMemoryVisibilitySchema = z.enum(['hidden', 'trusted', 'open', 'public'])
export type NpcMemoryVisibility = z.infer<typeof npcMemoryVisibilitySchema>

/**
 * Memory sentiment - emotional coloring of the memory.
 */
export const npcMemorySentimentSchema = z.enum(['positive', 'neutral', 'negative', 'traumatic'])
export type NpcMemorySentiment = z.infer<typeof npcMemorySentimentSchema>

/**
 * Memory event types - structured categories for memory events.
 */
export const NPC_MEMORY_EVENT_TYPES = [
  'first_meeting',
  'combat',
  'quest_completion',
  'gift_given',
  'gift_received',
  'courtship',
  'intimacy',
  'betrayal',
  'help_received',
  'help_given',
  'conversation_deep',
  'conversation_casual',
  'work_completed',
  'directive_assigned',
  'directive_completed',
  'directive_failed',
  'wage_paid',
  'injury_treated',
  'day_passed',
  'pairing_formed',
  'pairing_broken',
  'training',
  'promotion',
  'loss',
  'failed_mission',
  'custom',
] as const

export const npcMemoryEventTypeSchema = z.enum(NPC_MEMORY_EVENT_TYPES)
export type NpcMemoryEventType = z.infer<typeof npcMemoryEventTypeSchema>

export const npcMemoryEntrySchema = z.object({
  day: z.number().int().nonnegative(),
  event: z.string().min(1),
  eventType: npcMemoryEventTypeSchema.default('custom'),
  participants: z.array(z.string()).optional(),
  axisDelta: z.record(z.string(), z.number()).optional(),
  visibility: npcMemoryVisibilitySchema.default('open'),
  sentiment: npcMemorySentimentSchema.default('neutral'),
})

/**
 * Authored memory event types - historical events written by game authors.
 */
export const AUTHORED_MEMORY_EVENT_TYPES = [
  'house_fall',
  'betrayal',
  'victory',
  'failure',
  'loyalty_test',
  'failed_mission',
  'rescue',
  'loss',
  'first_meeting',
  'training',
  'promotion',
  'exile',
  'return',
  'custom',
] as const

export const authoredMemoryEventTypeSchema = z.enum(AUTHORED_MEMORY_EVENT_TYPES)
export type AuthoredMemoryEventType = z.infer<typeof authoredMemoryEventTypeSchema>

/**
 * Intimacy stage for memory visibility.
 */
export const MEMORY_INTIMACY_LEVELS = ['none', 'affinity', 'attachment', 'committed'] as const
export const memoryIntimacyLevelSchema = z.enum(MEMORY_INTIMACY_LEVELS)
export type MemoryIntimacyLevel = z.infer<typeof memoryIntimacyLevelSchema>

/**
 * Authored memory schema - pre-written memories for NPCs that give them depth from game start.
 */
export const authoredMemorySchema = z
  .object({
    dayOffset: z.number().int(), // Days before game start (0 = day 1, -500 = 500 days before)
    eventType: authoredMemoryEventTypeSchema,
    description: z.string().min(1),
    sentiment: npcMemorySentimentSchema,
    participants: z.array(z.string()).optional(),
    revealsOnTrustLevel: z.number().min(0).max(100).default(50),
    revealsOnIntimacy: memoryIntimacyLevelSchema.default('none'),
    unlocksDialogueTopic: z.string().optional(),
    influencesTraitDrift: z.record(z.string(), z.number()).optional(),
  })
  .strict()

export type AuthoredMemory = z.infer<typeof authoredMemorySchema>

export const npcDefinitionSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().min(1),
    npcType: z.enum(['roster', 'story', 'world', 'enemy']).default('roster'),
    districtId: entityIdSchema.optional(),
    description: z.string().optional(),
    origin: z.string().min(1),
    background: z.string().min(1),
    rarity: raritySchema,
    status: npcStatusSchema,
    factionAffinityId: entityIdSchema.nullable(),
    baseAttributes: attributesSchema,
    startingSkills: skillsSchema,
    startingTraits: traitsSchema,
    allowedTitleIds: z.array(entityIdSchema).default([]),
    motivation: npcMotivationSchema.optional(),
    ageBand: npcAgeBandSchema.optional(),
    sex: z.string().optional(),
    appearanceTags: z.array(z.string()).optional(),
    quirks: z.array(npcQuirkSchema).default([]),
    loyalties: z.array(npcLoyaltySchema).default([]),
    dialogueId: entityIdSchema.optional(),
    defaultArcId: z.string().optional(),
    consentPreferences: consentPreferencesSchema,
    // All NPCs are romance-eligible by default. Relationship depth determines progression, not authoring flags.
    schedule: z.object({
      morning: z.string().optional(),
      afternoon: z.string().optional(),
      evening: z.string().optional(),
      night: z.string().optional(),
    }).default(() => ({})),
    authoredMemories: z.array(authoredMemorySchema).default([]),
    isShopOwner: z.boolean().default(false),
    shopId: entityIdSchema.optional(),
  })
  .strict()

/**
 * NPC Intention types - proactive actions NPCs take when idle and not on directive.
 * Extended with 25 new types for Fuzzy Logic + ML-based intention system.
 */
export const NPC_INTENTION_TYPES = [
  // Original 10 types
  'lead-group',
  'support-group',
  'scout-ahead',
  'resource-gather',
  'confront-rival',
  'protect-house',
  'investigate-threat',
  'patrol-district',
  'seek-employment',
  'socialize',
  // Basis-Bedürfnisse (5)
  'eat-meal',
  'drink',
  'sleep',
  'rest',
  'groom',
  // Sozial/Romantik (5)
  'flirt-with',
  'court-romantically',
  'visit-lover',
  'jealousy-check',
  'spend-time-with',
  // Romantik/Sexualität (3)
  'seek-intimacy',
  'flirt-aggressively',
  'visit-romantic-partner',
  // Alltagsaktivitäten (4)
  'shop-for-goods',
  'train-self',
  'meditate',
  'practice-skill',
  // Spezial/Quirky (2)
  'people-watch',
  'gossip',
  // Geld verdienen (4)
  'seek-tips',
  'black-market-trade',
  'beg-for-coin',
  'scavenge-for-sell',
  // Macht/Kontrolle (5)
  'assert-dominance',
  'spy-on',
  'intercept-communication',
  'gather-leverage',
  'consolidate-power',
  // Gruppen/Dynamik (5)
  'form-squad',
  'recruit-member',
  'host-gathering',
  'mediate-conflict',
  'challenge-authority',
  // Überleben/Existenz (5)
  'scavenge',
  'fortify-position',
  'escape-attempt',
  'seek-shelter',
  'care-for-injured',
] as const

export const npcIntentionTypeSchema = z.enum(NPC_INTENTION_TYPES)
export type NpcIntentionType = z.infer<typeof npcIntentionTypeSchema>

/**
 * NPC Intention target types.
 */
export const NPC_INTENTION_TARGET_TYPES = ['district', 'npc', 'item', 'faction', 'poi'] as const
export const npcIntentionTargetTypeSchema = z.enum(NPC_INTENTION_TARGET_TYPES)
export type NpcIntentionTargetType = z.infer<typeof npcIntentionTargetTypeSchema>

/**
 * NPC Intention schema - represents a proactive action an NPC wants to take.
 */
export const npcIntentionSchema = z
  .object({
    type: npcIntentionTypeSchema,
    targetId: z.string().min(1),
    targetType: npcIntentionTargetTypeSchema.default('district'),
    priority: z.number().min(1).max(5),
    urgencyDays: z.number().int().positive(),
    confidence: z.number().min(0).max(100).default(50),
    createdAtDay: z.number().int().nonnegative(),
    expiresAtDay: z.number().int().nonnegative(),
  })
  .strict()

export type NpcIntention = z.infer<typeof npcIntentionSchema>

export const worldNpcDispositionSchema = z.enum(['neutral', 'friendly', 'hostile', 'afraid', 'unknown'])

export const worldNpcRuntimeStateSchema = z.object({
  npcId: entityIdSchema,
  lastContactDay: z.number().int().nonnegative().nullable().default(null),
  disposition: worldNpcDispositionSchema.default('neutral'),
  locationOverride: z.string().nullable().default(null),
  flags: z.array(z.string()).default([]),
}).strict()

export type WorldNpcDisposition = z.infer<typeof worldNpcDispositionSchema>
export type WorldNpcRuntimeState = z.infer<typeof worldNpcRuntimeStateSchema>

// ─── Captivity and pregnancy schemas ─────────────────────────────────────────

export const captivityStatusSchema = z.enum(['missing', 'captive', 'rescued', 'returned', 'dead'])

export const captivityConditionSchema = z.enum(['healthy', 'hurt', 'broken', 'altered'])

export const captivityComplianceSchema = z.enum(['resistant', 'conflicted', 'compliant'])

export const captivityBondTypeSchema = z.enum(['none', 'fear', 'dependency', 'affection', 'coercion'])
export const captivityRegimeSchema = z.enum(['unknown', 'hidden', 'guarded', 'penal', 'commercial', 'protective', 'medical'])

export const captivityStateSchema = z.object({
  status: captivityStatusSchema,
  holderId: z.string().nullable().default(null),
  siteId: z.string().nullable().default(null),
  roomId: z.string().nullable().default(null),
  regime: captivityRegimeSchema.default('unknown'),
  condition: captivityConditionSchema.default('healthy'),
  compliance: captivityComplianceSchema.default('resistant'),
  bondType: captivityBondTypeSchema.default('none'),
  timeHeldDays: z.number().int().nonnegative().default(0),
  lastTransferDay: z.number().int().nonnegative().nullable().default(null),
  questTag: z.string().nullable().default(null),
})
/**
 * pregnancyState tracks pregnancy status for NPCs.
 * context: 'unknown' = captivity aftermath (coercion linkage never surfaced as player label).
 * context: 'consensual' = freely chosen relationships.
 * wanted: player's intent at time of conception (null if not set).
 */
export const pregnancyStateSchema = z.object({
  context: z.enum(['consensual', 'unknown']),
  daysElapsed: z.number().int().nonnegative().default(0),
  questTag: z.string().nullable().default(null),
  partnerNpcId: z.string().nullable().optional(),
  wanted: z.boolean().nullable().default(null), // true = wanted, false = avoided, null = neutral/unspecified
})

/**
 * arousalState tracks an NPC's arousal level and related state.
 * Used for romantic/sexual mechanics and NPC-to-NPC interactions.
 */
export const arousalStateSchema = z
  .object({
    level: z.number().int().min(0).max(100).default(0), // 0-100 arousal level
    lastTriggerDay: z.number().int().nonnegative().nullable().default(null), // Day of last arousal trigger
    triggerSource: z.enum(['visual', 'dialogue', 'gift', 'proximity']).nullable().default(null), // What triggered arousal
    cooldownUntilDay: z.number().int().nonnegative().nullable().default(null), // Day when cooldown ends
  })
  .strict()

export const bondEntryReasonSchema = z.enum([
  'compact-assessment',
  'debt-settlement',
  'voluntary',
  'combat-capture',
  'inherited',
])

export const bondStatusSchema = z.object({
  holderId: z.string().min(1),
  contractValue: z.number().int().nonnegative(),
  termDays: z.number().int().positive().nullable(),
  entryReason: bondEntryReasonSchema,
  alongsideFreeAssignmentDays: z.number().int().nonnegative().default(0),
  lastEqualityNoticeDay: z.number().int().nonnegative().nullable().default(null),
  forSale: z.boolean().default(false),
  lastOfferDay: z.number().int().nonnegative().nullable().default(null),
  marketValue: z.number().int().nonnegative().default(0),
  ownerType: z.enum(['player', 'npc']).default('player'),
  bondStartDay: z.number().int().nonnegative().default(0),
})

export type CaptivityStatus = z.infer<typeof captivityStatusSchema>
export type CaptivityCondition = z.infer<typeof captivityConditionSchema>
export type CaptivityCompliance = z.infer<typeof captivityComplianceSchema>
export type CaptivityBondType = z.infer<typeof captivityBondTypeSchema>
export type CaptivityRegime = z.infer<typeof captivityRegimeSchema>
export type CaptivityState = z.infer<typeof captivityStateSchema>
export type PregnancyState = z.infer<typeof pregnancyStateSchema>
export type ArousalState = z.infer<typeof arousalStateSchema>
export type ConsentPreferences = z.infer<typeof consentPreferencesSchema>
export type BondEntryReason = z.infer<typeof bondEntryReasonSchema>
export type BondStatus = z.infer<typeof bondStatusSchema>

// ─── NPC Personal Funds Schema ──────────────────────────────────────────────

/**
 * npcPersonalFunds tracks an NPC's personal wealth separate from house/organization funds.
 * This enables NPCs to save, spend, and accumulate wealth independently.
 */
export const npcPersonalFundsSchema = z
  .object({
    savings: z.number().int().nonnegative().default(0), // Saved wealth (banked/stashed)
    carriedCash: z.number().int().nonnegative().default(0), // Cash on person
    lastWagePaymentDay: z.number().int().nonnegative().nullable().default(null),
    lastTipAmount: z.number().int().nonnegative().default(0), // Last tip received
  })
  .strict()

export type NpcPersonalFunds = z.infer<typeof npcPersonalFundsSchema>

// ─── NPC Clothing Schema ────────────────────────────────────────────────────

/**
 * Clothing layer types for NPC equipment.
 * Each layer represents a distinct body area that can be clothed.
 */
export const CLOTHING_LAYERS = ['head', 'torso', 'arms', 'legs', 'feet', 'full', 'undergarments'] as const
export type ClothingLayer = typeof CLOTHING_LAYERS[number]

/**
 * npcClothing tracks what clothing items an NPC is wearing, organized by layer.
 * Allows multiple items per layer (e.g., undergarments + outerwear on torso).
 */
export const npcClothingSchema = z
  .object({
    head: entityIdSchema.nullable().default(null),
    torso: entityIdSchema.nullable().default(null),
    arms: entityIdSchema.nullable().default(null),
    legs: entityIdSchema.nullable().default(null),
    feet: entityIdSchema.nullable().default(null),
    full: entityIdSchema.nullable().default(null), // Full-body garments override other layers
    undergarments: entityIdSchema.nullable().default(null),
    accessories: z.array(entityIdSchema).default([]),
  })
  .strict()

export type NpcClothing = z.infer<typeof npcClothingSchema>

// ─── NPC Armor Schema ───────────────────────────────────────────────────────

/**
 * Armor layer types for NPC equipment.
 * Separates light and heavy armor by body area.
 */
export const ARMOR_LAYERS = ['light-torso', 'light-legs', 'heavy-torso', 'heavy-legs', 'shield'] as const
export type ArmorLayer = typeof ARMOR_LAYERS[number]

/**
 * npcArmor tracks what armor items an NPC is wearing.
 * Light and heavy armor are tracked separately as they may have different penalties/bonuses.
 */
export const npcArmorSchema = z
  .object({
    lightTorso: entityIdSchema.nullable().default(null),
    lightLegs: entityIdSchema.nullable().default(null),
    heavyTorso: entityIdSchema.nullable().default(null),
    heavyLegs: entityIdSchema.nullable().default(null),
    shield: entityIdSchema.nullable().default(null),
  })
  .strict()

export type NpcArmor = z.infer<typeof npcArmorSchema>

// ─── Ward Personal Allowance Schema ─────────────────────────────────────────

/**
 * wardPersonalAllowance tracks the weekly allowance and spending rules for ward NPCs.
 * Wards are NPCs under the player's guardianship who receive regular stipends.
 */
export const wardPersonalAllowanceSchema = z
  .object({
    allowancePerWeek: z.number().int().nonnegative().default(2),
    personalSavings: z.number().int().nonnegative().default(0),
    lastAllowanceDay: z.number().int().nonnegative().nullable().default(null),
    allowedItems: z.array(entityIdSchema).default([]), // Item IDs ward can purchase
    restrictedItems: z.array(entityIdSchema).default([]), // Item IDs ward cannot purchase
  })
  .strict()

export type WardPersonalAllowance = z.infer<typeof wardPersonalAllowanceSchema>

// ─── Captivity Inventory Rules Schema ───────────────────────────────────────

/**
 * Confiscation types for captivity scenarios.
 * Determines what items are taken when an NPC is captured.
 */
export const confiscationTypeSchema = z.enum(['kidnap', 'imprisonment', 'arrest', 'search'])
export type ConfiscationType = z.infer<typeof confiscationTypeSchema>

/**
 * Confiscation rules for a specific captivity scenario.
 */
export const confiscationRulesSchema = z
  .object({
    confiscateAll: z.boolean().default(false),
    allowedCategories: z.array(z.string()).default([]), // Categories that are never taken
    confiscateWeapons: z.boolean().default(true),
    confiscateMoney: z.boolean().default(true),
    confiscateSentimental: z.boolean().default(false),
  })
  .strict()

/**
 * captivityInventoryRules defines what happens to an NPC's inventory when captured.
 * Different regimes have different confiscation/restitution policies.
 */
export const captivityInventoryRulesSchema = z
  .object({
    confiscationRules: z.record(z.string(), confiscationRulesSchema).default({}),
    restitutionRules: z
      .object({
        returnOnRelease: z.boolean().default(true),
        returnOnEscape: z.boolean().default(false),
        returnOnAcquittal: z.boolean().default(true),
        retainedByCaptors: z.boolean().default(false),
      })
      .default({
        returnOnRelease: true,
        returnOnEscape: false,
        returnOnAcquittal: true,
        retainedByCaptors: false,
      }),
  })
  .strict()

export type CaptivityInventoryRules = z.infer<typeof captivityInventoryRulesSchema>

export const MAX_NPC_MEMORY_ENTRIES = 20

export const npcArcDriftEntrySchema = z.object({
  day: z.number().int().nonnegative(),
  trait: z.string(),
  delta: z.number(),
  source: z.string(),
})

export const npcArcSchema = z
  .object({
    arcId: z.string(),
    stage: z.string(),
    stageEnteredDay: z.number().int().nonnegative(),
    stageFlags: z.record(z.string(), z.boolean()).default({}),
    driftHistory: z.array(npcArcDriftEntrySchema).default([]),
  })
  .nullable()
  .default(null)

// ── Arc definition schemas (for data/definitions/npc-arcs.json) ──────────────

const arcTransitionConditionsSchema = z
  .object({
    minDaysInStage: z.number().int().nonnegative().optional(),
    anyTraitAbove: z.object({ trait: z.string(), threshold: z.number() }).optional(),
    allTraitsAbove: z.object({ threshold: z.number() }).optional(),
  })
  .nullable()

const arcStageDefinitionSchema = z.object({
  id: z.string(),
  transitionConditions: arcTransitionConditionsSchema.default(null),
  transitionEventId: z.string().optional(),
})

export const npcArcDefinitionSchema = z.object({
  arcId: z.string(),
  stages: z.array(arcStageDefinitionSchema),
})

export type NpcArc = z.infer<typeof npcArcSchema>
export type NpcArcDriftEntry = z.infer<typeof npcArcDriftEntrySchema>
export type NpcArcDefinition = z.infer<typeof npcArcDefinitionSchema>

export const npcEquipmentSchema = z
  .object({
    weapon: entityIdSchema.nullable().default(null),
    armor: entityIdSchema.nullable().default(null),
    accessory: z.array(entityIdSchema).max(2).default([]),
  })
  .strict()

export type NpcEquipment = z.infer<typeof npcEquipmentSchema>

// NPC inventory migrated to inventoryState.npcInventories - removed from npcRuntimeState
// Legacy schema removed: npcInventoryItemSchema

export const businessStrategySchema = z.enum(['conservative', 'balanced', 'aggressive'])
export type BusinessStrategy = z.infer<typeof businessStrategySchema>

export const shopOwnerProfileSchema = z
  .object({
    shopId: entityIdSchema,
    businessStrategy: businessStrategySchema,
    profitMargin: z.number().min(0.1).max(0.5).default(0.2),
    restockThreshold: positiveIntegerSchema.default(10),
    restockBudget: nonNegativeIntegerSchema.default(500),
    specialtyCategories: z.array(z.string().min(1)).default([]),
  })
  .strict()

export type ShopOwnerProfile = z.infer<typeof shopOwnerProfileSchema>

export const npcRuntimeStateSchema = z
  .object({
    npcId: entityIdSchema,
    name: z.string().min(1),
    status: npcStatusSchema,
    assignment: npcAssignmentSchema,
    assignedDistrictId: z.string().nullable().default(null),
    roomAssignment: entityIdSchema.nullable().default(null),
    activeTitle: entityIdSchema.nullable(),
    wagesOwedDays: nonNegativeIntegerSchema,
    contractWagePerDay: z.number().optional(),
    trainingFocus: z.string().nullable().default(null),
    attributes: attributesSchema,
    skills: skillsSchema,
    traits: traitsSchema,
    states: statesSchema,
    loadout: loadoutSchema,
    equipment: npcEquipmentSchema.default({ weapon: null, armor: null, accessory: [] }),
    // inventory removed - migrated to inventoryState.npcInventories
    personalFunds: npcPersonalFundsSchema.default({ savings: 0, carriedCash: 0, lastWagePaymentDay: null, lastTipAmount: 0 }),
    clothing: npcClothingSchema.default({ head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] }),
    armor: npcArmorSchema.default({ lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null }),
    shopOwnerProfile: shopOwnerProfileSchema.optional(),
    npcMemory: z.array(npcMemoryEntrySchema).default([]),
    captivityState: captivityStateSchema.optional(),
    pregnancyState: pregnancyStateSchema.optional(),
    arousalState: arousalStateSchema.default({ level: 0, lastTriggerDay: null, triggerSource: null, cooldownUntilDay: null }),
    bondStatus: bondStatusSchema.nullable().default(null),
    npcArc: npcArcSchema,
    currentDirectiveId: entityIdSchema.nullable().default(null),
    directiveDeadlineDay: z.number().int().nonnegative().nullable().default(null),
    currentIntention: npcIntentionSchema.nullable().default(null),
    factionRelationships: z.array(factionRelationshipSchema).default([]),
    wardPersonalAllowance: wardPersonalAllowanceSchema.default({
      allowancePerWeek: 2,
      personalSavings: 0,
      lastAllowanceDay: null,
      allowedItems: [],
      restrictedItems: [],
    }),
  })
  .strict()

export type Attributes = z.infer<typeof attributesSchema>
export type NpcAgeBand = z.infer<typeof npcAgeBandSchema>
export type NpcAssignment = z.infer<typeof npcAssignmentSchema>
export type NpcLoyalty = z.infer<typeof npcLoyaltySchema>
export type LoyaltyType = z.infer<typeof npcLoyaltyTypeSchema>
export type NpcDefinition = z.infer<typeof npcDefinitionSchema>
export type NpcMemoryEntry = z.infer<typeof npcMemoryEntrySchema>
export type NpcMotivation = z.infer<typeof npcMotivationSchema>
export type NpcQuirk = z.infer<typeof npcQuirkSchema>
export type QuirkTag = z.infer<typeof quirkTagSchema>
export type NpcType = z.infer<typeof npcDefinitionSchema>['npcType']
export type NpcRuntimeState = z.infer<typeof npcRuntimeStateSchema>
export type NpcStatus = z.infer<typeof npcStatusSchema>
export type RelationshipAxes = z.infer<typeof relationshipAxesSchema>
export type Skills = z.infer<typeof skillsSchema>
export type States = z.infer<typeof statesSchema>
export type Traits = z.infer<typeof traitsSchema>

// ── Enemy NPC definitions ───────────────────────────────────────────────────

/** Schema for enemy/adversary NPC definitions (data/definitions/enemy-npcs.json). */
export const enemyNpcDefinitionSchema = z.object({
  id: entityIdSchema,
  name: z.string(),
  origin: z.string().optional(),
  background: z.string(),
  rarity: z.string().optional(),
  status: npcStatusSchema.optional(),
  factionAffinityId: entityIdSchema.nullable().default(null),
  baseAttributes: attributesSchema,
  startingSkills: skillsSchema,
  startingTraits: traitsSchema,
  allowedTitleIds: z.array(entityIdSchema).default([]),
  isRecurring: z.boolean().default(false),
  organizationId: z.string().nullable().default(null),
  encounterRole: z.string().nullable().optional(),
  recruitableOnDefeat: z.boolean().default(false),
  recruitCondition: z.string().nullable().optional(),
  loyaltyOnRecruit: z.number().nullable().optional(),
  lore: z.string().nullable().optional(),
  creatureType: z.enum(['human', 'beast', 'undead', 'corrupted']).default('human'),
})

export type EnemyNpcDefinition = z.infer<typeof enemyNpcDefinitionSchema>
