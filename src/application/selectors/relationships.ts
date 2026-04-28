import type { RootState } from '../store/gameStore'
import type { RelationshipAxes } from '../../domain/relationships/contracts'
import { buildRelationshipKey } from '../../domain/relationships/contracts'

const EMPTY_AXES: RelationshipAxes = { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }

export const selectRelationshipWithPlayer =
  (npcId: string) =>
  (state: RootState): RelationshipAxes => {
    const key = `player-${npcId}`
    return state.game.relationships[key] ?? EMPTY_AXES
  }

export const selectAllRelationships = (state: RootState): Record<string, RelationshipAxes> =>
  state.game.relationships

/**
 * Average loyalty across selected squad members' relationships.
 * Used to show squad cohesion in MissionPrepScreen.
 */
export const selectSquadCohesion = (state: RootState): number => {
  const squad = state.game.selectedSquadNpcIds ?? []
  if (squad.length === 0) return 50

  const total = squad.reduce((sum, npcId) => {
    const key = buildRelationshipKey('player', npcId)
    const rel = state.game.relationships?.[key]
    return sum + (rel?.loyalty ?? 50)
  }, 0)

  return Math.round(total / squad.length)
}
