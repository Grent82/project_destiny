import { z } from 'zod'

import { entityIdSchema, nonNegativeIntegerSchema } from '../shared/contracts'

// ─── Goods Model ────────────────────────────────────────────────────────────

/**
 * A tradeable/consumable good in the economy.
 * Slice 1 ships only with 'food' as the concrete good.
 */
export const goodIdSchema = z.enum(['food', 'water', 'materials', 'luxury', 'medicine', 'supplies'])

export type GoodId = z.infer<typeof goodIdSchema>

/**
 * Human-readable label for a good.
 */
export const goodLabelSchema = z.string().min(1)

/**
 * Good identity: what kind of thing this is.
 */
export const goodSchema = z.object({
  id: goodIdSchema,
  label: goodLabelSchema,
  description: z.string().optional(),
})

export type Good = z.infer<typeof goodSchema>

// ─── Market Model (Stock-and-Flow) ─────────────────────────────────────────

/**
 * Per-good market state: stock level, demand baseline, and derived price.
 *
 * Price formula (pure function, deterministic given inputs):
 *   price = basePrice * (1 + demandMultiplier - stockBuffer)
 *   where:
 *     - stockBuffer = (stock / stockCapacity) normalized to [0, 1]
 *     - demandMultiplier = (demandBaseline / 100) - 1, range [-0.5, 1.0]
 *
 * Bounds:
 *   - priceFloor: 0.5 * basePrice (severe surplus)
 *   - priceCeiling: 2.5 * basePrice (severe shortage)
 */
export const stockCapacitySchema = nonNegativeIntegerSchema

export const demandBaselineSchema = z.number().min(0).max(200)

export const marketStateSchema = z.object({
  goodId: goodIdSchema,
  stock: nonNegativeIntegerSchema,
  stockCapacity: stockCapacitySchema,
  demandBaseline: demandBaselineSchema,
  basePrice: nonNegativeIntegerSchema,
  currentPrice: nonNegativeIntegerSchema,
  lastRepriceDay: nonNegativeIntegerSchema,
})

export type MarketState = z.infer<typeof marketStateSchema>

/**
 * GoodsMarket: stock-and-flow market for a single good.
 * Encapsulates stock, capacity, demand, and price.
 */
export const goodsMarketSchema = z.object({
  goodId: goodIdSchema,
  stock: nonNegativeIntegerSchema,
  stockCapacity: stockCapacitySchema,
  demandBaseline: demandBaselineSchema,
  basePrice: nonNegativeIntegerSchema,
  currentPrice: nonNegativeIntegerSchema,
  priceFloor: nonNegativeIntegerSchema,
  priceCeiling: nonNegativeIntegerSchema,
  lastRepriceDay: nonNegativeIntegerSchema,
})

export type GoodsMarket = z.infer<typeof goodsMarketSchema>

// ─── Price Derivation Functions (Type Signatures) ───────────────────────────

/**
 * Price derivation: computes current price from market state.
 * Pure function: same inputs always produce same outputs.
 *
 * Formula:
 *   stockRatio = stock / stockCapacity (clamped to [0, 1])
 *   demandFactor = (demandBaseline / 100) - 1  (range: -0.5 to 1.0)
 *   stockFactor = 1 - stockRatio  (high stock = lower price)
 *   priceMultiplier = 1 + demandFactor - (stockFactor * 0.5)
 *   price = clamp(basePrice * priceMultiplier, priceFloor, priceCeiling)
 *
 * @param basePrice - Base reference price for this good
 * @param stock - Current stock level
 * @param stockCapacity - Maximum stock capacity
 * @param demandBaseline - Demand baseline (0-200, where 100 is normal)
 * @param priceFloor - Minimum price bound
 * @param priceCeiling - Maximum price bound
 * @returns Computed current price (bounded by floor/ceiling)
 */
export type PriceDerivationFn = (
  basePrice: number,
  stock: number,
  stockCapacity: number,
  demandBaseline: number,
  priceFloor: number,
  priceCeiling: number
) => number

// ─── Economic Agent Model ───────────────────────────────────────────────────

/**
 * Economic role of an agent in the simulation.
 */
export const economicRoleSchema = z.enum([
  'player',
  'house',
  'district',
  'faction',
  'npc',
  'shop',
  'market',
])

export type EconomicRole = z.infer<typeof economicRoleSchema>

/**
 * Decision policy type for deterministic agent behavior.
 * Signature only; implementation is seedable and pure.
 */
