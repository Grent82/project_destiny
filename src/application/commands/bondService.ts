import type { GameState, NpcRuntimeState } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { applyRelationshipDelta } from './adjustRelationship'
import { adjustCityDial } from './economicConsequences'

const TALLOW_RING_ID = 'faction-tallow-ring'
const TITLE_OBJECTION_DAY_INTERVAL = 28
const EQUALITY_NOTICE_THRESHOLD_DAYS = 14

function isPlayerHeldBound(npc: NpcRuntimeState): boolean {
  return npc.bondStatus?.holderId === 'player'
}

function queueEvent(state: GameState, eventId: string): GameState {
  if (state.pendingEvents.some((event) => event.eventId === eventId)) {
    return state
  }

  return {
    ...state,
    pendingEvents: [
      ...state.pendingEvents,
      {
        eventId,
        firedOnDay: state.day,
      },
    ],
    lastFiredDay: {
      ...state.lastFiredDay,
      [eventId]: state.day,
    },
  }
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

  applyRelationshipDelta(next, 'player', npcId, 'loyalty', 25)
  applyRelationshipDelta(next, 'player', npcId, 'trust', 20)
  applyRelationshipDelta(next, 'player', npcId, 'respect', 10)

  next = queueEvent(next, 'event-npc-freed')
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

  next = queueEvent(next, 'event-bound-npc-notices-difference')
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
      (npc.activeTitle === 'title-steward' || npc.activeTitle === 'title-archivist'),
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
    next = queueEvent(next, 'event-title-npc-bond-objection')
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

export function applyBondServiceEffects(state: GameState): GameState {
  const freeWorkers = state.roster.filter(
    (npc) => npc.assignment === 'working' && !isPlayerHeldBound(npc),
  )

  let next: GameState = {
    ...state,
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
  return next
}
