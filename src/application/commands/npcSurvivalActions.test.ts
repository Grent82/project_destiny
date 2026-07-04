import { describe, it, expect } from 'vitest'
import { npcEatMeal, npcDrink, npcSleep, npcRest, npcGroom, npcMeditate } from './npcSurvivalActions'
import { initialStateWithIda, idaRhysRosterEntry } from './testFixtures'
import type { GameState } from '../../domain/game/contracts'
import type { InventoryContainer } from '../../domain/inventory/contracts'

const NPC_ID = idaRhysRosterEntry.npcId

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

function withNpcStates(state: GameState, npcId: string, states: Partial<typeof idaRhysRosterEntry.states>): GameState {
  return {
    ...state,
    roster: state.roster.map((n) => (n.npcId === npcId ? { ...n, states: { ...n.states, ...states } } : n)),
  }
}

describe('npcEatMeal', () => {
  it('consumes a personal food item and reduces hunger by its effect value', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { hunger: 60 })
    state = withNpcItem(state, NPC_ID, 'item-ration-compact-brick', 'inst-ration-1')

    const result = npcEatMeal(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.hunger).toBe(30) // 60 - 30
    expect(result.inventoryState.npcInventories[NPC_ID]![0]!.slots).toHaveLength(0)
    expect(result.inventoryState.itemRegistry['inst-ration-1']).toBeUndefined()
  })

  it('falls back to house food stock when no personal item is found', () => {
    const state = withNpcStates(initialStateWithIda, NPC_ID, { hunger: 60 })
    const stockBefore = state.cityResources.foodStock

    const result = npcEatMeal(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.hunger).toBe(40) // 60 - 20
    expect(result.cityResources.foodStock).toBe(stockBefore - 1)
  })

  it('only forages a little when there is no personal item and no house stock', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { hunger: 60 })
    state = { ...state, cityResources: { ...state.cityResources, foodStock: 0 } }

    const result = npcEatMeal(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.hunger).toBe(55) // 60 - 5
    expect(result.cityResources.foodStock).toBe(0)
  })
})

describe('npcDrink', () => {
  it('consumes a personal drink item, reducing hunger and intoxication', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { hunger: 50, intoxication: 40 })
    state = withNpcItem(state, NPC_ID, 'item-waterskin-filled', 'inst-water-1')

    const result = npcDrink(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.hunger).toBe(40) // 50 - 10
    expect(npc.states.intoxication).toBe(20) // 40 - 20
    expect(result.inventoryState.npcInventories[NPC_ID]![0]!.slots).toHaveLength(0)
  })

  it('does not drink further when already very intoxicated, only sobers slightly', () => {
    const state = withNpcStates(initialStateWithIda, NPC_ID, { hunger: 50, intoxication: 80 })

    const result = npcDrink(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.hunger).toBe(50) // unchanged
    expect(npc.states.intoxication).toBe(75) // 80 - 5
  })

  it('finds nothing to drink when water access is scarce and no item is available', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { hunger: 50, intoxication: 40 })
    state = { ...state, cityResources: { ...state.cityResources, waterAccess: 10 } }

    const result = npcDrink(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.hunger).toBe(50)
    expect(npc.states.intoxication).toBe(40)
  })
})

describe('npcSleep', () => {
  it('reduces fatigue more when the NPC has intact quarters, and also eases stress and gives modest health recovery (destiny-i8nc contract)', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { fatigue: 80, stress: 50, health: 80 })
    state = {
      ...state,
      roster: state.roster.map((n) => (n.npcId === NPC_ID ? { ...n, roomAssignment: 'room-quarters' } : n)),
    }

    const result = npcSleep(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.fatigue).toBe(40) // 80 - 40
    expect(npc.states.stress).toBe(35) // 50 - 15
    expect(npc.states.health).toBe(85) // 80 + 5
  })

  it('reduces fatigue less when sleeping rough (no quarters), with a smaller stress/health effect', () => {
    const state = withNpcStates(initialStateWithIda, NPC_ID, { fatigue: 80, stress: 50, health: 80 })

    const result = npcSleep(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.fatigue).toBe(65) // 80 - 15
    expect(npc.states.stress).toBe(44) // 50 - 6
    expect(npc.states.health).toBe(82) // 80 + 2
  })

  it('does not touch injury — sleep does not treat wounds, only treatment does (destiny-i8nc contract)', () => {
    const state = withNpcStates(initialStateWithIda, NPC_ID, { fatigue: 80, injury: 20 })
    const result = npcSleep(state, NPC_ID)
    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.injury).toBe(20)
  })
})

describe('npcRest', () => {
  it('reduces fatigue moderately, less than a full sleep, and gives light stress relief but no health recovery', () => {
    const state = withNpcStates(initialStateWithIda, NPC_ID, { fatigue: 50, stress: 30, health: 80 })

    const result = npcRest(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.fatigue).toBe(38) // 50 - 12
    expect(npc.states.stress).toBe(26) // 30 - 4 (no quarters by default)
    expect(npc.states.health).toBe(80) // unchanged
  })
})

describe('npcGroom', () => {
  it('consumes a personal grooming item and reduces hygiene (grime) by its effect value', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { hygiene: 70 })
    state = withNpcItem(state, NPC_ID, 'item-soap-bar-plain', 'inst-soap-1')

    const result = npcGroom(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.hygiene).toBe(40) // 70 - 30
    expect(result.inventoryState.npcInventories[NPC_ID]![0]!.slots).toHaveLength(0)
  })

  it('washes up with house water when no personal item is available', () => {
    const state = withNpcStates(initialStateWithIda, NPC_ID, { hygiene: 70 })

    const result = npcGroom(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.hygiene).toBe(55) // 70 - 15
  })

  it('washes up less effectively when water access is scarce', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { hygiene: 70 })
    state = { ...state, cityResources: { ...state.cityResources, waterAccess: 10 } }

    const result = npcGroom(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.hygiene).toBe(65) // 70 - 5
  })
})

describe('npcMeditate', () => {
  it('reduces stress, scaled by intellect/prudence', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { stress: 70 })
    state = {
      ...state,
      roster: state.roster.map((n) =>
        n.npcId === NPC_ID
          ? { ...n, attributes: { ...n.attributes, intellect: 70 }, traits: { ...n.traits, prudence: 70 } }
          : n,
      ),
    }

    const result = npcMeditate(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    // reduction = 15 + round((70-50)/5 + (70-50)/5) = 15 + 8 = 23
    expect(npc.states.stress).toBe(47)
  })

  it('does nothing while the player is in combat', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { stress: 70 })
    state = {
      ...state,
      playerCharacter: {
        ...state.playerCharacter,
        combatState: { health: 50, injury: 0, morale: 50 },
      },
    }

    const result = npcMeditate(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.stress).toBe(70)
  })

  it('does nothing when the NPC\'s district is under high tension', () => {
    let state = withNpcStates(initialStateWithIda, NPC_ID, { stress: 70 })
    state = {
      ...state,
      roster: state.roster.map((n) => (n.npcId === NPC_ID ? { ...n, assignedDistrictId: 'district-the-pale' } : n)),
      districtTension: { ...state.districtTension, 'district-the-pale': 90 },
    }

    const result = npcMeditate(state, NPC_ID)

    const npc = result.roster.find((n) => n.npcId === NPC_ID)!
    expect(npc.states.stress).toBe(70)
  })
})
