import { z } from 'zod'

export const entityIdSchema = z.string().min(1)

export const npcIntentionTypeSchema = z.enum([
  'lead-group',
  'support-group',
  'scout-ahead',
  'resource-gather',
  'confront-rival',
  'protect-house',
  'investigate-threat',
  'patrol-district',
  'seek-employment',
  'socialize',
  'eat-meal',
  'drink',
  'sleep',
  'rest',
  'groom',
  'flirt-with',
  'court-romantically',
  'visit-lover',
  'jealousy-check',
  'spend-time-with',
  'seek-intimacy',
  'flirt-aggressively',
  'visit-romantic-partner',
  'shop-for-goods',
  'train-self',
  'meditate',
  'practice-skill',
  'people-watch',
  'gossip',
  'seek-tips',
  'black-market-trade',
  'beg-for-coin',
  'scavenge-for-sell',
  'assert-dominance',
  'spy-on',
  'intercept-communication',
  'gather-leverage',
  'consolidate-power',
  'form-squad',
  'recruit-member',
  'host-gathering',
  'mediate-conflict',
  'challenge-authority',
  'scavenge',
  'fortify-position',
  'escape-attempt',
  'seek-shelter',
  'care-for-injured',
] as const)

export const percentageSchema = z.number().finite().min(0).max(100)

export const signedStandingSchema = z.number().int().min(-100).max(100)

export const nonNegativeIntegerSchema = z.number().int().min(0)

export const positiveIntegerSchema = z.number().int().positive()

export const nonNegativeNumberSchema = z.number().finite().min(0)

export const raritySchema = z.enum(['common', 'uncommon', 'rare', 'elite', 'legendary'])

export const combatRangeSchema = z.enum(['close', 'medium', 'distant'])

export const timeSlotSchema = z.enum(['morning', 'afternoon', 'evening', 'night'])

export const timeSlotSimulationTaskStatusSchema = z.enum(['pending', 'queued', 'processing', 'completed', 'skipped'])

export const timeSlotSimulationTaskSchema = z
  .object({
    taskId: z.string().min(1),
    npcId: entityIdSchema,
    intentionType: npcIntentionTypeSchema,
    timeSlot: timeSlotSchema,
    priority: z.number().int().min(1).max(5),
    dependencies: z.array(z.string()).default([]),
    status: timeSlotSimulationTaskStatusSchema.default('pending'),
    estimatedRoll: z.boolean().default(false),
    createdAtDay: positiveIntegerSchema,
  })
  .strict()

export const timeSlotStateSchema = z
  .object({
    currentSlot: timeSlotSchema.default('morning'),
    slotQueue: z.array(timeSlotSimulationTaskSchema).default([]),
    completedTasks: z.array(entityIdSchema).default([]),
    skippedTasks: z.array(entityIdSchema).default([]),
    slotHistory: z.array(
      z.object({
        slot: timeSlotSchema,
        day: positiveIntegerSchema,
        tasksCompleted: z.number().int().nonnegative(),
        tasksSkipped: z.number().int().nonnegative(),
      })
    ).default([]),
    lastProcessedSeed: z.number().int().nonnegative().default(42),
  })
  .strict()

export type CombatRange = z.infer<typeof combatRangeSchema>
export type EntityId = z.infer<typeof entityIdSchema>
export type Percentage = z.infer<typeof percentageSchema>
export type Rarity = z.infer<typeof raritySchema>
export type TimeSlot = z.infer<typeof timeSlotSchema>
export type TimeSlotSimulationTask = z.infer<typeof timeSlotSimulationTaskSchema>
export type TimeSlotSimulationTaskStatus = z.infer<typeof timeSlotSimulationTaskStatusSchema>
export type TimeSlotState = z.infer<typeof timeSlotStateSchema>
