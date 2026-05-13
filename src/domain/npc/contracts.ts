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
])

export const npcAssignmentSchema = z.enum([
  'idle',
  'training',
  'working',
  'assigned_title',
  'deployed',
  'recovering',
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

export const npcAgeBandSchema = z.enum(['young', 'adult', 'middle', 'elder'])

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

export const bondTypeSchema = z.enum([
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
])

export const npcBondSchema = z.object({
  type: bondTypeSchema,
  targetId: z.string().min(1),
  note: z.string().optional(),
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
    bonds: z.array(npcBondSchema).default([]),
    dialogueId: entityIdSchema.optional(),
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

export const MAX_NPC_MEMORY_ENTRIES = 20

export const npcRuntimeStateSchema = z
  .object({
    npcId: entityIdSchema,
    name: z.string().min(1),
    status: npcStatusSchema,
    assignment: npcAssignmentSchema,
    activeTitle: entityIdSchema.nullable(),
    wagesOwedDays: nonNegativeIntegerSchema,
    trainingFocus: z.string().nullable().default(null),
    attributes: attributesSchema,
    skills: skillsSchema,
    traits: traitsSchema,
    states: statesSchema,
    loadout: loadoutSchema,
    npcMemory: z.array(npcMemoryEntrySchema).default([]),
  })
  .strict()

export type Attributes = z.infer<typeof attributesSchema>
export type NpcAgeBand = z.infer<typeof npcAgeBandSchema>
export type NpcAssignment = z.infer<typeof npcAssignmentSchema>
export type NpcBond = z.infer<typeof npcBondSchema>
export type BondType = z.infer<typeof bondTypeSchema>
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
