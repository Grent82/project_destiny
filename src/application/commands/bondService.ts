import type { GameState, NpcRuntimeState } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { applyRelationshipDelta, writeNpcMemory } from './adjustRelationship'
import { adjustCityDial } from './economicConsequences'
import { EVENT_IDS, FACTION_IDS, TITLE_IDS } from '../content/ids'
import { enqueueTemplateEvent } from './eventInstances'

const TALLOW_RING_ID = FACTION_IDS.TALLOW_RING
const GILDED_COURT_ID = FACTION_IDS.GILDED_COURT
const TITLE_OBJECTION_DAY_INTERVAL = 28
const EQUALITY_NOTICE_THRESHOLD_DAYS = 14
const HOLDER_LOG_INTERVAL = 7
const HOLDER_MORAL_THRESHOLD_COUNT = 3
const COERCIVE_ENTRY_REASONS = new Set(['compact-assessment', 'combat-capture', 'debt-settlement'])

function isPlayerHeldBound(npc: NpcRuntimeState): boolean {
  return npc.bondStatus?.holderId === 'player'
}

function queueEvent(state: GameState, eventId: string): GameState {
  if (state.pendingEvents.some((event) => event.eventId === eventId)) {
    return state
  }

  return enqueueTemplateEvent(
    {
      ...state,
      lastFiredDay: {
        ...state.lastFiredDay,
        [eventId]: state.day,
      },
    },
    eventId,
    { firedOnDay: state.day },
  )
}

export function freeNpc(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((entry) => entry.npcId === npcId)
  const bondStatus = npc?.bondStatus
  if (!npc || !bondStatus || bondStatus.holderId !== 'player') return state
  if (state.money < bondStatus.contractValue) return state

  let next: GameState = {
    ...state,
    money: state.money - bondStatus.contractValue,
    roster: state.roster.map((entry) =>
      entry.npcId === npcId
        ? { ...entry, bondStatus: null }
        : entry.traits.empathy > 55
          ? {
              ...entry,
              states: {
                ...entry.states,
                morale: Math.min(100, entry.states.morale + 5),
              },
            }
          : entry,
    ),
    relationships: { ...state.relationships },
  }

  const loyaltyResult = applyRelationshipDelta(next, 'player', npcId, 'loyalty', 25)
  next = loyaltyResult.state
  const trustResult = applyRelationshipDelta(next, 'player', npcId, 'trust', 20)
  next = trustResult.state
  const respectResult = applyRelationshipDelta(next, 'player', npcId, 'respect', 10)
  next = respectResult.state

  next = queueEvent(next, EVENT_IDS.NPC_FREED)
  next = appendActivityLogEntry(
    next,
    'system',
    `${npc.name} is released from bond service. The contract is paid in full.`,
  )

  return next
}

function applyEqualityNotice(state: GameState, npc: NpcRuntimeState): GameState {
  let next = state
  next = {
    ...next,
    roster: next.roster.map((entry) =>
      entry.npcId === npc.npcId
        ? {
            ...entry,
            states: {
              ...entry.states,
              morale: Math.max(0, entry.states.morale - 5),
            },
            bondStatus: entry.bondStatus
              ? {
                  ...entry.bondStatus,
                  lastEqualityNoticeDay: next.day,
                }
              : null,
          }
        : entry,
    ),
  }

  next = queueEvent(next, EVENT_IDS.BOUND_NPC_NOTICES_DIFFERENCE)
  return appendActivityLogEntry(
    next,
    'system',
    `${npc.name} notices what equal work does not equal under bond.`,
  )
}

