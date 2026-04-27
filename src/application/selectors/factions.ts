import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

export function selectFactionSummaries(state: RootState) {
  return state.game.factionStates.map((faction) => ({
    factionId: faction.factionId,
    name:
      contentCatalog.factionsById.get(faction.factionId)?.name ?? faction.factionId,
    agenda:
      contentCatalog.factionsById.get(faction.factionId)?.agenda ?? 'Unknown agenda',
    power: faction.power,
    wealth: faction.wealth,
    security: faction.security,
    standingWithPlayer: faction.standingWithPlayer,
    activePressure: faction.activePressure,
  }))
}
