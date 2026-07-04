import { describe, it, expect } from 'vitest'
import {
  npcConfrontRival,
  npcAssertDominance,
  npcProtectHouse,
  npcPatrolDistrict,
  npcFortifyPosition,
  npcCareForInjured,
} from './npcAggressionActions'
import { initialStateWithIda, idaRhysRosterEntry } from './testFixtures'
import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import type { InventoryContainer } from '../../domain/inventory/contracts'

const NPC_ID = idaRhysRosterEntry.npcId

function withNpcOverrides(state: GameState, npcId: string, overrides: Partial<NpcRuntimeState>): GameState {
  return {
    ...state,
    roster: state.roster.map((n) => (n.npcId === npcId ? { ...n, ...overrides } : n)),
  }
}

function withNpcStates(state: GameState, npcId: string, states: Partial<NpcRuntimeState['states']>): GameState {
  return {
    ...state,
    roster: state.roster.map((n) => (n.npcId === npcId ? { ...n, states: { ...n.states, ...states } } : n)),
  }
}

function addRosterEntry(state: GameState, npcId: string, overrides: Partial<NpcRuntimeState> = {}): GameState {
  return {
    ...state,
    roster: [...state.roster, { ...idaRhysRosterEntry, npcId, name: npcId, ...overrides }],
  }
}

function withNpcItem(state: GameState, npcId: string, itemId: string, uniqueId: string): GameState {
  const container: InventoryContainer = {
    containerId: `container-${npcId}`,
    containerType: 'satchel',
    ownerId: npcId,
    maxSlots: 5,
    slots: [{ slotId: `slot-${uniqueId}`, itemInstanceId: uniqueId, quantity: 1 }],
    locked: false,
  }
  return {
    ...state,
    inventoryState: {
      ...state.inventoryState,
      npcInventories: { ...state.inventoryState.npcInventories, [npcId]: [container] },
      itemRegistry: {
        ...state.inventoryState.itemRegistry,
        [uniqueId]: {
          uniqueId,
          itemId,
          quantity: 1,
          locationType: 'npc_inventory',
          locationId: npcId,
          acquiredDay: 1,
          flags: [],
        },
      },
    },
  }
}

const alwaysSucceed = () => 0
const alwaysFail = () => 0.999

describe('npcConfrontRival', () => {
  it('no-ops when the NPC has no authored rival', () => {
    const result = npcConfrontRival(initialStateWithIda, NPC_ID, alwaysSucceed)
    expect(result).toBe(initialStateWithIda)
  })

  it('no-ops when the authored rival is not a live roster NPC', () => {
    // npc-alis-vey has an authored rival (npc-enemy-lady-sorn) in npcs.json, but that rival is
    // not added to the roster here.
    let state = addRosterEntry(initialStateWithIda, 'npc-alis-vey')
    const before = state
    state = npcConfrontRival(state, 'npc-alis-vey', alwaysSucceed)
    expect(state).toBe(before)
  })

  it('raises the rival\'s fear/anger on success when the rival is a live roster NPC', () => {
    let state = addRosterEntry(initialStateWithIda, 'npc-alis-vey')
    state = addRosterEntry(state, 'npc-enemy-lady-sorn')

    const result = npcConfrontRival(state, 'npc-alis-vey', alwaysSucceed)

    const rival = result.roster.find((n) => n.npcId === 'npc-enemy-lady-sorn')!
    expect(rival.states.fear).toBeGreaterThan(idaRhysRosterEntry.states.fear)
    expect(rival.states.anger).toBeGreaterThan(idaRhysRosterEntry.states.anger)
  })

  it('raises the actor\'s own fear on failure', () => {
    let state = addRosterEntry(initialStateWithIda, 'npc-alis-vey')
    state = addRosterEntry(state, 'npc-enemy-lady-sorn')

    const result = npcConfrontRival(state, 'npc-alis-vey', alwaysFail)

    const actor = result.roster.find((n) => n.npcId === 'npc-alis-vey')!
    expect(actor.states.fear).toBeGreaterThan(idaRhysRosterEntry.states.fear)
  })
})

describe('npcAssertDominance', () => {
  it('increases the weakest idle target\'s fear and decreases their respect on success', () => {
    const result = npcAssertDominance(initialStateWithIda, NPC_ID, alwaysSucceed)

    const marionId = initialStateWithIda.roster[0]!.npcId
    const rel = result.relationships[`${marionId}-to-${NPC_ID}`]
    expect(rel?.fear ?? 0).toBeGreaterThan(0)
    expect(rel?.respect ?? 0).toBeLessThan(0)
  })

  it('raises the actor\'s own anger when rebuffed', () => {
    const result = npcAssertDominance(initialStateWithIda, NPC_ID, alwaysFail)

    const actor = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(actor.states.anger).toBeGreaterThan(idaRhysRosterEntry.states.anger)
  })

  it('no-ops when there is no other idle NPC', () => {
    const state: GameState = { ...initialStateWithIda, roster: [initialStateWithIda.roster.find((n) => n.npcId === NPC_ID)!] }
    const result = npcAssertDominance(state, NPC_ID, alwaysSucceed)
    expect(result).toBe(state)
  })
})