function applyMonthlyBondOperationCosts(state: GameState): GameState {
  const boundWorkers = state.roster.filter(
    (npc) => isPlayerHeldBound(npc) && npc.assignment === 'working',
  )
  if (boundWorkers.length === 0 || state.day % TITLE_OBJECTION_DAY_INTERVAL !== 0) {
    return state
  }

  let next: GameState = {
    ...state,
    factionStandings: {
      ...state.factionStandings,
      [TALLOW_RING_ID]: Math.max(
        -100,
        (state.factionStandings[TALLOW_RING_ID] ?? 0) - 1,
      ),
    },
    roster: state.roster.map((npc) =>
      npc.traits.empathy > 55
        ? {
            ...npc,
            states: {
              ...npc.states,
              morale: Math.max(0, npc.states.morale - 2),
            },
          }
        : npc,
    ),
  }

  next = adjustCityDial(next, 'corruption', 2)
  next = adjustCityDial(next, 'prosperity', -1)
  next = adjustCityDial(next, 'unrest', 1)

  const objectionNpc = next.roster.find(
    (npc) =>
      npc.traits.empathy > 55 &&
      (npc.activeTitle === TITLE_IDS.STEWARD || npc.activeTitle === TITLE_IDS.ARCHIVIST),
  )

  if (objectionNpc) {
    next = {
      ...next,
      roster: next.roster.map((npc) =>
        npc.npcId === objectionNpc.npcId
          ? { ...npc, activeTitle: null }
          : npc,
      ),
    }
    next = queueEvent(next, EVENT_IDS.TITLE_NPC_BOND_OBJECTION)
    next = appendActivityLogEntry(
      next,
      'system',
      `${objectionNpc.name} refuses to keep serving while bonded labor funds the house.`,
    )
  }

  return appendActivityLogEntry(
    next,
    'system',
    'The cost of running bonded labor settles into the house. Empathic eyes do not look away, and the wider city grows meaner around it.',
  )
}

/**
 * Applies power-asymmetric relationship deltas for every NPC held under player bond.
 * Fear toward the player accumulates from coercive entry reasons and dominance differential.
 * Empathic NPCs cool affinity toward the player. Loyalty drifts by dominance imbalance.
 * All deltas are pure (no randomness) and delegate writes to applyRelationshipDelta / writeNpcMemory.
 */
function applyBondHolderPowerDynamics(state: GameState): GameState {
  let next = state
  const player = state.playerCharacter

  for (const npc of state.roster) {
    if (!npc.bondStatus || npc.bondStatus.holderId !== 'player' || npc.bondStatus.ownerType !== 'player') continue

    const bond = npc.bondStatus
    const dominanceDiff = player.traits.dominance - npc.traits.empathy

    // Fear delta: NPC's felt weight of ownership
    let fearDelta = 4 + Math.max(0, Math.min(8, dominanceDiff / 20))
    if (bond.entryReason === 'combat-capture') fearDelta += 8
    fearDelta -= bond.alongsideFreeAssignmentDays / 7
    const roundedFear = Math.max(0, Math.round(fearDelta))

    if (roundedFear > 0) {
      const fearResult = applyRelationshipDelta(next, npc.npcId, 'player', 'fear', roundedFear)
      next = fearResult.state
      // Fiction-contract memory: power imbalance felt before it is ever strategic
      const memoryLine =
        bond.entryReason === 'combat-capture'
          ? 'The contract is a chain. I feel it every morning.'
          : 'The weight of the contract sits between us.'
      next = writeNpcMemory(next, npc.npcId, memoryLine, ['player'])
    }

    // Affinity tension: player grows cooler toward conscience-burdened NPCs or when ruthless
    if (npc.traits.empathy > 55 || player.traits.ruthlessness > 60) {
      const affinityResult = applyRelationshipDelta(next, 'player', npc.npcId, 'affinity', -2)
      next = affinityResult.state
    }

    // Loyalty modulation: dominance advantage sustains control; deficit breeds friction
    const loyaltyDelta = dominanceDiff > 0 ? 2 : -1
    const loyaltyResult = applyRelationshipDelta(next, npc.npcId, 'player', 'loyalty', loyaltyDelta)
    next = loyaltyResult.state
  }
  return next
}

