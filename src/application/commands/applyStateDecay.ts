import type { GameState, RoomFunction } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'
import { deriveGriefState, deriveGriefMoraleModifier } from './grief'
import { isNpcNaked } from '../../domain/npc/isNpcNaked'
import { PLAYER_MAX_HEALTH } from './combatants'
import {
  hasResidentQuarters,
  hasMedicSupport,
  hasInfirmarySupport,
  isReadyForDuty,
  getNpcRecoverySupport,
  getPlayerRecoverySupport,
  getPlayerOvernightHealthGain,
  describeRecoverySupportTier,
} from './recovery'

const PLAYER_REST_MESSAGE_BY_TIER: Record<ReturnType<typeof getPlayerRecoverySupport>, string> = {
  none: 'You rest as best you can amid the ruin of House Valdris. It is not enough, but it is something.',
  lodging: "You rest in the house's quarters and wake a little steadier.",
  treatment: "The infirmary's care eases your wounds through the night.",
  'treatment-plus-medic': "Between the infirmary and a skilled medic's care, you wake much improved.",
}

function hasIntactRoom(state: GameState, fn: RoomFunction): boolean {
  return state.house.rooms.some((r) => r.state === 'intact' && r.roomFunction === fn)
}

/** Modifiers per ageBand: stress/fatigue accumulation rate and recovery rate. */
const AGE_BAND_MODIFIERS = {
  child:  { accum: 0.50, recovery: 1.20 }, // wards decay slowly, recover fast
  young:  { accum: 1.05, recovery: 1.08 },
  adult:  { accum: 1.00, recovery: 1.00 },
  middle: { accum: 1.00, recovery: 1.00 },
  elder:  { accum: 1.08, recovery: 0.95 },
} as const

