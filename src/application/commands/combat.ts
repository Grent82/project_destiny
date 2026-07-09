/** Public combat commands — starts, steps, and concludes encounters; orchestrates all sub-modules. */

import type {
  ActiveCombatState,
  CombatAction,
  GameState,
} from '../../domain'
import { checkFearRefuseAdvance } from '../../domain/npcStateModifiers'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { applyRelationshipDelta } from './adjustRelationship'
import { getRenownLevel } from '../../domain/progression/contracts'
import { createRng } from './seededRng'
import { settleQuestFailure, settleQuestSuccess } from './questSettlement'
import { formatMarks } from '../../domain/game/currency'
import { computePostCombatFearDelta } from '../../domain/combat/fearModel'
import { spawnEventRumor } from './spawnEventRumor'
import { advanceTimeSlotInState } from './timeAdvance'
import { grantNewItemToNpc } from './npcInventoryHelpers'

const NPC_COMBAT_LOOT_CHANCE = 0.3
import {
  FALLBACK_ENCOUNTER_POOL,
  PLAYER_MAX_HEALTH,
  buildAllyCombatant,
  buildEnemyCombatant,
  buildPlayerCombatant,
  randomIndex,
} from './combatants'
export {
  getRelationshipCombatModifier,
  getEnemyDangerModifiers,
} from './combatants'
export { MIN_DEPLOYABLE_HEALTH } from './combatConsts'
import { isDeployable } from './isDeployable'
import { isSeriousInjury } from './recovery'
import {
  advanceTurn,
  appendLog,
  applyAction,
  clearGuardingForCombatant,
  evaluateOutcome,
  getCombatantById,
  updateCombatant,
} from './combatResolution'
import { resolveEnemyTurns } from './combatAI'
import { appendCombatActivityEntries, syncRosterFromCombat } from './combatAftermath'
import { DISTRICT_IDS, FACTION_IDS } from '../content/ids'

export function startCombatEncounter(state: GameState, linkedQuestId?: string | null): GameState {
  if (state.activeCombat?.outcome === 'ongoing') {
    return state
  }

  const linkedQuest = linkedQuestId
    ? state.activeQuests.find((quest) => quest.questId === linkedQuestId) ?? null
    : null

  if (
    linkedQuest &&
    linkedQuest.context.incidentDistrictId &&
    state.currentDistrictId !== linkedQuest.context.incidentDistrictId
  ) {
    return state
  }

  const squad = state.npcRuntimeStates.filter(
    (npc) => state.selectedSquadNpcIds.includes(npc.npcId) && isDeployable(npc),
  )

  if (squad.length === 0) {
    return state
  }

  // Night/evening combat: reduced visibility hurts accuracy
  const timeSlotAccuracyMod =
    state.timeSlot === 'night' ? -15
    : state.timeSlot === 'evening' ? -5
    : state.timeSlot === 'afternoon' ? 3
    : 0

  const currentDistrict = contentCatalog.districtsById.get(state.currentDistrictId ?? '')
  const districtFactionId = currentDistrict?.controllingFactionId ?? FACTION_IDS.CIVIC_COMPACT
  const districtDangerLevel = currentDistrict?.dangerLevel ?? 1

  const npcAllies = squad.map((npc) => {
    const base = buildAllyCombatant(npc, state.equippedItemDurabilities, state.relationships)
    return timeSlotAccuracyMod !== 0
      ? { ...base, accuracy: Math.max(1, Math.min(99, base.accuracy + timeSlotAccuracyMod)) }
      : base
  })
  const playerCombatant = buildPlayerCombatant(state.playerCharacter)
  const allies = [playerCombatant, ...npcAllies]
  // Enemy count matches NPC squad size only (not counting the player)
  const encounterPool =
    contentCatalog.encounterTablesByDistrict.get(state.currentDistrictId ?? '') ??
    FALLBACK_ENCOUNTER_POOL
  const enemies = npcAllies.map((_, index) =>
    buildEnemyCombatant(
      index,
      npcAllies,
      districtDangerLevel,
      encounterPool[index % encounterPool.length],
    ),
  )
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
    factionId: districtFactionId,
    linkedQuestId: linkedQuestId ?? null,
    provenance: {
      sourceType: linkedQuestId ? 'quest' : 'district',
      linkedQuestId: linkedQuestId ?? null,
      linkedExpeditionId: null,
      linkedFactionId: linkedQuest?.context.issuerFactionId ?? districtFactionId,
      districtId: linkedQuest?.context.incidentDistrictId ?? state.currentDistrictId,
      destinationId: null,
      enemyTemplateIds: [],
      enemyDefinitionIds: enemies.map((e) => e.sourceNpcId).filter((id): id is string => id != null),
    },
  }

  const nextActiveQuests = linkedQuest
    ? state.activeQuests.map((quest) =>
        quest.questId === linkedQuest.questId
          ? {
              ...quest,
              stageId: 'engaged',
              currentObjectiveLabel:
                'The squad is committed. Break the hostile line and survive the clash.',
              progress: {
                ...quest.progress,
                completedSteps: Math.max(quest.progress.completedSteps, 3),
                lastAdvancedDay: state.day,
              },
              journalEntries: [
                ...quest.journalEntries,
                'The squad commits to the incident site and the fighting begins.',
              ],
            }
          : quest,
      )
    : state.activeQuests

  return appendActivityLogEntry(
    {
      ...state,
      activeCombat: encounter,
      activeQuests: nextActiveQuests,
    },
    'combat',
    'The squad moves out. A hostile patrol stands in the way.',
  )
}

