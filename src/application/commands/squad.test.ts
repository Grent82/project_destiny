import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import {
  addNpcToSelectedSquad,
  removeNpcFromSelectedSquad,
  squadRules,
} from './squad'

describe('squad commands', () => {
  it('adds a roster npc to the selected squad when capacity allows', () => {
    const state = {
      ...initialGameStateSnapshot,
      selectedSquadNpcIds: ['npc-marion-vale'],
    }

    const nextState = addNpcToSelectedSquad(state, 'npc-ida-rhys')

    expect(nextState.selectedSquadNpcIds).toEqual([
      'npc-marion-vale',
      'npc-ida-rhys',
    ])
  })

  it('removes an npc from the selected squad', () => {
    const nextState = removeNpcFromSelectedSquad(
      initialGameStateSnapshot,
      'npc-ida-rhys',
    )

    expect(nextState.selectedSquadNpcIds).toEqual(['npc-marion-vale'])
  })

  it('does not exceed the maximum squad size', () => {
    const state = {
      ...initialGameStateSnapshot,
      selectedSquadNpcIds: [
        'npc-a',
        'npc-b',
        'npc-c',
        'npc-d',
        'npc-e',
        'npc-f',
      ],
      roster: [
        ...initialGameStateSnapshot.roster,
        {
          ...initialGameStateSnapshot.roster[0],
          npcId: 'npc-a',
        },
        {
          ...initialGameStateSnapshot.roster[0],
          npcId: 'npc-b',
        },
        {
          ...initialGameStateSnapshot.roster[0],
          npcId: 'npc-c',
        },
        {
          ...initialGameStateSnapshot.roster[0],
          npcId: 'npc-d',
        },
        {
          ...initialGameStateSnapshot.roster[0],
          npcId: 'npc-e',
        },
        {
          ...initialGameStateSnapshot.roster[0],
          npcId: 'npc-f',
        },
      ],
    }

    const nextState = addNpcToSelectedSquad(state, 'npc-ida-rhys')

    expect(nextState.selectedSquadNpcIds).toHaveLength(squadRules.maxSquadSize)
    expect(nextState.selectedSquadNpcIds).not.toContain('npc-ida-rhys')
  })
})
