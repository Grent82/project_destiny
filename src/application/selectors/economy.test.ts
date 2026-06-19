import { describe, expect, it } from 'vitest'

import {
  selectFoodSecurity,
  selectFoodStock,
  selectFoodCapacity,
  selectWaterAccess,
  selectMaterialStock,
  selectCorridorStatus,
  selectEconomyOverview,
} from './economy'
import { DEFAULT_FOOD_BASE_PRICE } from './marketPricing'
import { initialGameStateSnapshot } from '../store/initialGameState'

function makeState(overrides: Partial<typeof initialGameStateSnapshot> = {}): { game: typeof initialGameStateSnapshot } {
  return {
    game: {
      ...initialGameStateSnapshot,
      ...overrides,
    },
  }
}

function makeHouseKitchenIntact() {
  return {
    ...initialGameStateSnapshot.house,
    rooms: initialGameStateSnapshot.house.rooms.map((room) =>
      room.roomId === 'room-kitchen' ? { ...room, state: 'intact' as const } : room,
    ),
  }
}

describe('selectFoodSecurity', () => {
  it('returns 0 when food stock is zero', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 0 },
    })
    expect(selectFoodSecurity(state)).toBe(0)
  })

  it('returns 100 when food stock is full', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 1000 },
    })
    expect(selectFoodSecurity(state)).toBe(100)
  })

  it('returns 50 when food stock is half', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 500 },
    })
    expect(selectFoodSecurity(state)).toBe(50)
  })

  it('returns 62 when food stock is 620 of 1000 capacity', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 620 },
    })
    expect(selectFoodSecurity(state)).toBe(62)
  })

  it('clamps to 100 when stock exceeds capacity', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 1500 },
    })
    expect(selectFoodSecurity(state)).toBe(100)
  })

  it('defaults to 0 when capacity is zero', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 100, foodCapacity: 0 },
    })
    expect(selectFoodSecurity(state)).toBe(0)
  })
})

describe('selectFoodStock', () => {
  it('returns the food stock value', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 750 },
    })
    expect(selectFoodStock(state)).toBe(750)
  })

  it('defaults to 0 when food stock is missing', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodStock: 0 },
    })
    expect(selectFoodStock(state)).toBe(0)
  })
})

describe('selectFoodCapacity', () => {
  it('returns the food capacity value', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodCapacity: 2000 },
    })
    expect(selectFoodCapacity(state)).toBe(2000)
  })

  it('defaults to 1000 when capacity is missing', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, foodCapacity: 1000 },
    })
    expect(selectFoodCapacity(state)).toBe(1000)
  })
})

describe('selectWaterAccess', () => {
  it('returns the water access value', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, waterAccess: 85 },
    })
    expect(selectWaterAccess(state)).toBe(85)
  })
})

describe('selectMaterialStock', () => {
  it('returns the material stock value', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, materialStock: 30 },
    })
    expect(selectMaterialStock(state)).toBe(30)
  })
})

describe('selectCorridorStatus', () => {
  it('returns the corridor status value', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'disrupted' },
    })
    expect(selectCorridorStatus(state)).toBe('disrupted')
  })

  it('defaults to blocked when corridor status is missing', () => {
    const state = makeState({
      cityResources: { ...initialGameStateSnapshot.cityResources, corridorStatus: 'blocked' },
    })
    expect(selectCorridorStatus(state)).toBe('blocked')
  })
})

describe('selectEconomyOverview', () => {
  it('surfaces a single-source food and corridor snapshot for the dashboard', () => {
    const state = makeState({
      cityResources: {
        ...initialGameStateSnapshot.cityResources,
        foodStock: 350,
        foodCapacity: 1000,
        corridorStatus: 'disrupted',
        corridorClearanceProgressDays: 1,
      },
      roster: initialGameStateSnapshot.roster.slice(0, 2),
      currentDistrictId: 'district-harbor',
    })

    const overview = selectEconomyOverview(state)

    expect(overview.foodStock).toBe(350)
    expect(overview.foodCapacity).toBe(1000)
    expect(overview.foodSecurity).toBe(35)
    expect(overview.localOutput).toBe(102)
    expect(overview.dailyConsumption).toBe(601)
    expect(overview.corridorImport).toBe(150)
    expect(overview.netFoodDelta).toBe(-349)
    expect(overview.foodPrice).toBeLessThan(DEFAULT_FOOD_BASE_PRICE)
    expect(overview.foodPriceTrend).toBe('falling')
    expect(overview.marketState).toMatch(/good supply|discount/i)
    expect(overview.corridorProgress.daysRemaining).toBe(1)
    expect(overview.playerActions.marketRoute).toBe('/shops')
    expect(overview.playerActions.contractsRoute).toBe('/contracts')
  })

  it('routes market review through the district map when the house is not in a district', () => {
    const state = makeState({
      currentDistrictId: null,
    })

    const overview = selectEconomyOverview(state)

    expect(overview.playerActions.marketRoute).toBe('/district-map')
  })

  it('includes bonded kitchen labor in local output when a player-held bound NPC is placed into food service', () => {
    const state = makeState({
      house: makeHouseKitchenIntact(),
      roster: initialGameStateSnapshot.roster.map((npc) =>
        npc.npcId === 'npc-marion-vale'
          ? {
              ...npc,
              assignment: 'working' as const,
              roomAssignment: 'room-kitchen',
              bondStatus: {
                holderId: 'player',
                contractValue: 55,
                termDays: 20,
                entryReason: 'voluntary' as const,
                alongsideFreeAssignmentDays: 0,
                lastEqualityNoticeDay: null,
                forSale: false,
                lastOfferDay: null,
                marketValue: 140,
                ownerType: 'player' as const,
                bondStartDay: 1,
              },
            }
          : npc,
      ),
    })

    const overview = selectEconomyOverview(state)

    expect(overview.localOutput).toBe(126)
    expect(overview.boundKitchenHands).toBe(1)
    expect(overview.boundKitchenOutput).toBe(6)
  })
})
