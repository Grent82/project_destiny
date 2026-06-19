import type { EconomicAgent } from '../../domain/economy/contracts'
import type { GameState } from '../../domain/game/contracts'

export type ProducerLocation = 'inside-walls' | 'field-belt' | 'corridor-fed'

export const PRODUCER_YIELD_MODIFIERS: Record<ProducerLocation, number> = {
  'inside-walls': 1.0,
  'field-belt': 0.8,
  'corridor-fed': 1.2,
}

export interface Producer extends EconomicAgent {
  producerLocation: ProducerLocation
  baselineYield: number
  assignedLabor: number
  requiredLabor: number
}

export const BOUND_KITCHEN_HAND_YIELD = 6

export const BASE_CORRIDOR_IMPORT = 500

export const CORRIDOR_THROUGHPUT_MODIFIERS: Record<GameState['cityResources']['corridorStatus'], number> = {
  open: 1.0,
  disrupted: 0.3,
  blocked: 0.0,
}

const DEFAULT_DECISION_POLICY: EconomicAgent['decisionPolicy'] = {
  policyType: 'survival_first',
  riskTolerance: 50,
  targetStockBuffer: 0.3,
}

function buildProducer(
  agentId: string,
  role: EconomicAgent['role'],
  producerLocation: ProducerLocation,
  baselineYield: number,
  assignedLabor: number,
  requiredLabor: number,
): Producer {
  return {
    agentId,
    role,
    money: 0,
    inventory: {},
    needs: {},
    decisionPolicy: DEFAULT_DECISION_POLICY,
    productionCapacity: { food: baselineYield },
    productionCost: {},
    producerLocation,
    baselineYield,
    assignedLabor,
    requiredLabor,
  }
}

export function deriveFoodSecurityFromStock(foodStock: number, foodCapacity: number): number {
  if (foodCapacity <= 0) return 0
  const ratio = Math.min(Math.max(foodStock / foodCapacity, 0), 1)
  return Math.round(ratio * 100)
}

export function syncFoodSecurityToStock(state: GameState): GameState {
  const derived = deriveFoodSecurityFromStock(
    state.cityResources.foodStock,
    state.cityResources.foodCapacity,
  )

  if (derived === state.cityResources.foodSecurity) return state

  return {
    ...state,
    cityResources: {
      ...state.cityResources,
      foodSecurity: derived,
    },
  }
}

export function getCorridorImportAmount(
  corridorStatus: GameState['cityResources']['corridorStatus'],
): number {
  return Math.round(BASE_CORRIDOR_IMPORT * CORRIDOR_THROUGHPUT_MODIFIERS[corridorStatus])
}

export function buildCanonicalFoodProducers(state: GameState): Producer[] {
  const kitchen = state.house.rooms.find((room) => room.roomId === 'room-kitchen')
  const houseLabor = kitchen?.state === 'intact' ? 2 : 0
  const boundKitchenHands =
    kitchen?.state === 'intact'
      ? state.roster.filter(
          (npc) =>
            npc.assignment === 'working' &&
            npc.roomAssignment === 'room-kitchen' &&
            npc.bondStatus?.holderId === 'player' &&
            npc.bondStatus?.ownerType === 'player',
        ).length
      : 0

  const producers = [
    buildProducer('producer-house-kitchen-gardens', 'house', 'inside-walls', 18, houseLabor, 2),
    buildProducer('producer-inner-gardens', 'district', 'inside-walls', 24, 3, 3),
    buildProducer('producer-field-belt-shares', 'district', 'field-belt', 50, 5, 5),
    buildProducer('producer-corridor-fed-farms', 'district', 'corridor-fed', 32, 4, 4),
  ]

  if (boundKitchenHands > 0) {
    producers.push(
      buildProducer(
        'producer-bound-kitchen-service',
        'house',
        'inside-walls',
        BOUND_KITCHEN_HAND_YIELD * boundKitchenHands,
        boundKitchenHands,
        boundKitchenHands,
      ),
    )
  }

  return producers
}

export function calculateFoodProductionTotal(producers: readonly Producer[]): number {
  return producers.reduce((total, producer) => {
    const locationModifier = PRODUCER_YIELD_MODIFIERS[producer.producerLocation]
    const laborFactor = Math.min(producer.assignedLabor / (producer.requiredLabor || 1), 1.0)
    const produced = Math.round(producer.baselineYield * locationModifier * laborFactor)
    return total + Math.max(0, produced)
  }, 0)
}
