import { z } from 'zod'

export const questObjectiveTypeSchema = z.enum(['combat', 'delivery', 'investigation', 'survival'])
export const questDiscoverySourceSchema = z.enum(['bar', 'guild', 'court', 'event', 'npc', 'notice_board', 'faction_house'])
export const questLeadFreshnessSchema = z.enum(['fresh', 'aging', 'stale'])

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
  executionDurationDays: z.number().int().positive().nullable().default(null),
  executionDurationWatches: z.number().int().positive().nullable().default(null),
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
  successorQuestId: z.string().nullable().default(null),
  successorOnFailQuestId: z.string().nullable().default(null),
  midQuestBeats: z.array(z.object({
    atStageId: z.string(),
    label: z.string(),
    journalEntry: z.string(),
  })).default([]),
  rewardItemIds: z.array(z.string()).default([]),
  rewardRelationshipDeltas: z.array(z.object({
    npcId: z.string(),
    trust: z.number().optional(),
    affinity: z.number().optional(),
    respect: z.number().optional(),
    fear: z.number().optional(),
    loyalty: z.number().optional(),
  }).strict()).default([]),
  successorRumorIds: z.array(z.string()).default([]),
}).strict()

export const questClueSchema = z.object({
  clueId: z.string(),
  label: z.string(),
  discovered: z.boolean().default(false),
  discoveredOnDay: z.number().int().positive().nullable().default(null),
  usedInBranchId: z.string().nullable().default(null),
}).strict()

export const questParticipantSchema = z.object({
  npcId: z.string(),
  role: z.enum(['employer', 'target', 'ally', 'witness', 'victim', 'unknown']),
  status: z.enum(['active', 'dead', 'missing', 'captured', 'fled']).default('active'),
}).strict()

export const questAftermathSchema = z.object({
  worldConsequenceIds: z.array(z.string()).default([]),
  factionImpacts: z.array(z.object({
    factionId: z.string(),
    delta: z.number(),
  })).default([]),
  unlockNpcIds: z.array(z.string()).default([]),
  narrativeSummary: z.string().nullable().default(null),
}).strict()

export const questRuntimeProgressSchema = z.object({
  requiredSteps: z.number().int().nonnegative().default(1),
  completedSteps: z.number().int().nonnegative().default(0),
  lastAdvancedDay: z.number().int().positive().nullable().default(null),
  lastSurveillanceLoggedDay: z.number().int().positive().nullable().default(null),
}).strict()

export const questRuntimeContextSchema = z.object({
  incidentDistrictId: z.string().nullable().default(null),
  issuerFactionId: z.string().nullable().default(null),
  sourceNpcId: z.string().nullable().default(null),
  discoverySource: questDiscoverySourceSchema.nullable().default(null),
  discoveryDistrictId: z.string().nullable().default(null),
  selectedBranchId: z.string().nullable().default(null),
  retryBehavior: z.enum(['fail', 'retryable', 'branch']).default('fail'),
  executionDurationDays: z.number().int().positive().nullable().default(null),
  executionDurationWatches: z.number().int().positive().nullable().default(null),
}).strict()

export const questLeadRuntimeSchema = z.object({
  leadId: z.string(),
  questId: z.string(),
  discoveredDay: z.number().int().positive(),
  discoverySource: questDiscoverySourceSchema.nullable().default(null),
  discoveryDistrictId: z.string().nullable().default(null),
  sourceNpcId: z.string().nullable().default(null),
  sourcePoiId: z.string().nullable().default(null),
  issuerFactionId: z.string().nullable().default(null),
  expiresOnDay: z.number().int().positive().nullable().default(null),
  freshness: questLeadFreshnessSchema.default('fresh'),
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
    lastSurveillanceLoggedDay: null,
  })),
  context: questRuntimeContextSchema.default(() => ({
    incidentDistrictId: null,
    issuerFactionId: null,
    sourceNpcId: null,
    discoverySource: null,
    discoveryDistrictId: null,
    selectedBranchId: null,
    retryBehavior: 'fail' as const,
    executionDurationDays: null,
    executionDurationWatches: null,
  })),
  journalEntries: z.array(z.string()).default([]),
  clues: z.array(questClueSchema).default([]),
  participants: z.array(questParticipantSchema).default([]),
  aftermath: questAftermathSchema.nullable().default(null),
}).strict()

const REQUIRED_STEPS_BY_OBJECTIVE: Record<QuestObjectiveType, number> = {
  combat: 4,
  delivery: 3,
  investigation: 3,
  survival: 3,
}

function resolveRequiredSteps(template: QuestTemplate): number {
  if (template.objectiveType === 'investigation' && template.executionDurationDays != null) {
    return 2 + template.executionDurationDays
  }

  if (
    (template.objectiveType === 'delivery' || template.objectiveType === 'survival') &&
    template.executionDurationWatches != null
  ) {
    return 2 + template.executionDurationWatches
  }

  return REQUIRED_STEPS_BY_OBJECTIVE[template.objectiveType]
}

