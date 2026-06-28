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

/**
 * Agenda tree node - represents a step in a faction's multi-step political agenda.
 */
export const agendaTreeNodeSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    voteTemplateId: z.string().min(1).optional(),
    unlockedByNodeId: z.string().min(1).optional(),
    requiredOutcome: z.enum(['pass', 'fail']).default('pass'),
    description: z.string().optional(),
  })
  .strict()

export type AgendaTreeNode = z.infer<typeof agendaTreeNodeSchema>

/**
 * Agenda tree - a multi-step political agenda for a faction.
 */
export const agendaTreeSchema = z
  .object({
    id: z.string().min(1),
    factionId: entityIdSchema,
    title: z.string().min(1),
    description: z.string().min(1),
    nodes: z.array(agendaTreeNodeSchema).min(1),
    finalOutcome: z.object({
      description: z.string().min(1),
      effects: z.array(z.record(z.string(), z.unknown())),
    }),
  })
  .strict()

export type AgendaTree = z.infer<typeof agendaTreeSchema>

/**
 * Progress tracking for an agenda tree node.
 */
export const agendaNodeProgressSchema = z.enum(['pending', 'completed', 'blocked'])
export type AgendaNodeProgress = z.infer<typeof agendaNodeProgressSchema>

/**
 * Agenda progress tracking for a faction's agenda trees.
 */
export const agendaProgressSchema = z
  .object({
    treeId: z.string().min(1),
    nodeProgress: z.record(z.string().min(1), agendaNodeProgressSchema),
    completed: z.boolean().default(false),
    blocked: z.boolean().default(false),
  })
  .strict()

export type AgendaProgress = z.infer<typeof agendaProgressSchema>

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
    agendaTreeIds: z.array(z.string().min(1)).default([]),
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
    agendaProgress: z.array(agendaProgressSchema).default([]),
  })
  .strict()

export type FactionDefinition = z.infer<typeof factionDefinitionSchema>
export type FactionRuntimeState = z.infer<typeof factionRuntimeStateSchema>
export type PoliticalDials = z.infer<typeof politicalDialsSchema>

/**
 * Faction Directive types - tasks that faction leaders assign to NPCs.
 */
export const FACTION_DIRECTIVE_TYPES = [
  'scout',
  'protect',
  'retrieve',
  'intercept',
  'negotiate',
  'sabotage',
  'escort',
  'investigate',
] as const

export const factionDirectiveTypeSchema = z.enum(FACTION_DIRECTIVE_TYPES)

export type FactionDirectiveType = z.infer<typeof factionDirectiveTypeSchema>

/**
 * Directive status lifecycle.
 */
export const FACTION_DIRECTIVE_STATUS = [
  'pending',
  'in-progress',
  'completed',
  'failed',
  'cancelled',
] as const

export const factionDirectiveStatusSchema = z.enum(FACTION_DIRECTIVE_STATUS)

export type FactionDirectiveStatus = z.infer<typeof factionDirectiveStatusSchema>

/**
 * Directive target types - what the directive is targeting.
 */
export const FACTION_DIRECTIVE_TARGET_TYPES = [
  'district',
  'npc',
  'item',
  'faction',
] as const

export const factionDirectiveTargetTypeSchema = z.enum(FACTION_DIRECTIVE_TARGET_TYPES)

export type FactionDirectiveTargetType = z.infer<typeof factionDirectiveTargetTypeSchema>

/**
 * Faction Directive schema - represents a task assigned by a faction leader to an NPC.
 */
export const factionDirectiveSchema = z
  .object({
    id: entityIdSchema,
    factionId: entityIdSchema,
    targetNpcId: entityIdSchema,
    directiveType: factionDirectiveTypeSchema,
    targetId: z.string().min(1), // District ID, NPC ID, Item ID, or Faction ID
    targetType: factionDirectiveTargetTypeSchema,
    priority: z.number().min(1).max(5),
    deadlineDay: z.number().min(0),
    status: factionDirectiveStatusSchema,
    rewardMarks: z.number().min(0).default(0),
    rewardStanding: z.number().min(-100).max(100).default(0),
    createdAtDay: z.number().min(0),
    completedAtDay: z.number().min(0).optional().nullable(),
    description: z.string().min(1).optional(),
  })
  .strict()

export type FactionDirective = z.infer<typeof factionDirectiveSchema>

/**
 * Skill requirements for each directive type.
 */
export const directiveSkillRequirements: Record<FactionDirectiveType, Record<string, number>> = {
  scout: { perception: 60, survival: 40 },
  protect: { endurance: 60, discipline: 50 },
  retrieve: { agility: 50, security: 40 },
  intercept: { might: 60, melee: 50 },
  negotiate: { presence: 60, negotiation: 70 },
  sabotage: { intrigue: 70, ruthlessness: 50 },
  escort: { loyalty: 60, discipline: 50 },
  investigate: { intellect: 60, curiosity: 50 },
}
