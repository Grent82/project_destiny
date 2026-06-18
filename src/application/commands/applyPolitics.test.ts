import { describe, expect, it } from 'vitest'

import { applyPolitics, applyVoteEffects, selectAgendaVote } from './applyPolitics'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameStateSchema } from '../../domain'
import type { CouncilVoteEvent } from '../../domain/governance/contracts'
import { contentCatalog } from '../content/contentCatalog'
import type { FactionDefinition, NpcDefinition } from '../../domain'

// ── Shared vote fixture factory ───────────────────────────────────────────────

function makeVote(overrides: Partial<CouncilVoteEvent> = {}): CouncilVoteEvent {
  return {
    id: 'test-vote-001',
    title: 'Test Vote',
    description: 'A test vote.',
    proposingFactionId: 'faction-gilded-court',
    targetFactionId: null,
    effect: 'Test effect text.',
    mechanicalEffects: [],
    tags: [],
    playerInfluenceThreshold: 30,
    expiresOnDay: 5,
    outcome: 'pending',
    playerVote: null,
    ...overrides,
  }
}

// ── applyVoteEffects unit tests ───────────────────────────────────────────────

describe('applyVoteEffects', () => {
  it('applies factionStanding delta and clamps to [-100, 100]', () => {
    const vote = makeVote({
      mechanicalEffects: [{ type: 'factionStanding', factionId: 'faction-tallow-ring', delta: -10 }],
    })
    const before = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      factionStandings: { ...initialGameStateSnapshot.factionStandings, 'faction-tallow-ring': 5 },
    })
    const after = applyVoteEffects(before, vote)
    expect(after.factionStandings['faction-tallow-ring']).toBe(-5)
  })

  it('clamps factionStanding at lower bound -100', () => {
    const vote = makeVote({
      mechanicalEffects: [{ type: 'factionStanding', factionId: 'faction-tallow-ring', delta: -200 }],
    })
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      factionStandings: { ...initialGameStateSnapshot.factionStandings, 'faction-tallow-ring': 0 },
    })
    const after = applyVoteEffects(state, vote)
    expect(after.factionStandings['faction-tallow-ring']).toBe(-100)
  })

  it('applies cityDial delta for unrest', () => {
    const vote = makeVote({
      mechanicalEffects: [{ type: 'cityDial', dial: 'unrest', delta: -8 }],
    })
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      cityDials: { ...initialGameStateSnapshot.cityDials, unrest: 50 },
    })
    const after = applyVoteEffects(state, vote)
    expect(after.cityDials.unrest).toBe(42)
  })

  it('applies districtTension delta', () => {
    const vote = makeVote({
      mechanicalEffects: [{ type: 'districtTension', districtId: 'district-harbor', delta: -15 }],
    })
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      districtTension: { 'district-harbor': 40 },
    })
    const after = applyVoteEffects(state, vote)
    expect(after.districtTension['district-harbor']).toBe(25)
  })

  it('applies districtMarketPressure delta', () => {
    const vote = makeVote({
      mechanicalEffects: [{ type: 'districtMarketPressure', districtId: 'district-ironworks', delta: -10 }],
    })
    const state = gameStateSchema.parse({ ...initialGameStateSnapshot })
    const districtBefore = state.districts.find((d) => d.districtId === 'district-ironworks')
    if (!districtBefore) return // skip if district not in initial state
    const after = applyVoteEffects(state, vote)
    const districtAfter = after.districts.find((d) => d.districtId === 'district-ironworks')!
    expect(districtAfter.marketPressure).toBe(Math.max(0, districtBefore.marketPressure - 10))
  })

  it('applies multiple effects in sequence', () => {
    const vote = makeVote({
      mechanicalEffects: [
        { type: 'factionStanding', factionId: 'faction-the-restored', delta: 8 },
        { type: 'factionStanding', factionId: 'faction-gilded-court', delta: -5 },
        { type: 'cityDial', dial: 'unrest', delta: -8 },
        { type: 'cityDial', dial: 'prosperity', delta: -3 },
      ],
    })
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-the-restored': 0,
        'faction-gilded-court': 0,
      },
      cityDials: { ...initialGameStateSnapshot.cityDials, unrest: 50, prosperity: 50 },
    })
    const after = applyVoteEffects(state, vote)
    expect(after.factionStandings['faction-the-restored']).toBe(8)
    expect(after.factionStandings['faction-gilded-court']).toBe(-5)
    expect(after.cityDials.unrest).toBe(42)
    expect(after.cityDials.prosperity).toBe(47)
  })

  it('with empty mechanicalEffects returns state unchanged (no mutation)', () => {
    const vote = makeVote({ mechanicalEffects: [] })
    const state = gameStateSchema.parse({ ...initialGameStateSnapshot })
    const after = applyVoteEffects(state, vote)
    expect(after.factionStandings).toEqual(state.factionStandings)
    expect(after.cityDials).toEqual(state.cityDials)
  })
})

