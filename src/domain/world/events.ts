import { z } from 'zod'

import { entityIdSchema, positiveIntegerSchema } from '../shared/contracts'

/**
 * World event types for Living World systems.
 * These events enable NPCs and systems to react to state changes.
 */
export const worldEventTypeSchema = z.enum([
  'corridor-blocked',
  'corridor-disrupted',
  'corridor-cleared',
  'expedition-started',
  'expedition-complete',
  'expedition-failed',
  'shop-stock-low',
  'shop-price-changed',
  'npc-hired',
  'npc-departed',
  'coalition-formed',
  'coalition-dissolved',
])

export type WorldEventType = z.infer<typeof worldEventTypeSchema>

/**
 * A world event recording a significant state change in the Living World.
 * Events are published by commands and can be queried by systems/NPCs to react.
 */
export const worldEventSchema = z
  .object({
    eventId: entityIdSchema,
    type: worldEventTypeSchema,
    day: positiveIntegerSchema,
    payload: z.record(z.string(), z.unknown()),
    source: z.enum(['system', 'npc', 'player']),
    sourceNpcId: entityIdSchema.optional().nullable().default(null),
    relatedNpcIds: z.array(entityIdSchema).default([]),
    relatedQuestIds: z.array(z.string()).default([]),
  })
  .strict()

export type WorldEvent = z.infer<typeof worldEventSchema>
