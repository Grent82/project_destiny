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
import { buildRelationshipKey, type RelationshipAxes } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { getArmorProfile, getWeaponProfile } from '../content/equipmentCatalog'
import { getDurabilityAccuracyModifier, getDurabilityArmorModifier } from './durability'
import { appendActivityLogEntry } from './activityLog'
import { applyRelationshipDelta } from './adjustRelationship'
import { getRenownLevel } from '../../domain/progression/contracts'
import enemyNpcsData from '../../../data/definitions/enemy-npcs.json'

const ENEMY_NAMES = ['Ash Raider', 'Bog Skirmisher', 'Ruin Poacher', 'Fen Cutthroat']

const PLAYER_DEFAULT_WEAPON_ID = 'weapon-dagger-wasterunner'

function buildPlayerCombatant(playerCharacter: GameState['playerCharacter']): CombatantState {
  const { attributes, skills } = playerCharacter
  return {
    combatantId: 'player',
    sourceNpcId: null,
    name: playerCharacter.name || 'The Heir',
    side: 'allies',
    maxHealth: 80,
    health: 80,
    morale: Math.max(30, Math.min(100, Math.round(attributes.resolve * 0.7 + attributes.presence * 0.3))),
    skill: Math.min(85, Math.max(skills.melee, skills.ranged)),
    accuracy: Math.min(90, 50 + Math.floor(attributes.perception * 0.4)),
    damageMin: Math.max(5, Math.floor(attributes.might / 8) + 5),
    damageMax: Math.max(8, Math.floor(attributes.might / 5) + 6),
    effectiveRange: skills.ranged > skills.melee ? 'distant' : 'close',
    soak: 3,
    speed: 4,
    guarding: false,
    staggered: false,
    guardCooldown: false,
    equippedWeaponId: PLAYER_DEFAULT_WEAPON_ID,
    equippedArmorId: null,
  }
}

function isAlive(combatant: CombatantState) {
  return combatant.health > 0
}

/**
 * Compute hit chance bonus/penalty from relationships.
 * Called when building ally combatants.
 * Returns a modifier in range [-0.15, +0.15].
 */
export function getRelationshipCombatModifier(
  npcId: string,
  relationships: Record<string, RelationshipAxes>
): number {
  const key = buildRelationshipKey('player', npcId)
  const rel = relationships[key]
  if (!rel) return 0

  const loyaltyBonus = (rel.loyalty - 50) / 1000  // ±0.05 max
  const trustBonus = (rel.trust - 50) / 1000       // ±0.05 max
  const fearPenalty = rel.fear > 70 ? -(rel.fear - 70) / 1000 : 0 // up to -0.03

  return Math.max(-0.15, Math.min(0.15, loyaltyBonus + trustBonus + fearPenalty))
}

