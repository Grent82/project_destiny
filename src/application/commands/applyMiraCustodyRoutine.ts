import type { GameState, CaptivityState } from '../../domain'
import { EVENT_IDS } from '../content/ids'
import { enqueueTemplateEvent } from './eventInstances'
import { getAllNpcCaptivityStates, setNpcCaptivityState } from './captivityRegistry'

/**
 * Mira's custody routine: deterministic room transfers and psychological drift
 * while she remains captive in the old tannery.
 *
 * Room schedule:
 * - Days 1-3: tannery-inner-ring (secure holding)
 * - Day 4: transfer to tannery-holding-floor (public-facing route)
 * - Days 4-6: tannery-holding-floor
 * - Day 7: transfer back to tannery-inner-ring
 * - Cycle repeats every 7 days
 *
 * Psychological drift:
 * - condition can worsen: healthy -> hurt -> broken -> altered
 * - compliance can shift: resistant -> conflicted -> compliant
 * - bondType can shift across all values including affection
 *
 * Stop condition:
 * - When quest-mira-rescue is completed, routine stops driving custody state
 */

export const MIRA_CUSTODY_ROOMS = ['tannery-holding-floor', 'tannery-inner-ring'] as const
export type MiraRoomId = typeof MIRA_CUSTODY_ROOMS[number]

export const MIRA_CUSTODY_CYCLE_DAYS = 7
export const MIRA_CUSTODY_TRANSFER_DAY = 4 // Day 4 of cycle: switch from inner-ring to holding-floor

// Condition progression (worsening only, no romance path)
const MIRAGE_CONDITION_PROGRESSION: CaptivityState['condition'][] = ['healthy', 'hurt', 'broken', 'altered']

// Compliance progression (under pressure)
const COMPLIANCE_PROGRESSION: CaptivityState['compliance'][] = ['resistant', 'conflicted', 'compliant']

// Bond type progression (all values available)
const BOND_TYPE_PROGRESSION: CaptivityState['bondType'][] = ['none', 'fear', 'dependency', 'affection', 'coercion']

/**
 * Returns the room Mira should be in based on her timeHeldDays.
 * Uses a 7-day cycle: inner-ring for days 1-3, holding-floor for days 4-7, repeat.
 *
 * timeHeldDays=0 means day 1 of captivity (inner-ring)
 * timeHeldDays=3 means day 4 of captivity (transfer to holding-floor)
 */
export function getMiraExpectedRoom(timeHeldDays: number): MiraRoomId {
  // Convert timeHeldDays to 1-based day number for the cycle
  const dayNumber = timeHeldDays + 1
  const dayInCycle = ((dayNumber - 1) % MIRA_CUSTODY_CYCLE_DAYS) + 1
  return dayInCycle < MIRA_CUSTODY_TRANSFER_DAY ? 'tannery-inner-ring' : 'tannery-holding-floor'
}

/**
 * Returns whether a transfer should occur after incrementing timeHeldDays.
 * Transfer happens when the NEW day number hits the transfer day or starts a new cycle.
 */
export function shouldTransferOnDay(timeHeldDays: number): boolean {
  // This is called AFTER incrementing, so timeHeldDays is already the new value
  const dayNumber = timeHeldDays + 1
  const dayInCycle = ((dayNumber - 1) % MIRA_CUSTODY_CYCLE_DAYS) + 1
  return dayInCycle === MIRA_CUSTODY_TRANSFER_DAY || dayInCycle === 1
}

/**
 * Returns whether the rescue quest is active or completed.
 * If completed, the custody routine should stop.
 */
export function isMiraRescueComplete(state: Pick<GameState, 'completedQuestIds' | 'activeQuests'>): boolean {
  return state.completedQuestIds.includes('quest-mira-rescue')
}

/**
 * Returns whether Mira is currently in captivity (status check).
 */
export function isMiraCaptive(captivity: CaptivityState | undefined): boolean {
  if (!captivity) return false
  return captivity.status === 'captive' || captivity.status === 'missing'
}

/**
 * Clones the game state for mutation in the command.
 */
function cloneState(state: GameState): GameState {
  return {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((npc) => ({ ...npc, states: { ...npc.states } })),
    eventInstances: [...state.eventInstances],
    activityLog: [...state.activityLog],
    lastFiredDay: { ...state.lastFiredDay },
  }
}

/**
 * Applies psychological drift to Mira's captivity state.
 * Drift is bounded: condition worsens, compliance may shift, bondType may shift.
 * NEVER progresses to affection or consensual intimacy.
 */
