import { z } from 'zod'

import { entityIdSchema } from '../shared/contracts'

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
  })
  .strict()

export type DistrictDefinition = z.infer<typeof districtDefinitionSchema>
