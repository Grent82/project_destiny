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

export const npcDefinitionSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().min(1),
    origin: z.string().min(1),
    background: z.string().min(1),
    rarity: raritySchema,
    status: npcStatusSchema,
    factionAffinityId: entityIdSchema.nullable(),
    baseAttributes: attributesSchema,
    startingSkills: skillsSchema,
    startingTraits: traitsSchema,
    allowedTitleIds: z.array(entityIdSchema).default([]),
  })
  .strict()

export const npcRuntimeStateSchema = z
  .object({
    npcId: entityIdSchema,
    name: z.string().min(1),
    status: npcStatusSchema,
    assignment: npcAssignmentSchema,
    activeTitle: entityIdSchema.nullable(),
    wagesOwedDays: nonNegativeIntegerSchema,
    attributes: attributesSchema,
    skills: skillsSchema,
    traits: traitsSchema,
    states: statesSchema,
    loadout: loadoutSchema,
    relationships: z.record(entityIdSchema, relationshipAxesSchema),
    factionRelationships: z.array(factionRelationshipSchema),
  })
  .strict()

export type Attributes = z.infer<typeof attributesSchema>
export type NpcAssignment = z.infer<typeof npcAssignmentSchema>
export type NpcDefinition = z.infer<typeof npcDefinitionSchema>
export type NpcRuntimeState = z.infer<typeof npcRuntimeStateSchema>
export type NpcStatus = z.infer<typeof npcStatusSchema>
export type RelationshipAxes = z.infer<typeof relationshipAxesSchema>
export type Skills = z.infer<typeof skillsSchema>
export type States = z.infer<typeof statesSchema>
export type Traits = z.infer<typeof traitsSchema>
