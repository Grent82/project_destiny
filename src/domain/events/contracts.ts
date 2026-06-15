import { z } from 'zod'
import { entityIdSchema, timeSlotSchema } from '../shared/contracts'

export const eventOutcomeTypeSchema = z.enum([
  'adjustFactionStanding',
  'adjustCityDial',
  'adjustCityResource',
  'addCredits',
  'addActivityLogEntry',
  'setCorridorStatus',
  'adjustNpcRelationship',
  'createQuestLead',
  'updateQuestStage',
  'unlockNpc',
  'addNpcToRoster',
  'transferBondedNpc',
])

export const eventOutcomeSchema = z
  .object({
    type: eventOutcomeTypeSchema,
    target: z.string().optional(),
    delta: z.number().optional(),
    value: z.string().optional(),
    message: z.string().optional(),
    npcId: z.string().optional(),
    axis: z.enum(['affinity', 'respect', 'fear', 'trust', 'loyalty']).optional(),
    questId: z.string().optional(),
    stageId: z.string().optional(),
    objectiveLabel: z.string().optional(),
    arcId: z.string().optional(),
    buyerId: z.string().optional(),
  })
  .strict()

export const eventChoiceSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    outcomes: z.array(eventOutcomeSchema),
  })
  .strict()

export const eventTriggerConditionsSchema = z
  .object({
    minUnrest: z.number().optional(),
    maxUnrest: z.number().optional(),
    minFoodSecurity: z.number().optional(),
    maxFoodSecurity: z.number().optional(),
    corridorStatus: z.enum(['open', 'disrupted', 'blocked']).optional(),
    factionStandingBelow: z
      .object({ factionId: z.string(), threshold: z.number() })
      .optional(),
    factionStandingAbove: z
      .object({ factionId: z.string(), threshold: z.number() })
      .optional(),
    dayMin: z.number().optional(),
    dayMax: z.number().optional(),
    currentDistrict: z.string().optional(),
    activeQuestId: z.string().optional(),
    requiredRosterNpcId: z.string().optional(),
    maxCredits: z.number().optional(),
    minRenown: z.number().optional(),
    debtPaid: z.boolean().optional(),
    minRosterSize: z.number().optional(),
    completedQuestCountMin: z.number().optional(),
    npcRelationshipMin: z
      .object({
        npcId: z.string(),
        axis: z.enum(['affinity', 'respect', 'fear', 'trust', 'loyalty']),
        min: z.number(),
      })
      .optional(),
    timeSlot: timeSlotSchema.optional(),
    npcState: z
      .array(
        z.object({
          npcId: z.string(),
          axis: z.enum(['affinity', 'respect', 'fear', 'trust', 'loyalty']),
          min: z.number().optional(),
          max: z.number().optional(),
        }),
      )
      .optional(),
    isFirstRun: z.boolean().optional(),
    probability: z.number().min(0).max(1).default(1),
  })
  .strict()

export const eventFiringModeSchema = z.enum(['world', 'system']).default('world')

export const eventTemplateSchema = z
  .object({
    id: entityIdSchema,
    title: z.string().min(1),
    description: z.string().min(1),
    triggerConditions: eventTriggerConditionsSchema,
    choices: z.array(eventChoiceSchema).min(1),
    isAutoResolved: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    repeatable: z.boolean().default(false),
    cooldownDays: z.number().int().min(1).default(7),
    sourceDistrictId: z.string().nullable().default(null),
    sourceNpcId: z.string().nullable().default(null),
    presentationFlavour: z.string().nullable().default(null),
    firingMode: eventFiringModeSchema,
  })
  .strict()

export const pendingEventSchema = z
  .object({
    eventId: entityIdSchema,
    firedOnDay: z.number(),
  })
  .strict()

/** Richer event instance with provenance and resolution history. */
export const eventInstanceSchema = z
  .object({
    instanceId: z.string(),
    eventId: entityIdSchema,
    firedOnDay: z.number().int().positive(),
    resolvedOnDay: z.number().int().positive().nullable().default(null),
    chosenOptionId: z.string().nullable().default(null),
    sourceDistrictId: z.string().nullable().default(null),
    sourceNpcId: z.string().nullable().default(null),
    presentationText: z.string().nullable().default(null),
    contextId: z.string().nullable().default(null),
  })
  .strict()

export type EventTemplate = z.infer<typeof eventTemplateSchema>
export type EventChoice = z.infer<typeof eventChoiceSchema>
export type EventOutcome = z.infer<typeof eventOutcomeSchema>
export type PendingEvent = z.infer<typeof pendingEventSchema>
export type EventInstance = z.infer<typeof eventInstanceSchema>
