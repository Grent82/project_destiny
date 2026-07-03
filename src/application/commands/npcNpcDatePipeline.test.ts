import { describe, it, expect } from 'vitest'
import { endDay } from './endDay'
import { generateNpcDateProposals } from './generateNpcDateProposals'
import { initialStateWithIda } from './testFixtures'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { NPC_IDS } from '../content/ids/npcIds'
import type { GameState } from '../../domain/game/contracts'

const MARION = NPC_IDS.MARION_VALE
const IDA = NPC_IDS.IDA_RHYS

const alwaysProposeRng = () => 0 // guarantees the 1.5% proposal roll succeeds

function baseState(rngSeed: number, day: number): GameState {
  const rel = { affinity: 90, trust: 90, respect: 0, fear: 0, loyalty: 90, intimacyStage: 'attachment' as const }
  // High player loyalty for both NPCs so the unrelated NPC-departure roll in
  // handleConsequencesPhase (gated on relLoyalty < 25) can never fire and interfere
  // with this test — Ida would otherwise be removable by an unrelated seed-dependent roll.
  const playerRel = { affinity: 60, trust: 60, respect: 60, fear: 0, loyalty: 60 }
  return {
    ...initialStateWithIda,
    day,
    timeSlot: 'evening',
    rngSeed,
    lastFiredDay: {},
    pendingDateProposals: [],
    scheduledDates: [],
    relationships: {
      ...initialStateWithIda.relationships,
      [buildRelationshipKey(MARION, IDA)]: rel,
      [buildRelationshipKey(IDA, MARION)]: rel,
      [buildRelationshipKey('player', MARION)]: playerRel,
      [buildRelationshipKey('player', IDA)]: playerRel,
    },
  }
}

/**
 * Builds the state this test starts from: day D, with an already-generated, accepted
 * proposal for tomorrow (D+2) sitting in pendingDateProposals — as if generateNpcDateProposals
 * had just run inside a Pairing phase on day D+1 (i.e. one endDay() call from now).
 *
 * generateNpcDateProposals picks a date template using a seed derived purely from
 * state.rngSeed (not from the injected Rng callback), and resolution later in this test
 * only fires for dates whose time slot is 'morning' (endDay always resets timeSlot to
 * 'morning' at the start of a day, before Social Sim resolves same-day dates). Search for
 * an rngSeed where the real generateNpcDateProposals happens to land on the 'morning'-slot
 * template (date-quiet-morning) so the rest of the pipeline is deterministic.
 */
function buildStartingState(day: number): GameState {
  for (let seed = 1; seed < 2000; seed++) {
    const generated = generateNpcDateProposals(baseState(seed, day + 1), alwaysProposeRng)
    const proposal = generated.pendingDateProposals[0]
    if (proposal && proposal.proposedTimeSlot === 'morning') {
      return {
        ...baseState(seed, day),
        pendingDateProposals: generated.pendingDateProposals,
        lastFiredDay: generated.lastFiredDay,
      }
    }
  }
  throw new Error('Could not find an rngSeed producing a morning-slot date proposal in range')
}

describe('NPC-NPC date pipeline: generate -> schedule -> resolve', () => {
  it('drives an accepted proposal all the way to a completed, relationship-affecting date', () => {
    const day = 10
    const generatedState = buildStartingState(day)

    // 1. Generation: the fixed dead-code bug — proposals must be 'accepted', not 'pending'.
    expect(generatedState.pendingDateProposals).toHaveLength(1)
    const proposal = generatedState.pendingDateProposals[0]!
    expect(proposal.status).toBe('accepted')
    expect(proposal.proposerNpcId).toBe(MARION)
    expect(proposal.targetNpcId).toBe(IDA)

    // 2. Scheduling: the next endDay() call advances the day; its Pairing phase should
    // pick up the accepted proposal (the fixed scheduler participant lookup).
    const afterSchedulingDay = endDay(generatedState)
    const scheduled = afterSchedulingDay.scheduledDates.find(
      (d) => d.npcIds.includes(MARION) && d.npcIds.includes(IDA),
    )
    expect(scheduled).toBeDefined()
    expect(scheduled!.status).toBe('scheduled')
    expect(
      afterSchedulingDay.pendingDateProposals.some((p) => p.proposalId === proposal.proposalId),
    ).toBe(false)

    // 3. Resolution: the following endDay() call's Social Simulation phase resolves the
    // scheduled date (timeSlot resets to 'morning' at day-advance, matching the date's slot).
    const afterResolutionDay = endDay(afterSchedulingDay)
    const resolved = afterResolutionDay.scheduledDates.find((d) => d.dateId === scheduled!.dateId)
    expect(resolved).toBeDefined()
    expect(resolved!.status).toBe('completed')
    expect(resolved!.outcomeId).not.toBeNull()

    // The date outcome must have actually touched the relationship, proving the full
    // generate -> schedule -> resolve chain ran for real (not silently dropped).
    const relAfter = afterResolutionDay.relationships[buildRelationshipKey(MARION, IDA)]!
    const relBefore = generatedState.relationships[buildRelationshipKey(MARION, IDA)]!
    expect(relAfter.affinity).not.toBe(relBefore.affinity)
  })
})