function buildAllyCombatant(
  npc: NpcRuntimeState,
  equippedItemDurabilities: GameState['equippedItemDurabilities'],
  relationships: Record<string, RelationshipAxes> = {},
): CombatantState {
  const definition = contentCatalog.npcsById.get(npc.npcId)
  const skill = Math.max(npc.skills.melee, npc.skills.ranged)
  const effectiveRange: CombatRange =
    npc.skills.ranged > npc.skills.melee ? 'distant' : 'close'

  const snap = { hunger: npc.states.hunger, fatigue: npc.states.fatigue }
  const statePenalty = getHungerCombatPenalty(snap) + getFatigueAccuracyPenalty(snap)
  const baseAccuracy = Math.min(95, skill + Math.floor(npc.attributes.perception / 3))

  const weaponDurability = equippedItemDurabilities[npc.npcId]?.['weapon'] ?? 100
  const weaponDurMod = getDurabilityAccuracyModifier(weaponDurability)
  const armorDurability = equippedItemDurabilities[npc.npcId]?.['armor'] ?? 100
  const armorDurMod = getDurabilityArmorModifier(armorDurability)

  const relModifier = getRelationshipCombatModifier(npc.npcId, relationships)
  const skillAccuracy = Math.max(1, Math.floor(Math.max(1, baseAccuracy + statePenalty) * weaponDurMod))
  const hitChance = Math.max(0.05, Math.min(0.95, skillAccuracy / 100 + relModifier))

  return {
    combatantId: `ally-${npc.npcId}`,
    sourceNpcId: npc.npcId,
    name: definition?.name ?? npc.npcId,
    side: 'allies',
    maxHealth: Math.max(35, npc.states.health),
    health: Math.max(35, npc.states.health),
    morale: npc.states.morale,
    skill,
    accuracy: Math.max(0, Math.min(100, Math.round(hitChance * 100))),
    damageMin: Math.max(8, Math.floor((npc.attributes.might + skill) / 12)),
    damageMax: Math.max(12, Math.floor((npc.attributes.might + skill) / 9)),
    effectiveRange,
    soak: Math.floor(Math.floor(npc.attributes.endurance / 4) * armorDurMod),
    speed: Math.max(1, Math.floor((npc.attributes.agility + npc.attributes.resolve) / 18)),
    guarding: false,
    staggered: false,
    guardCooldown: false,
    equippedWeaponId: npc.loadout.primaryWeaponId,
    equippedArmorId: npc.loadout.armorId,
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
    staggered: false,
    guardCooldown: false,
    equippedWeaponId: null,
    equippedArmorId: null,
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

  // Enemies use varied targeting strategies for unpredictability
  if (actor.side === 'enemies') {
    const roll = Math.random()
    // 35%: target lowest HP (focus fire)
    if (roll < 0.35) {
      return opponents.slice().sort((a, b) => a.health - b.health)[0] ?? null
    }
    // 25%: target lowest morale (exploit fear)
    if (roll < 0.60) {
      return opponents.slice().sort((a, b) => a.morale - b.morale)[0] ?? null
    }
    // 25%: target highest skill (neutralize the strongest)
    if (roll < 0.85) {
      return opponents.slice().sort((a, b) => b.skill - a.skill)[0] ?? null
    }
    // 15%: random target
    return opponents[Math.floor(Math.random() * opponents.length)] ?? null
  }

  // Allies always focus lowest HP (maximize KO chance)
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
  const effectiveAccuracy = Math.min(99, Math.max(1, weapon.accuracy + rangeOffset - armor.evasionPenalty))

  const hit = Math.random() * 100 < effectiveAccuracy

  if (!hit) {
    return appendLog(encounter, actorId, `${buildMissMessage(actor.name, target.name)}.`)
  }

  const rawDamage = Math.round(
    weapon.damageMin + Math.random() * (weapon.damageMax - weapon.damageMin),
  )
  const effectiveSoak = Math.max(0, armor.soak - weapon.armorPiercing)
  const guardMitigation = target.guarding ? 0.70 : 1
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
      guardCooldown: true,
      morale: Math.max(0, combatant.morale - 3),
    })),
    actorId,
    'The combatant braces, trading momentum for protection.',
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
  const roundChanged = nextTurn.round > encounter.round

  return {
    ...encounter,
    activeCombatantId: nextTurn.activeCombatantId,
    round: nextTurn.round,
    combatants: roundChanged
      ? encounter.combatants.map((c) => ({ ...c, guardCooldown: false }))
      : encounter.combatants,
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

    // Stagger: skip this enemy's turn and clear the flag
    if (activeCombatant.staggered) {
      nextEncounter = updateCombatant(nextEncounter, activeCombatant.combatantId, (c) => ({
        ...c,
        staggered: false,
      }))
      nextEncounter = appendLog(
        nextEncounter,
        activeCombatant.combatantId,
        `${activeCombatant.name} is still reeling — their action is lost.`,
      )
      nextEncounter = advanceTurn(nextEncounter)
      continue
    }

    const chosenAction: CombatAction = (() => {
      // At distance, melee enemies advance
      if (nextEncounter.range === 'distant' && activeCombatant.effectiveRange === 'close') {
        return 'advance'
      }
      // Low health + not on cooldown: chance to guard (defensive AI)
      if (activeCombatant.health < 30 && !activeCombatant.guardCooldown && Math.random() < 0.5) {
        return 'guard'
      }
      // Ranged enemies at close range: retreat to get effective range
      if (nextEncounter.range === 'close' && activeCombatant.effectiveRange === 'distant' && Math.random() < 0.4) {
        return 'retreat'
      }
      return 'attack'
    })()

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

export function startCombatEncounter(state: GameState, linkedQuestId?: string | null): GameState {
  if (state.activeCombat?.outcome === 'ongoing') {
    return state
  }

  const squad = state.roster.filter((npc) => state.selectedSquadNpcIds.includes(npc.npcId))

  if (squad.length === 0) {
    return state
  }

  // Night/evening combat: reduced visibility hurts accuracy
  const timeSlotAccuracyMod =
    state.timeSlot === 'night' ? -15
    : state.timeSlot === 'evening' ? -5
    : state.timeSlot === 'afternoon' ? 3
    : 0

  const npcAllies = squad.map((npc) => {
    const base = buildAllyCombatant(npc, state.equippedItemDurabilities, state.relationships)
    return timeSlotAccuracyMod !== 0
      ? { ...base, accuracy: Math.max(1, Math.min(99, base.accuracy + timeSlotAccuracyMod)) }
      : base
  })
  const playerCombatant = buildPlayerCombatant(state.playerCharacter)
  const allies = [playerCombatant, ...npcAllies]
  // Enemy count matches NPC squad size only (not counting the player)
  const enemies = npcAllies.map((_, index) => buildEnemyCombatant(index, npcAllies))
  const combatants = [...allies, ...enemies].sort(
    (left, right) => right.speed - left.speed || right.skill - left.skill,
  )

  const encounter: ActiveCombatState = {
    encounterId: `encounter-day-${state.day}-${state.timeSlot}`,
    round: 1,
    range: 'medium',
    outcome: 'ongoing',
    activeCombatantId: combatants[0]?.combatantId ?? null,
    combatants,
    log: [
      {
        round: 1,
        actorId: combatants[0]?.combatantId ?? 'system',
        summary: 'A patrol moves to cut the squad off. The gap between them closes fast.',
      },
    ],
    factionId: 'faction-civic-compact',
    linkedQuestId: linkedQuestId ?? null,
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
    'The squad moves out. A hostile patrol stands in the way.',
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

  // Stagger: skip the active ally's turn and clear the flag
  if (activeCombatant.staggered) {
    let nextEncounter = updateCombatant(encounter, activeCombatant.combatantId, (c) => ({
      ...c,
      staggered: false,
    }))
    nextEncounter = appendLog(
      nextEncounter,
      activeCombatant.combatantId,
      `${activeCombatant.name} is still reeling — their action is lost.`,
    )
    nextEncounter = advanceTurn(nextEncounter)
    nextEncounter = resolveEnemyTurns(nextEncounter)
    nextEncounter = evaluateOutcome(nextEncounter)
    let nextState = syncRosterFromCombat({ ...state, activeCombat: nextEncounter }, nextEncounter)
    nextState = appendCombatActivityEntries(nextState, nextEncounter, previousLogLength)
    return nextState
  }

  // Guard cooldown: prevent guard spam — unit can only guard once per round
  if (action === 'guard' && activeCombatant.guardCooldown) {
    let nextEncounter = appendLog(
      encounter,
      activeCombatant.combatantId,
      `${activeCombatant.name} is already braced — they cannot guard again this round.`,
    )
    nextEncounter = advanceTurn(nextEncounter)
    nextEncounter = resolveEnemyTurns(nextEncounter)
    nextEncounter = evaluateOutcome(nextEncounter)
    let nextState = syncRosterFromCombat({ ...state, activeCombat: nextEncounter }, nextEncounter)
    nextState = appendCombatActivityEntries(nextState, nextEncounter, previousLogLength)
    return nextState
  }

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

  // Durability degradation for ally equipment (5% chance per action)
  if (activeCombatant.side === 'allies' && activeCombatant.sourceNpcId) {
    const npcId = activeCombatant.sourceNpcId
    const durabilities = { ...nextState.equippedItemDurabilities }
    const npcDur = { ...(durabilities[npcId] ?? {}) } as Record<'weapon' | 'armor', number>

    if (action === 'attack' && activeCombatant.equippedWeaponId && Math.random() < 0.05) {
      const amount = 3 + Math.floor(Math.random() * 3)
      npcDur['weapon'] = Math.max(0, (npcDur['weapon'] ?? 100) - amount)
    }

    if (activeCombatant.equippedArmorId && Math.random() < 0.05) {
      const amount = 2 + Math.floor(Math.random() * 3)
      npcDur['armor'] = Math.max(0, (npcDur['armor'] ?? 100) - amount)
    }

    // Auto-switch to secondary weapon if primary breaks
    const primaryBroken = npcDur['weapon'] === 0
    const rosterNpc = nextState.roster.find((r) => r.npcId === npcId)
    if (primaryBroken && rosterNpc?.loadout.secondaryWeaponId) {
      const secondaryId = rosterNpc.loadout.secondaryWeaponId
      nextState = {
        ...nextState,
        activeCombat: nextState.activeCombat
          ? {
              ...nextState.activeCombat,
              combatants: nextState.activeCombat.combatants.map((c) =>
                c.sourceNpcId === npcId ? { ...c, equippedWeaponId: secondaryId } : c,
              ),
            }
          : nextState.activeCombat,
      }
      nextState = appendActivityLogEntry(
        nextState,
        'combat',
        `${rosterNpc.npcId}'s weapon fails. They draw their secondary.`,
      )
    }

    durabilities[npcId] = npcDur
    nextState = { ...nextState, equippedItemDurabilities: durabilities }
  }

  // Fear generation: allies who take heavy damage become frightened
  for (const allyCombatant of nextEncounter.combatants.filter((c) => c.side === 'allies' && c.sourceNpcId)) {
    const before = encounter.combatants.find((c) => c.combatantId === allyCombatant.combatantId)
    if (!before) continue
    const damageTaken = before.health - allyCombatant.health
    if (damageTaken <= 0) continue
    const threshold = allyCombatant.maxHealth * 0.25
    if (damageTaken >= threshold) {
      const fearGain = allyCombatant.health <= allyCombatant.maxHealth * 0.2 ? 12 : 6
      applyRelationshipDelta(nextState, 'player', allyCombatant.sourceNpcId!, 'fear', fearGain)
    }
  }

  nextState = appendCombatActivityEntries(nextState, nextEncounter, previousLogLength)

  if (nextEncounter.outcome === 'victory') {
    nextState = appendActivityLogEntry(
      nextState,
      'combat',
      'The squad holds the ground. The patrol does not.',
    )
  }

  if (nextEncounter.outcome === 'defeat') {
    nextState = appendActivityLogEntry(
      nextState,
      'combat',
      'The patrol holds. The squad falls back.',
    )
  }

  return nextState
}

export function concludeCombatEncounter(state: GameState): GameState {
  if (!state.activeCombat || state.activeCombat.outcome === 'ongoing') return state

  const combat = state.activeCombat
  const mission = state.activeMissionId
    ? contentCatalog.missionsById.get(state.activeMissionId)
    : null
  let nextState: GameState = { ...state, activeCombat: null }

  if (combat.outcome === 'victory') {
    const reward = mission?.rewardCredits ?? 0
    if (reward > 0) nextState = { ...nextState, money: nextState.money + reward }

    // Loot from defeated enemies
    const defeatedEnemies = combat.combatants.filter((c) => c.side === 'enemies' && c.health <= 0)
    if (defeatedEnemies.length > 0) {
      const lootMarks = defeatedEnemies.reduce((sum, e) => sum + Math.max(5, Math.floor(e.maxHealth / 5)), 0)
      nextState = { ...nextState, money: nextState.money + lootMarks }
      nextState = appendActivityLogEntry(
        nextState,
        'economy',
        `Searched the fallen. Found ${lootMarks} Marks in coin and valuables.`,
      )
    }

    // Relationship gains for victory
    const allyCombatants = combat.combatants.filter((c) => c.side === 'allies' && c.sourceNpcId)
    nextState = { ...nextState, relationships: { ...nextState.relationships } }
    for (const ally of allyCombatants) {
      applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'trust', 3)
      applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'loyalty', 2)
    }

    // Recruitable defeated enemies
    const recruitableDefs = (enemyNpcsData as Array<{ id: string; name: string; recruitableOnDefeat: boolean }>)
      .filter((en) => en.recruitableOnDefeat)
    if (recruitableDefs.length > 0) {
      const alreadyOffered = new Set(nextState.availableForHire.map((o) => o.npcId))
      const alreadyHired = new Set(nextState.roster.map((r) => r.npcId))
      const eligible = recruitableDefs.filter((en) => !alreadyOffered.has(en.id) && !alreadyHired.has(en.id))
      if (eligible.length > 0) {
        const pick = eligible[Math.floor(Math.random() * eligible.length)]!
        nextState = {
          ...nextState,
          availableForHire: [
            ...nextState.availableForHire,
            {
              npcId: pick.id,
              discoveredInDistrictId: nextState.currentDistrictId,
              wagePerDay: 10,
              signingBonus: 0,
              requiredFactionId: null,
              requiredFactionStanding: 0,
              turnsAvailable: 3,
              source: 'combat' as const,
            },
          ],
        }
        nextState = appendActivityLogEntry(
          nextState,
          'system',
          `${pick.name} is defeated but alive. They may be willing to talk.`,
        )
      }
    }

    if (mission) {
      const employerCurrent = nextState.factionStandings[mission.employerFactionId] ?? 0
      const enemyCurrent = nextState.factionStandings[mission.enemyFactionId] ?? 0
      nextState = {
        ...nextState,
        factionStandings: {
          ...nextState.factionStandings,
          [mission.employerFactionId]: Math.max(-100, Math.min(100, employerCurrent + mission.rewardStanding)),
          [mission.enemyFactionId]: Math.max(-100, Math.min(100, enemyCurrent - mission.penaltyStanding)),
        },
        activeMissionId: null,
      }
      const employerName = contentCatalog.factionsById.get(mission.employerFactionId)?.name ?? mission.employerFactionId
      const enemyName = contentCatalog.factionsById.get(mission.enemyFactionId)?.name ?? mission.enemyFactionId
      nextState = appendActivityLogEntry(nextState, 'economy',
        `Mission complete: "${mission.title}". +${reward} Marks. Standing with ${employerName} improved; ${enemyName} will remember this.`)
    } else {
      const factionId = combat.factionId
      if (factionId) {
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

      // Non-quest victory renown gain
      const oldRenown = nextState.playerCharacter.renown
      const newRenown = oldRenown + 5
      const oldLevel = getRenownLevel(oldRenown)
      const newLevel = getRenownLevel(newRenown)
      nextState = {
        ...nextState,
        playerCharacter: { ...nextState.playerCharacter, renown: newRenown },
      }
      nextState = appendActivityLogEntry(nextState, 'system', 'Victory. +5 Renown.')
      if (newLevel.level > oldLevel.level) {
        nextState = appendActivityLogEntry(nextState, 'system', `Your name carries further now. Renown rank: ${newLevel.label}.`)
      }
    }

    // Complete linked quest on victory
    if (combat.linkedQuestId) {
      const questIdx = nextState.activeQuests.findIndex((q) => q.questId === combat.linkedQuestId)
      if (questIdx !== -1) {
        const completedQuest = { ...nextState.activeQuests[questIdx], objectiveMet: true, status: 'completed' as const }
        const nextQuests = nextState.activeQuests.filter((_, i) => i !== questIdx)
        const template = contentCatalog.questsById.get(completedQuest.questId)
        const renownGain = template?.riskLevel === 'high' ? 15 : template?.riskLevel === 'medium' ? 8 : 4
        const oldRenown = nextState.playerCharacter.renown
        const newRenown = oldRenown + renownGain
        const oldLevel = getRenownLevel(oldRenown)
        const newLevel = getRenownLevel(newRenown)
        nextState = {
          ...nextState,
          activeQuests: nextQuests,
          completedQuestIds: [...nextState.completedQuestIds, completedQuest.questId],
          playerCharacter: {
            ...nextState.playerCharacter,
            renown: newRenown,
          },
        }
        const questTitle = template?.title ?? completedQuest.questId
        nextState = appendActivityLogEntry(nextState, 'system', `Contract fulfilled: "${questTitle}". +${renownGain} Renown.`)
        if (newLevel.level > oldLevel.level) {
          nextState = appendActivityLogEntry(nextState, 'system', `Your name carries further now. Renown rank: ${newLevel.label}.`)
        }

        // Apply quest rewards: Marks and faction standing
        if (template) {
          if (template.rewardMarks > 0) {
            nextState = { ...nextState, money: nextState.money + template.rewardMarks }
            nextState = appendActivityLogEntry(nextState, 'economy', `Payment received: ${template.rewardMarks} Marks for "${questTitle}".`)
          }
          if (template.rewardStandingFactionId && template.rewardStandingDelta > 0) {
            const current = nextState.factionStandings[template.rewardStandingFactionId] ?? 0
            nextState = {
              ...nextState,
              factionStandings: {
                ...nextState.factionStandings,
                [template.rewardStandingFactionId]: Math.max(-100, Math.min(100, current + template.rewardStandingDelta)),
              },
            }
            const factionName = contentCatalog.factionsById.get(template.rewardStandingFactionId)?.name ?? template.rewardStandingFactionId
            nextState = appendActivityLogEntry(nextState, 'system', `Standing with ${factionName} improved by ${template.rewardStandingDelta}.`)
          }
          if (template.rewardCityDialId && template.rewardCityDialDelta) {
            const dial = template.rewardCityDialId as keyof typeof nextState.cityDials
            if (dial in nextState.cityDials) {
              nextState = {
                ...nextState,
                cityDials: {
                  ...nextState.cityDials,
                  [dial]: Math.max(0, Math.min(100, (nextState.cityDials[dial] as number) + template.rewardCityDialDelta)),
                },
              }
            }
          }
        }
      }
    }
  }

  if (combat.outcome === 'defeat') {
    // Relationship penalties for defeat
    const allyCombatants = combat.combatants.filter((c) => c.side === 'allies' && c.sourceNpcId)
    nextState = { ...nextState, relationships: { ...nextState.relationships } }
    for (const ally of allyCombatants) {
      const result = applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'trust', -2)
      if (result.significant) {
        nextState = appendActivityLogEntry(
          nextState,
          'system',
          `${ally.name} questions the player's leadership after the defeat.`,
        )
      }
    }

    if (mission) {
      const employerCurrent = nextState.factionStandings[mission.employerFactionId] ?? 0
      nextState = {
        ...nextState,
        factionStandings: {
          ...nextState.factionStandings,
          [mission.employerFactionId]: Math.max(-100, Math.min(100, employerCurrent - mission.penaltyStanding)),
        },
        activeMissionId: null,
      }
      const employerName = contentCatalog.factionsById.get(mission.employerFactionId)?.name ?? mission.employerFactionId
      nextState = appendActivityLogEntry(nextState, 'combat',
        `The squad was driven back. "${mission.title}" failed. Standing with ${employerName} suffers.`)
    } else {
      const factionId = combat.factionId
      if (factionId) {
        const current = nextState.factionStandings[factionId] ?? 0
        nextState = {
          ...nextState,
          factionStandings: {
            ...nextState.factionStandings,
            [factionId]: Math.max(-100, Math.min(100, current - 5)),
          },
        }
        const factionName = contentCatalog.factionsById.get(factionId)?.name ?? factionId
        nextState = appendActivityLogEntry(nextState, 'system', `Defeat. Standing with ${factionName} worsens.`)
      }
    }
  }

  // District tension — any combat increases unrest
  nextState = {
    ...nextState,
    cityDials: {
      ...nextState.cityDials,
      unrest: Math.min(100, nextState.cityDials.unrest + 3),
    },
  }

  // Write health, assignment, and emotional aftermath back to roster
  const isVictory = combat.outcome === 'victory'
  const allyCombatants = combat.combatants.filter((c) => c.side === 'allies' && c.sourceNpcId)

  // Post-combat relationship boosts for surviving allies (shared experience)
  nextState = { ...nextState, relationships: { ...nextState.relationships } }
  for (const ally of allyCombatants) {
    if (ally.health > 0) {
      applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'affinity', 2)
      applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'trust', 1)
      if (isVictory && mission) {
        applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'loyalty', 3)
      }
    }
  }

  nextState = {
    ...nextState,
    roster: nextState.roster.map((npc) => {
      const ally = allyCombatants.find((c) => c.sourceNpcId === npc.npcId)
      if (!ally) return npc

      const newHealth = Math.max(0, Math.min(100, ally.health))
      const isKO = newHealth <= 0

      let newStress = npc.states.stress
      let newMorale = npc.states.morale

      // Victory/defeat emotional response
      if (isVictory) {
        newMorale = Math.min(100, newMorale + 5)
        newStress = Math.max(0, newStress - 3)
      } else {
        newMorale = Math.max(0, newMorale - 8)
        newStress = Math.min(100, newStress + 8)
      }

      // Combat is stressful regardless
      newStress = Math.min(100, newStress + 3)

      // High-injury stress spike
      if (newHealth < 30 && !isKO) {
        newStress = Math.min(100, newStress + 5)
      }

      return {
        ...npc,
        assignment: isKO ? 'recovering' : 'idle',
        states: {
          ...npc.states,
          health: isKO ? 10 : newHealth,
          morale: newMorale,
          stress: newStress,
          injury: isKO
            ? Math.min(100, npc.states.injury + 30)
            : Math.min(100, npc.states.injury + Math.max(0, npc.states.health - newHealth)),
        },
      }
    }),
    selectedSquadNpcIds: [],
  }

  return appendActivityLogEntry(nextState, 'system', 'The encounter is concluded. The squad returns.')
}
