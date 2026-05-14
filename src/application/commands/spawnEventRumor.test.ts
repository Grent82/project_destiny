import { describe, expect, it } from 'vitest'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { spawnEventRumor } from './spawnEventRumor'

const baseState = initialGameStateSnapshot

describe('spawnEventRumor — combat-victory', () => {
  it('adds a rumor to state.rumors after a combat victory', () => {
    const state = { ...baseState, currentDistrictId: 'district-cinder-row', rumors: [] }
    const next = spawnEventRumor(state, {
      eventType: 'combat-victory',
      districtId: 'district-cinder-row',
      enemyFactionId: 'faction-tallow-ring',
    })
    expect(next.rumors).toHaveLength(1)
    expect(next.rumors[0]!.districtId).toBe('district-cinder-row')
    expect(next.rumors[0]!.eventSource).toBeDefined()
    expect(next.rumors[0]!.source).toBe('generated')
  })

  it('falls back to generic template when no faction-specific template exists', () => {
    const state = { ...baseState, currentDistrictId: 'district-the-warrens', rumors: [] }
    const next = spawnEventRumor(state, {
      eventType: 'combat-victory',
      districtId: 'district-the-warrens',
      enemyFactionId: 'faction-unknown-xyz',
    })
    expect(next.rumors).toHaveLength(1)
    expect(next.rumors[0]!.templateId).toBe('evt-generic-combat-victory')
  })

  it('uses the provided districtId, not state.currentDistrictId', () => {
    const state = {
      ...baseState,
      currentDistrictId: 'district-harbor',
      rumors: [],
    }
    const next = spawnEventRumor(state, {
      eventType: 'combat-victory',
      districtId: 'district-cinder-row',
      enemyFactionId: null,
    })
    expect(next.rumors[0]!.districtId).toBe('district-cinder-row')
  })

  it('does not mutate the original state', () => {
    const state = { ...baseState, rumors: [] }
    spawnEventRumor(state, {
      eventType: 'combat-victory',
      districtId: 'district-the-pale',
      enemyFactionId: null,
    })
    expect(state.rumors).toHaveLength(0)
  })
})

describe('spawnEventRumor — combat-defeat', () => {
  it('adds a defeat rumor', () => {
    const state = { ...baseState, rumors: [] }
    const next = spawnEventRumor(state, {
      eventType: 'combat-defeat',
      districtId: 'district-the-warrens',
      enemyFactionId: null,
    })
    expect(next.rumors).toHaveLength(1)
    expect(next.rumors[0]!.templateId).toBe('evt-generic-combat-defeat')
  })
})

describe('spawnEventRumor — quest-complete', () => {
  it('adds a quest-resolved rumor with fallback district', () => {
    const state = {
      ...baseState,
      currentDistrictId: 'district-harbor',
      rumors: [],
    }
    const next = spawnEventRumor(state, {
      eventType: 'quest-complete',
      questOutcomeType: 'quest-resolved',
      districtId: null,
    })
    expect(next.rumors).toHaveLength(1)
    expect(next.rumors[0]!.templateId).toBe('evt-quest-resolved')
    expect(next.rumors[0]!.source).toBe('generated')
  })

  it('adds a captive-freed rumor', () => {
    const state = { ...baseState, rumors: [] }
    const next = spawnEventRumor(state, {
      eventType: 'quest-complete',
      questOutcomeType: 'captive-freed',
      districtId: 'district-the-pale',
    })
    expect(next.rumors).toHaveLength(1)
    expect(next.rumors[0]!.templateId).toBe('evt-captive-freed')
    expect(next.rumors[0]!.districtId).toBe('district-the-pale')
  })

  it('adds an evidence-secured rumor', () => {
    const state = { ...baseState, rumors: [] }
    const next = spawnEventRumor(state, {
      eventType: 'quest-complete',
      questOutcomeType: 'evidence-secured',
      districtId: null,
    })
    expect(next.rumors).toHaveLength(1)
    expect(next.rumors[0]!.templateId).toBe('evt-evidence-secured')
  })
})

describe('spawnEventRumor — faction-milestone', () => {
  it('spawns a rumor when standing crosses 50', () => {
    const state = { ...baseState, rumors: [] }
    const next = spawnEventRumor(state, {
      eventType: 'faction-milestone',
      factionId: 'faction-civic-compact',
      milestone: 50,
    })
    expect(next.rumors).toHaveLength(1)
    expect(next.rumors[0]!.templateId).toBe('evt-compact-standing-50')
    expect(next.rumors[0]!.eventSource).toBe('evt-faction-faction-civic-compact-m50')
  })

  it('does not re-spawn if milestone rumor already exists (deduplication)', () => {
    const milestoneKey = 'evt-faction-faction-civic-compact-m50'
    const existingRumor = {
      id: milestoneKey,
      kind: 'ambient' as const,
      source: 'generated' as const,
      districtId: 'district-the-pale',
      originNpcId: null,
      templateId: 'evt-compact-standing-50',
      text: 'placeholder',
      subjectNpcIds: ['npc-enemy-the-dockmaster'],
      truth: 'mixed' as const,
      credibility: 50,
      heat: 20,
      createdDay: 1,
      lastSpreadDay: 1,
      eventSource: milestoneKey,
    }
    const state = { ...baseState, rumors: [existingRumor] }
    const next = spawnEventRumor(state, {
      eventType: 'faction-milestone',
      factionId: 'faction-civic-compact',
      milestone: 50,
    })
    expect(next.rumors).toHaveLength(1)
    expect(next).toBe(state) // same reference — no change
  })

  it('returns state unchanged if no template exists for the milestone', () => {
    const state = { ...baseState, rumors: [] }
    const next = spawnEventRumor(state, {
      eventType: 'faction-milestone',
      factionId: 'faction-unknown',
      milestone: 50,
    })
    expect(next.rumors).toHaveLength(0)
    expect(next).toBe(state)
  })
})
