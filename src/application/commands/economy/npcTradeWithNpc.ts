import type { GameState } from '../../../domain/game/contracts'
import type { NpcRuntimeState } from '../../../domain/npc/contracts'
import type { TransferItemParams } from '../../../domain/inventory/contracts'
import { buildRelationshipKey } from '../../../domain/relationships/contracts'
import { getJobForNpc } from '../../content/jobCatalog'
import { appendActivityLogEntry } from '../activityLog'
import { transferItem } from '../inventory/transferItem'
import { findNpcInventoryItemByTag, type FoundInventoryItem } from '../npcInventoryHelpers'

/**
 * NPC-to-NPC trade (destiny-bkln.cq28). An acting NPC seeks a co-located roster partner who owns
 * an item matching what the acting NPC's job/specialty wants (via getJobForNpc — the same
 * job-to-district-hint mapping spendingAgency.ts already uses for "what does this NPC's work
 * involve"), and buys it with their own personalFunds. Item moves via the canonical transferItem
 * core; money moves directly on personalFunds (not part of transferItem's scope — personalFunds
 * lives on NpcRuntimeState, not inventoryState).
 */

const JOB_SKILL_TO_WANTED_TAG: Partial<Record<string, string>> = {
  crafting: 'repair',
  engineering: 'repair',
  security: 'repair',
  medicine: 'healing',
  survival: 'food',
  negotiation: 'gift',
}
const DEFAULT_WANTED_TAG = 'food'

function wantedTagForNpc(npc: NpcRuntimeState): string {
  const job = getJobForNpc(npc.skills)
  return JOB_SKILL_TO_WANTED_TAG[job.primarySkill] ?? DEFAULT_WANTED_TAG
}

function isColocatedForTrade(a: NpcRuntimeState, b: NpcRuntimeState): boolean {
  if (a.assignment === 'deployed' || b.assignment === 'deployed') return false
  if (b.captivityState?.status === 'captive' || b.captivityState?.status === 'missing') return false
  if (b.status === 'ward') return false
  return a.assignedDistrictId === b.assignedDistrictId
}

/** Price multiplier scales 0.8 (high affinity, generous) to 1.2 (low/negative affinity, steep). */
function priceMultiplierForAffinity(affinity: number): number {
  const clamped = Math.max(-100, Math.min(100, affinity))
  return 1.2 - ((clamped + 100) / 200) * 0.4
}

interface TradeMatch {
  partner: NpcRuntimeState
  found: FoundInventoryItem
  price: number
}

function findTradeMatch(state: GameState, acting: NpcRuntimeState): TradeMatch | null {
  const wantedTag = wantedTagForNpc(acting)
  for (const partner of state.npcRuntimeStates) {
    if (partner.npcId === acting.npcId) continue
    if (!partner.playerRosterMember) continue
    if (!isColocatedForTrade(acting, partner)) continue

    const found = findNpcInventoryItemByTag(state, partner.npcId, wantedTag)
    if (!found) continue

    const affinity = state.relationships[buildRelationshipKey(acting.npcId, partner.npcId)]?.affinity ?? 0
    const price = Math.max(1, Math.round(found.itemDef.value * priceMultiplierForAffinity(affinity)))
    return { partner, found, price }
  }
  return null
}

/** Whether this NPC can currently find and afford a trade with a co-located partner. */
export function npcCanTradeWithNpc(state: GameState, npc: NpcRuntimeState): boolean {
  const match = findTradeMatch(state, npc)
  if (!match) return false
  const totalFunds = npc.personalFunds.carriedCash + npc.personalFunds.savings
  return totalFunds >= match.price
}

/** NPC buys an item they want from a co-located roster partner's inventory, paying from personalFunds. */
export function npcTradeWithNpc(state: GameState, npcId: string): GameState {
  const acting = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!acting) return state

  const match = findTradeMatch(state, acting)
  if (!match) return state

  const totalFunds = acting.personalFunds.carriedCash + acting.personalFunds.savings
  if (totalFunds < match.price) return state

  const transferParams: TransferItemParams = {
    fromType: 'npc_inventory',
    fromId: match.partner.npcId,
    toType: 'npc_inventory',
    toId: npcId,
    itemInstanceId: match.found.itemInstanceId,
    quantity: 1,
  }
  let next = transferItem(state, transferParams)
  if (next === state) return state

  const fromCarried = Math.min(acting.personalFunds.carriedCash, match.price)
  const fromSavings = match.price - fromCarried

  next = {
    ...next,
    npcRuntimeStates: next.npcRuntimeStates.map((n) => {
      if (n.npcId === npcId) {
        return {
          ...n,
          personalFunds: {
            ...n.personalFunds,
            carriedCash: n.personalFunds.carriedCash - fromCarried,
            savings: n.personalFunds.savings - fromSavings,
          },
        }
      }
      if (n.npcId === match.partner.npcId) {
        return { ...n, personalFunds: { ...n.personalFunds, carriedCash: n.personalFunds.carriedCash + match.price } }
      }
      return n
    }),
  }

  return appendActivityLogEntry(
    next,
    'economy',
    `${acting.name} buys ${match.found.itemDef.name} from ${match.partner.name} for ${match.price} marks.`,
  )
}
