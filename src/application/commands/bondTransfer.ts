import type { GameState } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'
import type { Rng } from './seededRng'
import { FACTION_IDS } from '../content/ids'
import { enqueueTemplateEvent } from './eventInstances'

const TALLOW_RING_FACTION = FACTION_IDS.TALLOW_RING

/** Condition health delta per day for NPC-held bonded persons by buyer specialization. */
const HELD_DECAY_BY_SPECIALIZATION: Record<string, number> = {
  assessed: -1,
  security: -2,
  specialist: 1,
  labor: -1,
}

export function transferBondedNpc(state: GameState, npcId: string, buyerId: string): GameState {
  const npc = state.npcRuntimeStates.find((r) => r.npcId === npcId)
  if (!npc || !npc.bondStatus || npc.bondStatus.ownerType !== 'player') return state

  const buyer = contentCatalog.bondBuyersById.get(buyerId)
  if (!buyer) return state

  const saleAmount = Math.round(npc.bondStatus.marketValue * buyer.offerModifier)

  // Build new registry entry
  const prevRegistry = state.bondedPersonsRegistry ?? {}
  const buyerEntries = prevRegistry[buyerId] ?? []
  const bondedPersonsRegistry = {
    ...prevRegistry,
    [buyerId]: [...buyerEntries, npcId],
  }

  // Update npcRuntimeStates: mark transferred, change owner
  const roster = state.npcRuntimeStates.map((r) => {
    if (r.npcId !== npcId) {
      // High-empathy morale response for witnesses
      if (r.traits.empathy > 55) {
        return {
          ...r,
          states: { ...r.states, morale: Math.max(0, r.states.morale - 8) },
        }
      }
      return r
    }
    return {
      ...r,
      assignment: 'transferred' as const,
      bondStatus: {
        ...r.bondStatus!,
        holderId: buyerId,
        ownerType: 'npc' as const,
        lastOfferDay: state.day,
        forSale: false,
      },
    }
  })

  let next: GameState = {
    ...state,
    money: state.money + saleAmount,
    npcRuntimeStates: roster,
    bondedPersonsRegistry,
  }

  next = appendActivityLogEntry(
    next,
    'economy',
    `You transferred ${npc.name} to ${buyer.name}. Received ${saleAmount} Marks.`,
  )

  return next
}

/** Check whether any bonded-for-sale NPC should trigger an acquisition offer today. */
export function checkBondAcquisitionOffers(state: GameState, rng: Rng): GameState {
  let next = state

  for (const npc of state.npcRuntimeStates) {
    if (!npc.bondStatus?.forSale) continue
    if (npc.bondStatus.ownerType !== 'player') continue

    const daysInService = state.day - npc.bondStatus.bondStartDay
    if (daysInService < 5) continue

    const lastOffer = npc.bondStatus.lastOfferDay
    if (lastOffer !== null && state.day - lastOffer < 10) continue

    const buyers = contentCatalog.bondBuyers
    if (buyers.length === 0) continue

    const buyerIdx = Math.floor(rng() * buyers.length)
    const buyer = buyers[buyerIdx]!
    const offerAmount = Math.round(npc.bondStatus.marketValue * buyer.offerModifier)
    const instanceId = `bond-offer-${npc.npcId}-${state.day}`

    // Only one offer per day
    if (next.pendingEvents.some((e) => e.eventId === 'bond-acquisition-offer')) break

    next = enqueueTemplateEvent(
      {
        ...next,
        lastFiredDay: { ...next.lastFiredDay, 'bond-acquisition-offer': state.day },
        npcRuntimeStates: next.npcRuntimeStates.map((r) =>
          r.npcId === npc.npcId && r.bondStatus
            ? { ...r, bondStatus: { ...r.bondStatus, lastOfferDay: state.day } }
            : r,
        ),
      },
      'bond-acquisition-offer',
      {
        instanceId,
        firedOnDay: state.day,
        sourceDistrictId: state.currentDistrictId,
        sourceNpcId: npc.npcId,
        presentationText: `${buyer.name} has made an offer for ${npc.name}. Offer: ${offerAmount} Marks.`,
        contextId: buyer.id,
      },
    )

    break // one offer per day
  }

  return next
}

