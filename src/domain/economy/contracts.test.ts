import { describe, expect, it } from 'vitest'

import {
  goodSchema,
  goodsMarketSchema,
  economicAgentSchema,
  decisionPolicySchema,
  goodIdSchema,
} from './contracts'

describe('Good', () => {
  it('parses a valid good', () => {
    const good = {
      id: 'food' as const,
      label: 'Food Rations',
      description: 'Basic sustenance for the household',
    }
    const result = goodSchema.safeParse(good)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('food')
      expect(result.data.label).toBe('Food Rations')
    }
  })

  it('rejects an invalid good id', () => {
    const result = goodSchema.safeParse({
      id: 'invalid_good' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      label: 'Test',
    })
    expect(result.success).toBe(false)
  })
})

describe('GoodsMarket', () => {
  it('parses a valid market state', () => {
    const market = {
      goodId: 'food' as const,
      stock: 500,
      stockCapacity: 1000,
      demandBaseline: 100,
      basePrice: 10,
      currentPrice: 10,
      priceFloor: 5,
      priceCeiling: 25,
      lastRepriceDay: 1,
    }
    const result = goodsMarketSchema.safeParse(market)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.stock).toBe(500)
      expect(result.data.demandBaseline).toBe(100)
    }
  })

  it('rejects negative stock', () => {
    const result = goodsMarketSchema.safeParse({
      goodId: 'food' as const,
      stock: -100,
      stockCapacity: 1000,
      demandBaseline: 100,
      basePrice: 10,
      currentPrice: 10,
      priceFloor: 5,
      priceCeiling: 25,
      lastRepriceDay: 1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects demand baseline above 200', () => {
    const result = goodsMarketSchema.safeParse({
      goodId: 'food' as const,
      stock: 500,
      stockCapacity: 1000,
      demandBaseline: 250,
      basePrice: 10,
      currentPrice: 10,
      priceFloor: 5,
      priceCeiling: 25,
      lastRepriceDay: 1,
    })
    expect(result.success).toBe(false)
  })
})

describe('EconomicAgent', () => {
  it('parses a player agent', () => {
    const agent = {
      agentId: 'player',
      role: 'player' as const,
      money: 1000,
      inventory: { food: 50 },
      needs: { food: 10 },
      decisionPolicy: {
        policyType: 'survival_first' as const,
        riskTolerance: 60,
        targetStockBuffer: 0.3,
      },
      productionCapacity: {},
      productionCost: {},
    }
    const result = economicAgentSchema.safeParse(agent)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe('player')
      expect(result.data.inventory.food).toBe(50)
    }
  })

  it('parses an npc agent with custom policy', () => {
    const agent = {
      agentId: 'npc-id',
      role: 'npc' as const,
      money: 100,
      inventory: {},
      needs: { food: 1 },
      decisionPolicy: {
        policyType: 'custom' as const,
        riskTolerance: 30,
        targetStockBuffer: 0.5,
      },
      productionCapacity: {},
      productionCost: {},
    }
    const result = economicAgentSchema.safeParse(agent)
    expect(result.success).toBe(true)
  })

  it('defaults inventory and needs to empty objects', () => {
    const agent = {
      agentId: 'player',
      role: 'player' as const,
      money: 1000,
      decisionPolicy: {
        policyType: 'survival_first' as const,
      },
    }
    const result = economicAgentSchema.safeParse(agent)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.inventory).toEqual({})
      expect(result.data.needs).toEqual({})
    }
  })
})

describe('DecisionPolicy', () => {
  it('parses all policy types', () => {
    const policies = [
      { policyType: 'survival_first' as const },
      { policyType: 'profit_maximize' as const },
      { policyType: 'risk_averse' as const },
      { policyType: 'risk_tolerant' as const },
      { policyType: 'custom' as const },
    ]

    policies.forEach(policy => {
      const result = decisionPolicySchema.safeParse(policy)
      expect(result.success).toBe(true)
    })
  })

  it('defaults riskTolerance to 50', () => {
    const result = decisionPolicySchema.safeParse({ policyType: 'custom' as const })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.riskTolerance).toBe(50)
    }
  })

  it('defaults targetStockBuffer to 0.3', () => {
    const result = decisionPolicySchema.safeParse({ policyType: 'custom' as const })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.targetStockBuffer).toBe(0.3)
    }
  })

  it('rejects riskTolerance outside [0, 100]', () => {
    const result1 = decisionPolicySchema.safeParse({
      policyType: 'custom' as const,
      riskTolerance: -10,
    })
    const result2 = decisionPolicySchema.safeParse({
      policyType: 'custom' as const,
      riskTolerance: 150,
    })
    expect(result1.success).toBe(false)
    expect(result2.success).toBe(false)
  })
})

describe('GoodId enum', () => {
  it('accepts all valid good ids', () => {
    const validIds = ['food', 'water', 'materials', 'luxury', 'medicine', 'supplies']
    validIds.forEach(id => {
      const result = goodIdSchema.safeParse(id)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid good ids', () => {
    const result = goodIdSchema.safeParse('gold')
    expect(result.success).toBe(false)
  })
})
