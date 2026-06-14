import { goodIdSchema } from './contracts'

/**
 * Compute current market price using stock-and-flow model.
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
export function computePrice(
  basePrice: number,
  stock: number,
  stockCapacity: number,
  demandBaseline: number,
  priceFloor: number,
  priceCeiling: number
): number {
  // Guard against division by zero
  if (stockCapacity <= 0) {
    return priceCeiling
  }

  const stockRatio = Math.min(Math.max(stock / stockCapacity, 0), 1)
  const demandFactor = Math.min(Math.max((demandBaseline / 100) - 1, -0.5), 1.0)
  const stockFactor = 1 - stockRatio
  const priceMultiplier = 1 + demandFactor - (stockFactor * 0.5)
  const rawPrice = basePrice * priceMultiplier

  return Math.max(Math.min(Math.round(rawPrice), priceCeiling), priceFloor)
}

/**
 * Compute food security score (0-100) from food stock.
 *
 * Formula:
 *   ratio = foodStock / foodCapacity (clamped to [0, 1])
 *   foodSecurity = ratio * 100
 *
 * @param foodStock - Current food stock level
 * @param foodCapacity - Maximum food capacity
 * @returns Food security score (0-100)
 */
export function computeFoodSecurity(foodStock: number, foodCapacity: number): number {
  if (foodCapacity <= 0) {
    return 0
  }
  const ratio = Math.min(Math.max(foodStock / foodCapacity, 0), 1)
  return Math.round(ratio * 100)
}

/**
 * Compute market pressure score (0-100) from market state.
 *
 * Formula:
 *   stockRatio = stock / stockCapacity
 *   demandFactor = demandBaseline / 100
 *   pressure = (1 - stockRatio) * demandFactor * 100
 *   marketPressure = clamp(pressure, 0, 100)
 *
 * @param stock - Current stock level
 * @param stockCapacity - Maximum stock capacity
 * @param demandBaseline - Demand baseline (0-200)
 * @returns Market pressure score (0-100)
 */
export function computeMarketPressure(stock: number, stockCapacity: number, demandBaseline: number): number {
  if (stockCapacity <= 0) {
    return 100
  }
  const stockRatio = Math.min(Math.max(stock / stockCapacity, 0), 1)
  const demandFactor = demandBaseline / 100
  const pressure = (1 - stockRatio) * demandFactor * 100
  return Math.max(Math.min(Math.round(pressure), 100), 0)
}

/**
 * Validate that a goodId is one of the shipped goods.
 */
export function isValidGoodId(goodId: string): boolean {
  const result = goodIdSchema.safeParse(goodId)
  return result.success
}
