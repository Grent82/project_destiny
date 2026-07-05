import type { GameState } from '../../../domain/game/contracts'
import type { NpcRuntimeState } from '../../../domain/npc/contracts'
import type { TransferItemParams } from '../../../domain/inventory/contracts'
import { buildRelationshipKey } from '../../../domain/relationships/contracts'
import { contentCatalog } from '../../content/contentCatalog'
import { appendActivityLogEntry } from '../activityLog'
import { applyRelationshipDelta } from '../adjustRelationship'
import { transferItem } from '../inventory/transferItem'
import { findNpcInventoryItemByCategory } from '../npcInventoryHelpers'
import { resolveGiftOutcome } from '../giftItem'

/**
 * NPC-to-NPC gift-giving (destiny-bkln.g1un). Mirrors giftItemToNpc's transfer path exactly
 * (per its own bd notes: build on destiny-su15.3/su15.5, not a separate ownership path) — the
 * npc_inventory -> npc_inventory branch in transferItem.ts is NPC-id-agnostic, no player-specific
 * assumption, so it works unmodified for two NPCs.
 */

function isColocatedForGifting(giver: NpcRuntimeState, target: NpcRuntimeState): boolean {
  if (target.captivityState?.status === 'captive' || target.captivityState?.status === 'missing') return false
  if (target.status === 'ward') return false
  if (giver.assignment === 'deployed' || target.assignment === 'deployed') return false
  return giver.assignedDistrictId === target.assignedDistrictId
}

/** Finds the co-located other roster NPC with the highest affinity toward `giverId`. */
function findGiftTarget(state: GameState, giver: NpcRuntimeState): NpcRuntimeState | null {
  let best: NpcRuntimeState | null = null
  let bestAffinity = -Infinity
  for (const candidate of state.npcRuntimeStates) {
    if (candidate.npcId === giver.npcId) continue
    if (!candidate.playerRosterMember) continue
    if (!isColocatedForGifting(giver, candidate)) continue
    const affinity = state.relationships[buildRelationshipKey(giver.npcId, candidate.npcId)]?.affinity ?? 0
    if (affinity > bestAffinity) {
      bestAffinity = affinity
      best = candidate
    }
  }
  return best
}

/** Whether this NPC has a gift item and an eligible co-located target to give it to. */
export function npcCanGiveGift(state: GameState, npc: NpcRuntimeState): boolean {
  if (!findNpcInventoryItemByCategory(state, npc.npcId, 'gift')) return false
  return findGiftTarget(state, npc) !== null
}

/** NPC gives a gift item from their own inventory to the co-located roster NPC they like most. */
export function npcGiveGift(state: GameState, npcId: string): GameState {
  const giver = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!giver) return state

  const found = findNpcInventoryItemByCategory(state, npcId, 'gift')
  if (!found) return state

  const target = findGiftTarget(state, giver)
  if (!target) return state

  const item = contentCatalog.itemsById.get(found.itemDef.id)
  if (!item) return state

  const transferParams: TransferItemParams = {
    fromType: 'npc_inventory',
    fromId: npcId,
    toType: 'npc_inventory',
    toId: target.npcId,
    itemInstanceId: found.itemInstanceId,
    quantity: 1,
  }
  let next = transferItem(state, transferParams)
  if (next === state) return state

  const outcome = resolveGiftOutcome(item, target)
  if (outcome.affinity !== 0) { const r = applyRelationshipDelta(next, npcId, target.npcId, 'affinity', outcome.affinity); next = r.state }
  if (outcome.respect !== 0) { const r = applyRelationshipDelta(next, npcId, target.npcId, 'respect', outcome.respect); next = r.state }
  if (outcome.trust !== 0) { const r = applyRelationshipDelta(next, npcId, target.npcId, 'trust', outcome.trust); next = r.state }
  if (outcome.loyalty !== 0) { const r = applyRelationshipDelta(next, npcId, target.npcId, 'loyalty', outcome.loyalty); next = r.state }

  return appendActivityLogEntry(
    next,
    'system',
    `${giver.name} gave ${item.name} to ${target.name}. ${outcome.reaction}`,
  )
}
