import { z } from 'zod'

import { timeSlotSchema } from '../shared/contracts'
import { intimacyStageSchema } from '../relationships/contracts'

export const dateOutcomeSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    axesDeltas: z.object({
      affinity: z.number().optional(),
      trust: z.number().optional(),
      respect: z.number().optional(),
      loyalty: z.number().optional(),
      fear: z.number().optional(),
      anger: z.number().optional(),
    }),
  })
  .strict()

export const dateDefinitionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    cost: z.number().nonnegative().default(0),
    durationHours: z.number().positive(),
    preferredTimeSlot: timeSlotSchema,
    requiredIntimacyStage: intimacyStageSchema,
    traitPreferences: z.record(z.string(), z.number().positive()).default({}),
    skillPreferences: z.record(z.string(), z.number().positive()).default({}),
    relationshipRewards: z.object({
      affinity: z.object({ min: z.number(), max: z.number() }),
      trust: z.object({ min: z.number(), max: z.number() }).optional(),
      respect: z.object({ min: z.number(), max: z.number() }).optional(),
      loyalty: z.object({ min: z.number(), max: z.number() }).optional(),
    }),
    outcomes: z.array(dateOutcomeSchema).min(1),
  })
  .strict()

export type DateOutcome = z.infer<typeof dateOutcomeSchema>
export type DateDefinition = z.infer<typeof dateDefinitionSchema>