/**
 * Steps 2, 2b: hunger/fatigue/stress decay and health recovery for recovering NPCs.
 *
 * destiny-rama.12 (full parity): this loop already ran over every person in the unified
 * npcRuntimeStates list unconditionally (no npcType gate at all) — the fold itself already gave
 * world/story persons the same survival-need accumulation as roster, which is the whole point of
 * "full parity". The one thing genuinely missing was excluding npcType:'enemy' persons (no runtime
 * agency, belongs to the combat system) — added below. Captives are NOT excluded here: they still
 * accumulate hunger/fatigue/stress like anyone else (a captive still gets hungry), on top of —
 * not instead of — their separate custody-specific state (condition/compliance/bondType) handled
 * by applyAbstractCustodySimulation/applyMiraCustodyRoutine/applyNpcRoomInteractions. Those systems
 * touch different concerns (custody condition, not survival needs) even where both happen to adjust
 * `states.stress` — that's two independent contributions to the same field, the same layering every
 * roster NPC already gets from passive decay plus active player-triggered effects, not a duplicate
 * application of the same mechanic.
 */
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
    npcRuntimeStates: state.npcRuntimeStates.map((npc) => {
      if (npc.npcType === 'enemy') return npc

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
      const nakedMoralePenalty = isNpcNaked(npc) ? 20 : 0
      const moralePenalty = (highAnger ? 3 : 0) + (highHygiene ? 2 : 0) + (waterScarcity ? 2 : 0) + (-griefMoraleMod) + nakedMoralePenalty

      // Fatigue: resting recovery is boosted by ageMod.recovery; deployed accumulation scaled by ageMod.accum
      const barracksBonus = isResting && npc.assignment === 'idle' && hasBarracks ? 2 : 0
      const fatigueDelta = isResting
        ? -Math.round(10 * ageMod.recovery) - barracksBonus
        : Math.round(5 * ageMod.accum)

      const studyBonus = isResting && npc.assignment === 'idle' && hasStudy ? 1 : 0
      const kitchenBonus = isResting && hasKitchen ? 3 : 0
      const quartersFatigueBonus = isResting && hasResidentQuarters(state, npc.roomAssignment) ? 2 : 0
      const quartersMoraleBonus = isResting && hasResidentQuarters(state, npc.roomAssignment) ? 1 : 0

      // Naked NPCs suffer additional stress from exposure and social stigma
      const nakedStressPenalty = isNpcNaked(npc) ? 5 : 0

      return {
        ...npc,
        states: {
          ...npc.states,
          hunger: Math.max(0, Math.min(100, npc.states.hunger + Math.round(8 * ageMod.accum) - kitchenBonus)),
          fatigue: Math.max(0, Math.min(100, npc.states.fatigue + fatigueDelta - quartersFatigueBonus)),
          stress: isResting
            ? Math.max(0, npc.states.stress - Math.round(3 * ageMod.recovery) - studyBonus + nakedStressPenalty)
            : npc.states.stress + nakedStressPenalty,
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

  // Step 2b: Recovering NPCs regain health and shed injury each day. npcType:'enemy' excluded
  // (destiny-rama.12), matching Step 1 above — currently a no-op in practice since nothing sets
  // assignment:'recovering' on an enemy-typed person, but kept consistent for defense-in-depth.
  for (const npc of next.npcRuntimeStates.filter((r) => r.assignment === 'recovering' && r.npcType !== 'enemy')) {
    const npcDef = contentCatalog.npcsById.get(npc.npcId)
    const npcName = npcDef?.name ?? npc.npcId
    const ageBand = npcDef?.ageBand ?? 'adult'
    const ageMod = AGE_BAND_MODIFIERS[ageBand] ?? AGE_BAND_MODIFIERS.adult
    const hasLodging = hasResidentQuarters(next, npc.roomAssignment)
    const hasInfirmary = hasInfirmarySupport(next)
    const hasMedic = hasMedicSupport(next)
    const newHealth = Math.min(
      100,
      npc.states.health +
        Math.round((15 + (hasLodging ? 2 : 0) + (hasInfirmary ? 3 : 0) + (hasMedic ? 10 : 0)) * ageMod.recovery),
    )
    const fullyRecovered = isReadyForDuty(newHealth)

    next = {
      ...next,
      npcRuntimeStates: next.npcRuntimeStates.map((r) =>
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
      const tier = getNpcRecoverySupport(next, npc)
      next = appendActivityLogEntry(
        next,
        'system',
        `${npcName} is still recovering. ${describeRecoverySupportTier(tier)}.`,
      )
    }
  }

  // Step 2b' (destiny-629x world-recovery scaffolding) was folded into Step 2b above in
  // destiny-rama.8: World/story persons are now full NpcRuntimeState entries in the same
  // `npcRuntimeStates` list, so a world person with `assignment:'recovering'` is already picked up
  // by Step 2b's unfiltered `next.npcRuntimeStates.filter(r => r.assignment === 'recovering')` — a
  // second, separately-targeted loop here would double-process the same entries (double health
  // gain per day). `hasLodging` naturally resolves to false for world persons since their
  // `roomAssignment` stays null (they were never assigned house quarters), matching the old
  // world-only behavior exactly. Still scaffolding in practice: nothing currently sets a World
  // NPC's injury above 0 (no combat/incident path touches them yet, tracked in destiny-s97u).

  // Step 2c: The player rests through the house's lodging/treatment support each night.
  const playerCombatState = next.playerCharacter.combatState
  if (playerCombatState && (playerCombatState.health < PLAYER_MAX_HEALTH)) {
    const supportTier = getPlayerRecoverySupport(next, playerCombatState.health)
    const healthGain = getPlayerOvernightHealthGain(supportTier)

    const newHealth = Math.min(PLAYER_MAX_HEALTH, playerCombatState.health + healthGain)

    if (newHealth !== playerCombatState.health) {
      next = {
        ...next,
        playerCharacter: {
          ...next.playerCharacter,
          combatState: { ...playerCombatState, health: newHealth },
        },
      }
      next = appendActivityLogEntry(next, 'system', PLAYER_REST_MESSAGE_BY_TIER[supportTier])
    }
  }

  return next
}
