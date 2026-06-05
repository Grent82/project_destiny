import { describe, expect, it } from 'vitest'

import { applyPolitics, applyVoteEffects } from './applyPolitics'
import { initialGameStateSnapshot } from '../store/initialGameState'
import { gameStateSchema } from '../../domain'
import type { CouncilVoteEvent } from '../../domain/governance/contracts'

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
})
