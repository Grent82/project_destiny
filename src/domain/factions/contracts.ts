import { z } from 'zod'

import {
  entityIdSchema,
  percentageSchema,
  signedStandingSchema,
} from '../shared/contracts'

export const politicalDialsSchema = z
  .object({
    control: percentageSchema,
    prosperity: percentageSchema,
    unrest: percentageSchema,
    corruption: percentageSchema,
  })
  .strict()

/**
 * Machine-readable proposal conditions used by agenda-driven vote selection.
 * All thresholds are optional; absent thresholds are always satisfied.
 */
export const agendaProposesWhenSchema = z
  .object({
    cityUnrestAbove: z.number().min(0).max(100).optional(),
    factionPressureAbove: z.number().min(0).max(100).optional(),
    standingWithPlayerBelow: z.number().min(-100).max(100).optional(),
    prosperityBelow: z.number().min(0).max(100).optional(),
  })
  .strict()

export const agendaAxesSchema = z
  .object({
    /** Policy tags matching tags on council vote templates. */
    values: z.array(z.string().min(1)),
    /** Conditions under which this faction tends to propose a vote. */
    proposesWhen: agendaProposesWhenSchema,
    /** Conditions under which this faction tends to oppose/block a vote. */
    blocksWhen: agendaProposesWhenSchema.optional(),
  })
  .strict()

export type AgendaAxes = z.infer<typeof agendaAxesSchema>

export const factionDefinitionSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().min(1),
    primer: z.string().min(1),
    agenda: z.string().min(1),
    description: z.string().min(1),
    territory: z.array(entityIdSchema),
    tags: z.array(z.string().min(1)).default([]),
    dailyAgendaHook: z.string().optional(),
    agendaAxes: agendaAxesSchema.optional(),
  })
  .strict()

export const factionRuntimeStateSchema = z
  .object({
    factionId: entityIdSchema,
    power: percentageSchema,
    wealth: percentageSchema,
    security: percentageSchema,
    standingWithPlayer: signedStandingSchema,
    activePressure: percentageSchema,
    leaderNpcId: z.string().min(1).optional().nullable(),
  })
  .strict()

export type FactionDefinition = z.infer<typeof factionDefinitionSchema>
export type FactionRuntimeState = z.infer<typeof factionRuntimeStateSchema>
export type PoliticalDials = z.infer<typeof politicalDialsSchema>
