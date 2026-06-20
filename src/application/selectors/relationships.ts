import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import type { RelationshipAxes } from '../../domain/relationships/contracts'
import { buildRelationshipKey, getRelationship } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'

export const selectRelationshipWithPlayer =
  (npcId: string) => {
    let selector = relationshipWithPlayerSelectorCache.get(npcId)
    if (!selector) {
      selector = createSelector(
        [(state: RootState) => state.game.relationships],
        (relationships): RelationshipAxes => getRelationship(relationships, 'player', npcId),
      )
      relationshipWithPlayerSelectorCache.set(npcId, selector)
    }
    return selector
  }

export const selectAllRelationships = (state: RootState): Record<string, RelationshipAxes> =>
  state.game.relationships

export const selectKnownAssociates =
  (npcId: string) => {
    let selector = knownAssociatesSelectorCache.get(npcId)
    if (!selector) {
      selector = createSelector(
        [(state: RootState) => state.game.relationships],
        (relationships): { npcId: string; name: string; axes: RelationshipAxes }[] => {
          const results: { npcId: string; name: string; axes: RelationshipAxes }[] = []
          const allNpcIds = contentCatalog.npcs.map((n) => n.id)
          for (const otherId of allNpcIds) {
            if (otherId === npcId) continue
            const key = buildRelationshipKey(npcId, otherId)
            const axes = relationships[key]
            if (!axes) continue
            const otherNpc = contentCatalog.npcsById.get(otherId)
            if (otherNpc) {
              results.push({ npcId: otherId, name: otherNpc.name, axes })
            }
          }
          return results
        },
      )
      knownAssociatesSelectorCache.set(npcId, selector)
    }
    return selector
  }

export const selectGiftHistoryWithPlayer =
  (npcId: string) => {
    let selector = giftHistorySelectorCache.get(npcId)
    if (!selector) {
      selector = createSelector(
        [(state: RootState) => state.game.activityLog],
        (activityLog): { itemId: string; itemName: string; message: string; day: number }[] =>
          activityLog
            .filter((entry) => entry.id.startsWith(`gift::${npcId}::`))
            .map((entry) => {
              const [, , itemId = 'unknown-item'] = entry.id.split('::')
              const itemName = contentCatalog.itemsById.get(itemId)?.name ?? itemId
              return {
                itemId,
                itemName,
                message: entry.message,
                day: entry.day,
              }
            }),
      )
      giftHistorySelectorCache.set(npcId, selector)
    }
    return selector
  }

export const selectCourtshipHistoryWithPlayer =
  (npcId: string) => {
    let selector = courtshipHistorySelectorCache.get(npcId)
    if (!selector) {
      selector = createSelector(
        [(state: RootState) => state.game.activityLog],
        (activityLog): { message: string; day: number }[] =>
          activityLog
            .filter((entry) => entry.id.startsWith(`courtship::${npcId}::`))
            .map((entry) => ({
              message: entry.message,
              day: entry.day,
            })),
      )
      courtshipHistorySelectorCache.set(npcId, selector)
    }
    return selector
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

const relationshipWithPlayerSelectorCache = new Map<string, (state: RootState) => RelationshipAxes>()
const knownAssociatesSelectorCache = new Map<string, (state: RootState) => { npcId: string; name: string; axes: RelationshipAxes }[]>()
const giftHistorySelectorCache = new Map<string, (state: RootState) => { itemId: string; itemName: string; message: string; day: number }[]>()
const courtshipHistorySelectorCache = new Map<string, (state: RootState) => { message: string; day: number }[]>()