describe('npcProtectHouse', () => {
  it('reduces the house district\'s tension and boosts the actor\'s morale', () => {
    const state = { ...initialStateWithIda, districtTension: { ...initialStateWithIda.districtTension, [initialStateWithIda.houseDistrictId]: 50 } }

    const result = npcProtectHouse(state, NPC_ID)

    expect(result.districtTension[initialStateWithIda.houseDistrictId]).toBeLessThan(50)
    const actor = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(actor.states.morale).toBeGreaterThan(idaRhysRosterEntry.states.morale)
  })
})

describe('npcPatrolDistrict', () => {
  it('reduces tension in the NPC\'s own assigned district', () => {
    let state = withNpcOverrides(initialStateWithIda, NPC_ID, { assignedDistrictId: 'district-the-pale' })
    state = { ...state, districtTension: { ...state.districtTension, 'district-the-pale': 50 } }

    const result = npcPatrolDistrict(state, NPC_ID, alwaysFail)

    expect(result.districtTension['district-the-pale']).toBeLessThan(50)
  })

  it('no-ops when the NPC has no assigned district', () => {
    const state = withNpcOverrides(initialStateWithIda, NPC_ID, { assignedDistrictId: null })
    const result = npcPatrolDistrict(state, NPC_ID, alwaysFail)
    expect(result).toBe(state)
  })
})

describe('npcFortifyPosition', () => {
  it('increases fortification level and deducts full cost on success', () => {
    const state = { ...initialStateWithIda, money: 100, house: { ...initialStateWithIda.house, fortificationLevel: 1 } }

    const result = npcFortifyPosition(state, NPC_ID, alwaysSucceed)

    expect(result.house.fortificationLevel).toBe(2)
    expect(result.money).toBe(80)
  })

  it('deducts a smaller cost and does not raise the level on failure', () => {
    const state = { ...initialStateWithIda, money: 100, house: { ...initialStateWithIda.house, fortificationLevel: 1 } }

    const result = npcFortifyPosition(state, NPC_ID, alwaysFail)

    expect(result.house.fortificationLevel).toBe(1)
    expect(result.money).toBe(90)
  })

  it('no-ops when funds are insufficient', () => {
    const state = { ...initialStateWithIda, money: 5, house: { ...initialStateWithIda.house, fortificationLevel: 1 } }
    const result = npcFortifyPosition(state, NPC_ID, alwaysSucceed)
    expect(result).toBe(state)
  })

  it('no-ops when fortification is already maxed', () => {
    const state = { ...initialStateWithIda, money: 100, house: { ...initialStateWithIda.house, fortificationLevel: 5 } }
    const result = npcFortifyPosition(state, NPC_ID, alwaysSucceed)
    expect(result).toBe(state)
  })
})

describe('npcCareForInjured', () => {
  // Per the canonical recovery contract (destiny-i8nc/destiny-o8mn): a generic 'heal' item effect
  // restores health only. Injury only meaningfully reduces with real treatment support (infirmary
  // or a medic title) — matching useItem.ts's consumable path and applyStateDecay.ts's
  // getNpcRecoverySupport-gated recovering-NPC loop.
  it('consumes a personal healing item and restores health, but does not reduce injury without real treatment support', () => {
    let state = addRosterEntry(initialStateWithIda, 'npc-injured-1', { assignment: 'idle' })
    state = withNpcStates(state, 'npc-injured-1', { health: 50, injury: 30 })
    state = withNpcItem(state, NPC_ID, 'item-medkit-field', 'inst-medkit-1')

    const result = npcCareForInjured(state, NPC_ID)

    const target = result.roster.find((n) => n.npcId === 'npc-injured-1')!
    expect(target.states.health).toBeGreaterThan(50)
    expect(target.states.injury).toBe(30)
    expect(result.inventoryState.npcInventories[NPC_ID]![0]!.slots).toHaveLength(0)
  })

  it('also reduces injury when the house has real treatment support (a medic title)', () => {
    let state = addRosterEntry(initialStateWithIda, 'npc-injured-1', { assignment: 'idle' })
    state = withNpcStates(state, 'npc-injured-1', { health: 50, injury: 30 })
    state = withNpcItem(state, NPC_ID, 'item-medkit-field', 'inst-medkit-1')
    state = withNpcOverrides(state, NPC_ID, { activeTitle: 'title-medic' })

    const result = npcCareForInjured(state, NPC_ID)

    const target = result.roster.find((n) => n.npcId === 'npc-injured-1')!
    expect(target.states.injury).toBeLessThan(30)
  })

  it('gives smaller bedside comfort (health only, no injury change) when no healing item or treatment support is available', () => {
    let state = addRosterEntry(initialStateWithIda, 'npc-injured-1', { assignment: 'idle' })
    state = withNpcStates(state, 'npc-injured-1', { health: 50, injury: 30 })

    const result = npcCareForInjured(state, NPC_ID)

    const target = result.roster.find((n) => n.npcId === 'npc-injured-1')!
    expect(target.states.health).toBe(55)
    expect(target.states.injury).toBe(30)
  })

  it('no-ops when no one needs care', () => {
    const result = npcCareForInjured(initialStateWithIda, NPC_ID)
    expect(result).toBe(initialStateWithIda)
  })
})
