import type { GameState } from '../../domain/game/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { formatMarks } from '../../domain/game/currency'

/**
 * Computes the sell price for an owned item at the current district.
 * Base price comes from the item's tradeValue effect (or 50% of item value as fallback).
 * District marketPressure scales the price: 0 → ×0.7, 50 → ×1.0, 100 → ×1.3.
 */
export function computeSellPrice(state: GameState, instanceId: string): number {
  const owned = state.ownedItems.find((o) => o.instanceId === instanceId)
  if (!owned) return 0

  const def = contentCatalog.itemsById.get(owned.itemId)
  if (!def) return 0

  const tradeEffect = def.effects?.find((e) => e['type'] === 'tradeValue')
  const baseValue = tradeEffect ? Number(tradeEffect['value']) : Math.floor(def.value * 0.5)

  const districtState = state.districts.find((d) => d.districtId === state.currentDistrictId)
  const marketPressure = districtState?.marketPressure ?? 50
  const multiplier = 0.7 + (marketPressure / 100) * 0.6

  return Math.max(1, Math.floor(baseValue * multiplier))
}

export function sellItem(state: GameState, instanceId: string): GameState {
  const owned = state.ownedItems.find((o) => o.instanceId === instanceId)
  if (!owned) return state

  const def = contentCatalog.itemsById.get(owned.itemId)
  if (!def) return state

  const sellPrice = computeSellPrice(state, instanceId)

  return {
    ...state,
    money: state.money + sellPrice,
    ownedItems: state.ownedItems.filter((o) => o.instanceId !== instanceId),
    activityLog: [
      {
        id: `log-${state.day}-${state.timeSlot}-sell-${instanceId}`,
        day: state.day,
        timeSlot: state.timeSlot,
        category: 'economy' as const,
        message: `Sold ${def.name} for ${formatMarks(sellPrice)}.`,
      },
      ...state.activityLog,
    ].slice(0, 50),
  }
}
