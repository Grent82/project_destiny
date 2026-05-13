import type { RootState } from '../store/gameStore'
import type { RelationshipAxes } from '../../domain/relationships/contracts'
import { buildRelationshipKey, getRelationship } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'

export const selectRelationshipWithPlayer =
  (npcId: string) =>
  (state: RootState): RelationshipAxes => {
    return getRelationship(state.game.relationships, 'player', npcId)
  }

export const selectAllRelationships = (state: RootState): Record<string, RelationshipAxes> =>
  state.game.relationships

export const selectKnownAssociates =
  (npcId: string) =>
  (state: RootState): { npcId: string; name: string; axes: RelationshipAxes }[] => {
    const results: { npcId: string; name: string; axes: RelationshipAxes }[] = []
    const allNpcIds = contentCatalog.npcs.map((n) => n.id)
    for (const otherId of allNpcIds) {
      if (otherId === npcId) continue
      const key = buildRelationshipKey(npcId, otherId)
      const axes = state.game.relationships[key]
      if (!axes) continue
      const otherNpc = contentCatalog.npcsById.get(otherId)
      if (otherNpc) {
        results.push({ npcId: otherId, name: otherNpc.name, axes })
      }
    }
    return results
  }

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
