import { describe, it, expect } from 'vitest'
import {
  npcLeadGroup,
  npcFormSquad,
  npcSupportGroup,
  npcRecruitMember,
  npcCanFormGroup,
  npcCanSupportGroup,
  npcCanRecruitMember,
} from './npcGroups'
import { initialStateWithIda, idaRhysRosterEntry } from './testFixtures'
import type { GameState } from '../../domain/game/contracts'
import type { NpcGroup, NpcRuntimeState } from '../../domain/npc/contracts'

const DISTRICT = 'district-harbor'
const MARION_ID = initialStateWithIda.npcRuntimeStates[0]!.npcId
const IDA_ID = idaRhysRosterEntry.npcId

function idleInDistrict(npc: NpcRuntimeState, districtId: string | null = DISTRICT): NpcRuntimeState {
  return { ...npc, assignment: 'idle', assignedDistrictId: districtId }
}

function makeRosterNpc(npcId: string, name: string): NpcRuntimeState {
  return idleInDistrict({ ...idaRhysRosterEntry, npcId, name })
}

/** Isolated 2+N-person state (Marion + Ida + extras), all idle and co-located, no pre-existing groups. */
function baseState(extraNpcs: NpcRuntimeState[] = []): GameState {
  const marion = idleInDistrict(initialStateWithIda.npcRuntimeStates[0]!)
  const ida = idleInDistrict(initialStateWithIda.npcRuntimeStates[1]!)
  return {
    ...initialStateWithIda,
    npcRuntimeStates: [marion, ida, ...extraNpcs],
    npcGroups: [],
  }
}

function withGroup(state: GameState, group: NpcGroup): GameState {
  return { ...state, npcGroups: [...state.npcGroups, group] }
}

const testGroup = (overrides: Partial<NpcGroup> = {}): NpcGroup => ({
  groupId: 'group-test-1',
  leaderId: MARION_ID,
  memberIds: [],
  purpose: 'circle',
  districtId: DISTRICT,
  formedOnDay: 1,
  ...overrides,
})

describe('npcLeadGroup / npcCanFormGroup', () => {
  it('forms a group from co-located idle roster candidates', () => {
    const state = baseState()
    expect(npcCanFormGroup(state, state.npcRuntimeStates[0]!)).toBe(true)

    const result = npcLeadGroup(state, MARION_ID)
    expect(result.npcGroups).toHaveLength(1)
    const group = result.npcGroups[0]!
    expect(group.leaderId).toBe(MARION_ID)
    expect(group.memberIds).toContain(IDA_ID)
    expect(group.purpose).toBe('circle')
    expect(group.districtId).toBe(DISTRICT)
  })

  it('caps membership at 3 additional members', () => {
    const extras = [
      makeRosterNpc('npc-extra-1', 'Extra One'),
      makeRosterNpc('npc-extra-2', 'Extra Two'),
      makeRosterNpc('npc-extra-3', 'Extra Three'),
      makeRosterNpc('npc-extra-4', 'Extra Four'),
    ]
    const state = baseState(extras)

    const result = npcLeadGroup(state, MARION_ID)
    expect(result.npcGroups[0]!.memberIds).toHaveLength(3)
  })

  it('boosts affinity with new members symmetrically', () => {
    const state = baseState()
    const result = npcLeadGroup(state, MARION_ID)
    expect(result.relationships[`${MARION_ID}-to-${IDA_ID}`]?.affinity ?? 0).toBeGreaterThan(0)
    expect(result.relationships[`${IDA_ID}-to-${MARION_ID}`]?.affinity ?? 0).toBeGreaterThan(0)
  })

  it('logs a group-formation message', () => {
    const state = baseState()
    const result = npcLeadGroup(state, MARION_ID)
    expect(result.activityLog.some((e) => e.message.includes('gathers a following'))).toBe(true)
  })

  it('no-ops when there are no co-located idle candidates', () => {
    const state = { ...baseState(), npcRuntimeStates: [idleInDistrict(initialStateWithIda.npcRuntimeStates[0]!)] }
    expect(npcCanFormGroup(state, state.npcRuntimeStates[0]!)).toBe(false)
    const result = npcLeadGroup(state, MARION_ID)
    expect(result).toBe(state)
  })

  it('no-ops when the NPC already leads or belongs to a group', () => {
    const state = withGroup(baseState(), testGroup({ leaderId: MARION_ID, memberIds: [] }))
    expect(npcCanFormGroup(state, state.npcRuntimeStates[0]!)).toBe(false)
    const result = npcLeadGroup(state, MARION_ID)
    expect(result).toBe(state)
  })

  it('no-ops for an unknown npcId', () => {
    const state = baseState()
    const result = npcLeadGroup(state, 'npc-does-not-exist')
    expect(result).toBe(state)
  })
})

