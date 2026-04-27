import type {
  ActiveCombatState,
  CombatAction,
  CombatRange,
  CombatantState,
  GameState,
  NpcRuntimeState,
} from '../../domain'
import {
  checkFearRefuseAdvance,
  getFatigueAccuracyPenalty,
  getHungerCombatPenalty,
} from '../../domain/npcStateModifiers'
import { contentCatalog } from '../content/contentCatalog'
import { getArmorProfile, getWeaponProfile } from '../content/equipmentCatalog'
import { appendActivityLogEntry } from './activityLog'

const ENEMY_NAMES = ['Ash Raider', 'Bog Skirmisher', 'Ruin Poacher', 'Fen Cutthroat']

function isAlive(combatant: CombatantState) {
  return combatant.health > 0
}

function buildAllyCombatant(npc: NpcRuntimeState): CombatantState {
  const definition = contentCatalog.npcsById.get(npc.npcId)
  const skill = Math.max(npc.skills.melee, npc.skills.ranged)
  const effectiveRange: CombatRange =
    npc.skills.ranged > npc.skills.melee ? 'distant' : 'close'

  const snap = { hunger: npc.states.hunger, fatigue: npc.states.fatigue }
  const statePenalty = getHungerCombatPenalty(snap) + getFatigueAccuracyPenalty(snap)
  const baseAccuracy = Math.min(95, skill + Math.floor(npc.attributes.perception / 3))

  return {
    combatantId: `ally-${npc.npcId}`,
    sourceNpcId: npc.npcId,
    name: definition?.name ?? npc.npcId,
    side: 'allies',
    maxHealth: Math.max(35, npc.states.health),
    health: Math.max(35, npc.states.health),
    morale: npc.states.morale,
    skill,
    accuracy: Math.max(1, baseAccuracy + statePenalty),
    damageMin: Math.max(8, Math.floor((npc.attributes.might + skill) / 12)),
    damageMax: Math.max(12, Math.floor((npc.attributes.might + skill) / 9)),
    effectiveRange,
    soak: Math.floor(npc.attributes.endurance / 4),
    speed: Math.max(1, Math.floor((npc.attributes.agility + npc.attributes.resolve) / 18)),
    guarding: false,
  }
}

function buildEnemyCombatant(index: number, allies: CombatantState[]): CombatantState {
  const allyAverageSkill = Math.max(
    35,
    Math.floor(
      allies.reduce((total, ally) => total + ally.skill, 0) / Math.max(allies.length, 1),
    ) - 4,
  )
  const allyAverageHealth = Math.max(
    38,
    Math.floor(
      allies.reduce((total, ally) => total + ally.maxHealth, 0) /
        Math.max(allies.length, 1),
    ) - 6,
  )

  return {
    combatantId: `enemy-${index + 1}`,
    sourceNpcId: null,
    name: ENEMY_NAMES[index % ENEMY_NAMES.length],
    side: 'enemies',
    maxHealth: allyAverageHealth,
    health: allyAverageHealth,
    morale: 58,
    skill: allyAverageSkill,
    accuracy: Math.min(90, allyAverageSkill + 12),
    damageMin: Math.max(7, Math.floor(allyAverageSkill / 7)),
    damageMax: Math.max(11, Math.floor(allyAverageSkill / 5)),
    effectiveRange: index % 2 === 0 ? 'close' : 'distant',
    soak: 10 + index * 2,
    speed: 4 + (index % 2),
    guarding: false,
  }
}

function getCombatantById(
  encounter: ActiveCombatState,
  combatantId: string | null,
) {
  if (!combatantId) {
    return null
  }

  return encounter.combatants.find((combatant) => combatant.combatantId === combatantId) ?? null
}

function getOpponents(encounter: ActiveCombatState, side: CombatantState['side']) {
  return encounter.combatants.filter(
    (combatant) => combatant.side !== side && isAlive(combatant),
  )
}

function getPreferredTarget(encounter: ActiveCombatState, actor: CombatantState) {
  const opponents = getOpponents(encounter, actor.side)

  if (opponents.length === 0) {
    return null
  }

  return opponents.slice().sort((left, right) => left.health - right.health)[0] ?? null
}

function updateCombatant(
  encounter: ActiveCombatState,
  combatantId: string,
  updater: (combatant: CombatantState) => CombatantState,
) {
  return {
    ...encounter,
    combatants: encounter.combatants.map((combatant) =>
      combatant.combatantId === combatantId ? updater(combatant) : combatant,
    ),
  }
}

