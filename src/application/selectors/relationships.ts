import type { RootState } from '../store/gameStore'
import type { RelationshipAxes } from '../../domain/relationships/contracts'

const EMPTY_AXES: RelationshipAxes = { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }

export const selectRelationshipWithPlayer =
  (npcId: string) =>
  (state: RootState): RelationshipAxes => {
    const key = `player-${npcId}`
    return state.game.relationships[key] ?? EMPTY_AXES
  }

export const selectAllRelationships = (state: RootState): Record<string, RelationshipAxes> =>
  state.game.relationships
