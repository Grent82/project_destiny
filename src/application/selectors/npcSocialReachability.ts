/**
 * Canonical NPC presence/reachability contract for social actions.
 *
 * Replaces screen-local presence logic (previously inline in NpcDetailPanel.tsx) with one
 * shared model. Returns structured reasons, not just a yes/no boolean, so the UI can explain
 * the actual blocker instead of a generic "unavailable" message.
 *
 * See docs/analysis/roster-npc-spatial-contract-2026-07-03.md for the underlying presence
 * precedence rule (captive/missing > out-of-house district > house). A deployed NPC's
 * assignedDistrictId falls through to the 'assigned-other-district' reason below.
 */
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import type { CaptivityState, NpcRuntimeState } from '../../domain/npc/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { getNpcCaptivityState } from '../commands/captivityRegistry'

export type NpcReachabilityReason =
  | 'eligible'
  | 'captive'
  | 'missing'
  | 'transferred'
  | 'assigned-other-district'
  | 'player-away-from-house'

export interface NpcSocialReachability {
  reason: NpcReachabilityReason
  /** Whether ordinary conversation (e.g. Speak/dialogue) is still possible. */
  canConverseRemotely: boolean
  /** Whether private in-person actions (Talk Deeply, Court, gifts, dates, intimacy) are allowed. */
  canUsePrivateActions: boolean
  /** Player-facing explanation of the blocker, or null when fully eligible. */
  blockerMessage: string | null
}

function formatDistrictName(districtId: string | null | undefined): string {
  if (!districtId) return 'an unknown district'
  return contentCatalog.districtsById.get(districtId)?.name ?? districtId.replace('district-', '').replace(/-/g, ' ')
}

function eligible(): NpcSocialReachability {
  return { reason: 'eligible', canConverseRemotely: true, canUsePrivateActions: true, blockerMessage: null }
}

function computeReachability(
  npc: NpcRuntimeState | undefined,
  captivity: CaptivityState | undefined,
  houseDistrictId: string,
  currentDistrictId: string | null,
): NpcSocialReachability {
  if (!npc) return eligible()

  const npcName = npc.name

  if (captivity?.status === 'captive') {
    return {
      reason: 'captive',
      canConverseRemotely: false,
      canUsePrivateActions: false,
      blockerMessage: `${npcName} is being held captive and is not reachable for conversation or private time right now.`,
    }
  }

  if (captivity?.status === 'missing') {
    return {
      reason: 'missing',
      canConverseRemotely: false,
      canUsePrivateActions: false,
      blockerMessage: `${npcName} is missing. Their whereabouts are unknown.`,
    }
  }

  if (npc.assignment === 'transferred') {
    return {
      reason: 'transferred',
      canConverseRemotely: true,
      canUsePrivateActions: false,
      blockerMessage: `${npcName} has been transferred away and is no longer available for private time with the house.`,
    }
  }

  if (npc.assignedDistrictId && npc.assignedDistrictId !== houseDistrictId) {
    const playerDistrictLabel = formatDistrictName(currentDistrictId)
    return {
      reason: 'assigned-other-district',
      canConverseRemotely: true,
      canUsePrivateActions: false,
      blockerMessage: `${npcName} is currently occupied in ${formatDistrictName(npc.assignedDistrictId)}. You are in ${playerDistrictLabel}. Meet in person before asking for private time.`,
    }
  }

  const isPlayerAtHouse = currentDistrictId === houseDistrictId
  if (!isPlayerAtHouse) {
    const playerDistrictLabel = formatDistrictName(currentDistrictId)
    const houseDistrictLabel = formatDistrictName(houseDistrictId)
    return {
      reason: 'player-away-from-house',
      canConverseRemotely: true,
      canUsePrivateActions: false,
      blockerMessage: `You are in ${playerDistrictLabel}. ${npcName} is at House Valdris in ${houseDistrictLabel}. Return to the house before asking for private time together.`,
    }
  }

  return eligible()
}

const reachabilitySelectorCache = new Map<string, (state: RootState) => NpcSocialReachability>()

export const selectNpcSocialReachability =
  (npcId: string) => {
    let selector = reachabilitySelectorCache.get(npcId)
    if (!selector) {
      selector = createSelector(
        [
          (state: RootState) => state.game.roster.find((r) => r.npcId === npcId),
          (state: RootState) => getNpcCaptivityState(state.game, npcId),
          (state: RootState) => state.game.houseDistrictId,
          (state: RootState) => state.game.currentDistrictId,
        ],
        computeReachability,
      )
      reachabilitySelectorCache.set(npcId, selector)
    }
    return selector
  }
