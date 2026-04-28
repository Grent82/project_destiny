import type { GameState } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { generateDistrictHireOffers } from './generateHireOffers'
import { evaluateEvents } from './evaluateEvents'

function buildTravelMessage(name: string, dangerLevel: number): string {
  if (dangerLevel >= 5) return `You move through ${name}. The street remembers you.`
  if (dangerLevel >= 4) return `You enter ${name}. It costs something just to be here.`
  return `You make your way to ${name}.`
}

export function travelToDistrict(state: GameState, districtId: string): GameState {
  const district = contentCatalog.districtsById.get(districtId)
  const name = district?.name ?? districtId
  const dangerLevel = district?.dangerLevel ?? 1
  const message = buildTravelMessage(name, dangerLevel)

  const nextState: GameState = { ...state, currentDistrictId: districtId, availableForHire: [...state.availableForHire] }
  generateDistrictHireOffers(nextState, districtId)

  const withLog = appendActivityLogEntry(nextState, 'system', message)
  return evaluateEvents(withLog)
}
