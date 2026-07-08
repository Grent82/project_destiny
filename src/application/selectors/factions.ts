import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import type { NpcDefinition } from '../../domain/npc/contracts'

export const selectFactionSummaries = createSelector(
  (state: RootState) => state.game.factionStates,
  (state: RootState) => state.game.factionStandings,
  (factionStates, factionStandings) =>
    factionStates.map((faction) => ({
      factionId: faction.factionId,
      name: contentCatalog.factionsById.get(faction.factionId)?.name ?? faction.factionId,
      agenda: contentCatalog.factionsById.get(faction.factionId)?.agenda ?? 'Unknown agenda',
      power: faction.power,
      wealth: faction.wealth,
      security: faction.security,
      standingWithPlayer: factionStandings[faction.factionId] ?? 0,
      activePressure: faction.activePressure,
    })),
)

/**
 * Canonical faction standing tier label (destiny-09wr). FactionsScreen and LedgerScreen each used
 * to compute this independently with different boundaries, disagreeing on the same standing value
 * (e.g. +10 was 'Neutral' on one screen, 'Warm' on the other). This is the single source of truth.
 */
export function getFactionStandingTier(standing: number): string {
  if (standing <= -60) return 'Hostile'
  if (standing <= -20) return 'Cold'
  if (standing <= 20) return 'Neutral'
  if (standing <= 60) return 'Warm'
  return 'Allied'
}

export const selectFactionStandings = (state: RootState) => state.game.factionStandings

export const selectFactionStanding =
  (factionId: string) =>
  (state: RootState): number =>
    state.game.factionStandings[factionId] ?? 0

export const selectCityDials = (state: RootState) => state.game.cityDials

export const selectAllFactions = createSelector(
  (state: RootState) => state.game.factionStandings,
  (factionStandings) =>
    contentCatalog.factions.map((faction) => ({
      factionId: faction.id,
      name: faction.name,
      primer: faction.primer,
      agenda: faction.agenda,
      standing: factionStandings[faction.id] ?? 0,
    })),
)

export const selectCityStability = (state: RootState) => state.game.cityStability ?? 60

export const selectFactionLeader = (factionId: string) =>
  (state: RootState): NpcDefinition | undefined => {
    const factionState = state.game.factionStates.find((f) => f.factionId === factionId)
    const leaderNpcId = factionState?.leaderNpcId
    if (!leaderNpcId) return undefined
    return contentCatalog.npcsById.get(leaderNpcId)
  }

export const selectAllFactionLeaders = createSelector(
  (state: RootState) => state.game.factionStates,
  (factionStates) =>
    factionStates
      .map((faction) => {
        const leaderNpcId = faction.leaderNpcId
        if (!leaderNpcId) return null
        const leader = contentCatalog.npcsById.get(leaderNpcId)
        if (!leader) return null
        const factionDef = contentCatalog.factionsById.get(faction.factionId)
        return {
          factionId: faction.factionId,
          factionName: factionDef?.name ?? faction.factionId,
          leaderId: leaderNpcId,
          leaderName: leader.name,
          traits: leader.startingTraits,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
)

/**
 * Select faction agenda values for display.
 */
export const selectFactionAgendas = createSelector(
  (state: RootState) => state.game.factionStates,
  (factionStates) =>
    factionStates
      .map((faction) => {
        const factionDef = contentCatalog.factionsById.get(faction.factionId)
        return {
          factionId: faction.factionId,
          factionName: factionDef?.name ?? faction.factionId,
          agendaValues: factionDef?.agendaAxes?.values ?? [],
          proposesWhen: factionDef?.agendaAxes?.proposesWhen,
        }
      })
      .filter((f) => f.agendaValues.length > 0),
)
