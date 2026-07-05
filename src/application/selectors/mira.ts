import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import { resolveSiteRuntime } from '../commands/siteLifecycle'

const MIRA_CUSTODY_HANDLER_FLAG = 'mira-custody-handler'
const MIRA_CUSTODY_GUARD_FLAG = 'mira-custody-guard'
const MIRA_TANNERY_SITE_ID = 'site-poi-pale-old-tannery'

function resolveNpcName(npcId: string): string {
  return (
    contentCatalog.npcsById.get(npcId)?.name ??
    contentCatalog.enemyNpcsById.get(npcId)?.name ??
    npcId
  )
}

export interface MiraCustodyChainPresence {
  occupancyId: string
  npcId: string
  npcName: string
  roomId: string
  roomName: string | null
}

export interface MiraCustodyChain {
  siteId: string
  siteName: string
  handler: {
    npcId: string
    npcName: string
  }
  guardPresences: MiraCustodyChainPresence[]
}

export const selectMiraCustodyChain = createSelector(
  [(state: RootState) => state.game],
  (game): MiraCustodyChain | null => {
    const runtime = resolveSiteRuntime(game, MIRA_TANNERY_SITE_ID)
    if (!runtime) return null

    const handlerStates = game.npcRuntimeStates.filter((entry) =>
      (entry.flags ?? []).includes(MIRA_CUSTODY_HANDLER_FLAG),
    )
    if (handlerStates.length !== 1) return null

    const handler = handlerStates[0]
    if (!handler) return null

    const guardIds = new Set(
      game.npcRuntimeStates
        .filter((entry) => (entry.flags ?? []).includes(MIRA_CUSTODY_GUARD_FLAG))
        .map((entry) => entry.npcId),
    )
    const roomNames = new Map(runtime.roomInstances.map((room) => [room.roomId, room.name]))

    const guardPresences = game.npcSitePresences
      .filter(
        (presence) =>
          presence.siteId === MIRA_TANNERY_SITE_ID &&
          presence.role === 'guard' &&
          presence.status === 'present' &&
          presence.roomId !== null &&
          guardIds.has(presence.npcId),
      )
      .map((presence) => ({
        occupancyId: presence.occupancyId,
        npcId: presence.npcId,
        npcName: resolveNpcName(presence.npcId),
        roomId: presence.roomId!,
        roomName: roomNames.get(presence.roomId!) ?? null,
      }))

    if (guardPresences.length < 2) return null
    if (guardPresences.some((presence) => presence.roomName === null)) return null

    return {
      siteId: MIRA_TANNERY_SITE_ID,
      siteName: runtime.name,
      handler: {
        npcId: handler.npcId,
        npcName: resolveNpcName(handler.npcId),
      },
      guardPresences,
    }
  },
)
