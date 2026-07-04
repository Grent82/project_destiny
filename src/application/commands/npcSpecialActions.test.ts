import { describe, it, expect } from 'vitest'
import { npcResourceGather, npcScavenge, npcSeekEmployment, npcHostGathering } from './npcSpecialActions'
import { initialStateWithIda, idaRhysRosterEntry } from './testFixtures'
import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'

const NPC_ID = idaRhysRosterEntry.npcId

function withNpcOverrides(state: GameState, npcId: string, overrides: Partial<NpcRuntimeState>): GameState {
  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) => (n.npcId === npcId ? { ...n, ...overrides } : n)),
  }
}

const alwaysSucceed = () => 0
const alwaysFail = () => 0.999

describe('npcResourceGather', () => {
  it('increases materialStock', () => {
    const state = { ...initialStateWithIda, cityResources: { ...initialStateWithIda.cityResources, materialStock: 20 } }
    const result = npcResourceGather(state, NPC_ID)
    expect(result.cityResources.materialStock).toBeGreaterThan(20)
  })
})

describe('npcScavenge', () => {
  it('increases materialStock by a smaller amount', () => {
    const state = { ...initialStateWithIda, cityResources: { ...initialStateWithIda.cityResources, materialStock: 20 } }
    const result = npcScavenge(state, NPC_ID)
    expect(result.cityResources.materialStock).toBeGreaterThan(20)
  })
})

describe('npcSeekEmployment', () => {
  it('creates a real employment contract via createEmployment', () => {
    const result = npcSeekEmployment(initialStateWithIda, NPC_ID)
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.currentEmployment).not.toBeNull()
    expect(npc.currentEmployment?.taskType).toBe('work')
  })

  it('does not overwrite an already-active employment contract', () => {
    let state = withNpcOverrides(initialStateWithIda, NPC_ID, {
      currentEmployment: {
        employmentId: 'employment-existing',
        employerId: 'employer-x',
        employerType: 'npc',
        employeeId: NPC_ID,
        taskType: 'scout',
        status: 'in-progress',
        createdAtDay: 1,
        wagePerDay: 5,
        completionBonus: 0,
        performanceThreshold: 50,
        poachProtection: 0,
        autoRenew: false,
        performanceHistory: [],
      },
    })
    state = { ...state }

    const result = npcSeekEmployment(state, NPC_ID)
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.currentEmployment?.employmentId).toBe('employment-existing')
  })
})

function withReceptionRoom(state: GameState): GameState {
  return {
    ...state,
    house: {
      ...state.house,
      rooms: state.house.rooms.map((r, i) => (i === 0 ? { ...r, state: 'intact' as const, roomFunction: 'reception' as const } : r)),
    },
  }
}

describe('npcHostGathering', () => {
  it('no-ops when there is no intact reception/quarters/study room (rooms have no roomFunction set by default)', () => {
    const result = npcHostGathering(initialStateWithIda, NPC_ID, alwaysSucceed)
    expect(result).toBe(initialStateWithIda)
  })

  it('boosts affinity for invited guests on success', () => {
    const state = withReceptionRoom(initialStateWithIda)
    const result = npcHostGathering(state, NPC_ID, alwaysSucceed)
    const marionId = state.npcRuntimeStates[0]!.npcId
    const rel = result.relationships[`${NPC_ID}-to-${marionId}`]
    expect(rel?.affinity ?? 0).toBeGreaterThan(0)
  })

  it('still gives a smaller affinity boost on failure', () => {
    const state = withReceptionRoom(initialStateWithIda)
    const result = npcHostGathering(state, NPC_ID, alwaysFail)
    const marionId = state.npcRuntimeStates[0]!.npcId
    const rel = result.relationships[`${NPC_ID}-to-${marionId}`]
    expect(rel?.affinity ?? 0).toBeGreaterThan(0)
  })

  it('no-ops when there are no other idle NPCs', () => {
    const base = withReceptionRoom(initialStateWithIda)
    const state: GameState = { ...base, npcRuntimeStates: [base.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!] }
    const result = npcHostGathering(state, NPC_ID, alwaysSucceed)
    expect(result).toBe(state)
  })
})
