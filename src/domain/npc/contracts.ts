import { z } from 'zod'

import { loadoutSchema } from '../items/contracts'
import {
  entityIdSchema,
  nonNegativeIntegerSchema,
  percentageSchema,
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
    // All NPCs are romance-eligible by default. Relationship depth determines progression, not authoring flags.
    schedule: z.object({
      morning: z.string().optional(),
      afternoon: z.string().optional(),
      evening: z.string().optional(),
      night: z.string().optional(),
    }).default(() => ({})),
  })
  .strict()

export const npcMemoryEntrySchema = z.object({
  day: z.number().int().nonnegative(),
  event: z.string().min(1),
  participants: z.array(z.string()).optional(),
  axisDelta: z.record(z.string(), z.number()).optional(),
})

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
 * pregnancyState is NEVER set by direct player action.
 * It is set only by event resolution logic as a rare world-generated aftermath.
 * context: 'unknown' = captivity aftermath (coercion linkage never surfaced as player label).
 * context: 'consensual' = freely chosen relationships.
 */
export const pregnancyStateSchema = z.object({
  context: z.enum(['consensual', 'unknown']),
  daysElapsed: z.number().int().nonnegative().default(0),
  questTag: z.string().nullable().default(null),
  partnerNpcId: z.string().nullable().optional(),
})

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
export type BondEntryReason = z.infer<typeof bondEntryReasonSchema>
export type BondStatus = z.infer<typeof bondStatusSchema>

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
    npcMemory: z.array(npcMemoryEntrySchema).default([]),
    captivityState: captivityStateSchema.optional(),
    pregnancyState: pregnancyStateSchema.optional(),
    bondStatus: bondStatusSchema.nullable().default(null),
    npcArc: npcArcSchema,
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