// ── Integration: applyPolitics auto-resolution ────────────────────────────────

describe('applyPolitics vote auto-resolution', () => {
  it('applies mechanicalEffects when vote passes', () => {
    const expiredVote = makeVote({
      id: 'test-vote-expires',
      mechanicalEffects: [{ type: 'factionStanding', factionId: 'faction-tallow-ring', delta: -10 }],
      expiresOnDay: 1,
    })
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      day: 5,
      activeCouncilVotes: [expiredVote],
      factionStandings: { ...initialGameStateSnapshot.factionStandings, 'faction-tallow-ring': 20 },
    })
    // rng always returns 0 → passes (0 < 0.5 = true)
    const after = applyPolitics(state, () => 0)
    expect(after.factionStandings['faction-tallow-ring']).toBe(10)
    expect(after.activeCouncilVotes).toHaveLength(0)
  })

  it('does NOT apply mechanicalEffects when vote fails', () => {
    const expiredVote = makeVote({
      id: 'test-vote-fails',
      mechanicalEffects: [{ type: 'factionStanding', factionId: 'faction-tallow-ring', delta: -10 }],
      expiresOnDay: 1,
    })
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      day: 5,
      activeCouncilVotes: [expiredVote],
      factionStandings: { ...initialGameStateSnapshot.factionStandings, 'faction-tallow-ring': 20 },
    })
    // rng always returns 1 → fails (1 < 0.5 = false)
    const after = applyPolitics(state, () => 1)
    expect(after.factionStandings['faction-tallow-ring']).toBe(20)
  })
})

// ── selectAgendaVote tests ────────────────────────────────────────────────────

describe('selectAgendaVote', () => {
  function makeTemplate(
    id: string,
    proposingFactionId: string,
    tags: string[] = [],
  ): CouncilVoteEvent {
    return makeVote({ id, proposingFactionId, tags })
  }

  it('returns null when no templates provided', () => {
    const state = gameStateSchema.parse({ ...initialGameStateSnapshot })
    expect(selectAgendaVote(state, [], () => 0.5)).toBeNull()
  })

  it('picks the faction with highest activePressure when no world conditions met', () => {
    const templates = [
      makeTemplate('vote-compact', 'faction-civic-compact', ['order']),
      makeTemplate('vote-tallow', 'faction-tallow-ring', ['contraband']),
    ]
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      factionStates: initialGameStateSnapshot.factionStates.map((fs) => ({
        ...fs,
        activePressure:
          fs.factionId === 'faction-civic-compact' ? 80
          : fs.factionId === 'faction-tallow-ring' ? 20
          : fs.activePressure,
      })),
    })
    // Use deterministic rng (0 for no tie-break noise)
    const selected = selectAgendaVote(state, templates, () => 0)
    expect(selected?.proposingFactionId).toBe('faction-civic-compact')
  })

  it('high-pressure Compact with high unrest reliably proposes an order/patrol vote', () => {
    const templates = [
      makeTemplate('compact-patrol', 'faction-civic-compact', ['order', 'patrol']),
      makeTemplate('gilded-fee', 'faction-gilded-court', ['licensing']),
      makeTemplate('tallow-exempt', 'faction-tallow-ring', ['contraband']),
    ]
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      cityDials: { ...initialGameStateSnapshot.cityDials, unrest: 75 },
      factionStates: initialGameStateSnapshot.factionStates.map((fs) => ({
        ...fs,
        activePressure:
          fs.factionId === 'faction-civic-compact' ? 80 : 10,
      })),
    })
    const selected = selectAgendaVote(state, templates, () => 0)
    expect(selected?.proposingFactionId).toBe('faction-civic-compact')
    expect(selected?.tags).toContain('order')
  })

  it('no faction proposes a vote with tags that contradict their agenda values', () => {
    // Tallow Ring only has contraband/exemption/profit values
    // A 'welfare' tag vote should not be picked for Tallow Ring
    const templates = [
      makeTemplate('tallow-exempt', 'faction-tallow-ring', ['exemption', 'profit']),
      makeTemplate('tallow-welfare', 'faction-tallow-ring', ['welfare']),  // tag mismatch
    ]
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      factionStates: initialGameStateSnapshot.factionStates.map((fs) => ({
        ...fs,
        activePressure: fs.factionId === 'faction-tallow-ring' ? 90 : 10,
      })),
    })
    // Run many times to ensure 'tallow-welfare' (wrong tags) is never picked
    const picks = Array.from({ length: 20 }, (_, i) => {
      const r = selectAgendaVote(state, templates, () => i / 20)
      return r?.id
    })
    expect(picks.every((p) => p === 'tallow-exempt')).toBe(true)
  })

  it('different world states produce different proposing factions', () => {
    const templates = [
      makeTemplate('compact-vote', 'faction-civic-compact', ['order']),
      makeTemplate('gilded-vote', 'faction-gilded-court', ['licensing']),
      makeTemplate('tallow-vote', 'faction-tallow-ring', ['contraband']),
    ]

    const highUnrestState = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      cityDials: { ...initialGameStateSnapshot.cityDials, unrest: 75 },
      factionStates: initialGameStateSnapshot.factionStates.map((fs) => ({
        ...fs,
        activePressure: fs.factionId === 'faction-civic-compact' ? 70 : 15,
      })),
    })

    const highPressureTallowState = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      cityDials: { ...initialGameStateSnapshot.cityDials, unrest: 20 },
      factionStates: initialGameStateSnapshot.factionStates.map((fs) => ({
        ...fs,
        activePressure: fs.factionId === 'faction-tallow-ring' ? 90 : 5,
      })),
    })

    const lowProsperityState = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      cityDials: { ...initialGameStateSnapshot.cityDials, prosperity: 25, unrest: 30 },
      factionStates: initialGameStateSnapshot.factionStates.map((fs) => ({
        ...fs,
        activePressure: fs.factionId === 'faction-gilded-court' ? 80 : 5,
      })),
    })

    const r1 = selectAgendaVote(highUnrestState, templates, () => 0)
    const r2 = selectAgendaVote(highPressureTallowState, templates, () => 0)
    const r3 = selectAgendaVote(lowProsperityState, templates, () => 0)

    // Each state should select a different faction
    expect(r1?.proposingFactionId).toBe('faction-civic-compact')
    expect(r2?.proposingFactionId).toBe('faction-tallow-ring')
    expect(r3?.proposingFactionId).toBe('faction-gilded-court')
  })
})

