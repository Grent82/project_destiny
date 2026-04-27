import type { GameState } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'

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
  return appendActivityLogEntry(
    { ...state, currentDistrictId: districtId },
    'system',
    message,
  )
}
