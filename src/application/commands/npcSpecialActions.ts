import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import type { TransferItemParams } from '../../domain/inventory/contracts'
import type { Rng } from './seededRng'
import { appendActivityLogEntry } from './activityLog'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { calculateMercenaryContractWage } from './wageRates'
import { createEmployment } from './employment/createEmployment'
import { contentCatalog } from '../content/contentCatalog'
import { resolveShopPricingBreakdown } from '../content/shopPricing'
import { transferItem } from './inventory/transferItem'

/**
 * NPC Special Actions (destiny-ddqf)
 *
 * Real implementations for resource-gather, scavenge, seek-employment, host-gathering, and
 * shop-for-goods (destiny-2igf — built on destiny-su15.3/su15.4's canonical transfer core and
 * persistent shop stock, once those landed). recruit-member stays a placeholder — no NPC
 * group/squad runtime concept exists to add a member to (see destiny-l2ex's
 * lead-group/support-group for the same gap).
 */

/** NPC gathers raw materials for the house, feeding the (currently unpopulated) materialStock. */
export function npcResourceGather(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const gain = Math.max(
    1,
    Math.round(2 + (npc.skills.survival - 50) / 15 + (npc.attributes.endurance - 50) / 20 + (npc.traits.prudence - 50) / 25),
  )

  const next: GameState = {
    ...state,
    cityResources: {
      ...state.cityResources,
      materialStock: Math.min(100, state.cityResources.materialStock + gain),
    },
  }
  return appendActivityLogEntry(next, 'system', `${npc.name} gathers useful materials for the house.`)
}

/** NPC scavenges for scrap materials — a smaller, endurance-focused counterpart to resource-gather. */
export function npcScavenge(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const gain = Math.max(1, Math.round(1 + (npc.skills.survival - 50) / 20 + (npc.attributes.endurance - 50) / 20))

  const next: GameState = {
    ...state,
    cityResources: {
      ...state.cityResources,
      materialStock: Math.min(100, state.cityResources.materialStock + gain),
    },
  }
  return appendActivityLogEntry(next, 'system', `${npc.name} scavenges scrap from the district.`)
}

/**
 * NPC seeks day labor, creating a real employment contract via the existing (previously
 * unfed-by-idle-NPCs) createEmployment command. No-ops if the NPC already has an active
 * employment contract.
 */
export function npcSeekEmployment(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state
  if (npc.currentEmployment && npc.currentEmployment.status !== 'completed' && npc.currentEmployment.status !== 'failed' && npc.currentEmployment.status !== 'cancelled') {
    return state
  }

  const wagePerDay = calculateMercenaryContractWage(npc.skills)
  const districtLabel = npc.assignedDistrictId ?? 'the district'

  return createEmployment(state, {
    employerId: 'day-labor',
    employerType: 'faction',
    employeeId: npc.npcId,
    taskType: 'work',
    deadlineDay: state.day + 5,
    wagePerDay,
    description: `Day labor found in ${districtLabel}`,
  })
}

/**
 * NPC hosts a small gathering among other idle roster NPCs — an autonomous, NPC-to-NPC
 * counterpart to hostGathering.ts (which is player-initiated only). Requires an intact
 * reception/quarters/study room, matching hostGathering.ts's room requirement. Scoped to
 * playerRosterMember (destiny-rama.9) — a house gathering invites the player's own operatives,
 * not world/story/captive persons sharing the unified runtime list.
 */
export function npcHostGathering(state: GameState, npcId: string, rng: Rng): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const room = state.house.rooms.find(
    (r) => r.state === 'intact' && (r.roomFunction === 'reception' || r.roomFunction === 'quarters' || r.roomFunction === 'study'),
  )
  if (!room) return state

  const guests = state.npcRuntimeStates
    .filter((r) => r.npcId !== npcId && r.playerRosterMember && r.assignment === 'idle')
    .sort((a, b) => {
      const relA = state.relationships[buildRelationshipKey(npcId, a.npcId)]?.affinity ?? 0
      const relB = state.relationships[buildRelationshipKey(npcId, b.npcId)]?.affinity ?? 0
      return relB - relA
    })
    .slice(0, 3)
  if (guests.length === 0) return state

  const successChance = Math.max(
    0.2,
    Math.min(0.9, 0.4 + (npc.skills.performance - 50) / 150 + (npc.attributes.presence - 50) / 150),
  )
  const success = rng() < successChance
  const gain = success ? 3 : 1

  let next = state
  for (const guest of guests) {
    const key = buildRelationshipKey(npcId, guest.npcId)
    const reverseKey = buildRelationshipKey(guest.npcId, npcId)
    const rel = state.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
    const reverseRel = state.relationships[reverseKey] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
    next = {
      ...next,
      relationships: {
        ...next.relationships,
        [key]: { ...rel, affinity: Math.max(-100, Math.min(100, rel.affinity + gain)) },
        [reverseKey]: { ...reverseRel, affinity: Math.max(-100, Math.min(100, reverseRel.affinity + gain)) },
      },
    }
  }

  const guestNames = guests.map((g) => g.name).join(', ')
  const message = success
    ? `${npc.name} hosts a gathering in ${room.name} with ${guestNames}. A good evening.`
    : `${npc.name} hosts a gathering in ${room.name} with ${guestNames}, though it's a quiet, awkward affair.`
  return appendActivityLogEntry(next, 'system', message)
}

