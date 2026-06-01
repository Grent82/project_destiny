import type { GameState } from '../../domain'

type CityResourceKey = 'foodSecurity' | 'waterAccess' | 'materialStock'
type CityDialKey = 'control' | 'prosperity' | 'unrest' | 'corruption'

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export function adjustCityResource(state: GameState, resource: CityResourceKey, delta: number): GameState {
  return {
    ...state,
    cityResources: {
      ...state.cityResources,
      [resource]: clampPercent(state.cityResources[resource] + delta),
    },
  }
}

export function adjustCityDial(state: GameState, dial: CityDialKey, delta: number): GameState {
  return {
    ...state,
    cityDials: {
      ...state.cityDials,
      [dial]: clampPercent(state.cityDials[dial] + delta),
    },
  }
}

export function adjustDistrictTension(state: GameState, districtId: string, delta: number): GameState {
  return {
    ...state,
    districtTension: {
      ...state.districtTension,
      [districtId]: clampPercent((state.districtTension[districtId] ?? 0) + delta),
    },
  }
}
