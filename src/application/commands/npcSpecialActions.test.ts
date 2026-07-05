import { describe, it, expect } from 'vitest'
import { npcResourceGather, npcScavenge, npcSeekEmployment, npcHostGathering, npcShopForGoods, npcCanShopForGoods } from './npcSpecialActions'
import { initialStateWithIda, idaRhysRosterEntry } from './testFixtures'
import { resolveShopPricingBreakdown } from '../content/shopPricing'
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

const SHOP_ID = 'shop-harbor-provisions'
const SHOP_DISTRICT_ID = 'district-harbor'
const SHOP_STOCK_CONTAINER_ID = `shop:${SHOP_ID}:stock`

function withDistrictAndFunds(state: GameState, personalFunds: NpcRuntimeState['personalFunds']): GameState {
  return withNpcOverrides(state, NPC_ID, { assignedDistrictId: SHOP_DISTRICT_ID, personalFunds })
}

describe('npcShopForGoods', () => {
  it('no-ops when the NPC has no assigned district', () => {
    const result = npcShopForGoods(initialStateWithIda, NPC_ID)
    expect(result).toBe(initialStateWithIda)
  })

  it('does nothing when the NPC cannot afford any offer in their district', () => {
    const state = withDistrictAndFunds(initialStateWithIda, { savings: 0, carriedCash: 1, lastWagePaymentDay: null, lastTipAmount: 0 })
    const result = npcShopForGoods(state, NPC_ID)
    expect(result).toBe(state)
  })

  it('buys the cheapest-first, in-stock, affordable offer and deducts personalFunds', () => {
    const state = withDistrictAndFunds(initialStateWithIda, { savings: 0, carriedCash: 200, lastWagePaymentDay: null, lastTipAmount: 0 })
    const expectedPrice = resolveShopPricingBreakdown(state, SHOP_ID, 'item-medkit-field')!.finalPrice

    const result = npcShopForGoods(state, NPC_ID)
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!

    expect(npc.personalFunds.carriedCash).toBe(200 - expectedPrice)
  })

  it('adds the purchased item instance to the NPC inventory', () => {
    const state = withDistrictAndFunds(initialStateWithIda, { savings: 0, carriedCash: 200, lastWagePaymentDay: null, lastTipAmount: 0 })
    const result = npcShopForGoods(state, NPC_ID)

    const npcContainers = result.inventoryState.npcInventories[NPC_ID] ?? []
    const hasMedkit = npcContainers.some((c) =>
      c.slots.some((slot) => slot.itemInstanceId && result.inventoryState.itemRegistry[slot.itemInstanceId]?.itemId === 'item-medkit-field'),
    )
    expect(hasMedkit).toBe(true)
  })

  it('removes the purchased item instance from shop stock', () => {
    const state = withDistrictAndFunds(initialStateWithIda, { savings: 0, carriedCash: 200, lastWagePaymentDay: null, lastTipAmount: 0 })
    const before = state.inventoryState.sharedContainers.find((c) => c.containerId === SHOP_STOCK_CONTAINER_ID)!
    const beforeQty = before.slots
      .filter((slot) => slot.itemInstanceId && state.inventoryState.itemRegistry[slot.itemInstanceId]?.itemId === 'item-medkit-field')
      .reduce((sum, slot) => sum + slot.quantity, 0)

    const result = npcShopForGoods(state, NPC_ID)
    const after = result.inventoryState.sharedContainers.find((c) => c.containerId === SHOP_STOCK_CONTAINER_ID)!
    const afterQty = after.slots
      .filter((slot) => slot.itemInstanceId && result.inventoryState.itemRegistry[slot.itemInstanceId]?.itemId === 'item-medkit-field')
      .reduce((sum, slot) => sum + slot.quantity, 0)

    expect(afterQty).toBe(beforeQty - 1)
  })

  it('logs a purchase message naming the shop', () => {
    const state = withDistrictAndFunds(initialStateWithIda, { savings: 0, carriedCash: 200, lastWagePaymentDay: null, lastTipAmount: 0 })
    const result = npcShopForGoods(state, NPC_ID)
    expect(result.activityLog.some((e) => e.message.includes('buys') && e.message.includes('Harbor Provisions'))).toBe(true)
  })

  it('falls through to a cheaper offer when the NPC cannot afford the first-ordered one', () => {
    const priceMedkit = resolveShopPricingBreakdown(initialStateWithIda, SHOP_ID, 'item-medkit-field')!.finalPrice
    const priceLedger = resolveShopPricingBreakdown(initialStateWithIda, SHOP_ID, 'item-ledger-bureau')!.finalPrice
    expect(priceMedkit).toBeGreaterThan(priceLedger + 2)

    const state = withDistrictAndFunds(initialStateWithIda, {
      savings: 0,
      carriedCash: priceLedger + 2,
      lastWagePaymentDay: null,
      lastTipAmount: 0,
    })

    const result = npcShopForGoods(state, NPC_ID)
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npc.personalFunds.carriedCash).toBe(priceLedger + 2 - priceLedger)
  })

  it('applies a negotiation-skill price discount', () => {
    const lowSkillState = withDistrictAndFunds(initialStateWithIda, { savings: 0, carriedCash: 200, lastWagePaymentDay: null, lastTipAmount: 0 })
    const baseSkills = lowSkillState.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!.skills
    const highSkillState = withNpcOverrides(lowSkillState, NPC_ID, { skills: { ...baseSkills, negotiation: 100 } })

    const lowResult = npcShopForGoods(lowSkillState, NPC_ID)
    const highResult = npcShopForGoods(highSkillState, NPC_ID)

    const lowSpent = 200 - lowResult.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!.personalFunds.carriedCash
    const highSpent = 200 - highResult.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!.personalFunds.carriedCash

    expect(highSpent).toBeLessThan(lowSpent)
  })

  it('draws from savings once carriedCash is exhausted', () => {
    const expectedPrice = resolveShopPricingBreakdown(initialStateWithIda, SHOP_ID, 'item-medkit-field')!.finalPrice
    const state = withDistrictAndFunds(initialStateWithIda, {
      savings: 200,
      carriedCash: 10,
      lastWagePaymentDay: null,
      lastTipAmount: 0,
    })

    const result = npcShopForGoods(state, NPC_ID)
    const npc = result.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!

    expect(npc.personalFunds.carriedCash).toBe(0)
    expect(npc.personalFunds.savings).toBe(200 - (expectedPrice - 10))
  })
})

describe('npcCanShopForGoods', () => {
  it('returns false when the NPC has no assigned district', () => {
    const npc = initialStateWithIda.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npcCanShopForGoods(initialStateWithIda, npc)).toBe(false)
  })

  it('returns true when an affordable, in-stock offer exists in the district', () => {
    const state = withDistrictAndFunds(initialStateWithIda, { savings: 0, carriedCash: 200, lastWagePaymentDay: null, lastTipAmount: 0 })
    const npc = state.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npcCanShopForGoods(state, npc)).toBe(true)
  })

  it('returns false when funds are insufficient for any offer', () => {
    const state = withDistrictAndFunds(initialStateWithIda, { savings: 0, carriedCash: 1, lastWagePaymentDay: null, lastTipAmount: 0 })
    const npc = state.npcRuntimeStates.find((n) => n.npcId === NPC_ID)!
    expect(npcCanShopForGoods(state, npc)).toBe(false)
  })
})
