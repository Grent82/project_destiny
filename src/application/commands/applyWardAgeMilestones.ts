import type { GameState, Ward, WardStage } from '../../domain/game/contracts'
import type { Traits } from '../../domain/npc/contracts'
import type { Rng } from './seededRng'

// Compressed time: 100 in-game days ≈ 1 year
const STAGE_THRESHOLDS: Record<WardStage, number> = {
  infant: 0,
  child: 201,
  teenager: 1101,
  young_adult: 1601,
}

const STAGE_ORDER: WardStage[] = ['infant', 'child', 'teenager', 'young_adult']

const STAGE_EVENT: Partial<Record<WardStage, string>> = {
  child: 'event-ward-stage-infant-to-child',
  teenager: 'event-ward-stage-child-to-teenager',
  young_adult: 'event-ward-stage-teenager-to-young-adult',
}

const TRAIT_KEYS: (keyof Traits)[] = [
  'discipline', 'ambition', 'empathy', 'ruthlessness',
  'prudence', 'curiosity', 'dominance', 'loyalty', 'vanity', 'zeal',
]

function expectedStage(age: number): WardStage {
  if (age >= STAGE_THRESHOLDS.young_adult) return 'young_adult'
  if (age >= STAGE_THRESHOLDS.teenager) return 'teenager'
  if (age >= STAGE_THRESHOLDS.child) return 'child'
  return 'infant'
}

function dedupeKey(wardId: string, stage: WardStage): string {
  return `ward-milestone-${wardId}-${stage}`
}

function computeShapingTraits(state: GameState, ward: Ward, rng: Rng): Record<string, number> {
  const parentIds = ward.parentNpcIds.length > 0
    ? ward.parentNpcIds
    : ward.parentNpcId ? [ward.parentNpcId] : []

  const parentNpcs = state.roster.filter((n) => parentIds.includes(n.npcId))

  const result: Record<string, number> = {}
  for (const key of TRAIT_KEYS) {
    let base: number
    if (parentNpcs.length > 0) {
      const avg = parentNpcs.reduce((sum, n) => sum + n.traits[key], 0) / parentNpcs.length
      base = Math.round(avg)
    } else {
      base = 40
    }
    // ±20 offset, clamped to [0, 100]
    const offset = Math.floor(rng() * 41) - 20
    result[key] = Math.max(0, Math.min(100, base + offset))
  }
  return result
}

function applyMilestone(state: GameState, ward: Ward, targetStage: WardStage, rng: Rng): GameState {
  const key = dedupeKey(ward.wardId, targetStage)
  if (state.lastFiredDay[key] !== undefined) return state

  const eventId = STAGE_EVENT[targetStage]
  const alreadyPending = eventId
    ? state.pendingEvents.some((pe) => pe.eventId === eventId)
    : false

  const updatedWard: Ward = {
    ...ward,
    stage: targetStage,
    ...(targetStage === 'teenager' && {
      shapingTraits: computeShapingTraits(state, ward, rng),
    }),
    ...(targetStage === 'young_adult' && {
      promotedToNpcId: ward.promotedToNpcId ?? `npc-ward-grown-${ward.wardId}`,
    }),
  }

  return {
    ...state,
    wards: state.wards.map((w) => (w.wardId === ward.wardId ? updatedWard : w)),
    pendingEvents:
      eventId && !alreadyPending
        ? [...state.pendingEvents, { eventId, firedOnDay: state.day }]
        : state.pendingEvents,
    lastFiredDay: { ...state.lastFiredDay, [key]: state.day },
  }
}

export function applyWardAgeMilestones(state: GameState, rng: Rng): GameState {
  let next = state
  for (const ward of state.wards) {
    if (ward.birthDay === null) continue

    const age = state.day - ward.birthDay
    const target = expectedStage(age)
    const currentIdx = STAGE_ORDER.indexOf(ward.stage)
    const targetIdx = STAGE_ORDER.indexOf(target)

    if (targetIdx <= currentIdx) continue

    // Advance one stage at a time so each milestone fires its own event
    for (let i = currentIdx + 1; i <= targetIdx; i++) {
      const nextStage = STAGE_ORDER[i]!
      next = applyMilestone(next, next.wards.find((w) => w.wardId === ward.wardId)!, nextStage, rng)
    }
  }
  return next
}
