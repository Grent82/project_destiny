import { z } from 'zod'

import {
  entityIdSchema,
  percentageSchema,
  signedStandingSchema,
} from '../shared/contracts'

export const politicalDialsSchema = z
  .object({
    control: percentageSchema,
    prosperity: percentageSchema,
    unrest: percentageSchema,
    corruption: percentageSchema,
  })
  .strict()

export const factionDefinitionSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().min(1),
    agenda: z.string().min(1),
    description: z.string().min(1),
    territory: z.array(entityIdSchema),
    tags: z.array(z.string().min(1)).default([]),
  })
  .strict()

export const factionRuntimeStateSchema = z
  .object({
    factionId: entityIdSchema,
    power: percentageSchema,
    wealth: percentageSchema,
    security: percentageSchema,
    standingWithPlayer: signedStandingSchema,
    activePressure: percentageSchema,
  })
  .strict()

export type FactionDefinition = z.infer<typeof factionDefinitionSchema>
export type FactionRuntimeState = z.infer<typeof factionRuntimeStateSchema>
export type PoliticalDials = z.infer<typeof politicalDialsSchema>
