import type { GameState } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { generateDistrictHireOffers } from './generateHireOffers'

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

  let nextState: GameState = { ...state, currentDistrictId: districtId, availableForHire: [...state.availableForHire] }
  generateDistrictHireOffers(nextState, districtId)
  nextState = appendActivityLogEntry(nextState, 'system', message)

  const controlFactionId = district?.controllingFactionId
  if (controlFactionId) {
    const standing = nextState.factionStandings[controlFactionId] ?? 0
    if (standing <= -50) {
      nextState = appendActivityLogEntry(
        nextState,
        'system',
        `Moving through hostile territory. ${controlFactionId.replace('faction-', '')} enforcers watch every corner.`,
      )
      nextState = {
        ...nextState,
        roster: nextState.roster.map((npc) =>
          npc.assignment === 'idle' || npc.assignment === 'deployed'
            ? { ...npc, states: { ...npc.states, stress: Math.min(100, npc.states.stress + 3) } }
            : npc,
        ),
      }
    } else if (standing <= -30) {
      nextState = appendActivityLogEntry(
        nextState,
        'system',
        'You are not welcome here. Eyes follow you through the street.',
      )
    }
  }

  return nextState
}
