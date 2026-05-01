import { z } from 'zod'
import { entityIdSchema } from '../shared/contracts'

export const eventOutcomeTypeSchema = z.enum([
  'adjustFactionStanding',
  'adjustCityDial',
  'adjustCityResource',
  'addCredits',
  'addActivityLogEntry',
  'setCorridorStatus',
  'adjustNpcRelationship',
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
    probability: z.number().min(0).max(1).default(1),
  })
  .strict()

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
  })
  .strict()

export const pendingEventSchema = z
  .object({
    eventId: entityIdSchema,
    firedOnDay: z.number(),
  })
  .strict()

export type EventTemplate = z.infer<typeof eventTemplateSchema>
export type EventChoice = z.infer<typeof eventChoiceSchema>
export type EventOutcome = z.infer<typeof eventOutcomeSchema>
export type PendingEvent = z.infer<typeof pendingEventSchema>
