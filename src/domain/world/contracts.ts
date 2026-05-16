import { z } from 'zod'

export const worldHouseholdSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['household', 'establishment', 'faction_seat']),
  ownerNpcId: z.string().nullable().default(null),
  controllingFactionId: z.string().nullable().default(null),
  districtId: z.string().min(1),
  memberNpcIds: z
    .array(
      z.object({
        npcId: z.string().min(1),
        role: z.string().min(1),
        status: z.enum(['active', 'absent', 'captive', 'dead']).default('active'),
      }),
    )
    .default([]),
  rooms: z
    .array(
      z.object({
        id: z.string().min(1),
        function: z.string().nullable(),
        capacity: z.number().int().positive(),
      }),
    )
    .optional(),
  tags: z.array(z.string()).default([]),
  stability: z.number().int().min(0).max(100).default(50),
  reputation: z.number().int().min(0).max(100).default(50),
  security: z.number().int().min(0).max(100).default(30),
  resources: z
    .object({
      coin: z.number().int().min(0).default(0),
      food: z.number().int().min(0).default(0),
      favors: z.number().int().min(0).default(0),
      secrets: z.number().int().min(0).default(0),
    })
    .default({ coin: 0, food: 0, favors: 0, secrets: 0 }),
  activeConflicts: z
    .array(
      z.object({
        targetId: z.string().min(1),
        type: z.string().min(1),
        severity: z.number().int().min(0).max(5).default(1),
      }),
    )
    .default([]),
  fiction: z.string().optional(),
})

export type WorldHousehold = z.infer<typeof worldHouseholdSchema>