function appendLog(encounter: ActiveCombatState, actorId: string, summary: string) {
  return {
    ...encounter,
    log: [
      ...encounter.log,
      {
        round: encounter.round,
        actorId,
        summary,
      },
    ],
  }
}

function clearGuarding(encounter: ActiveCombatState, side: CombatantState['side']) {
  return {
    ...encounter,
    combatants: encounter.combatants.map((combatant) =>
      combatant.side === side ? { ...combatant, guarding: false } : combatant,
    ),
  }
}

function evaluateOutcome(encounter: ActiveCombatState): ActiveCombatState {
  const alliesAlive = encounter.combatants.some(
    (combatant) => combatant.side === 'allies' && isAlive(combatant),
  )
  const enemiesAlive = encounter.combatants.some(
    (combatant) => combatant.side === 'enemies' && isAlive(combatant),
  )

  if (!alliesAlive) {
    return {
      ...encounter,
      outcome: 'defeat',
      activeCombatantId: null,
    }
  }

  if (!enemiesAlive) {
    return {
      ...encounter,
      outcome: 'victory',
      activeCombatantId: null,
    }
  }

  return encounter
}

function getRangeModifier(weaponId: string | null, range: CombatRange): number {
  const weapon = getWeaponProfile(weaponId)
  if (range === 'close') return weapon.rangeModifierClose
  if (range === 'medium') return weapon.rangeModifierMedium
  return weapon.rangeModifierDistant
}

function buildHitMessage(actorName: string, targetName: string): string {
  const phrases = ['strikes', 'lands a blow on', 'connects with']
  return `${actorName} ${phrases[Math.floor(Math.random() * phrases.length)]} ${targetName}`
}

function buildMissMessage(actorName: string, targetName: string): string {
  const phrases = ['misses', 'goes wide of', 'is deflected by']
  return `${actorName} ${phrases[Math.floor(Math.random() * phrases.length)]} ${targetName}`
}

function attack(encounter: ActiveCombatState, actorId: string) {
  const actor = getCombatantById(encounter, actorId)

  if (!actor || !isAlive(actor)) {
    return encounter
  }

  const target = getPreferredTarget(encounter, actor)

  if (!target) {
    return encounter
  }

  const weapon = getWeaponProfile(actor.equippedWeaponId)
  const armor = getArmorProfile(target.equippedArmorId)
  const rangeOffset = getRangeModifier(actor.equippedWeaponId, encounter.range)
  const effectiveAccuracy = Math.min(99, Math.max(1, weapon.accuracy + rangeOffset))

  const hit = Math.random() * 100 < effectiveAccuracy

  if (!hit) {
    return appendLog(encounter, actorId, `${buildMissMessage(actor.name, target.name)}.`)
  }

  const rawDamage = Math.round(
    weapon.damageMin + Math.random() * (weapon.damageMax - weapon.damageMin),
  )
  const effectiveSoak = Math.max(0, armor.soak - weapon.armorPiercing)
  const guardMitigation = target.guarding ? 0.55 : 1
  let damage = Math.max(0, Math.round((rawDamage - effectiveSoak) * guardMitigation))

  const isCrit = Math.random() * 100 < weapon.critChance
  if (isCrit) damage = damage * 2

  const isStagger = Math.random() * 100 < weapon.staggerChance

  const parts: string[] = [buildHitMessage(actor.name, target.name)]
  parts.push(
    effectiveSoak > 0
      ? `${damage} damage (${effectiveSoak} soaked by armor)`
      : `${damage} damage`,
  )
  if (isCrit) parts.push('A telling blow!')
  if (isStagger) parts.push(`${target.name} is knocked off-balance`)

  const nextEncounter = updateCombatant(encounter, target.combatantId, (combatant) => ({
    ...combatant,
    health: Math.max(0, combatant.health - damage),
    morale: Math.max(0, combatant.morale - 6),
    guarding: false,
    staggered: isStagger,
  }))

  return appendLog(nextEncounter, actorId, `${parts.join(' — ')}.`)
}

function advance(encounter: ActiveCombatState, actorId: string) {
  if (encounter.range === 'close') {
    return appendLog(encounter, actorId, 'The squad is already in close range.')
  }

  const nextRange: CombatRange = encounter.range === 'distant' ? 'medium' : 'close'
  const message =
    nextRange === 'medium'
      ? 'The squad presses forward to medium range.'
      : 'The squad closes to fighting distance.'

  return appendLog({ ...encounter, range: nextRange }, actorId, message)
}

