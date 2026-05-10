import { z } from 'zod'

export const questObjectiveTypeSchema = z.enum(['combat', 'delivery', 'investigation', 'survival'])
export const questDiscoverySourceSchema = z.enum(['bar', 'guild', 'court', 'event', 'npc', 'notice_board'])

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
  discoverySource: questDiscoverySourceSchema.nullable().default(null),
  discoveryDistrictId: z.string().nullable().default(null),
  sourceNpcId: z.string().nullable().default(null),
  riskLevel: z.enum(['low', 'medium', 'high', 'extreme']).nullable().default(null),
  flavorNote: z.string().nullable().default(null),
  rewardCityDialId: z.enum(['prosperity', 'unrest', 'control', 'corruption']).nullable().default(null),
  rewardCityDialDelta: z.number().default(0),
  rewardDebtReduction: z.number().default(0),
  unlocksNpcId: z.string().nullable().default(null),
}).strict()

export const questRuntimeProgressSchema = z.object({
  requiredSteps: z.number().int().nonnegative().default(1),
  completedSteps: z.number().int().nonnegative().default(0),
  lastAdvancedDay: z.number().int().positive().nullable().default(null),
}).strict()

export const questRuntimeContextSchema = z.object({
  incidentDistrictId: z.string().nullable().default(null),
  issuerFactionId: z.string().nullable().default(null),
  sourceNpcId: z.string().nullable().default(null),
  discoverySource: questDiscoverySourceSchema.nullable().default(null),
  discoveryDistrictId: z.string().nullable().default(null),
  selectedBranchId: z.string().nullable().default(null),
  retryBehavior: z.enum(['fail', 'retryable', 'branch']).default('fail'),
}).strict()

export const questRuntimeSchema = z.object({
  questId: z.string(),
  acceptedOnDay: z.number(),
  status: z.enum(['active', 'completed', 'failed']),
  acceptedTitle: z.string(),
  acceptedBriefing: z.string().nullable().default(null),
  stageId: z.string().min(1).default('accepted'),
  objectiveMet: z.boolean().default(false),
  currentObjectiveLabel: z.string().nullable().default(null),
  progress: questRuntimeProgressSchema.default(() => ({
    requiredSteps: 1,
    completedSteps: 0,
    lastAdvancedDay: null,
  })),
  context: questRuntimeContextSchema.default(() => ({
    incidentDistrictId: null,
    issuerFactionId: null,
    sourceNpcId: null,
    discoverySource: null,
    discoveryDistrictId: null,
    selectedBranchId: null,
    retryBehavior: 'fail' as const,
  })),
  journalEntries: z.array(z.string()).default([]),
}).strict()

const REQUIRED_STEPS_BY_OBJECTIVE: Record<QuestObjectiveType, number> = {
  combat: 4,
  delivery: 3,
  investigation: 3,
  survival: 3,
}

const INITIAL_OBJECTIVE_LABEL_BY_TYPE: Record<QuestObjectiveType, string> = {
  combat: 'Travel to the incident and prepare the squad before the fighting starts.',
  delivery: 'Reach the district and complete the handoff on-site.',
  investigation: 'Gather operatives, reach the district, and work the lead.',
  survival: 'Reach the district and hold through the job until the danger passes.',
}

export type QuestTemplate = z.infer<typeof questTemplateSchema>
export type QuestObjectiveType = z.infer<typeof questObjectiveTypeSchema>
export type QuestRuntime = z.infer<typeof questRuntimeSchema>
export type QuestRuntimeContext = z.infer<typeof questRuntimeContextSchema>
export type QuestRuntimeProgress = z.infer<typeof questRuntimeProgressSchema>

export function createQuestRuntime(template: QuestTemplate, acceptedOnDay: number): QuestRuntime {
  const acceptedBriefing = template.openingText ?? template.briefing ?? null
  const initialJournalEntries = acceptedBriefing ? [acceptedBriefing] : []

  return questRuntimeSchema.parse({
    questId: template.id,
    acceptedOnDay,
    status: 'active',
    acceptedTitle: template.title,
    acceptedBriefing,
    stageId: 'accepted',
    objectiveMet: false,
    currentObjectiveLabel: INITIAL_OBJECTIVE_LABEL_BY_TYPE[template.objectiveType],
    progress: {
      requiredSteps: REQUIRED_STEPS_BY_OBJECTIVE[template.objectiveType],
      completedSteps: 0,
      lastAdvancedDay: acceptedOnDay,
    },
    context: {
      incidentDistrictId: template.districtId,
      issuerFactionId: template.employerFactionId,
      sourceNpcId: template.sourceNpcId,
      discoverySource: template.discoverySource,
      discoveryDistrictId: template.discoveryDistrictId,
      selectedBranchId: null,
      retryBehavior: 'fail',
    },
    journalEntries: initialJournalEntries,
  })
}
