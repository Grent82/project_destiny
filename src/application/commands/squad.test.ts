import { describe, expect, it } from 'vitest'

import { initialGameStateSnapshot } from '../store/initialGameState'
import { initialStateWithIda } from './testFixtures'
import {
  addNpcToSelectedSquad,
  removeNpcFromSelectedSquad,
  squadRules,
} from './squad'

describe('squad commands', () => {
  it('adds a roster npc to the selected squad when capacity allows', () => {
    const state = {
      ...initialStateWithIda,
      selectedSquadNpcIds: ['npc-marion-vale'],
    }

    const nextState = addNpcToSelectedSquad(state, 'npc-ida-rhys')

    expect(nextState.selectedSquadNpcIds).toEqual([
      'npc-marion-vale',
      'npc-ida-rhys',
    ])
  })

  it('removes an npc from the selected squad', () => {
    const state = {
      ...initialStateWithIda,
      selectedSquadNpcIds: ['npc-marion-vale', 'npc-ida-rhys'],
    }
    const nextState = removeNpcFromSelectedSquad(state, 'npc-ida-rhys')

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
      npcRuntimeStates: [
        ...initialGameStateSnapshot.npcRuntimeStates,
        {
          ...initialGameStateSnapshot.npcRuntimeStates[0],
          npcId: 'npc-a',
        },
        {
          ...initialGameStateSnapshot.npcRuntimeStates[0],
          npcId: 'npc-b',
        },
        {
          ...initialGameStateSnapshot.npcRuntimeStates[0],
          npcId: 'npc-c',
        },
        {
          ...initialGameStateSnapshot.npcRuntimeStates[0],
          npcId: 'npc-d',
        },
        {
          ...initialGameStateSnapshot.npcRuntimeStates[0],
          npcId: 'npc-e',
        },
        {
          ...initialGameStateSnapshot.npcRuntimeStates[0],
          npcId: 'npc-f',
        },
      ],
    }

    const nextState = addNpcToSelectedSquad(state, 'npc-ida-rhys')

    expect(nextState.selectedSquadNpcIds).toHaveLength(squadRules.maxSquadSize)
    expect(nextState.selectedSquadNpcIds).not.toContain('npc-ida-rhys')
  })

  it('does not add a duplicate npc to the selected squad', () => {
    const nextState = addNpcToSelectedSquad(initialGameStateSnapshot, 'npc-marion-vale')

    expect(nextState.selectedSquadNpcIds).toHaveLength(initialGameStateSnapshot.selectedSquadNpcIds.length)
    expect(nextState.selectedSquadNpcIds.filter((id) => id === 'npc-marion-vale')).toHaveLength(1)
  })

  it('does not add a working npc to the selected squad', () => {
    const state = {
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-ida-rhys' ? { ...npc, assignment: 'working' as const } : npc,
      ),
    }
    const nextState = addNpcToSelectedSquad(state, 'npc-ida-rhys')

    expect(nextState.selectedSquadNpcIds).not.toContain('npc-ida-rhys')
  })

  it('does not add a training npc to the selected squad', () => {
    const state = {
      ...initialStateWithIda,
      npcRuntimeStates: initialStateWithIda.npcRuntimeStates.map((npc) =>
        npc.npcId === 'npc-ida-rhys' ? { ...npc, assignment: 'training' as const } : npc,
      ),
    }
    const nextState = addNpcToSelectedSquad(state, 'npc-ida-rhys')

    expect(nextState.selectedSquadNpcIds).not.toContain('npc-ida-rhys')
  })

  it('is a no-op when removing an npc not in the squad', () => {
    const nextState = removeNpcFromSelectedSquad(initialGameStateSnapshot, 'npc-not-in-squad')

    expect(nextState.selectedSquadNpcIds).toEqual(initialGameStateSnapshot.selectedSquadNpcIds)
  })
})
