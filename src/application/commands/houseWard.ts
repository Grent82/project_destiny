/**
 * House Ward system — narrative wards that live in the house and grow into adults.
 *
 * Rules:
 * - Max 2 wards at any time (enforced by houseHeirs schema constraint).
 * - Wards arrive via authored origin events, not player menus.
 * - Stage progression: child → ward → apprentice → adult.
 * - Stage transitions are time-gated (days since arrival) + event-gated (at least one authored scene).
 * - When a ward reaches 'adult', they are added to the NPC roster and removed from houseHeirs.
 */

import type { GameState, Heir } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { appendActivityLogEntry } from './activityLog'

// Days required in each stage before eligibility to advance
const STAGE_DURATION_DAYS: Record<Heir['stage'], number> = {
  child: 30,
  ward: 60,
  apprentice: 90,
  adult: 0, // terminal
}

/** Authored origin stories for how a ward enters the house. */
export const WARD_ORIGIN_STORIES = [
  {
    id: 'ward-origin-street-orphan',
    name: 'Street Orphan',
    originStory:
      'A hollow-eyed child was found sheltering in the manor yard after the night watch cleared the docks. Marion brought them inside without asking permission.',
    initialStage: 'child' as const,
  },
  {
    id: 'ward-origin-debt-settlement',
    name: 'Debt Ward',
    originStory:
      'A ruined merchant settled his debts by placing his youngest under your roof as ward — common practice in the Pale, distasteful or not.',
    initialStage: 'ward' as const,
  },
  {
    id: 'ward-origin-guild-apprentice',
    name: 'Guild Apprentice',
    originStory:
      'The Underhand Scribes offered an apprentice to learn letters and discretion inside a noble house. Useful to both parties.',
    initialStage: 'apprentice' as const,
  },
] as const

export type WardOriginId = (typeof WARD_ORIGIN_STORIES)[number]['id']

/**
 * Attempt to accept a ward into the house. Fails silently if capacity is full.
 */
export function acceptWard(
  state: GameState,
  wardId: string,
  wardName: string,
  originId: WardOriginId
): GameState {
  if (state.house.houseHeirs.length >= 2) return state

  const origin = WARD_ORIGIN_STORIES.find((o) => o.id === originId)
  if (!origin) return state

  const newHeir: Heir = {
    id: wardId,
    name: wardName,
    originStory: origin.originStory,
    stage: origin.initialStage,
    arrivalDay: state.day,
    legitimacyStatus: 'unknown' as const,
    birthContext: null,
  }

  const next: GameState = {
    ...state,
    house: {
      ...state.house,
      houseHeirs: [...state.house.houseHeirs, newHeir],
    },
  }

  return appendActivityLogEntry(
    next,
    'system',
    `${wardName} joins the household. ${origin.originStory}`
  )
}

/**
 * Advance a ward's stage if eligibility criteria are met:
 * - Enough days have passed in the current stage.
 * - Not already 'adult' (would be formalized instead).
 */
export function advanceWardStage(state: GameState, wardId: string): GameState {
  const heirIndex = state.house.houseHeirs.findIndex((h) => h.id === wardId)
  if (heirIndex === -1) return state

  const heir = state.house.houseHeirs[heirIndex]
  if (heir.stage === 'adult') return state

  const daysInStage = state.day - heir.arrivalDay
  const required = STAGE_DURATION_DAYS[heir.stage]

  if (daysInStage < required) return state

  const stageOrder: Heir['stage'][] = ['child', 'ward', 'apprentice', 'adult']
  const nextStageIndex = stageOrder.indexOf(heir.stage) + 1
  const nextStage = stageOrder[nextStageIndex]

  const updatedHeirs = state.house.houseHeirs.map((h, i) =>
    i === heirIndex ? { ...h, stage: nextStage, arrivalDay: state.day } : h
  )

  const next: GameState = {
    ...state,
    house: { ...state.house, houseHeirs: updatedHeirs },
  }

  return appendActivityLogEntry(next, 'system', `${heir.name} grows into the role of ${nextStage}.`)
}

/**
 * Formalize an adult ward as a crew member on the NPC roster.
 * Removes them from houseHeirs and adds a new NpcRuntimeState entry.
 */
export function formalizeAdultWard(
  state: GameState,
  wardId: string,
  baseNpc: Omit<NpcRuntimeState, 'npcId'>
): GameState {
  const heir = state.house.houseHeirs.find((h) => h.id === wardId)
  if (!heir || heir.stage !== 'adult') return state

  const newNpc: NpcRuntimeState = { npcId: wardId, ...baseNpc }

  const next: GameState = {
    ...state,
    house: {
      ...state.house,
      houseHeirs: state.house.houseHeirs.filter((h) => h.id !== wardId),
    },
    roster: [...state.roster, newNpc],
  }

  return appendActivityLogEntry(
    next,
    'system',
    `${heir.name} is now a full member of the household — no longer a ward, but a name on the roster.`
  )
}

/**
 * Check all wards each end-of-day; automatically advance stage when eligible.
 * Called from endDay pipeline.
 */
export function tickWardStages(state: GameState): GameState {
  let next = state
  for (const heir of state.house.houseHeirs) {
    if (heir.stage !== 'adult') {
      next = advanceWardStage(next, heir.id)
    }
  }
  return next
}