export function performCombatAction(state: GameState, action: CombatAction): GameState {
  const encounter = state.activeCombat

  if (!encounter || encounter.outcome !== 'ongoing' || !encounter.activeCombatantId) {
    return state
  }

  const activeCombatant = getCombatantById(encounter, encounter.activeCombatantId)

  if (!activeCombatant || activeCombatant.side !== 'allies') {
    return state
  }

  const seeded = createRng(state.rngSeed)
  const rng = seeded.rng
  const previousLogLength = encounter.log.length

  // Stagger: skip the active ally's turn and clear the flag
  if (activeCombatant.staggered) {
    let nextEncounter = clearGuardingForCombatant(encounter, activeCombatant.combatantId)
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
    nextEncounter = resolveEnemyTurns(nextEncounter, rng)
    nextEncounter = evaluateOutcome(nextEncounter)
    let nextState = syncRosterFromCombat(
      { ...state, activeCombat: nextEncounter, rngSeed: seeded.getSeed() },
      nextEncounter,
    )
    nextState = appendCombatActivityEntries(nextState, nextEncounter, previousLogLength)
    return nextState
  }

  // Guard cooldown: prevent guard spam — unit can only guard once per round
  if (action === 'guard' && activeCombatant.guardCooldown) {
    let nextEncounter = appendLog(
      clearGuardingForCombatant(encounter, activeCombatant.combatantId),
      activeCombatant.combatantId,
      `${activeCombatant.name} is already braced — they cannot guard again this round.`,
    )
    nextEncounter = advanceTurn(nextEncounter)
    nextEncounter = resolveEnemyTurns(nextEncounter, rng)
    nextEncounter = evaluateOutcome(nextEncounter)
    let nextState = syncRosterFromCombat(
      { ...state, activeCombat: nextEncounter, rngSeed: seeded.getSeed() },
      nextEncounter,
    )
    nextState = appendCombatActivityEntries(nextState, nextEncounter, previousLogLength)
    return nextState
  }

  // Fear check: ally may refuse advance action
  if (action === 'advance' && activeCombatant.sourceNpcId) {
    const npc = state.npcRuntimeStates.find((r) => r.npcId === activeCombatant.sourceNpcId)
    if (npc && checkFearRefuseAdvance({ fear: npc.states.fear }, rng)) {
      const refusalMessage = `${activeCombatant.name} hesitates — fear roots them in place.`
      let nextEncounter = appendLog(
        clearGuardingForCombatant(encounter, activeCombatant.combatantId),
        activeCombatant.combatantId,
        refusalMessage,
      )
      nextEncounter = advanceTurn(nextEncounter)
      nextEncounter = resolveEnemyTurns(nextEncounter, rng)
      nextEncounter = evaluateOutcome(nextEncounter)
      let nextState = syncRosterFromCombat(
        { ...state, activeCombat: nextEncounter, rngSeed: seeded.getSeed() },
        nextEncounter,
      )
      nextState = appendCombatActivityEntries(nextState, nextEncounter, previousLogLength)
      return nextState
    }
  }

  let nextEncounter = clearGuardingForCombatant(encounter, activeCombatant.combatantId)
  nextEncounter = applyAction(nextEncounter, activeCombatant.combatantId, action, rng)
  nextEncounter = evaluateOutcome(nextEncounter)

  if (nextEncounter.outcome === 'ongoing') {
    nextEncounter = advanceTurn(nextEncounter)
    nextEncounter = resolveEnemyTurns(nextEncounter, rng)
    nextEncounter = evaluateOutcome(nextEncounter)
  }

  let nextState = syncRosterFromCombat(
    {
      ...state,
      activeCombat: nextEncounter,
      rngSeed: seeded.getSeed(),
    },
    nextEncounter,
  )

  // Durability degradation for ally equipment (5% chance per action)
  if (activeCombatant.side === 'allies' && activeCombatant.sourceNpcId) {
    const npcId = activeCombatant.sourceNpcId
    const durabilities = { ...nextState.equippedItemDurabilities }
    // Ensure npcDur has default values to prevent Zod validation errors
    const npcDur: Record<'weapon' | 'armor', number> = {
      weapon: typeof (durabilities[npcId]?.weapon) === 'number' ? durabilities[npcId].weapon : 100,
      armor: typeof (durabilities[npcId]?.armor) === 'number' ? durabilities[npcId].armor : 100,
    }

    if (action === 'attack' && activeCombatant.equippedWeaponId && rng() < 0.05) {
      const amount = 3 + Math.floor(rng() * 3)
      npcDur['weapon'] = Math.max(0, npcDur['weapon'] - amount)
    }

    if (activeCombatant.equippedArmorId && rng() < 0.05) {
      const amount = 2 + Math.floor(rng() * 3)
      npcDur['armor'] = Math.max(0, npcDur['armor'] - amount)
    }

    // Auto-switch to secondary weapon if primary breaks
    const primaryBroken = npcDur['weapon'] === 0
    const rosterNpc = nextState.npcRuntimeStates.find((r) => r.npcId === npcId)
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

  // Battlefield panic — purely tactical. Relationship fear is NOT updated here.
  // Fear bleeds into relationship only at encounter resolution (bridge rule in fearModel.ts).
  // Note: checkFearRefuseAdvance uses npc.states.fear (relationship fear) to determine
  // panic susceptibility, so the two systems are connected at the threshold read point only.

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

  const seeded = createRng(state.rngSeed)
  const rng = seeded.rng
  const combat = state.activeCombat
  let nextState: GameState = { ...state, activeCombat: null }

  if (combat.outcome === 'victory') {
    // Loot from defeated enemies
    const defeatedEnemies = combat.combatants.filter((c) => c.side === 'enemies' && c.health <= 0)
    if (defeatedEnemies.length > 0) {
      const lootMarks = defeatedEnemies.reduce(
        (sum, e) => sum + Math.max(5, Math.floor(e.maxHealth / 5)),
        0,
      )
      nextState = { ...nextState, money: nextState.money + lootMarks }
      nextState = appendActivityLogEntry(
        nextState,
        'economy',
        `Searched the fallen. Found ${formatMarks(lootMarks)} in coin and valuables.`,
      )
    }

    // Relationship gains for victory + bridge rule: near-death allies gain relationship fear
    const allyCombatants = combat.combatants.filter((c) => c.side === 'allies' && c.sourceNpcId)
    for (const ally of allyCombatants) {
      const trustResult = applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'trust', 3)
      nextState = trustResult.state
      const loyaltyResult = applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'loyalty', 2)
      nextState = loyaltyResult.state

      // Bridge rule: near-death → relationship fear increase (reduced on victory)
      const rosterEntry = nextState.npcRuntimeStates.find((e) => e.npcId === ally.sourceNpcId)
      const currentFear = rosterEntry?.states.fear ?? 0
      const fearDelta = computePostCombatFearDelta(ally.health, ally.maxHealth, 'victory', currentFear)
      if (fearDelta > 0) {
        const fearResult = applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'fear', fearDelta)
        nextState = fearResult.state
      }
    }

    // NPC combat loot (destiny-bkln.cyrd): surviving ally combatants may personally recover a
    // small item from the fallen, landing in their own inventory — reuses the ally participant
    // tracking (sourceNpcId/side) that combatants.ts already provides, rather than inventing new
    // tracking. Passive combat-resolution side effect (like the money-loot branch above), not
    // intention-gated — an NPC doesn't "decide" to loot mid-fight.
    if (defeatedEnemies.length > 0) {
      const survivingAllies = allyCombatants.filter((a) => a.health > 0 && a.sourceNpcId)
      const lootPool = contentCatalog.items.filter((i) => i.category === 'material' || i.category === 'tradeGood')
      if (lootPool.length > 0) {
        for (const ally of survivingAllies) {
          if (rng() >= NPC_COMBAT_LOOT_CHANCE) continue
          const item = lootPool[randomIndex(lootPool.length, rng)]!
          nextState = grantNewItemToNpc(nextState, ally.sourceNpcId!, item.id, 1, 'combat_loot')
          const npcName = nextState.npcRuntimeStates.find((n) => n.npcId === ally.sourceNpcId)?.name ?? ally.sourceNpcId
          nextState = appendActivityLogEntry(nextState, 'economy', `${npcName} recovers ${item.name} from the fight.`)
        }
      }
    }

    // Recruitable defeated enemies (destiny-rama.14: enemy defs live in the unified npcs catalog now)
    const recruitableDefs = contentCatalog.npcs.filter((en) => en.npcType === 'enemy' && en.recruitableOnDefeat)
    if (recruitableDefs.length > 0) {
      const alreadyOffered = new Set(nextState.availableForHire.map((o) => o.npcId))
      const alreadyHired = new Set(nextState.npcRuntimeStates.map((r) => r.npcId))
      const eligible = recruitableDefs.filter(
        (en) => !alreadyOffered.has(en.id) && !alreadyHired.has(en.id),
      )
      if (eligible.length > 0) {
        const pick = eligible[randomIndex(eligible.length, rng)]!
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

    const factionId = combat.provenance?.linkedFactionId ?? combat.factionId
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
      nextState = appendActivityLogEntry(
        nextState,
        'system',
        `Victory came at a cost. Standing with ${factionName} worsens after the clash.`,
      )
    }

    if (combat.linkedQuestId) {
      nextState = settleQuestSuccess(nextState, combat.linkedQuestId, {
        objectiveLabel: 'The on-site clash is settled. Return to house business.',
        journalEntry: 'The contract was settled in live combat at the incident site.',
        completionMessage: `Contract fulfilled in the field.`,
      })
    } else {
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
        nextState = appendActivityLogEntry(
          nextState,
          'system',
          `Your name carries further now. Renown rank: ${newLevel.label}.`,
        )
      }
    }
  }

  if (combat.outcome === 'defeat') {
    // Relationship penalties for defeat + bridge rule: full fear delta applies
    const allyCombatants = combat.combatants.filter((c) => c.side === 'allies' && c.sourceNpcId)
    for (const ally of allyCombatants) {
      const trustResult = applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'trust', -2)
      nextState = trustResult.state
      if (trustResult.significant) {
        nextState = appendActivityLogEntry(
          nextState,
          'system',
          `${ally.name} questions the player's leadership after the defeat.`,
        )
      }
      // Bridge rule: full fear delta for near-death on defeat
      const rosterEntry = nextState.npcRuntimeStates.find((e) => e.npcId === ally.sourceNpcId)
      const currentFear = rosterEntry?.states.fear ?? 0
      const fearDelta = computePostCombatFearDelta(ally.health, ally.maxHealth, 'defeat', currentFear)
      if (fearDelta > 0) {
        const fearResult = applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'fear', fearDelta)
        nextState = fearResult.state
      }
    }

    let handledLinkedQuestFailure = false
    if (combat.linkedQuestId) {
      const runtime = nextState.activeQuests.find(
        (entry) => entry.questId === combat.linkedQuestId,
      )
      if (runtime) {
        switch (runtime.context.retryBehavior) {
          case 'retryable':
            runtime.stageId = 'setback'
            runtime.currentObjectiveLabel =
              'The squad was driven back. Regroup before attempting the incident again.'
            runtime.progress.lastAdvancedDay = nextState.day
            runtime.journalEntries = [
              ...runtime.journalEntries,
              'The squad was driven back. The contract remains open, but the house must regroup.',
            ]
            nextState = appendActivityLogEntry(
              nextState,
              'combat',
              `The squad was driven back, but ${runtime.acceptedTitle} remains open for another attempt.`,
            )
            break
          case 'branch':
            runtime.stageId = 'branch-aftermath'
            runtime.currentObjectiveLabel =
              'The defeat changes the shape of the contract. Return to the Work Board for the aftermath.'
            runtime.progress.lastAdvancedDay = nextState.day
            runtime.journalEntries = [
              ...runtime.journalEntries,
              'The defeat changes the shape of the contract. The next move is no longer straightforward.',
            ]
            nextState = appendActivityLogEntry(
              nextState,
              'combat',
              `The defeat alters ${runtime.acceptedTitle}. The house must decide what shape the aftermath takes.`,
            )
            break
          case 'fail':
          default:
            nextState = settleQuestFailure(nextState, combat.linkedQuestId, {
              failureMessage: `The squad was driven back. ${runtime.acceptedTitle} fails unless the house can bargain for another chance.`,
              failureCategory: 'combat',
              journalEntry:
                'The squad was beaten back at the incident site and the contract collapsed.',
              objectiveLabel: 'The incident ended in defeat. The contract is lost.',
            })
            handledLinkedQuestFailure = true
            break
        }
      }
    }

    const factionId = combat.provenance?.linkedFactionId ?? combat.factionId
    if (factionId && !handledLinkedQuestFailure) {
      const current = nextState.factionStandings[factionId] ?? 0
      nextState = {
        ...nextState,
        factionStandings: {
          ...nextState.factionStandings,
          [factionId]: Math.max(-100, Math.min(100, current - 5)),
        },
      }
      const factionName = contentCatalog.factionsById.get(factionId)?.name ?? factionId
      nextState = appendActivityLogEntry(
        nextState,
        'system',
        `Defeat. Standing with ${factionName} worsens.`,
      )
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
  for (const ally of allyCombatants) {
    if (ally.health > 0) {
      const affinityResult = applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'affinity', 2)
      nextState = affinityResult.state
      const trustResult = applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'trust', 1)
      nextState = trustResult.state
      if (isVictory) {
        const loyaltyResult = applyRelationshipDelta(nextState, 'player', ally.sourceNpcId!, 'loyalty', 3)
        nextState = loyaltyResult.state
      }
    }
  }

  // NPC-to-NPC survival bonds: co-deployed NPCs who survived together grow closer
  const survivingNpcAllies = allyCombatants.filter((c) => c.health > 0 && c.sourceNpcId)
  for (let i = 0; i < survivingNpcAllies.length; i++) {
    for (let j = i + 1; j < survivingNpcAllies.length; j++) {
      const idA = survivingNpcAllies[i]!.sourceNpcId!
      const idB = survivingNpcAllies[j]!.sourceNpcId!
      const nameA = survivingNpcAllies[i]!.name
      const nameB = survivingNpcAllies[j]!.name

      if (isVictory) {
        const affinityResultA = applyRelationshipDelta(nextState, idA, idB, 'affinity', 8)
        nextState = affinityResultA.state
        const respectResultA = applyRelationshipDelta(nextState, idA, idB, 'respect', 5)
        nextState = respectResultA.state
        const affinityResultB = applyRelationshipDelta(nextState, idB, idA, 'affinity', 8)
        nextState = affinityResultB.state
        const respectResultB = applyRelationshipDelta(nextState, idB, idA, 'respect', 5)
        nextState = respectResultB.state
        nextState = appendActivityLogEntry(
          nextState,
          'combat',
          `${nameA} and ${nameB} came through it together.`,
        )
      } else {
        const affinityResult1 = applyRelationshipDelta(nextState, idA, idB, 'affinity', 4)
        nextState = affinityResult1.state
        const trustResult1 = applyRelationshipDelta(nextState, idA, idB, 'trust', 5)
        nextState = trustResult1.state
        const affinityResult2 = applyRelationshipDelta(nextState, idB, idA, 'affinity', 4)
        nextState = affinityResult2.state
        const trustResult2 = applyRelationshipDelta(nextState, idB, idA, 'trust', 5)
        nextState = trustResult2.state
        nextState = appendActivityLogEntry(
          nextState,
          'combat',
          `${nameA} knows what ${nameB} did out there. That counts for something.`,
        )
      }
    }
  }

  nextState = {
    ...nextState,
    npcRuntimeStates: nextState.npcRuntimeStates.map((npc) => {
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
        assignment: isKO || isSeriousInjury(newHealth) ? 'recovering' : 'idle',
        states: {
          ...npc.states,
          health: isKO ? 10 : newHealth,
          morale: newMorale,
          stress: newStress,
        },
      }
    }),
    selectedSquadNpcIds: [],
  }

  const playerCombatant = combat.combatants.find(
    (combatant) => combatant.combatantId === 'player',
  )
  if (playerCombatant) {
    const playerHealth = Math.max(0, Math.min(PLAYER_MAX_HEALTH, playerCombatant.health))
    const playerWasKO = playerHealth <= 0
    nextState = {
      ...nextState,
      playerCharacter: {
        ...nextState.playerCharacter,
        combatState: {
          health: playerWasKO ? 10 : playerHealth,
          morale: Math.max(0, Math.min(100, playerCombatant.morale + (isVictory ? 5 : -8))),
        },
      },
    }
  }

  const outcomeLabel = combat.outcome === 'victory' ? 'Victory' : 'Defeat'
  const summaryNotes: string[] = []
  const defeatedCount = combat.combatants.filter((c) => c.side === 'enemies' && c.health <= 0).length
  const koCount = combat.combatants.filter((c) => c.side === 'allies' && c.health <= 0).length
  if (combat.outcome === 'victory' && defeatedCount > 0) {
    summaryNotes.push(`${defeatedCount} opponent${defeatedCount !== 1 ? 's' : ''} put down.`)
  }
  if (koCount > 0) {
    summaryNotes.push(`${koCount} ally${koCount !== 1 ? 's' : ''} knocked out.`)
  }
  if (combat.linkedQuestId) {
    summaryNotes.push(
      combat.outcome === 'victory' ? 'Contract obligation settled.' : 'Contract at risk.',
    )
  }

  nextState = {
    ...nextState,
    lastEncounterSummary: {
      outcome: combat.outcome as 'victory' | 'defeat',
      label: outcomeLabel,
      day: state.day,
      timeSlot: state.timeSlot,
      linkedQuestId: combat.linkedQuestId ?? null,
      noteLines: summaryNotes,
    },
  }

  return advanceTimeSlotInState(
    appendActivityLogEntry(
      spawnEventRumor(
        { ...nextState, rngSeed: seeded.getSeed() },
        {
          eventType: combat.outcome === 'victory' ? 'combat-victory' : 'combat-defeat',
          districtId:
            combat.provenance?.districtId ?? nextState.currentDistrictId ?? DISTRICT_IDS.THE_PALE,
          enemyFactionId: combat.provenance?.linkedFactionId ?? combat.factionId ?? null,
        },
      ),
      'system',
      'The encounter is concluded. The squad returns.',
    ),
  )
}