function retreat(encounter: ActiveCombatState, actorId: string) {
  if (encounter.range === 'distant') {
    return appendLog(encounter, actorId, 'The squad is already fighting at distance.')
  }

  const nextRange: CombatRange = encounter.range === 'close' ? 'medium' : 'distant'
  const message =
    nextRange === 'medium'
      ? 'The squad pulls back to medium range.'
      : 'The squad disengages and reopens distance.'

  return appendLog({ ...encounter, range: nextRange }, actorId, message)
}

function guard(encounter: ActiveCombatState, actorId: string) {
  return appendLog(
    updateCombatant(encounter, actorId, (combatant) => ({
      ...combatant,
      guarding: true,
      morale: Math.min(100, combatant.morale + 4),
    })),
    actorId,
    'The combatant braces and guards against the next strike.',
  )
}

function applyAction(
  encounter: ActiveCombatState,
  actorId: string,
  action: CombatAction,
) {
  switch (action) {
    case 'attack':
      return attack(encounter, actorId)
    case 'advance':
      return advance(encounter, actorId)
    case 'retreat':
      return retreat(encounter, actorId)
    case 'guard':
      return guard(encounter, actorId)
  }
}

function getInitiativeOrder(encounter: ActiveCombatState) {
  return encounter.combatants
    .filter(isAlive)
    .slice()
    .sort((left, right) => right.speed - left.speed || right.skill - left.skill)
    .map((combatant) => combatant.combatantId)
}

function findNextActiveCombatant(
  encounter: ActiveCombatState,
  currentCombatantId: string | null,
) {
  const initiative = getInitiativeOrder(encounter)

  if (initiative.length === 0) {
    return { activeCombatantId: null, round: encounter.round }
  }

  if (!currentCombatantId) {
    return {
      activeCombatantId: initiative[0] ?? null,
      round: encounter.round,
    }
  }

  const currentIndex = initiative.indexOf(currentCombatantId)

  if (currentIndex === -1 || currentIndex === initiative.length - 1) {
    return {
      activeCombatantId: initiative[0] ?? null,
      round: encounter.round + 1,
    }
  }

  return {
    activeCombatantId: initiative[currentIndex + 1] ?? null,
    round: encounter.round,
  }
}

function advanceTurn(encounter: ActiveCombatState) {
  const nextTurn = findNextActiveCombatant(encounter, encounter.activeCombatantId)

  return {
    ...encounter,
    activeCombatantId: nextTurn.activeCombatantId,
    round: nextTurn.round,
  }
}

function resolveEnemyTurns(encounter: ActiveCombatState) {
  let nextEncounter = encounter

  while (nextEncounter.outcome === 'ongoing') {
    const activeCombatant = getCombatantById(
      nextEncounter,
      nextEncounter.activeCombatantId,
    )

    if (!activeCombatant || activeCombatant.side === 'allies') {
      break
    }

    const chosenAction: CombatAction =
      nextEncounter.range === 'distant' && activeCombatant.effectiveRange === 'close'
        ? 'advance'
        : 'attack'

    nextEncounter = clearGuarding(nextEncounter, activeCombatant.side)
    nextEncounter = applyAction(
      nextEncounter,
      activeCombatant.combatantId,
      chosenAction,
    )
    nextEncounter = evaluateOutcome(nextEncounter)

    if (nextEncounter.outcome !== 'ongoing') {
      break
    }

    nextEncounter = advanceTurn(nextEncounter)
  }

  return nextEncounter
}

function syncRosterFromCombat(state: GameState, encounter: ActiveCombatState): GameState {
  const allyByNpcId = new Map(
    encounter.combatants
      .filter((combatant) => combatant.side === 'allies' && combatant.sourceNpcId)
      .map((combatant) => [combatant.sourceNpcId as string, combatant]),
  )

  return {
    ...state,
    roster: state.roster.map((npc) => {
      const combatant = allyByNpcId.get(npc.npcId)

      if (!combatant) {
        return npc
      }

      return {
        ...npc,
        states: {
          ...npc.states,
          health: Math.max(0, Math.min(100, combatant.health)),
          morale: combatant.morale,
          injury: Math.min(100, npc.states.injury + Math.max(0, npc.states.health - combatant.health)),
        },
      }
    }),
  }
}

function appendCombatActivityEntries(
  state: GameState,
  encounter: ActiveCombatState,
  previousLogLength: number,
) {
  return encounter.log
    .slice(previousLogLength)
    .reduce(
      (nextState, entry) =>
        appendActivityLogEntry(nextState, 'combat', entry.summary),
      state,
    )
}