const INITIAL_OBJECTIVE_LABEL_BY_TYPE: Record<QuestObjectiveType, string> = {
  combat: 'Travel to the incident and prepare the squad before the fighting starts.',
  delivery: 'Reach the district and complete the handoff on-site.',
  investigation: 'Gather operatives, reach the district, and work the lead.',
  survival: 'Reach the district and hold through the job until the danger passes.',
}

export type QuestTemplate = z.infer<typeof questTemplateSchema>
export type QuestObjectiveType = z.infer<typeof questObjectiveTypeSchema>
export type QuestDiscoverySource = z.infer<typeof questDiscoverySourceSchema>
export type QuestRuntime = z.infer<typeof questRuntimeSchema>
export type QuestRuntimeContext = z.infer<typeof questRuntimeContextSchema>
export type QuestRuntimeProgress = z.infer<typeof questRuntimeProgressSchema>
export type QuestLeadFreshness = z.infer<typeof questLeadFreshnessSchema>
export type QuestLeadRuntime = z.infer<typeof questLeadRuntimeSchema>
export type QuestClue = z.infer<typeof questClueSchema>
export type QuestParticipant = z.infer<typeof questParticipantSchema>
export type QuestAftermath = z.infer<typeof questAftermathSchema>

function resolveQuestLeadFreshness(daysVisible: number, expiresOnDay: number | null, currentDay: number): QuestLeadFreshness {
  if (expiresOnDay != null) {
    const remainingDays = expiresOnDay - currentDay
    if (remainingDays <= 1) return 'stale'
    if (remainingDays <= 3) return 'aging'
  }

  if (daysVisible >= 6) return 'stale'
  if (daysVisible >= 3) return 'aging'
  return 'fresh'
}

export function getQuestLeadFreshness(lead: QuestLeadRuntime, currentDay: number): QuestLeadFreshness {
  return resolveQuestLeadFreshness(currentDay - lead.discoveredDay, lead.expiresOnDay, currentDay)
}

export function isQuestLeadExpired(lead: QuestLeadRuntime, currentDay: number) {
  return lead.expiresOnDay != null && currentDay > lead.expiresOnDay
}

type QuestLeadRuntimeOverrides = Partial<Omit<QuestLeadRuntime, 'leadId' | 'questId' | 'discoveredDay' | 'expiresOnDay' | 'freshness'>>

export function createQuestLeadRuntime(
  template: QuestTemplate,
  discoveredDay: number,
  overrides: QuestLeadRuntimeOverrides = {},
): QuestLeadRuntime {
  const expiresOnDay = template.timeLimitDays != null ? discoveredDay + template.timeLimitDays : null

  return questLeadRuntimeSchema.parse({
    leadId: `${template.id}-lead-${discoveredDay}`,
    questId: template.id,
    discoveredDay,
    discoverySource: overrides.discoverySource ?? template.discoverySource,
    discoveryDistrictId: overrides.discoveryDistrictId ?? template.discoveryDistrictId,
    sourceNpcId: overrides.sourceNpcId ?? template.sourceNpcId,
    sourcePoiId: overrides.sourcePoiId ?? null,
    issuerFactionId: overrides.issuerFactionId ?? template.employerFactionId,
    expiresOnDay,
    freshness: resolveQuestLeadFreshness(0, expiresOnDay, discoveredDay),
  })
}

export function createQuestRuntime(
  template: QuestTemplate,
  acceptedOnDay: number,
  lead: QuestLeadRuntime | null = null,
): QuestRuntime {
  const acceptedBriefing = template.openingText ?? template.briefing ?? null
  const initialJournalEntries = acceptedBriefing ? [acceptedBriefing] : []

  // Seed initial participants from template
  const participants: QuestParticipant[] = []
  const sourceNpc = lead?.sourceNpcId ?? template.sourceNpcId
  if (sourceNpc) {
    participants.push({ npcId: sourceNpc, role: 'employer', status: 'active' })
  }
  if (template.enemyNpcId) {
    participants.push({ npcId: template.enemyNpcId, role: 'target', status: 'active' })
  }

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
      requiredSteps: resolveRequiredSteps(template),
      completedSteps: 0,
      lastAdvancedDay: acceptedOnDay,
    },
    context: {
      incidentDistrictId: template.districtId,
      issuerFactionId: lead?.issuerFactionId ?? template.employerFactionId,
      sourceNpcId: lead?.sourceNpcId ?? template.sourceNpcId,
      discoverySource: lead?.discoverySource ?? template.discoverySource,
      discoveryDistrictId: lead?.discoveryDistrictId ?? template.discoveryDistrictId,
      selectedBranchId: null,
      retryBehavior: 'fail',
      executionDurationDays: template.executionDurationDays,
      executionDurationWatches: template.executionDurationWatches,
    },
    journalEntries: initialJournalEntries,
    clues: [],
    participants,
    aftermath: null,
  })
}
