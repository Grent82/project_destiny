import { describe, it, expect } from 'vitest'
import {
  npcSpyOn,
  npcGatherLeverage,
  npcInterceptCommunication,
  npcPeopleWatch,
  npcScoutAhead,
  npcInvestigateThreat,
  npcSeekShelter,
  npcPracticeSkill,
  npcTrainSelf,
  npcEscapeAttempt,
} from './npcIntellectActions'
import { initialStateWithIda, idaRhysRosterEntry } from './testFixtures'
import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import type { CorrespondenceMessage } from '../../domain/correspondence/contracts'

const NPC_ID = idaRhysRosterEntry.npcId
const MARION_ID = 'npc-marion-vale'

function withNpcOverrides(state: GameState, npcId: string, overrides: Partial<NpcRuntimeState>): GameState {
  return {
    ...state,
    roster: state.roster.map((n) => (n.npcId === npcId ? { ...n, ...overrides } : n)),
  }
}

function withRoomFunction(state: GameState, roomFunction: 'quarters' | 'barracks' | 'workshop' | 'study'): GameState {
  return {
    ...state,
    house: {
      ...state.house,
      rooms: state.house.rooms.map((r, i) => (i === 0 ? { ...r, state: 'intact' as const, roomFunction } : r)),
    },
  }
}

function correspondenceMessage(overrides: Partial<CorrespondenceMessage>): CorrespondenceMessage {
  return {
    id: 'msg-1',
    fromId: 'npc-a',
    toId: 'npc-b',
    sentOnDay: 1,
    deliveredOnDay: 1,
    text: 'A letter.',
    modulesUsed: [],
    sensitivity: 'compromising',
    status: 'delivered',
    authenticity: 100,
    knownBy: [],
    interceptedBy: null,
    consequenceApplied: false,
    isPlayerTarget: false,
    ...overrides,
  }
}

const alwaysSucceed = () => 0
const alwaysFail = () => 0.999

describe('npcSpyOn', () => {
  it('learns the target\'s authored private need on success and records an npcMemory entry', () => {
    const result = npcSpyOn(initialStateWithIda, NPC_ID, alwaysSucceed)
    const actor = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(actor.npcMemory.length).toBeGreaterThan(0)
    expect(actor.npcMemory.at(-1)!.event).toContain('Marion')
  })

  it('raises the target\'s fear when caught (failure)', () => {
    const result = npcSpyOn(initialStateWithIda, NPC_ID, alwaysFail)
    const target = result.roster.find((n) => n.npcId === MARION_ID)!
    expect(target.states.fear).toBeGreaterThan(idaRhysRosterEntry.states.fear)
  })

  it('no-ops when there is no other idle NPC', () => {
    const state: GameState = { ...initialStateWithIda, roster: [initialStateWithIda.roster.find((n) => n.npcId === NPC_ID)!] }
    const result = npcSpyOn(state, NPC_ID, alwaysSucceed)
    expect(result).toBe(state)
  })
})

describe('npcGatherLeverage', () => {
  it('exploits a compromising letter the NPC already intercepted, raising the target\'s fear and lowering respect', () => {
    const msg = correspondenceMessage({ fromId: 'npc-other-a', toId: 'npc-other-b', interceptedBy: NPC_ID })
    const state = { ...initialStateWithIda, privateCorrespondence: [msg] }

    const result = npcGatherLeverage(state, NPC_ID)

    const updatedMsg = result.privateCorrespondence.find((m) => m.id === msg.id)!
    expect(updatedMsg.consequenceApplied).toBe(true)
    const rel = result.relationships[`npc-other-a-to-${NPC_ID}`]
    expect(rel?.fear ?? 0).toBeGreaterThan(0)
  })

  it('no-ops when there is no exploitable correspondence', () => {
    const result = npcGatherLeverage(initialStateWithIda, NPC_ID)
    expect(result).toBe(initialStateWithIda)
  })
})

describe('npcInterceptCommunication', () => {
  it('intercepts a letter the NPC is not a party to', () => {
    const msg = correspondenceMessage({ fromId: 'npc-other-a', toId: 'npc-other-b', status: 'sent' })
    const state = { ...initialStateWithIda, privateCorrespondence: [msg] }

    const result = npcInterceptCommunication(state, NPC_ID)

    const updatedMsg = result.privateCorrespondence.find((m) => m.id === msg.id)!
    expect(updatedMsg.status).toBe('intercepted')
    expect(updatedMsg.interceptedBy).toBe(NPC_ID)
  })

  it('no-ops when there is nothing to intercept', () => {
    const result = npcInterceptCommunication(initialStateWithIda, NPC_ID)
    expect(result).toBe(initialStateWithIda)
  })
})

