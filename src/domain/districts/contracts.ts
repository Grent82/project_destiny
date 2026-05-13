import { z } from 'zod'

import { entityIdSchema } from '../shared/contracts'

export const borderTypeSchema = z.enum([
  'open',
  'compact_checkpoint',
  'ring_toll',
  'condemned_barrier',
  'restricted_gate',
])

export const dominantExchangeSystemSchema = z.enum([
  'coin',
  'debt',
  'favor',
  'information',
  'violence',
])

export const rumorClimateSchema = z.enum(['dry', 'moderate', 'saturated'])

export const districtDefinitionSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().min(1),
    summary: z.string().min(1),
    controllingFactionId: entityIdSchema.nullable(),
    contestedByFactionIds: z.array(entityIdSchema).default([]),
    shopTypes: z.array(z.string().min(1)).min(1),
    tags: z.array(z.string().min(1)).default([]),
    dangerLevel: z.number().int().min(1).max(5),
    accessRestricted: z.boolean(),
    narrativeSummary: z.string().min(1),
    narrativeHook: z.string().optional(),
    hooks: z.array(z.string()).optional(),
    adjacentDistrictIds: z.array(entityIdSchema).default([]),
    borderTypes: z.record(z.string(), borderTypeSchema).default({}),
    minControlFactionStanding: z.number().nullable().default(null),
    // Social simulation fields (optional for backward compatibility)
    dominantExchangeSystem: dominantExchangeSystemSchema.default('coin'),
    rumorClimate: rumorClimateSchema.default('moderate'),
    socialDensity: z.number().int().min(1).max(5).default(3),
    reputation: z.number().int().min(0).max(100).default(50),
    // Fauna and creature presence (narrative texture)
    faunaPresence: z.array(z.string()).default([]),
  })
  .strict()

export type BorderType = z.infer<typeof borderTypeSchema>
export type DistrictDefinition = z.infer<typeof districtDefinitionSchema>
export type DominantExchangeSystem = z.infer<typeof dominantExchangeSystemSchema>
export type RumorClimate = z.infer<typeof rumorClimateSchema>