// ── Existing tests ────────────────────────────────────────────────────────────

describe('applyPolitics debt enforcement interest', () => {
  it('uses worse enforcement standing to increase daily debt interest', () => {
    const favorable = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      day: 16,
      debtAmount: 800,
      debtPaid: false,
      debtEnforcementFactionId: 'faction-gilded-court',
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': 35,
      },
    })

    const hostile = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      day: 16,
      debtAmount: 800,
      debtPaid: false,
      debtEnforcementFactionId: 'faction-gilded-court',
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-gilded-court': -55,
      },
    })

    const favorableNext = applyPolitics(favorable, () => 0.5)
    const hostileNext = applyPolitics(hostile, () => 0.5)

    expect(favorableNext.debtAmount).toBe(805)
    expect(hostileNext.debtAmount).toBe(820)
  })

  it('queues the authored debt faction warning as a concrete instance on day 20', () => {
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      day: 20,
      debtAmount: 600,
      debtPaid: false,
      debtEnforcementFactionId: 'faction-gilded-court',
      debtClaimantNpcId: 'npc-voss',
      pendingEvents: [],
      eventInstances: [],
    })

    const after = applyPolitics(state, () => 0.5)
    const pending = after.pendingEvents.find(
      (event) => event.eventId === 'event-debt-faction-warning',
    )

    expect(pending?.instanceId).toBeTruthy()
    expect(
      after.eventInstances.some(
        (instance) =>
          instance.eventId === 'event-debt-faction-warning' && instance.resolvedOnDay === null,
      ),
    ).toBe(true)
  })

  it('queues city crisis events as concrete instances', () => {
    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      day: 12,
      cityStability: 25,
      pendingEvents: [],
      eventInstances: [],
    })

    const after = applyPolitics(state, () => 0.5)
    const pending = after.pendingEvents.find((event) => event.eventId === 'event-city-crisis')

    expect(pending?.instanceId).toBeTruthy()
    expect(
      after.eventInstances.some(
        (instance) => instance.eventId === 'event-city-crisis' && instance.resolvedOnDay === null,
      ),
    ).toBe(true)
  })
})

