/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import {
  convertAuthoredMemoryToEntry,
  getVisibleAuthoredMemories,
  calculateTraitDriftFromMemories,
} from './initializeNpcAuthoredMemories'
import type { AuthoredMemory } from '../../domain/npc/contracts'

describe('convertAuthoredMemoryToEntry', () => {
  it('converts house_fall memory with correct day offset', () => {
    const authored: AuthoredMemory = {
      dayOffset: -500,
      eventType: 'house_fall',
      description: 'Saw the house burn',
      sentiment: 'traumatic',
      revealsOnTrustLevel: 70,
      revealsOnIntimacy: 'committed',
    }

    const entry = convertAuthoredMemoryToEntry(authored, 1)

    expect(entry.day).toBe(1) // Clamped to day 1
    expect(entry.event).toBe('Saw the house burn')
    expect(entry.sentiment).toBe('traumatic')
    expect(entry.eventType).toBe('loss')
  })

  it('calculates future day correctly', () => {
    const authored: AuthoredMemory = {
      dayOffset: 10,
      eventType: 'victory',
      description: 'Won the battle',
      sentiment: 'positive',
      revealsOnTrustLevel: 0,
      revealsOnIntimacy: 'none',
    }

    const entry = convertAuthoredMemoryToEntry(authored, 5)

    expect(entry.day).toBe(15) // 5 + 10
    expect(entry.eventType).toBe('quest_completion')
  })

  it('maps all event types correctly', () => {
    const mappings = [
      ['house_fall', 'loss'],
      ['betrayal', 'betrayal'],
      ['victory', 'quest_completion'],
      ['failure', 'failed_mission'],
      ['loyalty_test', 'custom'],
      ['failed_mission', 'failed_mission'],
      ['rescue', 'help_received'],
      ['loss', 'loss'],
      ['first_meeting', 'first_meeting'],
      ['training', 'training'],
      ['promotion', 'promotion'],
      ['exile', 'custom'],
      ['return', 'custom'],
      ['custom', 'custom'],
    ]

    for (const [eventType, expected] of mappings) {
      const authored: AuthoredMemory = {
        dayOffset: 0,
        eventType: eventType as any,
        description: 'Test event',
        sentiment: 'neutral',
        revealsOnTrustLevel: 0,
        revealsOnIntimacy: 'none',
      }

      const entry = convertAuthoredMemoryToEntry(authored, 1)
      expect(entry.eventType).toBe(expected)
    }
  })

  it('includes participants when provided', () => {
    const authored: AuthoredMemory = {
      dayOffset: -100,
      eventType: 'first_meeting',
      description: 'First met Ida',
      sentiment: 'positive',
      participants: ['npc-ida-rhys'],
      revealsOnTrustLevel: 0,
      revealsOnIntimacy: 'none',
    }

    const entry = convertAuthoredMemoryToEntry(authored, 1)

    expect(entry.participants).toEqual(['npc-ida-rhys'])
  })
})

describe('getVisibleAuthoredMemories', () => {
  const memories: AuthoredMemory[] = [
    {
      dayOffset: -500,
      eventType: 'house_fall',
      description: 'Traumatic memory',
      sentiment: 'traumatic',
      revealsOnTrustLevel: 70,
      revealsOnIntimacy: 'committed',
    },
    {
      dayOffset: -300,
      eventType: 'loyalty_test',
      description: 'Proved loyalty',
      sentiment: 'positive',
      revealsOnTrustLevel: 30,
      revealsOnIntimacy: 'affinity',
    },
    {
      dayOffset: -100,
      eventType: 'failed_mission',
      description: 'Failed mission',
      sentiment: 'negative',
      revealsOnTrustLevel: 50,
      revealsOnIntimacy: 'none',
    },
  ]

  it('returns only memories visible at given trust level', () => {
    const visible = getVisibleAuthoredMemories(memories, 50, 'none')

    expect(visible).toHaveLength(1)
    expect(visible[0]?.description).toBe('Failed mission')
  })

  it('returns only memories visible at given intimacy stage', () => {
    const visible = getVisibleAuthoredMemories(memories, 100, 'affinity')

    expect(visible).toHaveLength(2) // trust 30 + trust 50, but not committed
    expect(visible.map((m) => m.description)).toContain('Proved loyalty')
    expect(visible.map((m) => m.description)).toContain('Failed mission')
  })

  it('returns all memories at max trust and committed intimacy', () => {
    const visible = getVisibleAuthoredMemories(memories, 100, 'committed')

    expect(visible).toHaveLength(3)
  })

  it('returns empty array when trust is too low', () => {
    const visible = getVisibleAuthoredMemories(memories, 10, 'none')

    expect(visible).toHaveLength(0)
  })

  it('filters by both trust and intimacy correctly', () => {
    // Trust 70+ requires committed intimacy
    const visible = getVisibleAuthoredMemories(memories, 80, 'attachment')

    expect(visible).toHaveLength(2) // Not the committed one
    expect(visible.map((m) => m.description)).not.toContain('Traumatic memory')
  })
})

describe('calculateTraitDriftFromMemories', () => {
  const memories: AuthoredMemory[] = [
    {
      dayOffset: -500,
      eventType: 'house_fall',
      description: 'Traumatic event',
      sentiment: 'traumatic',
      revealsOnTrustLevel: 70,
      revealsOnIntimacy: 'committed',
      influencesTraitDrift: {
        loyalty: 5,
        prudence: 10,
      },
    },
    {
      dayOffset: -300,
      eventType: 'loyalty_test',
      description: 'Proved loyalty',
      sentiment: 'positive',
      revealsOnTrustLevel: 30,
      revealsOnIntimacy: 'affinity',
      influencesTraitDrift: {
        loyalty: 8,
      },
    },
  ]

  it('calculates trait drift from visible memories', () => {
    const drift = calculateTraitDriftFromMemories(memories, 100, 'committed')

    expect(drift.loyalty).toBe(13) // 5 + 8
    expect(drift.prudence).toBe(10)
  })

  it('only includes drift from visible memories', () => {
    const drift = calculateTraitDriftFromMemories(memories, 40, 'affinity')

    expect(drift.loyalty).toBe(8) // Only the loyalty_test memory
    expect(drift.prudence).toBeUndefined() // house_fall not visible
  })

  it('returns empty object when no memories are visible', () => {
    const drift = calculateTraitDriftFromMemories(memories, 10, 'none')

    expect(drift).toEqual({})
  })
})
