import { describe, expect, it } from 'vitest'

import {
  chronicleSchema,
  chronicleEntrySchema,
  createEmptyChronicle,
  addChronicleEntry,
  applyChronicleEviction,
  CHRONICLE_VERIDICAL_DAYS,
  CHRONICLE_COMPACTED_DAYS,
  CHRONICLE_MAX_ENTRIES_PER_DAY,
  type ChronicleEntry,
} from './contracts'
import type { TimeSlot } from '../shared/contracts'

function makeEntry(overrides: Partial<ChronicleEntry> = {}): ChronicleEntry {
  return {
    entryId: overrides.entryId ?? 'entry-test',
    day: overrides.day ?? 1,
    timeSlot: overrides.timeSlot ?? 'morning',
    kind: overrides.kind ?? 'scene',
    headline: overrides.headline ?? 'Test headline',
    detailLines: overrides.detailLines ?? [],
    actors: overrides.actors ?? [],
    places: overrides.places ?? [],
    effects: overrides.effects ?? { playerEffects: [], npcEffects: [], worldEffects: [] },
    linkedTarget: overrides.linkedTarget ?? null,
  }
}

describe('Chronicle schema', () => {
  it('validates a minimal empty chronicle', () => {
    const result = chronicleSchema.safeParse({ entriesByDay: {}, version: 1 })
    expect(result.success).toBe(true)
  })

  it('validates a chronicle with day buckets', () => {
    const chronicle = {
      entriesByDay: {
        '1': {
          day: 1,
          entries: [
            {
              entryId: 'entry-1',
              day: 1,
              timeSlot: 'morning',
              kind: 'scene',
              headline: 'The journey begins',
              detailLines: ['Player arrives in the Pale district'],
              actors: [
                { actorId: 'npc-marion-vale', actorName: 'Marion Vale', actorType: 'npc' },
              ],
              places: [
                { placeId: 'district-the-pale', placeName: 'The Pale', placeType: 'district' },
              ],
              effects: {
                playerEffects: ['Met Marion Vale'],
                npcEffects: [],
                worldEffects: [],
              },
              linkedTarget: null,
            },
          ],
        },
      },
      version: 1,
    }

    const result = chronicleSchema.safeParse(chronicle)
    expect(result.success).toBe(true)
  })

  it('rejects invalid entry kinds', () => {
    const invalid = {
      entriesByDay: {
        '1': {
          day: 1,
          entries: [
            {
              entryId: 'entry-1',
              day: 1,
              timeSlot: 'morning',
              kind: 'invalid_kind' as any,
              headline: 'Test',
              detailLines: [],
              actors: [],
              places: [],
              effects: { playerEffects: [], npcEffects: [], worldEffects: [] },
              linkedTarget: null,
            },
          ],
        },
      },
      version: 1,
    }

    const result = chronicleSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects entries with missing required fields', () => {
    const invalid = {
      entriesByDay: {
        '1': {
          day: 1,
          entries: [
            {
              entryId: 'entry-1',
              // missing day, timeSlot, kind, headline
              actors: [],
              places: [],
              effects: { playerEffects: [], npcEffects: [], worldEffects: [] },
              linkedTarget: null,
            },
          ],
        },
      },
      version: 1,
    }

    const result = chronicleSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('supports all entry kinds', () => {
    const kinds = ['scene', 'world', 'household', 'economy', 'combat', 'quest'] as const

    kinds.forEach((kind) => {
      const entry = {
        entryId: `entry-${kind}`,
        day: 1,
        timeSlot: 'morning',
        kind,
        headline: 'Test entry',
        detailLines: [],
        actors: [],
        places: [],
        effects: { playerEffects: [], npcEffects: [], worldEffects: [] },
        linkedTarget: null,
      }

      const result = chronicleEntrySchema.safeParse(entry)
      expect(result.success).toBe(true)
    })
  })
})

describe('createEmptyChronicle', () => {
  it('creates a chronicle with empty entriesByDay', () => {
    const chronicle = createEmptyChronicle()
    expect(chronicle.entriesByDay).toEqual({})
    expect(chronicle.version).toBe(1)
  })
})

describe('addChronicleEntry', () => {
  it('adds an entry to an empty chronicle', () => {
    const chronicle = createEmptyChronicle()
    const entry = makeEntry({
      entryId: 'entry-1',
      day: 1,
      timeSlot: 'morning',
      kind: 'scene',
      headline: 'First entry',
      detailLines: ['Detail 1'],
    })

    const result = addChronicleEntry(chronicle, entry)

    expect(result.entriesByDay['1']).toBeDefined()
    expect(result.entriesByDay['1']?.entries).toHaveLength(1)
    expect(result.entriesByDay['1']?.entries[0]).toBe(entry)
  })

  it('appends to existing day bucket', () => {
    const chronicle = createEmptyChronicle()
    const entry1 = makeEntry({
      entryId: 'entry-1',
      day: 1,
      timeSlot: 'morning',
      kind: 'scene',
      headline: 'First',
    })
    const entry2 = makeEntry({
      entryId: 'entry-2',
      day: 1,
      timeSlot: 'afternoon',
      kind: 'economy',
      headline: 'Second',
    })

    const afterFirst = addChronicleEntry(chronicle, entry1)
    const afterSecond = addChronicleEntry(afterFirst, entry2)

    expect(afterSecond.entriesByDay['1']?.entries).toHaveLength(2)
    expect(afterSecond.entriesByDay['1']?.entries[0]).toBe(entry1)
    expect(afterSecond.entriesByDay['1']?.entries[1]).toBe(entry2)
  })

  it('creates separate buckets for different days', () => {
    const chronicle = createEmptyChronicle()
    const entry1 = makeEntry({
      entryId: 'entry-1',
      day: 1,
      timeSlot: 'morning',
      kind: 'scene',
      headline: 'Day 1',
    })
    const entry2 = makeEntry({
      entryId: 'entry-2',
      day: 2,
      timeSlot: 'morning',
      kind: 'scene',
      headline: 'Day 2',
    })

    const result = addChronicleEntry(addChronicleEntry(chronicle, entry1), entry2)

    expect(result.entriesByDay['1']?.entries).toHaveLength(1)
    expect(result.entriesByDay['2']?.entries).toHaveLength(1)
  })
})

describe('applyChronicleEviction', () => {
  it('keeps veridical days unchanged', () => {
    const chronicle = {
      entriesByDay: {
        '1': { day: 1, entries: [makeEntry({ entryId: 'e1', day: 1, timeSlot: 'morning', headline: 'Day 1' })] },
        '2': { day: 2, entries: [makeEntry({ entryId: 'e2', day: 2, timeSlot: 'morning', headline: 'Day 2' })] },
        '3': { day: 3, entries: [makeEntry({ entryId: 'e3', day: 3, timeSlot: 'morning', headline: 'Day 3' })] },
      },
      version: 1,
    }

    // On day 7, days 1-7 should be veridical (within CHRONICLE_VERIDICAL_DAYS)
    const result = applyChronicleEviction(chronicle, 7)

    expect(result.entriesByDay['1']?.entries).toHaveLength(1)
    expect(result.entriesByDay['2']?.entries).toHaveLength(1)
    expect(result.entriesByDay['3']?.entries).toHaveLength(1)
  })

  it('compacts days in the compaction window', () => {
    const chronicle = {
      entriesByDay: {
        '1': { day: 1, entries: [
          makeEntry({ entryId: 'e1a', day: 1, timeSlot: 'morning', headline: 'Day 1 A' }),
          makeEntry({ entryId: 'e1b', day: 1, timeSlot: 'afternoon', headline: 'Day 1 B' }),
          makeEntry({ entryId: 'e1c', day: 1, timeSlot: 'evening', headline: 'Day 1 C' }),
        ]},
        '2': { day: 2, entries: [
          makeEntry({ entryId: 'e2a', day: 2, timeSlot: 'morning', headline: 'Day 2 A' }),
          makeEntry({ entryId: 'e2b', day: 2, timeSlot: 'afternoon', headline: 'Day 2 B' }),
        ]},
        '8': { day: 8, entries: [makeEntry({ entryId: 'e8', day: 8, timeSlot: 'morning', headline: 'Day 8' })] },
      },
      version: 1,
    }

    // On day 17:
    // - Days 10-17 are veridical (within 7 days)
    // - Days 4-9 are compacted (within 14 days)
    // - Days 1-3 are evicted (older than 14 days)
    const result = applyChronicleEviction(chronicle, 17)

    // Days 1 and 2 should be evicted
    expect(result.entriesByDay['1']).toBeUndefined()
    expect(result.entriesByDay['2']).toBeUndefined()

    // Day 8 should be compacted to first entry + summary
    expect(result.entriesByDay['8']?.entries).toHaveLength(1)
    expect(result.entriesByDay['8']?.entries[0]?.headline).toBe('Day 8')
  })

  it('enforces max entries per day in veridical window', () => {
    const manyEntries = Array.from({ length: 25 }, (_, i) =>
      makeEntry({ entryId: `e5-${i}`, day: 5, timeSlot: ['morning', 'afternoon', 'evening', 'night'][i % 4] as TimeSlot, headline: `Day 5 Entry ${i + 1}` })
    )

    const chronicle = {
      entriesByDay: {
        '5': { day: 5, entries: manyEntries },
      },
      version: 1,
    }

    // On day 7, day 5 is veridical but should be trimmed to max entries
    const result = applyChronicleEviction(chronicle, 7)

    expect(result.entriesByDay['5']?.entries).toHaveLength(CHRONICLE_MAX_ENTRIES_PER_DAY)
    // Should keep the newest entries (last 20)
    expect(result.entriesByDay['5']?.entries[0]?.headline).toBe('Day 5 Entry 6')
  })

  it('returns empty chronicle when all days are evicted', () => {
    const chronicle = {
      entriesByDay: {
        '1': { day: 1, entries: [makeEntry({ entryId: 'e1', day: 1, timeSlot: 'morning', headline: 'Day 1' })] },
      },
      version: 1,
    }

    // On day 30, day 1 is way beyond the 14-day retention
    const result = applyChronicleEviction(chronicle, 30)

    expect(result.entriesByDay).toEqual({})
  })

  it('handles empty day buckets', () => {
    const chronicle = {
      entriesByDay: {
        '1': { day: 1, entries: [] },
        '2': { day: 2, entries: [makeEntry({ entryId: 'e2', day: 2, timeSlot: 'morning', headline: 'Day 2' })] },
      },
      version: 1,
    }

    const result = applyChronicleEviction(chronicle, 10)

    // Empty bucket should be removed
    expect(result.entriesByDay['1']).toBeUndefined()
    expect(result.entriesByDay['2']?.entries).toHaveLength(1)
  })
})

describe('Chronicle constants', () => {
  it('has reasonable eviction thresholds', () => {
    expect(CHRONICLE_VERIDICAL_DAYS).toBe(7)
    expect(CHRONICLE_COMPACTED_DAYS).toBe(14)
    expect(CHRONICLE_MAX_ENTRIES_PER_DAY).toBe(20)
  })
})

describe('Fiction contract — entries name people and places', () => {
  it('supports actor references with names', () => {
    const entry = {
      entryId: 'entry-1',
      day: 1,
      timeSlot: 'morning',
      kind: 'scene' as const,
      headline: 'Ida Rhys joins the cause',
      detailLines: ['The mercenary accepts the contract'],
      actors: [
        { actorId: 'npc-ida-rhys', actorName: 'Ida Rhys', actorType: 'npc' },
        { actorId: 'protagonist', actorName: 'The Heir', actorType: 'protagonist' },
      ],
      places: [
        { placeId: 'district-the-pale', placeName: 'The Pale', placeType: 'district' },
      ],
      effects: {
        playerEffects: ['Recruited Ida Rhys'],
        npcEffects: ['Ida Rhys joins roster'],
        worldEffects: [],
      },
      linkedTarget: { targetType: 'npc', targetId: 'npc-ida-rhys' },
    }

    const result = chronicleEntrySchema.safeParse(entry)
    expect(result.success).toBe(true)
  })
})