describe('npcPeopleWatch', () => {
  it('adds an npcMemory entry when assigned to a district', () => {
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, { assignedDistrictId: 'district-the-pale' })
    const result = npcPeopleWatch(state, NPC_ID)
    const actor = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(actor.npcMemory.length).toBeGreaterThan(0)
  })

  it('no-ops when not assigned to any district', () => {
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, { assignedDistrictId: null })
    const result = npcPeopleWatch(state, NPC_ID)
    expect(result).toBe(state)
  })
})

describe('npcScoutAhead', () => {
  it('increases materialStock on success', () => {
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, { assignedDistrictId: 'district-the-pale' })
    const result = npcScoutAhead(state, NPC_ID, alwaysSucceed)
    expect(result.cityResources.materialStock).toBeGreaterThan(state.cityResources.materialStock)
  })

  it('no-ops when not assigned to any district', () => {
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, { assignedDistrictId: null })
    const result = npcScoutAhead(state, NPC_ID, alwaysSucceed)
    expect(result).toBe(state)
  })
})

describe('npcInvestigateThreat', () => {
  it('eases the assigned district\'s tension on success', () => {
    let state = withNpcOverrides(initialStateWithIda, NPC_ID, { assignedDistrictId: 'district-the-pale' })
    state = { ...state, districtTension: { ...state.districtTension, 'district-the-pale': 50 } }
    const result = npcInvestigateThreat(state, NPC_ID, alwaysSucceed)
    expect(result.districtTension['district-the-pale']).toBeLessThan(50)
  })
})

describe('npcSeekShelter', () => {
  it('reduces fear/stress more with an intact quarters room', () => {
    let state = withRoomFunction(initialStateWithIda, 'quarters')
    state = withNpcOverrides(state, NPC_ID, { states: { ...idaRhysRosterEntry.states, fear: 50, stress: 50 } })
    const result = npcSeekShelter(state, NPC_ID)
    const actor = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(actor.states.fear).toBe(40)
    expect(actor.states.stress).toBe(45)
  })

  it('reduces fear/stress less without a safe room', () => {
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, { states: { ...idaRhysRosterEntry.states, fear: 50, stress: 50 } })
    const result = npcSeekShelter(state, NPC_ID)
    const actor = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(actor.states.fear).toBe(47)
    expect(actor.states.stress).toBe(48)
  })
})

describe('npcPracticeSkill', () => {
  it('gains a small amount of XP in a random skill', () => {
    const result = npcPracticeSkill(initialStateWithIda, NPC_ID, () => 0.5)
    const actor = result.roster.find((n) => n.npcId === NPC_ID)!
    const changed = Object.entries(actor.skills).some(([k, v]) => v !== idaRhysRosterEntry.skills[k as keyof typeof idaRhysRosterEntry.skills])
    expect(changed).toBe(true)
  })
})

describe('npcTrainSelf', () => {
  it('gains skill XP in trainingFocus when a workshop/study room is available', () => {
    let state = withRoomFunction(initialStateWithIda, 'study')
    state = withNpcOverrides(state, NPC_ID, { trainingFocus: 'intrigue' })
    const result = npcTrainSelf(state, NPC_ID)
    const actor = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(actor.skills.intrigue).toBeGreaterThan(idaRhysRosterEntry.skills.intrigue)
  })

  it('no-ops without an intact workshop or study room', () => {
    const result = npcTrainSelf(initialStateWithIda, NPC_ID)
    expect(result).toBe(initialStateWithIda)
  })
})

describe('npcEscapeAttempt', () => {
  it('sets captivityState to missing on success', () => {
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, {
      captivityState: {
        status: 'captive',
        holderId: 'someone',
        siteId: null,
        roomId: null,
        regime: 'unknown',
        condition: 'healthy',
        compliance: 'resistant',
        bondType: 'none',
        timeHeldDays: 3,
        lastTransferDay: null,
        questTag: null,
        confiscatedItems: [],
        confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
      },
    })
    const result = npcEscapeAttempt(state, NPC_ID, alwaysSucceed)
    const actor = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(actor.captivityState?.status).toBe('missing')
  })

  it('raises fear on failure without changing captivityState', () => {
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, {
      captivityState: {
        status: 'captive',
        holderId: 'someone',
        siteId: null,
        roomId: null,
        regime: 'unknown',
        condition: 'healthy',
        compliance: 'resistant',
        bondType: 'none',
        timeHeldDays: 3,
        lastTransferDay: null,
        questTag: null,
        confiscatedItems: [],
        confiscatedMoney: null,
        confiscatedEquipment: { weapon: null, armor: null, accessory: [] },
      },
    })
    const result = npcEscapeAttempt(state, NPC_ID, alwaysFail)
    const actor = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(actor.captivityState?.status).toBe('captive')
    expect(actor.states.fear).toBeGreaterThan(idaRhysRosterEntry.states.fear)
  })

  it('no-ops when the NPC is not captive', () => {
    const result = npcEscapeAttempt(initialStateWithIda, NPC_ID, alwaysSucceed)
    expect(result).toBe(initialStateWithIda)
  })
})
