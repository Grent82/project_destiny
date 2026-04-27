import { z } from 'zod'
import { entityIdSchema, nonNegativeIntegerSchema, positiveIntegerSchema } from '../shared/contracts'

export const missionContractSchema = z.object({
  id: entityIdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  employerFactionId: entityIdSchema,
  enemyFactionId: entityIdSchema,
  district: entityIdSchema,
  rewardCredits: nonNegativeIntegerSchema,
  rewardStanding: positiveIntegerSchema,
  penaltyStanding: positiveIntegerSchema,
  difficulty: z.enum(['easy', 'standard', 'hard']),
  tags: z.array(z.string()).default([]),
}).strict()

export type MissionContract = z.infer<typeof missionContractSchema>
