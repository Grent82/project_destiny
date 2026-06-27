import { z } from 'zod'

import { npcEmploymentSchema } from '../../../domain/npc/contracts'

export const createEmploymentParamsSchema = z.object({
  employerId: z.string().min(1),
  employerType: z.enum(['player', 'npc', 'faction']),
  employeeId: z.string().min(1),
  taskType: z.enum(['scout', 'protect', 'retrieve', 'deliver', 'guard', 'negotiate', 'sabotage', 'escort', 'work']),
  target: z.string().min(1).optional(),
  deadlineDay: z.number().int().nonnegative().optional(),
  wagePerDay: z.number().int().nonnegative().default(0),
  completionBonus: z.number().int().nonnegative().default(0),
  description: z.string().min(1).optional(),
})

export type CreateEmploymentParams = z.infer<typeof createEmploymentParamsSchema>

export const employmentResultSchema = z.object({
  success: z.boolean(),
  employment: npcEmploymentSchema.optional(),
  error: z.string().optional(),
})

export type EmploymentResult = z.infer<typeof employmentResultSchema>