/** Decay or improve condition of NPC-held bonded persons based on the buyer's specialization. */
export function applyNpcHeldConditionDecay(state: GameState): GameState {
  const transferredNpcs = state.npcRuntimeStates.filter(
    (npc) => npc.assignment === 'transferred' && npc.bondStatus?.ownerType === 'npc',
  )
  if (transferredNpcs.length === 0) return state

  const roster = state.npcRuntimeStates.map((npc) => {
    if (npc.assignment !== 'transferred' || npc.bondStatus?.ownerType !== 'npc') return npc

    const buyer = contentCatalog.bondBuyersById.get(npc.bondStatus.holderId)
    const delta = HELD_DECAY_BY_SPECIALIZATION[buyer?.specialization ?? 'labor'] ?? -1
    return {
      ...npc,
      states: {
        ...npc.states,
        health: Math.max(0, Math.min(100, npc.states.health + delta)),
      },
    }
  })

  return { ...state, npcRuntimeStates: roster }
}

/**
 * Rescue a bonded person held by an NPC buyer via legal bid (pay 150% market value).
 * Returns state unchanged if the player cannot afford the ransom.
 */
export function rescueBondedNpcLegal(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((r) => r.npcId === npcId)
  if (!npc || !npc.bondStatus || npc.bondStatus.ownerType !== 'npc') return state

  const ransom = Math.ceil(npc.bondStatus.marketValue * 1.5)
  if (state.money < ransom) return state

  return applyRescue(state, npc.npcId, npc.bondStatus.holderId, ransom, 'economy',
    `Legal bid accepted. ${npc.name} returned to the house. Paid ${ransom} Marks.`,
  )
}

/**
 * Extract a bonded person via Tallow Ring channels.
 * Costs faction standing; person arrives in degraded condition (health −20).
 */
export function rescueBondedNpcExtraction(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((r) => r.npcId === npcId)
  if (!npc || !npc.bondStatus || npc.bondStatus.ownerType !== 'npc') return state

  let next = applyRescue(state, npcId, npc.bondStatus.holderId, 0, 'system',
    `${npc.name} extracted through Tallow Ring channels. They arrive diminished.`,
  )

  // Condition penalty from the extraction
  next = {
    ...next,
    npcRuntimeStates: next.npcRuntimeStates.map((r) =>
      r.npcId === npcId
        ? { ...r, states: { ...r.states, health: Math.max(0, r.states.health - 20) } }
        : r,
    ),
    factionStandings: {
      ...next.factionStandings,
      [TALLOW_RING_FACTION]: Math.max(-100, (next.factionStandings[TALLOW_RING_FACTION] ?? 0) - 15),
    },
  }

  return next
}

/**
 * Force-rescue a bonded person (combat resolution already handled upstream).
 * Person arrives with health −15 from the extraction.
 */
export function rescueBondedNpcForce(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((r) => r.npcId === npcId)
  if (!npc || !npc.bondStatus || npc.bondStatus.ownerType !== 'npc') return state

  let next = applyRescue(state, npcId, npc.bondStatus.holderId, 0, 'system',
    `${npc.name} retrieved by force. They are shaken but alive.`,
  )

  next = {
    ...next,
    npcRuntimeStates: next.npcRuntimeStates.map((r) =>
      r.npcId === npcId
        ? { ...r, states: { ...r.states, health: Math.max(0, r.states.health - 15) } }
        : r,
    ),
  }

  return next
}

function applyRescue(
  state: GameState,
  npcId: string,
  prevOwnerId: string,
  cost: number,
  logCategory: 'economy' | 'system',
  message: string,
): GameState {
  // Remove from bondedPersonsRegistry
  const prevRegistry = state.bondedPersonsRegistry ?? {}
  const ownerEntries = (prevRegistry[prevOwnerId] ?? []).filter((id) => id !== npcId)
  const bondedPersonsRegistry = { ...prevRegistry }
  if (ownerEntries.length === 0) {
    delete bondedPersonsRegistry[prevOwnerId]
  } else {
    bondedPersonsRegistry[prevOwnerId] = ownerEntries
  }

  const roster = state.npcRuntimeStates.map((r) => {
    if (r.npcId !== npcId) return r
    return {
      ...r,
      assignment: 'recovering' as const,
      bondStatus: r.bondStatus
        ? {
            ...r.bondStatus,
            holderId: 'player',
            ownerType: 'player' as const,
            forSale: false,
          }
        : null,
    }
  })

  const next: GameState = {
    ...state,
    money: Math.max(0, state.money - cost),
    npcRuntimeStates: roster,
    bondedPersonsRegistry,
  }

  return appendActivityLogEntry(next, logCategory, message)
}
