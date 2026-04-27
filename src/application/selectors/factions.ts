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

export const selectFactionStandings = (state: RootState) => state.game.factionStandings

export const selectFactionStanding =
  (factionId: string) =>
  (state: RootState): number =>
    state.game.factionStandings[factionId] ?? 0

export const selectCityDials = (state: RootState) => state.game.cityDials

export function selectAllFactions(state: RootState) {
  return contentCatalog.factions.map((faction) => ({
    factionId: faction.id,
    name: faction.name,
    agenda: faction.agenda,
    standing: state.game.factionStandings[faction.id] ?? 0,
  }))
}