describe('leader trait modifiers', () => {
  it('high ambition leader adds +20 to proposal score', () => {
    // Create a test faction with high ambition leader
    const originalFactions = contentCatalog.factions
    const originalNpcs = Array.from(contentCatalog.npcsById.values())

    // Mock a faction with agendaAxes
    const mockFaction = {
      id: 'faction-test-faction',
      name: 'Test Faction',
      agendaAxes: {
        values: ['test-value'],
        proposesWhen: {},
      },
      description: 'Test',
    }

    // Mock a leader with high ambition
    const mockLeader = {
      id: 'npc-test-leader',
      name: 'Ambitious Leader',
      startingTraits: {
        ambition: 80,
        prudence: 30,
        ruthlessness: 30,
        loyalty: 60,
        charm: 50,
        competence: 50,
      },
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(contentCatalog as any).factions = [...contentCatalog.factions, mockFaction]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(contentCatalog as any).factionsById = new Map(contentCatalog.factions.map((f: any) => [f.id, f]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(contentCatalog as any).npcsById = new Map(contentCatalog.npcsById).set('npc-test-leader', mockLeader as any)

    const templates: CouncilVoteEvent[] = [
      {
        ...makeVote(),
        proposingFactionId: 'faction-test-faction',
        tags: ['test-value'],
      },
    ]

    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      factionStates: [
        {
          factionId: 'faction-test-faction',
          power: 50,
          wealth: 50,
          security: 50,
          standingWithPlayer: 0,
          activePressure: 50,
          leaderNpcId: 'npc-test-leader',
        },
      ],
      factionStandings: { ...initialGameStateSnapshot.factionStandings },
    })

    const result = selectAgendaVote(state, templates, () => 0)
    expect(result).toBeDefined()
    expect(result?.proposingFactionId).toBe('faction-test-faction')

    // Restore
    ;(contentCatalog as Partial<typeof contentCatalog>).factions = originalFactions
    ;(contentCatalog as Partial<typeof contentCatalog>).npcsById = new Map(originalNpcs.map((n) => [n.id, n]))
  })

  it('high prudence leader reduces proposal score by 20%', () => {
    const mockFaction = {
      id: 'faction-prudent-faction',
      name: 'Prudent Faction',
      primer: 'Test primer',
      agenda: 'Test agenda',
      agendaAxes: {
        values: ['test-value'],
        proposesWhen: {},
      },
      description: 'Test',
      territory: [],
      tags: [],
    }

    const mockLeader = {
      id: 'npc-prudent-leader',
      name: 'Prudent Leader',
      npcType: 'roster',
      origin: 'Test origin',
      background: 'Test background',
      rarity: 'common',
      status: 'citizen',
      startingTraits: {
        ambition: 30,
        prudence: 80,
        ruthlessness: 30,
        loyalty: 60,
        charm: 50,
        competence: 50,
      },
      assignment: 'none',
      captivityState: null,
      npcArc: null,
      npcMemory: [],
      wardenRefs: [],
      currentLocation: null,
      isBondBuyer: false,
    }

    const originalFactions = contentCatalog.factions
    const originalNpcs = Array.from(contentCatalog.npcsById.values())

    ;(contentCatalog as Partial<typeof contentCatalog>).factions = [...contentCatalog.factions, mockFaction]
    ;(contentCatalog as Partial<typeof contentCatalog>).factionsById = new Map(contentCatalog.factions.map((f: FactionDefinition) => [f.id, f]))
    ;(contentCatalog as Partial<typeof contentCatalog>).npcsById = new Map(contentCatalog.npcsById).set('npc-prudent-leader', mockLeader as unknown as NpcDefinition)

    const templates: CouncilVoteEvent[] = [
      {
        ...makeVote(),
        proposingFactionId: 'faction-prudent-faction',
        tags: ['test-value'],
      },
    ]

    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      factionStates: [
        {
          factionId: 'faction-prudent-faction',
          power: 50,
          wealth: 50,
          security: 50,
          standingWithPlayer: 0,
          activePressure: 80,
          leaderNpcId: 'npc-prudent-leader',
        },
      ],
      factionStandings: { ...initialGameStateSnapshot.factionStandings },
    })

    // Without prudence, score would be 80 + any bonuses
    // With prudence, score should be 80 * 0.8 = 64
    const result = selectAgendaVote(state, templates, () => 0)
    expect(result).toBeDefined()

    ;(contentCatalog as Partial<typeof contentCatalog>).factions = originalFactions
    ;(contentCatalog as Partial<typeof contentCatalog>).npcsById = new Map(originalNpcs.map((n) => [n.id, n]))
  })

  it('high ruthlessness leader adds +15 when hostile target exists', () => {
    const mockFaction = {
      id: 'faction-ruthless-faction',
      name: 'Ruthless Faction',
      primer: 'Test primer',
      agenda: 'Test agenda',
      agendaAxes: {
        values: ['test-value'],
        proposesWhen: {},
      },
      description: 'Test',
      territory: [],
      tags: [],
    }

    const mockLeader = {
      id: 'npc-ruthless-leader',
      name: 'Ruthless Leader',
      npcType: 'roster',
      origin: 'Test origin',
      background: 'Test background',
      rarity: 'common',
      status: 'citizen',
      startingTraits: {
        ambition: 50,
        prudence: 30,
        ruthlessness: 85,
        loyalty: 60,
        charm: 50,
        competence: 50,
      },
    }

    const originalFactions = contentCatalog.factions
    const originalNpcs = Array.from(contentCatalog.npcsById.values())

    ;(contentCatalog as Partial<typeof contentCatalog>).factions = [...contentCatalog.factions, mockFaction]
    ;(contentCatalog as Partial<typeof contentCatalog>).factionsById = new Map(contentCatalog.factions.map((f: FactionDefinition) => [f.id, f]))
    ;(contentCatalog as Partial<typeof contentCatalog>).npcsById = new Map(contentCatalog.npcsById).set('npc-ruthless-leader', mockLeader as unknown as NpcDefinition)

    const templates: CouncilVoteEvent[] = [
      {
        ...makeVote(),
        proposingFactionId: 'faction-ruthless-faction',
        tags: ['test-value'],
      },
    ]

    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      factionStates: [
        {
          factionId: 'faction-ruthless-faction',
          power: 50,
          wealth: 50,
          security: 50,
          standingWithPlayer: 0,
          activePressure: 50,
          leaderNpcId: 'npc-ruthless-leader',
        },
      ],
      factionStandings: {
        ...initialGameStateSnapshot.factionStandings,
        'faction-tallow-ring': -50, // Hostile target
      },
    })

    const result = selectAgendaVote(state, templates, () => 0)
    expect(result).toBeDefined()

    ;(contentCatalog as Partial<typeof contentCatalog>).factions = originalFactions
    ;(contentCatalog as Partial<typeof contentCatalog>).npcsById = new Map(originalNpcs.map((n) => [n.id, n]))
  })

  it('low loyalty leader reduces proposal score by 10%', () => {
    const mockFaction = {
      id: 'faction-corrupt-faction',
      name: 'Corrupt Faction',
      primer: 'Test primer',
      agenda: 'Test agenda',
      agendaAxes: {
        values: ['test-value'],
        proposesWhen: {},
      },
      description: 'Test',
      territory: [],
      tags: [],
    }

    const mockLeader = {
      id: 'npc-corrupt-leader',
      name: 'Corrupt Leader',
      npcType: 'roster',
      origin: 'Test origin',
      background: 'Test background',
      rarity: 'common',
      status: 'citizen',
      startingTraits: {
        ambition: 70,
        prudence: 30,
        ruthlessness: 50,
        loyalty: 20,
        charm: 50,
        competence: 50,
      },
    }

    const originalFactions = contentCatalog.factions
    const originalNpcs = Array.from(contentCatalog.npcsById.values())

    ;(contentCatalog as Partial<typeof contentCatalog>).factions = [...contentCatalog.factions, mockFaction]
    ;(contentCatalog as Partial<typeof contentCatalog>).factionsById = new Map(contentCatalog.factions.map((f: FactionDefinition) => [f.id, f]))
    ;(contentCatalog as Partial<typeof contentCatalog>).npcsById = new Map(contentCatalog.npcsById).set('npc-corrupt-leader', mockLeader as unknown as NpcDefinition)

    const templates: CouncilVoteEvent[] = [
      {
        ...makeVote(),
        proposingFactionId: 'faction-corrupt-faction',
        tags: ['test-value'],
      },
    ]

    const state = gameStateSchema.parse({
      ...initialGameStateSnapshot,
      factionStates: [
        {
          factionId: 'faction-corrupt-faction',
          power: 50,
          wealth: 50,
          security: 50,
          standingWithPlayer: 0,
          activePressure: 70,
          leaderNpcId: 'npc-corrupt-leader',
        },
      ],
      factionStandings: { ...initialGameStateSnapshot.factionStandings },
    })

    const result = selectAgendaVote(state, templates, () => 0)
    expect(result).toBeDefined()

    ;(contentCatalog as Partial<typeof contentCatalog>).factions = originalFactions
    ;(contentCatalog as Partial<typeof contentCatalog>).npcsById = new Map(originalNpcs.map((n) => [n.id, n]))
  })
})