describe('npcFormSquad', () => {
  it('forms a squad-purpose group using the same candidate mechanics as lead-group', () => {
    const state = baseState()
    const result = npcFormSquad(state, MARION_ID)
    expect(result.npcGroups).toHaveLength(1)
    expect(result.npcGroups[0]!.purpose).toBe('squad')
    expect(result.npcGroups[0]!.memberIds).toContain(IDA_ID)
    expect(result.activityLog.some((e) => e.message.includes('forms a squad'))).toBe(true)
  })
})

describe('npcSupportGroup / npcCanSupportGroup', () => {
  it('joins a co-located group led by someone else', () => {
    const state = withGroup(baseState(), testGroup())

    expect(npcCanSupportGroup(state, state.npcRuntimeStates[1]!)).toBe(true)

    const result = npcSupportGroup(state, IDA_ID)
    const group = result.npcGroups.find((g) => g.groupId === 'group-test-1')!
    expect(group.memberIds).toContain(IDA_ID)
  })

  it('boosts affinity with the group leader', () => {
    const state = withGroup(baseState(), testGroup())
    const result = npcSupportGroup(state, IDA_ID)
    expect(result.relationships[`${IDA_ID}-to-${MARION_ID}`]?.affinity ?? 0).toBeGreaterThan(0)
  })

  it('logs a support message naming the leader', () => {
    const state = withGroup(baseState(), testGroup())
    const result = npcSupportGroup(state, IDA_ID)
    expect(result.activityLog.some((e) => e.message.includes('lends support'))).toBe(true)
  })

  it('no-ops when the group is already at the member cap', () => {
    const extras = [makeRosterNpc('npc-extra-1', 'Extra One'), makeRosterNpc('npc-extra-2', 'Extra Two')]
    const state = withGroup(
      baseState(extras),
      testGroup({ memberIds: [IDA_ID, 'npc-extra-1', 'npc-extra-2'] }),
    )
    // Nobody left ungrouped and co-located to test with, so directly assert the capacity gate via a
    // synthetic additional candidate outside the group.
    const withOutsider = { ...state, npcRuntimeStates: [...state.npcRuntimeStates, makeRosterNpc('npc-outsider', 'Outsider')] }
    expect(npcCanSupportGroup(withOutsider, withOutsider.npcRuntimeStates.find((n) => n.npcId === 'npc-outsider')!)).toBe(false)
    const result = npcSupportGroup(withOutsider, 'npc-outsider')
    expect(result).toBe(withOutsider)
  })

  it('no-ops when there is no group in the district', () => {
    const state = baseState()
    const result = npcSupportGroup(state, IDA_ID)
    expect(result).toBe(state)
  })

  it('no-ops when the NPC already belongs to a group', () => {
    const state = withGroup(baseState(), testGroup({ leaderId: MARION_ID, memberIds: [IDA_ID] }))
    const result = npcSupportGroup(state, IDA_ID)
    expect(result).toBe(state)
  })
})

describe('npcRecruitMember / npcCanRecruitMember', () => {
  it('adds a co-located, ungrouped candidate to the leader\'s group', () => {
    const state = withGroup(baseState(), testGroup())

    expect(npcCanRecruitMember(state, state.npcRuntimeStates[0]!)).toBe(true)

    const result = npcRecruitMember(state, MARION_ID)
    const group = result.npcGroups.find((g) => g.groupId === 'group-test-1')!
    expect(group.memberIds).toContain(IDA_ID)
  })

  it('boosts affinity with the recruited member', () => {
    const state = withGroup(baseState(), testGroup())
    const result = npcRecruitMember(state, MARION_ID)
    expect(result.relationships[`${MARION_ID}-to-${IDA_ID}`]?.affinity ?? 0).toBeGreaterThan(0)
  })

  it('logs a recruitment message', () => {
    const state = withGroup(baseState(), testGroup())
    const result = npcRecruitMember(state, MARION_ID)
    expect(result.activityLog.some((e) => e.message.includes('recruits'))).toBe(true)
  })

  it('no-ops when the acting NPC does not lead a group', () => {
    const state = baseState()
    const result = npcRecruitMember(state, MARION_ID)
    expect(result).toBe(state)
  })

  it('no-ops when the led group is already at the member cap', () => {
    const extras = [makeRosterNpc('npc-extra-1', 'Extra One'), makeRosterNpc('npc-extra-2', 'Extra Two'), makeRosterNpc('npc-extra-3', 'Extra Three')]
    const state = withGroup(
      baseState(extras),
      testGroup({ memberIds: ['npc-extra-1', 'npc-extra-2', IDA_ID] }),
    )
    expect(npcCanRecruitMember(state, state.npcRuntimeStates[0]!)).toBe(false)
    const result = npcRecruitMember(state, MARION_ID)
    expect(result).toBe(state)
  })

  it('no-ops when there are no ungrouped candidates left to recruit', () => {
    const state = withGroup(baseState(), testGroup({ memberIds: [IDA_ID] }))
    const result = npcRecruitMember(state, MARION_ID)
    expect(result).toBe(state)
  })
})
