import { describe, it, expect } from 'vitest'
import { scheduleAcceptedNpcDateProposals } from './scheduleNpcDateProposals'
import { initialStateWithIda, worldNpcRuntimeEntry } from './testFixtures'
import { NPC_IDS } from '../content/ids/npcIds'
import type { GameState } from '../../domain/game/contracts'
import type { DateProposal } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

const MARION = NPC_IDS.MARION_VALE
const IDA = NPC_IDS.IDA_RHYS

function acceptedProposal(overrides: Partial<DateProposal>): DateProposal {
  return {
    proposalId: 'proposal-1',
    proposerNpcId: MARION,
    targetNpcId: IDA,
    dateTemplateId: 'date-quiet-walk',
    proposedDay: 11,
    proposedTimeSlot: 'evening',
    proposedLocation: null,
    status: 'accepted',
    rejectionReason: null,
    proposedAtDay: 10,
    ...overrides,
  }
}

function worldNpc(npcId: string, overrides?: Partial<NpcRuntimeState>): NpcRuntimeState {
  return worldNpcRuntimeEntry(npcId, overrides)
}

describe('scheduleAcceptedNpcDateProposals', () => {
  it('schedules a Roster<->Roster proposal (existing behavior)', () => {
    const state: GameState = {
      ...initialStateWithIda,
      day: 10,
      pendingDateProposals: [acceptedProposal({})],
    }

    const result = scheduleAcceptedNpcDateProposals(state)

    expect(result.scheduledDates).toHaveLength(1)
    expect(result.scheduledDates[0]!.npcIds).toEqual([MARION, IDA])
    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('skips a Roster<->Roster proposal when a participant is deployed (existing behavior)', () => {
    const state: GameState = {
      ...initialStateWithIda,
      day: 10,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((n) =>
        n.npcId === MARION ? { ...n, assignment: 'deployed' as const } : n,
      ),
      pendingDateProposals: [acceptedProposal({})],
    }

    const result = scheduleAcceptedNpcDateProposals(state)

    expect(result.scheduledDates).toHaveLength(0)
    // Not removed here either — stays pending until processNpcDateProposals' staleness cleanup.
    expect(result.pendingDateProposals).toHaveLength(1)
  })

  it('schedules a player-proposed date (regression test for the participant-lookup bug)', () => {
    const state: GameState = {
      ...initialStateWithIda,
      day: 10,
      pendingDateProposals: [
        acceptedProposal({
          proposalId: 'proposal-player',
          proposerNpcId: 'player',
          targetNpcId: IDA,
        }),
      ],
    }

    const result = scheduleAcceptedNpcDateProposals(state)

    expect(result.scheduledDates).toHaveLength(1)
    expect(result.scheduledDates[0]!.npcIds).toEqual(['player', IDA])
    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('schedules a World<->World proposal (regression test for the participant-lookup bug)', () => {
    const worldA = worldNpc('npc-world-a')
    const worldB = worldNpc('npc-world-b')
    const state: GameState = {
      ...initialStateWithIda,
      day: 10,
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, worldA, worldB],
      pendingDateProposals: [
        acceptedProposal({
          proposalId: 'proposal-world',
          proposerNpcId: worldA.npcId,
          targetNpcId: worldB.npcId,
        }),
      ],
    }

    const result = scheduleAcceptedNpcDateProposals(state)

    expect(result.scheduledDates).toHaveLength(1)
    expect(result.scheduledDates[0]!.npcIds).toEqual([worldA.npcId, worldB.npcId])
    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('schedules a Roster<->World proposal (regression test for the participant-lookup bug)', () => {
    const world = worldNpc('npc-world-c')
    const state: GameState = {
      ...initialStateWithIda,
      day: 10,
      npcRuntimeStates: [...initialStateWithIda.npcRuntimeStates, world],
      pendingDateProposals: [
        acceptedProposal({
          proposalId: 'proposal-cross',
          proposerNpcId: MARION,
          targetNpcId: world.npcId,
        }),
      ],
    }

    const result = scheduleAcceptedNpcDateProposals(state)

    expect(result.scheduledDates).toHaveLength(1)
    expect(result.scheduledDates[0]!.npcIds).toEqual([MARION, world.npcId])
    expect(result.pendingDateProposals).toHaveLength(0)
  })

  it('skips a proposal whose participant no longer exists in roster or world state', () => {
    const state: GameState = {
      ...initialStateWithIda,
      day: 10,
      pendingDateProposals: [
        acceptedProposal({ proposerNpcId: 'npc-long-gone' }),
      ],
    }

    const result = scheduleAcceptedNpcDateProposals(state)

    expect(result.scheduledDates).toHaveLength(0)
    expect(result.pendingDateProposals).toHaveLength(1)
  })
})