/** Negotiation/administration haggle down the sticker price: 0% below skill 50, up to 20% at skill 100. */
function negotiationDiscountForSkill(npc: NpcRuntimeState): number {
  const skill = Math.max(npc.skills.negotiation, npc.skills.administration)
  return Math.max(0, Math.min(0.2, (skill - 50) / 250))
}

interface ShopMatch {
  shop: (typeof contentCatalog.shops)[number]
  shopStockContainerId: string
  offerItemId: string
  itemInstanceId: string
  price: number
}

/** Mirrors shopPricing.ts's district-controlling-faction lookup (used for offer.minStanding gating). */
function districtControlStanding(state: GameState, districtId: string): number {
  const districtState = state.districts.find((d) => d.districtId === districtId)
  const districtControlFactionId = districtState?.controllingFactionId
    ?? contentCatalog.districtsById.get(districtId)?.controllingFactionId
    ?? null
  return districtControlFactionId ? (state.factionStandings[districtControlFactionId] ?? 0) : 0
}

/**
 * Find the cheapest-first, in-stock, affordable offer across shops in the NPC's assigned
 * district, skipping shops the house's faction standing does not meet.
 */
function findShopMatch(state: GameState, npc: NpcRuntimeState): ShopMatch | null {
  if (!npc.assignedDistrictId) return null

  const totalFunds = npc.personalFunds.carriedCash + npc.personalFunds.savings
  if (totalFunds <= 0) return null

  const discount = negotiationDiscountForSkill(npc)
  const shopsInDistrict = contentCatalog.shops.filter((s) => s.districtId === npc.assignedDistrictId)
  const controlStanding = districtControlStanding(state, npc.assignedDistrictId)

  for (const shop of shopsInDistrict) {
    if (shop.requiredFactionId) {
      const standing = state.factionStandings[shop.requiredFactionId] ?? 0
      if (standing < (shop.minFactionStanding ?? 0)) continue
    }

    const shopStockContainerId = `shop:${shop.id}:stock`
    const shopStock = state.inventoryState.sharedContainers.find(
      (c) => c.containerId === shopStockContainerId || c.ownerId === shopStockContainerId || c.ownerId === shop.id,
    )
    if (!shopStock) continue

    for (const offer of shop.offers.slice().sort((a, b) => a.order - b.order)) {
      if (offer.minStanding !== undefined && controlStanding < offer.minStanding) continue

      const pricingBreakdown = resolveShopPricingBreakdown(state, shop.id, offer.itemId)
      if (!pricingBreakdown) continue

      const price = Math.max(1, Math.round(pricingBreakdown.finalPrice * (1 - discount)))
      if (price > totalFunds) continue

      const availableSlot = shopStock.slots.find((slot) => {
        if (!slot.itemInstanceId) return false
        const instanceDef = state.inventoryState.itemRegistry[slot.itemInstanceId]
        return instanceDef?.itemId === offer.itemId && slot.quantity > 0
      })
      if (!availableSlot?.itemInstanceId) continue

      return { shop, shopStockContainerId, offerItemId: offer.itemId, itemInstanceId: availableSlot.itemInstanceId, price }
    }
  }

  return null
}

/** Whether this NPC can currently find and afford an in-stock offer at a shop in their district. */
export function npcCanShopForGoods(state: GameState, npc: NpcRuntimeState): boolean {
  return findShopMatch(state, npc) !== null
}

/**
 * NPC shops for goods at a shop in their assigned district, paying from personalFunds and
 * negotiating the price down with negotiation/administration skill. Item moves via the canonical
 * transferItem core (shop_stock -> npc_inventory); money moves directly on personalFunds (shops
 * have no balance of their own, matching the player's own purchaseItemFromShop).
 */
export function npcShopForGoods(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const match = findShopMatch(state, npc)
  if (!match) return state

  const fromCarried = Math.min(npc.personalFunds.carriedCash, match.price)
  const fromSavings = match.price - fromCarried

  let next: GameState = {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) =>
      n.npcId === npcId
        ? {
            ...n,
            personalFunds: {
              ...n.personalFunds,
              carriedCash: n.personalFunds.carriedCash - fromCarried,
              savings: n.personalFunds.savings - fromSavings,
            },
          }
        : n,
    ),
  }

  const transferParams: TransferItemParams = {
    fromType: 'shop_stock',
    fromId: match.shopStockContainerId,
    toType: 'npc_inventory',
    toId: npcId,
    itemInstanceId: match.itemInstanceId,
    quantity: 1,
  }
  next = transferItem(next, transferParams)

  const itemName = contentCatalog.itemsById.get(match.offerItemId)?.name ?? match.offerItemId
  return appendActivityLogEntry(
    next,
    'economy',
    `${npc.name} buys ${itemName} from ${match.shop.name} for ${match.price} marks.`,
  )
}
