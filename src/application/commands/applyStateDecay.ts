import type { GameState, RoomFunction } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'
import { deriveGriefState, deriveGriefMoraleModifier } from './grief'
import { ROOM_IDS, TITLE_IDS } from '../content/ids'

function hasIntactRoom(state: GameState, fn: RoomFunction): boolean {
  return state.house.rooms.some((r) => r.state === 'intact' && r.roomFunction === fn)
}

const RESIDENTIAL_ROOM_IDS = new Set<string>([
  ROOM_IDS.QUARTERS,
  ROOM_IDS.MASTER_CHAMBER,
  ROOM_IDS.SERVANT_QUARTERS,
  ROOM_IDS.BARRACKS,
  ROOM_IDS.EAST_WING,
])

function hasResidentQuarters(state: GameState, roomId: string | null): boolean {
  if (!roomId || !RESIDENTIAL_ROOM_IDS.has(roomId)) return false
  return state.house.rooms.some((room) => room.roomId === roomId && room.state === 'intact')
}

/** Modifiers per ageBand: stress/fatigue accumulation rate and recovery rate. */
const AGE_BAND_MODIFIERS = {
  child:  { accum: 0.50, recovery: 1.20 }, // wards decay slowly, recover fast
  young:  { accum: 1.05, recovery: 1.08 },
  adult:  { accum: 1.00, recovery: 1.00 },
  middle: { accum: 1.00, recovery: 1.00 },
  elder:  { accum: 1.08, recovery: 0.95 },
} as const

/** Steps 2, 2b: hunger/fatigue/stress decay and health recovery for recovering NPCs. */
export function applyStateDecay(state: GameState): GameState {
  const waterScarcity = (state.cityResources?.waterAccess ?? 100) < 30
  const anger_morale_threshold = 30
  const anger_fear_threshold = 70
  const HYGIENE_PENALTY_THRESHOLD = 80  // Only penalize when severely unhygienic
  const ANGER_PENALTY_THRESHOLD = 60

  const hasKitchen = hasIntactRoom(state, 'kitchen')
  const hasBarracks = hasIntactRoom(state, 'barracks')
  const hasStudy = hasIntactRoom(state, 'study')

  let next: GameState = {
    ...state,
    roster: state.roster.map((npc) => {
      const isResting = npc.assignment !== 'deployed'
      const highAnger = (npc.states.anger ?? 0) > ANGER_PENALTY_THRESHOLD
      const highHygiene = (npc.states.hygiene ?? 0) > HYGIENE_PENALTY_THRESHOLD

      const npcDef = contentCatalog.npcsById.get(npc.npcId)
      const ageBand = npcDef?.ageBand ?? 'adult'
      const ageMod = AGE_BAND_MODIFIERS[ageBand] ?? AGE_BAND_MODIFIERS.adult

      // Anger: increases with low morale or high fear, decays slowly
      const angerFromMorale = npc.states.morale < anger_morale_threshold ? 5 : 0
      const angerFromFear = (npc.states.fear ?? 0) > anger_fear_threshold ? 3 : 0
      const newAnger = Math.max(0, Math.min(100, (npc.states.anger ?? 0) - 1 + angerFromMorale + angerFromFear))

      // Hygiene: accumulates over time, decays when resting
      const newHygiene = isResting
        ? Math.max(0, (npc.states.hygiene ?? 0) - 5)
        : Math.min(100, (npc.states.hygiene ?? 0) + 3)

      // Intoxication: decays naturally (sobers up)
      const newIntox = Math.max(0, (npc.states.intoxication ?? 0) - 15)

      // Morale penalty from poor conditions + grief
      const grief = deriveGriefState(npc, state.day)
      const griefMoraleMod = deriveGriefMoraleModifier(grief)
      const moralePenalty = (highAnger ? 3 : 0) + (highHygiene ? 2 : 0) + (waterScarcity ? 2 : 0) + (-griefMoraleMod)

      // Fatigue: resting recovery is boosted by ageMod.recovery; deployed accumulation scaled by ageMod.accum
      const barracksBonus = isResting && npc.assignment === 'idle' && hasBarracks ? 2 : 0
      const fatigueDelta = isResting
        ? -Math.round(10 * ageMod.recovery) - barracksBonus
        : Math.round(5 * ageMod.accum)

      const studyBonus = isResting && npc.assignment === 'idle' && hasStudy ? 1 : 0
      const kitchenBonus = isResting && hasKitchen ? 3 : 0
      const quartersFatigueBonus = isResting && hasResidentQuarters(state, npc.roomAssignment) ? 2 : 0
      const quartersMoraleBonus = isResting && hasResidentQuarters(state, npc.roomAssignment) ? 1 : 0

      return {
        ...npc,
        states: {
          ...npc.states,
          hunger: Math.max(0, Math.min(100, npc.states.hunger + Math.round(8 * ageMod.accum) - kitchenBonus)),
          fatigue: Math.max(0, Math.min(100, npc.states.fatigue + fatigueDelta - quartersFatigueBonus)),
          stress: isResting
            ? Math.max(0, npc.states.stress - Math.round(3 * ageMod.recovery) - studyBonus)
            : npc.states.stress,
          morale: Math.max(0, Math.min(100, npc.states.morale - moralePenalty + quartersMoraleBonus)),
          anger: newAnger,
          hygiene: newHygiene,
          intoxication: newIntox,
          // Low water access drains health
          health: waterScarcity ? Math.max(0, npc.states.health - 2) : npc.states.health,
        },
      }
    }),
  }

  // Log city-level water scarcity warning once per day (only when crossing threshold)
  if (waterScarcity && state.day % 3 === 0) {
    next = appendActivityLogEntry(
      next,
      'system',
      'Water access is critically low. The roster suffers.',
    )
  }

  // Step 2b: Recovering NPCs regain health each day
  const hasMedic = next.roster.some(
    (r) => r.activeTitle === TITLE_IDS.MEDIC && r.assignment !== 'deployed',
  )
  const hasInfirmary = hasIntactRoom(state, 'infirmary')
  const baseRecovery = 15
  const medicBonus = hasMedic ? 10 : 0
  const infirmaryBonus = hasInfirmary ? 3 : 0

  for (const npc of next.roster.filter((r) => r.assignment === 'recovering')) {
    const npcDef = contentCatalog.npcsById.get(npc.npcId)
    const npcName = npcDef?.name ?? npc.npcId
    const ageBand = npcDef?.ageBand ?? 'adult'
    const ageMod = AGE_BAND_MODIFIERS[ageBand] ?? AGE_BAND_MODIFIERS.adult
    const newHealth = Math.min(100, npc.states.health + Math.round((baseRecovery + medicBonus + infirmaryBonus) * ageMod.recovery))
    const fullyRecovered = newHealth >= 80

    next = {
      ...next,
      roster: next.roster.map((r) =>
        r.npcId === npc.npcId
          ? {
              ...r,
              assignment: fullyRecovered ? ('idle' as const) : r.assignment,
              states: { ...r.states, health: newHealth },
            }
          : r,
      ),
    }

    if (fullyRecovered) {
      next = appendActivityLogEntry(next, 'system', `${npcName} is recovered. Back on roster.`)
    } else if (newHealth > npc.states.health) {
      next = appendActivityLogEntry(next, 'system', `${npcName} is recovering. Health improving.`)
    }
  }

  return next
}