function applyBoundedPsychologicalDrift(
  state: GameState,
  captivity: CaptivityState,
  rng: () => number,
): GameState {
  const { condition, compliance, bondType, timeHeldDays } = captivity

  // Condition worsens every 5 days with some probability
  let newCondition = condition
  if (timeHeldDays > 0 && timeHeldDays % 5 === 0 && rng() < 0.6) {
    const currentIdx = MIRAGE_CONDITION_PROGRESSION.indexOf(condition)
    if (currentIdx < MIRAGE_CONDITION_PROGRESSION.length - 1) {
      newCondition = MIRAGE_CONDITION_PROGRESSION[currentIdx + 1]!
    }
  }

  // Compliance shifts under prolonged pressure (every 7 days)
  let newCompliance = compliance
  if (timeHeldDays >= 7 && timeHeldDays % 7 === 0 && rng() < 0.4) {
    const currentIdx = COMPLIANCE_PROGRESSION.indexOf(compliance)
    if (currentIdx < COMPLIANCE_PROGRESSION.length - 1) {
      newCompliance = COMPLIANCE_PROGRESSION[currentIdx + 1]!
    }
  }

  // Bond type may shift based on captivity experience
  let newBondType = bondType
  if (timeHeldDays >= 10 && timeHeldDays % 10 === 0 && rng() < 0.35) {
    const currentIdx = BOND_TYPE_PROGRESSION.indexOf(bondType)
    if (currentIdx < BOND_TYPE_PROGRESSION.length - 1) {
      newBondType = BOND_TYPE_PROGRESSION[currentIdx + 1]!
    }
  }

  // Apply changes if any
  if (newCondition !== condition || newCompliance !== compliance || newBondType !== bondType) {
    setNpcCaptivityState(state, 'npc-mira', {
      ...captivity,
      condition: newCondition,
      compliance: newCompliance,
      bondType: newBondType,
    })
  }

  return state
}

/**
 * Queues a transfer event for Mira's custody movement.
 * This is for story systems that need to know about the transfer.
 */
function queueMiraTransferEvent(
  state: GameState,
  fromRoom: string,
  toRoom: string,
  day: number,
): GameState {
  const key = `mira-custody-transfer:${day}`
  if (state.lastFiredDay[key]) return state

  const eventSource = `mira-transfer-${day}`
  const presentationText = `Mira's custody route has shifted. She is moved from ${fromRoom} to ${toRoom}.`
  return enqueueTemplateEvent(
    {
      ...state,
      lastFiredDay: {
        ...state.lastFiredDay,
        [key]: day,
      },
    },
    EVENT_IDS.MIRA_CUSTODY_TRANSFER,
    {
      instanceId: eventSource,
      firedOnDay: day,
      presentationText,
      contextId: 'site-poi-pale-old-tannery',
    },
  )
}

/**
 * Helper for quest/clue systems to read Mira's custody truth.
 * Returns the current room, expected next room, and transfer schedule.
 *
 * NOTE: This is NOT a day-1 player reveal. It's for story systems that
 * have earned access to this truth through investigation/clues.
 */
export function getMiraCustodySchedule(
  state: Pick<GameState, 'npcRuntimeStates' | 'completedQuestIds' | 'activeQuests' | 'day'>,
): {
  currentRoom: string | null
  nextRoom: string | null
  nextTransferDay: number | null
  isScheduleActive: boolean
} | null {
  const captivity = getAllNpcCaptivityStates(state)['npc-mira']
  if (!captivity || !isMiraCaptive(captivity)) return null
  if (isMiraRescueComplete(state)) return null

  const currentRoom = captivity.roomId
  const expectedRoom = getMiraExpectedRoom(captivity.timeHeldDays)
  const nextTransferDay = captivity.lastTransferDay ? captivity.lastTransferDay + MIRA_CUSTODY_CYCLE_DAYS : state.day + 1

  return {
    currentRoom: currentRoom || expectedRoom,
    nextRoom: expectedRoom === currentRoom ? MIRA_CUSTODY_ROOMS.find(r => r !== currentRoom) || null : expectedRoom,
    nextTransferDay,
    isScheduleActive: true,
  }
}

/**
 * Main command: applies Mira's daily custody routine.
 *
 * - Updates roomId based on the 7-day transfer cycle
 * - Applies bounded psychological drift
 * - Stops if rescue quest is completed
 *
 * Should be called from endDay() as part of the daily simulation.
 */
export function applyMiraCustodyRoutine(state: GameState, rng: () => number = Math.random): GameState {
  const captivity = getAllNpcCaptivityStates(state)['npc-mira']

  // Guard: no Mira captivity state = nothing to do
  if (!captivity) return state

  // Guard: Mira not captive = routine stopped
  if (!isMiraCaptive(captivity)) return state

  // Guard: rescue complete = stop the routine
  if (isMiraRescueComplete(state)) return state

  const next = cloneState(state)
  const { timeHeldDays, roomId, lastTransferDay } = captivity

  // Increment time held
  const newTimeHeldDays = timeHeldDays + 1

  // Check if this is a transfer day (using same logic as shouldTransferOnDay)
  const dayNumber = newTimeHeldDays + 1
  const dayInCycle = ((dayNumber - 1) % MIRA_CUSTODY_CYCLE_DAYS) + 1
  const isTransferDay = dayInCycle === MIRA_CUSTODY_TRANSFER_DAY || dayInCycle === 1

  let newRoomId = roomId
  let newLastTransferDay = lastTransferDay

  if (isTransferDay && roomId) {
    // Perform room transfer
    const fromRoom = roomId
    newRoomId = getMiraExpectedRoom(newTimeHeldDays)
    newLastTransferDay = next.day

    // Queue transfer event for story systems
    queueMiraTransferEvent(next, fromRoom, newRoomId, next.day)
  }

  // Update captivity state
  setNpcCaptivityState(next, 'npc-mira', {
    ...captivity,
    timeHeldDays: newTimeHeldDays,
    roomId: newRoomId,
    lastTransferDay: newLastTransferDay,
  })

  // Apply bounded psychological drift
  const updatedCaptivity = getAllNpcCaptivityStates(next)['npc-mira']
  if (updatedCaptivity) {
    applyBoundedPsychologicalDrift(next, updatedCaptivity, rng)
  }

  return next
}
