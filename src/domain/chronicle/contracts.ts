import { z } from 'zod'

import { entityIdSchema, positiveIntegerSchema, timeSlotSchema } from '../shared/contracts'

/**
 * Chronicle entry kinds — categorizes what type of scene/event is being recorded
 */
export const chronicleEntryKindSchema = z.enum([
  'scene',      // Narrative scenes, dialogue, character moments
  'world',      // World state changes, district events, faction shifts
  'household',  // House management, NPC domestic events, heir/ward milestones
  'economy',    // Trades, purchases, wages, resource changes
  'combat',     // Combat encounters, skirmishes, raids
  'quest',      // Quest starts, completions, milestones, investigations
])

export type ChronicleEntryKind = z.infer<typeof chronicleEntryKindSchema>

/**
 * Reference to an actor (NPC, faction, or the protagonist)
 */
export const chronicleActorRefSchema = z
  .object({
    actorId: entityIdSchema,
    actorName: z.string().min(1),
    actorType: z.enum(['npc', 'faction', 'protagonist', 'enemy']),
  })
  .strict()

export type ChronicleActorRef = z.infer<typeof chronicleActorRefSchema>

/**
 * Reference to a place (district, site, room, etc.)
 */
export const chroniclePlaceRefSchema = z
  .object({
    placeId: entityIdSchema,
    placeName: z.string().min(1),
    placeType: z.enum(['district', 'site', 'room', 'corridor', 'expedition']),
  })
  .strict()

export type ChroniclePlaceRef = z.infer<typeof chroniclePlaceRefSchema>

/**
 * Effect lines — the three-lens view of consequences (player/npc/world)
 * Matches the shape from lastResolvedEventSummary.playerEffects/npcEffects/worldEffects
 */
export const chronicleEffectLinesSchema = z
  .object({
    playerEffects: z.array(z.string()).default([]),
    npcEffects: z.array(z.string()).default([]),
    worldEffects: z.array(z.string()).default([]),
  })
  .strict()

export type ChronicleEffectLines = z.infer<typeof chronicleEffectLinesSchema>

/**
 * A single chronicle entry — one day's record of meaningful events
 */
export const chronicleEntrySchema = z
  .object({
    entryId: entityIdSchema,
    day: positiveIntegerSchema,
    timeSlot: timeSlotSchema,
    kind: chronicleEntryKindSchema,
    headline: z.string().min(1),
    detailLines: z.array(z.string()).default([]),
    actors: z.array(chronicleActorRefSchema).default([]),
    places: z.array(chroniclePlaceRefSchema).default([]),
    effects: chronicleEffectLinesSchema,
    linkedTarget: z
      .object({
        targetType: z.enum(['quest', 'npc', 'faction', 'item', 'event']),
        targetId: entityIdSchema,
      })
      .nullable()
      .default(null),
  })
  .strict()

export type ChronicleEntry = z.infer<typeof chronicleEntrySchema>

/**
 * A day's bucket of chronicle entries — all events that happened on a given day
 */
export const chronicleDayBucketSchema = z
  .object({
    day: positiveIntegerSchema,
    entries: z.array(chronicleEntrySchema),
  })
  .strict()

export type ChronicleDayBucket = z.infer<typeof chronicleDayBucketSchema>

/**
 * The Chronicle aggregate — day-bucketed persistent history with eviction policy
 */
export const chronicleSchema = z
  .object({
    entriesByDay: z.record(z.string(), chronicleDayBucketSchema), // key = day number as string
    version: z.number().int().min(1).default(1),
  })
  .strict()

export type Chronicle = z.infer<typeof chronicleSchema>

// ============================================================================
// Eviction Policy Constants
// ============================================================================

/**
 * Number of days to keep at full fidelity (verbatim entries)
 * Entries within this window are never compacted
 */
export const CHRONICLE_VERIDICAL_DAYS = 7

/**
 * Number of days to keep in compacted form
 * Older entries are condensed to headline-only summaries
 */
export const CHRONICLE_COMPACTED_DAYS = 14

/**
 * Maximum entries per day before compaction kicks in
 * Oldest entries in the day are merged into summary lines
 */
export const CHRONICLE_MAX_ENTRIES_PER_DAY = 20

/**
 * Eviction policy — removes entries older than COMPACTED_DAYS
 * Returns a new chronicle (immutable transformation)
 */
export function applyChronicleEviction(chronicle: Chronicle, currentDay: number): Chronicle {
  const veridicalThreshold = currentDay - CHRONICLE_VERIDICAL_DAYS
  const compactedThreshold = currentDay - CHRONICLE_COMPACTED_DAYS

  const newEntriesByDay: Record<string, ChronicleDayBucket> = {}

  for (const [dayStr, bucket] of Object.entries(chronicle.entriesByDay)) {
    const day = parseInt(dayStr, 10)

    // Skip days beyond the retention window
    if (day < compactedThreshold) {
      continue
    }

    // Compacted days: keep only first entry + summary line
    if (day < veridicalThreshold) {
      if (bucket.entries.length === 0) {
        continue
      }

      const firstEntry = bucket.entries[0]
      const summaryLine = `Compacted: ${bucket.entries.length - 1} additional event(s) on Day ${day}`

      newEntriesByDay[dayStr] = {
        day,
        entries: [
          {
            ...firstEntry,
            detailLines: [...firstEntry.detailLines, summaryLine],
          },
        ],
      }
      continue
    }

    // Veridical days: enforce max entries per day
    if (bucket.entries.length > CHRONICLE_MAX_ENTRIES_PER_DAY) {
      newEntriesByDay[dayStr] = {
        day,
        entries: bucket.entries.slice(-CHRONICLE_MAX_ENTRIES_PER_DAY), // keep newest
      }
      continue
    }

    // Keep as-is
    newEntriesByDay[dayStr] = bucket
  }

  return {
    ...chronicle,
    entriesByDay: newEntriesByDay,
  }
}

/**
 * Creates an empty chronicle instance
 */
export function createEmptyChronicle(): Chronicle {
  return {
    entriesByDay: {},
    version: 1,
  }
}

/**
 * Adds a new entry to the chronicle (before eviction is applied)
 */
export function addChronicleEntry(chronicle: Chronicle, entry: ChronicleEntry): Chronicle {
  const dayStr = entry.day.toString()
  const existingBucket = chronicle.entriesByDay[dayStr]

  const newBucket: ChronicleDayBucket = existingBucket
    ? {
        day: entry.day,
        entries: [...existingBucket.entries, entry],
      }
    : {
        day: entry.day,
        entries: [entry],
      }

  return {
    ...chronicle,
    entriesByDay: {
      ...chronicle.entriesByDay,
      [dayStr]: newBucket,
    },
  }
}
