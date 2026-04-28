import { z } from 'zod'

const discoveryEntrySchema = z.object({
  type: z.enum(['item', 'lore', 'marks']),
  itemId: z.string().optional(),
  loreKey: z.string().optional(),
  label: z.string().optional(),
  amount: z.number().optional(),
  weight: z.number(),
})

export const expeditionDestinationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  durationDays: z.number(),
  dangerLevel: z.number(),
  supplyConsumptionPerDay: z.number(),
  encounterEnemyIds: z.array(z.string()),
  discoveryTable: z.array(discoveryEntrySchema),
  narrativeHook: z.string().optional(),
})

export type ExpeditionDestination = z.infer<typeof expeditionDestinationSchema>

export const expeditionEncounterSchema = z.object({
  day: z.number(),
  type: z.enum(['combat', 'event', 'discovery', 'none']),
  label: z.string(),
  resolved: z.boolean().default(false),
})

export type ExpeditionEncounter = z.infer<typeof expeditionEncounterSchema>

export const expeditionDiscoverySchema = z.object({
  type: z.enum(['item', 'lore', 'marks']),
  itemId: z.string().optional(),
  loreKey: z.string().optional(),
  label: z.string().optional(),
  amount: z.number().optional(),
})

export type ExpeditionDiscovery = z.infer<typeof expeditionDiscoverySchema>

export const expeditionStateSchema = z.object({
  status: z.enum(['idle', 'preparing', 'traveling', 'returned']).default('idle'),
  destinationId: z.string().nullable().default(null),
  squadNpcIds: z.array(z.string()).default([]),
  suppliesRemaining: z.number().default(0),
  daysDeparted: z.number().default(0),
  totalDays: z.number().default(0),
  encounters: z.array(expeditionEncounterSchema).default([]),
  discoveries: z.array(expeditionDiscoverySchema).default([]),
  cityDayAtDeparture: z.number().default(0),
})

export type ExpeditionState = z.infer<typeof expeditionStateSchema>