export const decisionPolicyTypeSchema = z.enum([
  'survival_first',     // Secure needs before trade
  'profit_maximize',    // Trade for best margin
  'risk_averse',        // Maintain stock buffers
  'risk_tolerant',      // Lean inventory, frequent trade
  'custom',             // Agent-specific policy
])

export type DecisionPolicyType = z.infer<typeof decisionPolicyTypeSchema>

/**
 * Decision policy: deterministic behavior specification for an agent.
 * The actual decision logic is a pure, seedable function.
 *
 * Signature:
 *   (agentState, marketStates, rngSeed) => Decision
 *
 * Where Decision is one of:
 *   - { action: 'buy', goodId, quantity, maxPrice }
 *   - { action: 'sell', goodId, quantity, minPrice }
 *   - { action: 'hold' }
 *   - { action: 'consume', goodId, quantity }
 *   - { action: 'produce', goodId, quantity, cost }
 */
export const decisionPolicySchema = z.object({
  policyType: decisionPolicyTypeSchema,
  priorityWeights: z.record(z.string(), z.number().min(0).max(1)).optional(),
  riskTolerance: z.number().min(0).max(100).default(50),
  targetStockBuffer: z.number().min(0).max(1).default(0.3),
})

export type DecisionPolicy = z.infer<typeof decisionPolicySchema>

/**
 * EconomicAgent: a unified abstraction for any actor that participates in the economy.
 * All actor types (player, house, district, faction, npc) can be instantiated as EconomicAgents.
 *
 * This is the core abstraction for the living economy:
 * - money: liquid currency
 * - inventory: per-good quantities held
 * - needs: per-good consumption requirements
 * - role: what kind of actor this is
 * - decisionPolicy: how this agent makes economic decisions
 */
export const economicAgentSchema = z.object({
  agentId: entityIdSchema,
  role: economicRoleSchema,
  money: nonNegativeIntegerSchema,
  inventory: z.record(z.string(), nonNegativeIntegerSchema).default({}),
  needs: z.record(z.string(), nonNegativeIntegerSchema).default({}),
  decisionPolicy: decisionPolicySchema,
  productionCapacity: z.record(z.string(), nonNegativeIntegerSchema).default({}),
  productionCost: z.record(z.string(), nonNegativeIntegerSchema).default({}),
})

export type EconomicAgent = z.infer<typeof economicAgentSchema>

// ─── Derived View Formulas ──────────────────────────────────────────────────

/**
 * foodSecurity derivation: maps food stock to a 0-100 security score.
 *
 * Formula:
 *   ratio = foodStock / foodCapacity (clamped to [0, 1])
 *   foodSecurity = ratio * 100
 *
 * This reproduces the current foodSecurity range (0-100) from cityResources.
 */
export const foodSecurityDerivationSchema = z.object({
  formula: z.literal('foodSecurity = clamp(foodStock / foodCapacity, 0, 1) * 100'),
  description: z.literal('Linear mapping: 0 stock = 0 security, full capacity = 100 security'),
})

/**
 * marketPressure derivation: maps market state to a 0-100 pressure score.
 *
 * Formula:
 *   stockRatio = stock / stockCapacity
 *   demandFactor = demandBaseline / 100
 *   pressure = (1 - stockRatio) * demandFactor * 100
 *   marketPressure = clamp(pressure, 0, 100)
 *
 * High demand + low stock = high pressure (prices rising)
 * Low demand + high stock = low pressure (prices falling)
 */
export const marketPressureDerivationSchema = z.object({
  formula: z.literal('marketPressure = clamp((1 - stockRatio) * demandFactor * 100, 0, 100)'),
  description: z.literal('Combined stock/demand pressure: high demand + low stock = high pressure'),
})

export const derivationSpecSchema = z.object({
  foodSecurity: foodSecurityDerivationSchema,
  marketPressure: marketPressureDerivationSchema,
})

export type DerivationSpec = z.infer<typeof derivationSpecSchema>

// ─── Market Tick Model (for endDay integration) ─────────────────────────────

/**
 * MarketTickResult: what changed during a market tick.
 * Used for activity log entries and event triggers.
 */
export const marketTickResultSchema = z.object({
  goodId: goodIdSchema,
  oldPrice: nonNegativeIntegerSchema,
  newPrice: nonNegativeIntegerSchema,
  priceDelta: z.number(),
  stockDelta: nonNegativeIntegerSchema,
  demandDelta: z.number().optional(),
  reason: z.enum([
    'supply_shortage',
    'supply_surplus',
    'demand_spike',
    'demand_drop',
    'production',
    'consumption',
    'trade',
    'external_shock',
  ]),
})

export type MarketTickResult = z.infer<typeof marketTickResultSchema>