/**
 * Applies holder-side consequences for the player actively holding bond contracts.
 * Runs once per day. Effects:
 * - Trait drift: ruthlessness + dominance creep from coercive/sustained holding
 * - Roster friction: free empathic NPCs (empathy > 60) cool toward the player
 * - Charged log entry: every HOLDER_LOG_INTERVAL days names a bonded person
 * - Moral-weather pressure: Gilded Court standing and unrest if holding exceeds threshold
 *
 * Pure function — takes state, returns new state with no side effects.
 */
export function applyBondHolderConsequences(state: GameState): GameState {
  const playerBonds = state.roster.filter(
    (npc) => npc.bondStatus?.holderId === 'player' && npc.bondStatus?.ownerType === 'player',
  )
  if (playerBonds.length === 0) return state

  const hasCoerciveBond = playerBonds.some((npc) =>
    COERCIVE_ENTRY_REASONS.has(npc.bondStatus!.entryReason),
  )

  // Trait drift: holding power shapes the holder
  const ruthlessnessDrift = hasCoerciveBond ? 1 : 0
  const dominanceDrift = playerBonds.length > 0 ? 1 : 0
  let next: GameState = {
    ...state,
    relationships: { ...state.relationships },
    playerCharacter: {
      ...state.playerCharacter,
      traits: {
        ...state.playerCharacter.traits,
        ruthlessness: Math.min(100, state.playerCharacter.traits.ruthlessness + ruthlessnessDrift),
        dominance: Math.min(100, state.playerCharacter.traits.dominance + dominanceDrift),
      },
    },
  }

  // Roster friction: free NPCs with high empathy register the arrangement
  for (const npc of next.roster) {
    if (npc.bondStatus || npc.traits.empathy <= 60) continue
    applyRelationshipDelta(next, npc.npcId, 'player', 'affinity', -1)
  }

  // Charged log: every HOLDER_LOG_INTERVAL days, surface the weight of a specific bond
  if (state.day % HOLDER_LOG_INTERVAL === 0) {
    const featured = playerBonds[0]!
    next = appendActivityLogEntry(
      next,
      'system',
      `The ledger of ${featured.name}'s remaining term lies open on the table tonight. The house feels smaller for it.`,
    )
  }

  // Moral-weather pressure: if holding too many, the city and Gilded Court notice
  if (playerBonds.length >= HOLDER_MORAL_THRESHOLD_COUNT) {
    next = adjustCityDial(next, 'unrest', 1)
    next = {
      ...next,
      factionStandings: {
        ...next.factionStandings,
        [GILDED_COURT_ID]: Math.max(-100, (next.factionStandings[GILDED_COURT_ID] ?? 0) - 1),
      },
    }
  }

  return next
}

export function applyBondServiceEffects(state: GameState): GameState {
  const freeWorkers = state.roster.filter(
    (npc) => npc.assignment === 'working' && !isPlayerHeldBound(npc),
  )

  let next: GameState = {
    ...state,
    relationships: { ...state.relationships },
    roster: state.roster.map((npc) => {
      if (!isPlayerHeldBound(npc) || !npc.bondStatus) return npc

      const alongsideFree =
        npc.assignment === 'working' && freeWorkers.length > 0
          ? npc.bondStatus.alongsideFreeAssignmentDays + 1
          : 0

      return {
        ...npc,
        bondStatus: {
          ...npc.bondStatus,
          alongsideFreeAssignmentDays: alongsideFree,
        },
      }
    }),
  }

  for (const npc of next.roster) {
    if (
      isPlayerHeldBound(npc) &&
      npc.bondStatus &&
      npc.bondStatus.alongsideFreeAssignmentDays >= EQUALITY_NOTICE_THRESHOLD_DAYS &&
      npc.bondStatus.lastEqualityNoticeDay !== next.day
    ) {
      next = applyEqualityNotice(next, npc)
    }
  }

  next = applyMonthlyBondOperationCosts(next)
  next = applyBondHolderPowerDynamics(next)
  next = applyBondHolderConsequences(next)
  return next
}
