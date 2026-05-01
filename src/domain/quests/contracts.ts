import { z } from 'zod'

export const questObjectiveTypeSchema = z.enum(['combat', 'delivery', 'investigation', 'survival'])

export const questTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  questType: z.enum(['contract', 'story']).default('contract'),
  employerFactionId: z.string().nullable(),
  enemyFactionId: z.string().nullable(),
  districtId: z.string().nullable(),
  briefing: z.string(),
  openingText: z.string().nullable().default(null),
  aftermathText: z.string().nullable().default(null),
  prerequisiteQuestId: z.string().nullable().default(null),
  objectiveType: questObjectiveTypeSchema,
  rewardMarks: z.number().default(0),
  rewardStandingFactionId: z.string().nullable().default(null),
  rewardStandingDelta: z.number().default(0),
  penaltyStandingDelta: z.number().default(0),
  timeLimitDays: z.number().nullable().default(null),
  linkedMissionId: z.string().nullable().default(null),
  enemyNpcId: z.string().optional(),
  requiredFactionStanding: z.object({
    factionId: z.string(),
    minStanding: z.number(),
  }).nullable().default(null),
  discoverySource: z.enum(['bar', 'guild', 'court', 'event', 'npc', 'notice_board']).nullable().default(null),
  discoveryDistrictId: z.string().nullable().default(null),
  sourceNpcId: z.string().nullable().default(null),
  riskLevel: z.enum(['low', 'medium', 'high', 'extreme']).nullable().default(null),
  flavorNote: z.string().nullable().default(null),
  rewardCityDialId: z.enum(['prosperity', 'unrest', 'control', 'corruption']).nullable().default(null),
  rewardCityDialDelta: z.number().default(0),
  rewardDebtReduction: z.number().default(0),
  unlocksNpcId: z.string().nullable().default(null),
})

export const questRuntimeSchema = z.object({
  questId: z.string(),
  acceptedOnDay: z.number(),
  status: z.enum(['active', 'completed', 'failed']),
  objectiveMet: z.boolean().default(false),
})

export type QuestTemplate = z.infer<typeof questTemplateSchema>
export type QuestRuntime = z.infer<typeof questRuntimeSchema>