export function startCombatEncounter(state: GameState): GameState {
  if (state.activeCombat?.outcome === 'ongoing') {
    return state
  }

  const squad = state.roster.filter((npc) => state.selectedSquadNpcIds.includes(npc.npcId))

  if (squad.length === 0) {
    return state
  }

  const allies = squad.map(buildAllyCombatant)
  const enemies = allies.map((_, index) => buildEnemyCombatant(index, allies))
  const combatants = [...allies, ...enemies].sort(
    (left, right) => right.speed - left.speed || right.skill - left.skill,
  )

  const encounter: ActiveCombatState = {
    encounterId: `encounter-day-${state.day}-${state.timeSlot}`,
    round: 1,
    range: 'distant',
    outcome: 'ongoing',
    activeCombatantId: combatants[0]?.combatantId ?? null,
    combatants,
    log: [
      {
        round: 1,
        actorId: combatants[0]?.combatantId ?? 'system',
        summary: 'A hostile patrol intercepts the squad at range.',
      },
    ],
    factionId: 'faction-civic-compact',
  }

  return appendActivityLogEntry(
    syncRosterFromCombat(
    {
      ...state,
      activeCombat: encounter,
    },
    encounter,
    ),
    'combat',
    'The squad deploys into a hostile patrol encounter.',
  )
}

export function performCombatAction(
  state: GameState,
  action: CombatAction,
): GameState {
  const encounter = state.activeCombat

  if (!encounter || encounter.outcome !== 'ongoing' || !encounter.activeCombatantId) {
    return state
  }

  const activeCombatant = getCombatantById(encounter, encounter.activeCombatantId)

  if (!activeCombatant || activeCombatant.side !== 'allies') {
    return state
  }

  const previousLogLength = encounter.log.length

  // Fear check: ally may refuse advance action
  if (action === 'advance' && activeCombatant.sourceNpcId) {
    const npc = state.roster.find((r) => r.npcId === activeCombatant.sourceNpcId)
    if (npc && checkFearRefuseAdvance({ fear: npc.states.fear })) {
      const refusalMessage = `${activeCombatant.name} hesitates — fear roots them in place.`
      let nextEncounter = appendLog(encounter, activeCombatant.combatantId, refusalMessage)
      nextEncounter = advanceTurn(nextEncounter)
      nextEncounter = resolveEnemyTurns(nextEncounter)
      nextEncounter = evaluateOutcome(nextEncounter)
      let nextState = syncRosterFromCombat({ ...state, activeCombat: nextEncounter }, nextEncounter)
      nextState = appendCombatActivityEntries(nextState, nextEncounter, previousLogLength)
      return nextState
    }
  }

  let nextEncounter = clearGuarding(encounter, activeCombatant.side)
  nextEncounter = applyAction(nextEncounter, activeCombatant.combatantId, action)
  nextEncounter = evaluateOutcome(nextEncounter)

  if (nextEncounter.outcome === 'ongoing') {
    nextEncounter = advanceTurn(nextEncounter)
    nextEncounter = resolveEnemyTurns(nextEncounter)
    nextEncounter = evaluateOutcome(nextEncounter)
  }

  let nextState = syncRosterFromCombat(
    {
      ...state,
      activeCombat: nextEncounter,
    },
    nextEncounter,
  )

  nextState = appendCombatActivityEntries(nextState, nextEncounter, previousLogLength)

  if (nextEncounter.outcome === 'victory') {
    nextState = appendActivityLogEntry(
      nextState,
      'combat',
      'The squad wins the encounter.',
    )
  }

  if (nextEncounter.outcome === 'defeat') {
    nextState = appendActivityLogEntry(
      nextState,
      'combat',
      'The squad is forced out of the encounter.',
    )
  }

  return nextState
}

export function concludeCombatEncounter(state: GameState): GameState {
  if (!state.activeCombat || state.activeCombat.outcome === 'ongoing') {
    return state
  }

  const combat = state.activeCombat
  let nextState: GameState = { ...state, activeCombat: null }

  if (combat.outcome === 'victory' && combat.factionId) {
    const factionId = combat.factionId
    const current = nextState.factionStandings[factionId] ?? 0
    nextState = {
      ...nextState,
      factionStandings: {
        ...nextState.factionStandings,
        [factionId]: Math.max(-100, Math.min(100, current + 5)),
      },
    }
    const factionName = contentCatalog.factionsById.get(factionId)?.name ?? factionId
    nextState = appendActivityLogEntry(nextState, 'system', `Standing with ${factionName} improved.`)
  }

  return appendActivityLogEntry(
    nextState,
    'system',
    'The encounter is concluded and the squad returns to operations.',
  )
}
