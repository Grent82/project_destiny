import type { GameState, NpcStatus, Skills } from '../../domain'
import { NPC_STATE_THRESHOLDS } from '../../domain/npcStateThresholds'
import { RARITY_SKILL_CAPS, skillGainMultiplier, crossedMilestones } from '../../domain/progression/contracts'
import {
  getLoyaltyDeployStatus,
  getStressMoraleDecay,
} from '../../domain/npcStateModifiers'
import { appendActivityLogEntry } from './activityLog'
import { evaluateEvents } from './evaluateEvents'
import { expireHireOffers } from './recruitment'
import { getCouncilVoteTemplates, contentCatalog } from '../content/contentCatalog'
import { applyPassiveDrift, applyProximityGains, applyRelationshipDelta } from './adjustRelationship'
import { generateDistrictHireOffers } from './generateHireOffers'
import { evaluateNpcDeparture } from './npcDeparture'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { simulateRivalOrgs, applyRivalActions } from './simulateRivalOrgs'
import { getJobForNpc } from '../content/jobCatalog'

const NPC_WORLD_RUMOR_SNIPPETS = [
  'someone in the Merchant Guild is doctoring their ledgers.',
  'a shipment of arms was diverted from the docks last night.',
  'the city watch is being paid to look the other way in the Warrens.',
  'a noble heir is seeking quiet passage out of the city.',
]

const DISTRICT_HINT_TO_ID: Record<string, string> = {
  'Harbor Ward': 'district-harbor',
  'Civic Quarter': 'district-civic-quarter',
  'The Pale': 'district-the-pale',
  'Ironworks': 'district-ironworks',
  'Gilded Heights': 'district-gilded-heights',
  'The Warrens': 'district-the-warrens',
  'The Hollows': 'district-the-hollows',
}

export function applyEndOfDayResources(state: GameState): GameState {
  let next = state

  // Low food security → extra hunger decay for all NPCs
  if (next.cityResources.foodSecurity < 40) {
    next = {
      ...next,
      roster: next.roster.map((npc) => ({
        ...npc,
        states: {
          ...npc.states,
          hunger: Math.min(100, npc.states.hunger + 10),
        },
      })),
    }
    // Push unrest up if cityDials exists (added by destiny-suq)
    if ('cityDials' in next && next.cityDials != null) {
      const dials = next.cityDials as { unrest: number }
      next = {
        ...next,
        cityDials: { ...dials, unrest: Math.min(100, dials.unrest + 5) },
      } as GameState
    }
  }

  // Corridor status → food supply impact
  if (next.cityResources.corridorStatus === 'blocked') {
    next = {
      ...next,
      cityResources: {
        ...next.cityResources,
        foodSecurity: Math.max(0, next.cityResources.foodSecurity - 10),
      },
    }
    next = appendActivityLogEntry(
      next,
      'system',
      'The Green Corridor remains sealed. Food reserves dwindle.',
    )
  } else if (next.cityResources.corridorStatus === 'disrupted') {
    next = {
      ...next,
      cityResources: {
        ...next.cityResources,
        foodSecurity: Math.max(0, next.cityResources.foodSecurity - 3),
      },
    }
  }

  return next
}

const SKILL_KEYS: (keyof Skills)[] = [
  'melee',
  'ranged',
  'medicine',
  'administration',
  'engineering',
  'negotiation',
  'survival',
  'security',
  'crafting',
  'performance',
  'academics',
  'intrigue',
]

export function wageForStatus(status: NpcStatus): number {
  switch (status) {
    case 'retainer':
      return 4
    case 'mercenary':
      return 8
    case 'citizen':
      return 5
    case 'servant':
      return 2
    case 'apprentice':
      return 3
    case 'noble':
      return 14
    case 'criminal':
      return 5
    case 'prisoner':
      return 0
    case 'family':
      return 0
  }
}

function resolveRumorEvents(state: GameState): GameState {
  const rumorPending = state.pendingEvents.filter((pe) => {
    const template = contentCatalog.eventsById.get(pe.eventId)
    return template?.isAutoResolved === true && template.tags.includes('rumor')
  })
  if (rumorPending.length === 0) return state

  const chosen = rumorPending[Math.floor(Math.random() * rumorPending.length)]!
  const template = contentCatalog.eventsById.get(chosen.eventId)!

  let next = appendActivityLogEntry(state, 'system', `Rumor: ${template.description}`)
  next = {
    ...next,
    pendingEvents: next.pendingEvents.filter((pe) => pe.eventId !== chosen.eventId),
  }
  return next
}

function checkMainQuestProgression(state: GameState): GameState {
  const { stage } = state.mainQuest

  // lead-found → location-known: Wren contacts deliver intel after enough days
  if (stage === 'lead-found') {
    const tAllowRing = state.factionStandings['faction-tallow-ring'] ?? -100
    if (state.day >= 20 && tAllowRing > -30) {
      return appendActivityLogEntry(
        {
          ...state,
          mainQuest: {
            stage: 'location-known',
            lastClue: 'A Wren contact confirms it: Mira is held somewhere in The Pale. Getting her out will not be quiet.',
          },
        },
        'system',
        "Marion pulls you aside. 'They know where she is.' The search is over. The hard part begins.",
      )
    }
  }

  // location-known → rescued: completing quest-mira-rescue
  if (stage === 'location-known' && state.completedQuestIds.includes('quest-mira-rescue')) {
    return appendActivityLogEntry(
      {
        ...state,
        mainQuest: {
          stage: 'rescued',
          lastClue: '',
        },
      },
      'system',
      'Mira is out. She is not the same. Neither are you.',
    )
  }

  return state
}

export function endDay(state: GameState): GameState {
  let next = state

  // Step 1: Wage deduction
  // Pre-spread relationships for mutation in this section
  next = { ...next, relationships: { ...next.relationships } }
  for (const rosterEntry of state.roster) {
    const wage = wageForStatus(rosterEntry.status)
    if (wage === 0) continue

    if (next.money >= wage) {
      next = { ...next, money: next.money - wage }
      // Paid on time → loyalty +2
      applyRelationshipDelta(next, 'player', rosterEntry.npcId, 'loyalty', 2)
    } else {
      next = {
        ...next,
        roster: next.roster.map((r) =>
          r.npcId === rosterEntry.npcId
            ? { ...r, wagesOwedDays: r.wagesOwedDays + 1 }
            : r,
        ),
      }
      next = appendActivityLogEntry(
        next,
        'economy',
        `${rosterEntry.name} draws no wages today. The debt grows.`,
      )
    }
  }

  // Step 1b: Loyalty decay for unpaid NPCs (empathy trait reduces decay rate by 15%)
  const loyaltyDecay = next.playerCharacter.traits.empathy > 60 ? 13 : 15
  for (const npc of next.roster) {
    if (npc.wagesOwedDays >= 2) {
      const newLoyalty = Math.max(0, npc.traits.loyalty - loyaltyDecay)
      next = {
        ...next,
        roster: next.roster.map((r) =>
          r.npcId === npc.npcId
            ? { ...r, traits: { ...r.traits, loyalty: newLoyalty } }
            : r,
        ),
      }
      // Relationship loyalty penalty for unpaid wages
      const relResult = applyRelationshipDelta(next, 'player', npc.npcId, 'loyalty', -5)
      if (newLoyalty < 20) {
        next = appendActivityLogEntry(
          next,
          'system',
          `${npc.name}'s loyalty is failing. Unpaid debts leave marks on the house.`,
        )
      } else if (relResult.significant) {
        next = appendActivityLogEntry(
          next,
          'system',
          `${npc.name} grows resentful. The unpaid debt strains their loyalty.`,
        )
      }
    }
  }

  // Step 2: State decay
  next = {
    ...next,
    roster: next.roster.map((npc) => {
      const isResting = npc.assignment !== 'deployed'
      return {
        ...npc,
        states: {
          ...npc.states,
          hunger: Math.min(100, npc.states.hunger + 8),
          fatigue: isResting
            ? Math.max(0, npc.states.fatigue - 10)
            : Math.min(100, npc.states.fatigue + 5),
          stress: isResting
            ? Math.max(0, npc.states.stress - 3)
            : npc.states.stress,
        },
      }
    }),
  }

  // Step 2b: Recovering NPCs regain health each day
  const hasMedic = next.roster.some(
    (r) => r.activeTitle === 'title-medic' && r.assignment !== 'deployed',
  )
  const baseRecovery = 15
  const medicBonus = hasMedic ? 10 : 0

  for (const npc of next.roster.filter((r) => r.assignment === 'recovering')) {
    const newHealth = Math.min(100, npc.states.health + baseRecovery + medicBonus)
    const fullyRecovered = newHealth >= 80
    const npcDef = contentCatalog.npcsById.get(npc.npcId)
    const npcName = npcDef?.name ?? npc.npcId

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
      next = appendActivityLogEntry(
        next,
        'system',
        `${npcName} is recovered. Back on roster.`,
      )
    } else if (newHealth > npc.states.health) {
      next = appendActivityLogEntry(
        next,
        'system',
        `${npcName} is recovering. Health improving.`,
      )
    }
  }

  // Step 3: Threshold event checks
  for (const npc of next.roster) {
    const snap = {
      stress: npc.states.stress,
      morale: npc.states.morale,
      hunger: npc.states.hunger,
      loyalty: npc.traits.loyalty,
    }

    // Stress → extra morale decay
    const moraleDecay = getStressMoraleDecay(snap)
    if (moraleDecay < 0) {
      next = {
        ...next,
        roster: next.roster.map((r) =>
          r.npcId === npc.npcId
            ? { ...r, states: { ...r.states, morale: Math.max(0, r.states.morale + moraleDecay) } }
            : r,
        ),
      }
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name} carries the weight. Morale slips.`,
      )
    }

    // Hunger threshold warning
    if (snap.hunger > NPC_STATE_THRESHOLDS.HUNGER_COMBAT_PENALTY_THRESHOLD) {
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name} is hungry. Fighting will cost more than it should.`,
      )
    }

    // Loyalty warning
    const loyaltyStatus = getLoyaltyDeployStatus(snap)
    if (loyaltyStatus === 'warning' || loyaltyStatus === 'blocked') {
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name} is pulling back. Orders may not hold.`,
      )
    }
  }

  // Step 4: Title effects
  for (const npc of next.roster) {
    if (!npc.activeTitle) continue
    const npcName = npc.name

    switch (npc.activeTitle) {
      case 'title-medic': {
        const injured = next.roster
          .filter((r) => r.states.health < 100)
          .sort((a, b) => a.states.health - b.states.health)[0]
        if (injured) {
          const patientName = injured.name
          next = {
            ...next,
            roster: next.roster.map((r) =>
              r.npcId === injured.npcId
                ? { ...r, states: { ...r.states, health: Math.min(100, r.states.health + 8) } }
                : r,
            ),
          }
          next = appendActivityLogEntry(
            next,
            'system',
            `${npcName} tended to ${patientName}'s injuries.`,
          )
        }
        break
      }

      case 'title-steward': {
        next = { ...next, money: next.money + 15 }
        next = {
          ...next,
          cityResources: {
            ...next.cityResources,
            foodSecurity: Math.min(100, next.cityResources.foodSecurity + 5),
            waterAccess: Math.min(100, next.cityResources.waterAccess + 5),
          },
        }
        next = appendActivityLogEntry(
          next,
          'economy',
          `${npcName} managed the accounts. +15 Marks, +5 food and water.`,
        )
        break
      }

      case 'title-trainer': {
        const idleNpcs = next.roster.filter(
          (r) => r.assignment === 'idle' && r.npcId !== npc.npcId,
        )
        if (idleNpcs.length > 0) {
          const target = idleNpcs[Math.floor(Math.random() * idleNpcs.length)]!
          const skillKey = SKILL_KEYS[Math.floor(Math.random() * SKILL_KEYS.length)]!
          next = {
            ...next,
            roster: next.roster.map((r) =>
              r.npcId === target.npcId
                ? {
                    ...r,
                    skills: {
                      ...r.skills,
                      [skillKey]: Math.min(100, r.skills[skillKey] + 1),
                    },
                  }
                : r,
            ),
          }
          const targetName = target.name
          next = appendActivityLogEntry(
            next,
            'system',
            `${npcName} ran drills. ${targetName} improved their ${skillKey}.`,
          )
        }
        break
      }

      case 'title-chief-engineer': {
        next = {
          ...next,
          cityResources: {
            ...next.cityResources,
            materialStock: Math.min(100, next.cityResources.materialStock + 5),
          },
        }
        next = appendActivityLogEntry(
          next,
          'system',
          `${npcName} oversaw workshop output. +5 materials.`,
        )
        break
      }

      // title-quartermaster: no daily tick effect
      default:
        break
    }
  }

  // Step 4b: Training NPCs gain skills each day
  // Working NPCs do NOT get training gains — they trade skill growth for income
  {
    const hasTrainer = next.roster.some(
      (r) => r.activeTitle === 'title-trainer' && r.assignment !== 'deployed',
    )
    const baseGain = hasTrainer ? 2 : 1

    for (const npc of next.roster.filter((r) => r.assignment === 'training')) {
      const npcDef = contentCatalog.npcsById.get(npc.npcId)
      const rarityCap = RARITY_SKILL_CAPS[npcDef?.rarity ?? 'common'] ?? 70

      // Use training focus if set; otherwise pick a random skill
      const focusedSkill = npc.trainingFocus && (npc.skills as Record<string, number>)[npc.trainingFocus] !== undefined
        ? npc.trainingFocus
        : null
      const skillKey = focusedSkill ?? SKILL_KEYS[Math.floor(Math.random() * SKILL_KEYS.length)]!

      const currentVal = (npc.skills as Record<string, number>)[skillKey] ?? 0
      if (currentVal >= rarityCap) {
        next = appendActivityLogEntry(
          next, 'system',
          `${npc.name} has reached their limit in ${skillKey} — ${npcDef?.rarity ?? 'common'} cap is ${rarityCap}.`,
        )
        continue
      }

      const multiplier = skillGainMultiplier(currentVal)
      const rawGain = baseGain * (focusedSkill ? 1.5 : 1)
      const effectiveGain = Math.max(1, Math.round(rawGain * multiplier))
      const newVal = Math.min(rarityCap, currentVal + effectiveGain)

      next = {
        ...next,
        roster: next.roster.map((r) =>
          r.npcId === npc.npcId
            ? { ...r, skills: { ...r.skills, [skillKey]: newVal } }
            : r,
        ),
      }

      const milestones = crossedMilestones(currentVal, newVal)
      if (milestones.length > 0) {
        next = appendActivityLogEntry(
          next, 'system',
          `${npc.name} reached a milestone in ${skillKey} (${milestones[0]}). Something has changed in them.`,
        )
      } else {
        next = appendActivityLogEntry(
          next, 'system',
          `${npc.name} gained +${effectiveGain} ${skillKey}${focusedSkill ? ' (focused training)' : ''}.`,
        )
      }
    }
  }

  // Step 4c: Working NPC passive income
  const workingNpcs = next.roster.filter((r) => r.assignment === 'working')
  for (const runtimeNpc of workingNpcs) {
    const npcDef = contentCatalog.npcsById.get(runtimeNpc.npcId)
    if (!npcDef) continue

    const skills = runtimeNpc.skills as Record<string, number>
    const nonCombatSkills = ['administration', 'medicine', 'engineering', 'negotiation', 'security', 'crafting', 'academics']
    const bestSkill = Math.max(...nonCombatSkills.map((s) => skills[s] ?? 0))
    const income = Math.max(3, Math.min(15, Math.floor(bestSkill / 7)))
    next = { ...next, money: next.money + income }

    if (income >= 10) {
      next = appendActivityLogEntry(
        next,
        'economy',
        `${npcDef.name} brings in ${income} Marks from day work.`,
      )
    }
  }

  // Step 5: Resource consequences
  next = applyEndOfDayResources(next)

  // Step 5b: Passive relationship drift and proximity gains
  next = { ...next, relationships: { ...next.relationships } }
  applyPassiveDrift(next)
  const deployedNpcIds = next.roster
    .filter((r) => r.assignment === 'deployed')
    .map((r) => r.npcId)
  if (deployedNpcIds.length > 0) {
    applyProximityGains(next, deployedNpcIds)
  }

  // Step 5c-pre: Ambition frustration morale drain
  for (const npc of next.roster) {
    if (npc.traits.ambition > 65 && npc.activeTitle === null && npc.assignment !== 'deployed') {
      next = {
        ...next,
        roster: next.roster.map((r) =>
          r.npcId === npc.npcId
            ? { ...r, states: { ...r.states, morale: Math.max(0, r.states.morale - 2) } }
            : r,
        ),
      }
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name}: ambition stirs without outlet. Morale suffers.`,
      )
    }
  }

  // Step 5c: NPC departure / betrayal check (after wages and passive drift)
  // Math.random() is acceptable here — endDay is a command, not a reducer.
  const rosterBeforeDepartures = next.roster
  for (const npc of rosterBeforeDepartures) {
    if (npc.assignment === 'recovering' || npc.assignment === 'assigned_title') continue
    const relKey = buildRelationshipKey('player', npc.npcId)
    // Use start-of-day relationships: freshly-created entries from wage payment have
    // loyalty=0 by default, which would incorrectly flag new NPCs for departure.
    const rel = state.relationships[relKey]
    const result = evaluateNpcDeparture(
      { id: npc.npcId, name: npc.name, assignment: npc.assignment, traits: { loyalty: npc.traits.loyalty } },
      rel,
      Math.random(),
    )
    if (result.type === 'departed') {
      next = {
        ...next,
        roster: next.roster.filter((r) => r.npcId !== npc.npcId),
        availableForHire: next.availableForHire.filter((o) => o.npcId !== npc.npcId),
      }
      next = appendActivityLogEntry(next, 'system', `${result.npcName}: ${result.reason}`)
    } else if (result.type === 'betrayed') {
      next = {
        ...next,
        roster: next.roster.filter((r) => r.npcId !== npc.npcId),
      }
      // Leak info to rivals — boost a hostile faction's standing
      const hostieFactions = Object.entries(next.factionStandings)
        .filter(([, s]) => s < -20)
        .map(([id]) => id)
      if (hostieFactions.length > 0) {
        const target = hostieFactions[0]!
        next = {
          ...next,
          factionStandings: {
            ...next.factionStandings,
            [target]: Math.min(100, (next.factionStandings[target] ?? 0) + 10),
          },
        }
      }
      next = appendActivityLogEntry(next, 'system', `${result.npcName}: ${result.consequence}`)
      next = {
        ...next,
        pendingEvents: [
          ...next.pendingEvents,
          { eventId: 'event-npc-betrayal', firedOnDay: next.day },
        ],
      }
    }
  }

  // Step 5d: Durability warnings
  for (const npc of next.roster) {
    const npcDur = next.equippedItemDurabilities[npc.npcId]
    if (!npcDur) continue

    if (npc.loadout.primaryWeaponId) {
      const weaponDur = npcDur['weapon'] ?? 100
      if (weaponDur === 0) {
        next = appendActivityLogEntry(next, 'system', `Warning: ${npc.name}'s weapon is broken and needs repair.`)
      } else if (weaponDur <= 20) {
        next = appendActivityLogEntry(next, 'system', `Warning: ${npc.name}'s weapon needs repair.`)
      }
    }

    if (npc.loadout.armorId) {
      const armorDur = npcDur['armor'] ?? 100
      if (armorDur === 0) {
        next = appendActivityLogEntry(next, 'system', `Warning: ${npc.name}'s armor is broken and needs repair.`)
      } else if (armorDur <= 20) {
        next = appendActivityLogEntry(next, 'system', `Warning: ${npc.name}'s armor needs repair.`)
      }
    }
  }

  // Step 6: Advance time
  const nextDay = next.day + 1
  next = { ...next, day: nextDay, timeSlot: 'morning' }
  next = appendActivityLogEntry(next, 'system', `The day turns. Day ${nextDay}.`)

  // Step 7: Periodic council vote — fire one every 5 days if none active
  if (nextDay % 5 === 0 && next.activeCouncilVotes.length === 0) {
    const templates = getCouncilVoteTemplates()
    if (templates.length > 0) {
      const template = templates[Math.floor(Math.random() * templates.length)]!
      next = {
        ...next,
        activeCouncilVotes: [
          ...next.activeCouncilVotes,
          {
            ...template,
            id: `${template.id}-day-${nextDay}`,
            expiresOnDay: nextDay + 7,
            outcome: 'pending' as const,
          },
        ],
      }
      next = appendActivityLogEntry(
        next,
        'system',
        `The council convenes. A vote is called: "${template.title}".`,
      )
    }
  }

  // Step 7b: Faction pressure escalation
  next = {
    ...next,
    factionStates: next.factionStates.map((factionState) => {
      const standing = next.factionStandings[factionState.factionId] ?? 0
      if (standing < -40) {
        return { ...factionState, activePressure: Math.min(100, factionState.activePressure + 5) }
      }
      return { ...factionState, activePressure: Math.max(0, factionState.activePressure - 2) }
    }),
  }
  for (const factionState of next.factionStates) {
    const standing = next.factionStandings[factionState.factionId] ?? 0
    if (standing < -40 && factionState.activePressure >= 60) {
      next = appendActivityLogEntry(
        next,
        'system',
        `${factionState.factionId.replace('faction-', '')} pressure on the house is mounting.`,
      )
    }
  }

  // Step 7c: Rival org simulation
  const rivalActions = simulateRivalOrgs(next, [Math.random(), Math.random()])
  next = applyRivalActions(next, rivalActions)

  // Step 7d: City stability crisis event
  if ((next.cityStability ?? 60) < 30) {
    const crisisEventId = 'event-city-crisis'
    const alreadyPending = next.pendingEvents.some((e) => e.eventId === crisisEventId)
    const alreadyFired = next.lastFiredDay[crisisEventId] !== undefined
    if (!alreadyPending && !alreadyFired) {
      next = {
        ...next,
        pendingEvents: [...next.pendingEvents, { eventId: crisisEventId, firedOnDay: next.day }],
        lastFiredDay: { ...next.lastFiredDay, [crisisEventId]: next.day },
      }
    }
  }

  // Step 7e: Household antagonist faction notice — fires every 10 days if standing > 30
  if ((next.factionStandings['faction-gilded-court'] ?? -20) > 30 && next.day % 10 === 0) {
    const noticeEventId = 'event-gilded-notice'
    const alreadyPending = next.pendingEvents.some((e) => e.eventId === noticeEventId)
    if (!alreadyPending) {
      next = {
        ...next,
        pendingEvents: [...next.pendingEvents, { eventId: noticeEventId, firedOnDay: next.day }],
      }
    }
  }

  // Step 7f: Debt crisis consequences
  if (next.debtCrisisTriggered && !next.debtPaid) {
    // Gilded Court faction pressure spikes when debt is in default
    next = {
      ...next,
      factionStates: next.factionStates.map((fs) =>
        fs.factionId === 'faction-gilded-court'
          ? { ...fs, activePressure: Math.min(100, fs.activePressure + 10) }
          : fs
      ),
    }
    // After day 35: low-loyalty NPCs begin to leave (loyalty trait < 40)
    if (next.day >= 35) {
      const departing = next.roster.filter(
        (npc) => npc.traits.loyalty < 40 && npc.assignment !== 'deployed',
      )
      for (const npc of departing) {
        next = appendActivityLogEntry(
          next,
          'system',
          `${npc.name} has left. With the house seized and no prospects, they could not stay.`,
        )
      }
      const departingIds = new Set(departing.map((n) => n.npcId))
      next = {
        ...next,
        roster: next.roster.filter((n) => !departingIds.has(n.npcId)),
        selectedSquadNpcIds: next.selectedSquadNpcIds.filter((id) => !departingIds.has(id)),
      }
    }
  }

  // Step 8: Evaluate world events
  const afterExpiry = expireHireOffers(next)

  // Step 9: Every 3 days, refresh hire offers for the current district
  let afterEvents: GameState
  if (nextDay % 3 === 0 && afterExpiry.currentDistrictId) {
    const refreshed: GameState = { ...afterExpiry, availableForHire: [...afterExpiry.availableForHire] }
    generateDistrictHireOffers(refreshed, afterExpiry.currentDistrictId)
    afterEvents = evaluateEvents(refreshed)
  } else {
    afterEvents = evaluateEvents(afterExpiry)
  }


  // Step 9a: NPC world agency — working NPCs shape the world through their actions
  {
    const FACTION_IDS = [
      'faction-civic-compact',
      'faction-gilded-court',
      'faction-foundry-league',
      'faction-tallow-ring',
      'faction-restored',
    ] as const

    const workingNpcs = afterEvents.roster.filter((r) => r.assignment === 'working')

    for (const npc of workingNpcs) {
      if (Math.random() >= 0.15) continue // raised from 8% to 15% for richer agency

      const job = getJobForNpc(npc.skills as Record<string, number>)
      const district = job.districtHint
      const districtId = DISTRICT_HINT_TO_ID[district] ?? `district-${district.toLowerCase().replace(/\s+/g, '-')}`
      const npcName = npc.name

      const isReckless = npc.traits.ruthlessness > 60 || npc.traits.prudence < 40
      const isAmbitious = npc.traits.ambition > 60
      const isDiplomatic = npc.traits.empathy > 60
      const isCharming = npc.traits.vanity > 60
      const isGreedy = npc.traits.ambition > 50 && npc.traits.discipline < 50

      type AgencyAction = 'rumor' | 'incident' | 'contact' | 'faction_favor' | 'npc_bond' | 'spend_marks'
      const pool: AgencyAction[] = ['rumor', 'rumor', 'rumor']
      if (isReckless || isAmbitious) pool.push('incident', 'incident')
      if (isDiplomatic || isCharming) pool.push('contact', 'contact', 'npc_bond')
      if (isAmbitious) pool.push('faction_favor')
      if (isGreedy) pool.push('spend_marks')

      const action = pool[Math.floor(Math.random() * pool.length)]!

      afterEvents = { ...afterEvents, relationships: { ...afterEvents.relationships } }

      if (action === 'rumor') {
        const snippet = NPC_WORLD_RUMOR_SNIPPETS[Math.floor(Math.random() * NPC_WORLD_RUMOR_SNIPPETS.length)]!
        afterEvents = appendActivityLogEntry(
          afterEvents,
          'system',
          `${npcName} overheard something useful while working in ${district}. Word is: ${snippet}`,
        )

      } else if (action === 'incident') {
        afterEvents = appendActivityLogEntry(
          afterEvents,
          'system',
          `${npcName} got into a confrontation at ${district}. Tension is running higher there.`,
        )
        if (afterEvents.districtTension[districtId] !== undefined) {
          afterEvents = {
            ...afterEvents,
            districtTension: {
              ...afterEvents.districtTension,
              [districtId]: Math.min(100, (afterEvents.districtTension[districtId] ?? 0) + 3),
            },
          }
        }
        // Reckless incidents also slightly damage faction relations
        if (isReckless) {
          const districtFactionMap: Record<string, string> = {
            'district-the-pale': 'faction-gilded-court',
            'district-ironworks': 'faction-foundry-league',
            'district-harbor': 'faction-civic-compact',
            'district-the-warrens': 'faction-tallow-ring',
            'district-the-hollows': 'faction-restored',
            'district-gilded-heights': 'faction-gilded-court',
          }
          const affectedFaction = districtFactionMap[districtId]
          if (affectedFaction && afterEvents.factionStandings[affectedFaction] !== undefined) {
            afterEvents = {
              ...afterEvents,
              factionStandings: {
                ...afterEvents.factionStandings,
                [affectedFaction]: Math.max(-100, (afterEvents.factionStandings[affectedFaction] ?? 0) - 2),
              },
            }
          }
        }

      } else if (action === 'contact') {
        afterEvents = appendActivityLogEntry(
          afterEvents,
          'system',
          `${npcName} made a useful contact in ${district}. A new opportunity may follow.`,
        )

      } else if (action === 'faction_favor') {
        // Ambitious NPC does a favour for a faction → small standing gain
        const factionId = FACTION_IDS[Math.floor(Math.random() * FACTION_IDS.length)]!
        const factionName = contentCatalog.factionsById.get(factionId)?.name ?? factionId
        const delta = 1 + Math.floor(Math.random() * 2)
        if (afterEvents.factionStandings[factionId] !== undefined) {
          afterEvents = {
            ...afterEvents,
            factionStandings: {
              ...afterEvents.factionStandings,
              [factionId]: Math.min(100, (afterEvents.factionStandings[factionId] ?? 0) + delta),
            },
          }
          afterEvents = appendActivityLogEntry(
            afterEvents,
            'system',
            `${npcName} did a quiet favour for ${factionName} while working in ${district}. Your standing with them shifts.`,
          )
        }

      } else if (action === 'npc_bond') {
        // Diplomatic NPC forms a bond with another NPC in the roster
        const others = afterEvents.roster.filter((r) => r.npcId !== npc.npcId)
        if (others.length > 0) {
          const other = others[Math.floor(Math.random() * others.length)]!
          const relKey = buildRelationshipKey(npc.npcId, other.npcId)
          const existing = afterEvents.relationships[relKey]
          if (!existing || existing.loyalty < 30) {
            const delta = 5 + Math.floor(Math.random() * 10)
            applyRelationshipDelta(afterEvents, npc.npcId, other.npcId, 'loyalty', delta)
            afterEvents = appendActivityLogEntry(
              afterEvents,
              'system',
              `${npcName} and ${other.name} grew closer — shared time in the field has built some trust between them.`,
            )
          }
        }

      } else if (action === 'spend_marks') {
        // Greedy NPC spends house marks on personal indulgences
        const cost = 5 + Math.floor(Math.random() * 10)
        if (afterEvents.money >= cost) {
          afterEvents = { ...afterEvents, money: afterEvents.money - cost }
          afterEvents = appendActivityLogEntry(
            afterEvents,
            'economy',
            `${npcName} spent ${cost} marks on personal business while working in ${district}. Deducted from house funds.`,
          )
          // Small loyalty boost — they appreciate the freedom
          applyRelationshipDelta(afterEvents, 'player', npc.npcId, 'loyalty', 1)
        }
      }
    }
  }

  // Step 9b: Faction daily agenda log
  const factionIds = [
    'faction-civic-compact',
    'faction-gilded-court',
    'faction-foundry-league',
    'faction-tallow-ring',
    'faction-restored',
  ]
  const factionAgendaMessages: Record<string, string> = {
    'faction-civic-compact': 'The Collectors updated their ledgers. Three new accounts flagged for collection.',
    'faction-gilded-court': 'The Iron Compact posted new contract boards in the Docks. Rates competitive.',
    'faction-foundry-league': 'A Pale Court courier was seen near the old annex. No message delivered.',
    'faction-tallow-ring': "The Tangle's network shifted overnight. Two safe-houses changed hands.",
    'faction-restored': 'Ashborn markings appeared on a warehouse wall in the Ashfields.',
  }
  const todayFactionId = factionIds[nextDay % factionIds.length]!
  const agendaMsg = factionAgendaMessages[todayFactionId] ?? `${todayFactionId} acted today.`
  afterEvents = appendActivityLogEntry(afterEvents, 'system', agendaMsg)

  // Step 9c: District tension update
  const TENSION_DECAY_TARGET = 30
  const TENSION_DRIFT = 2
  const failedDistrictIds = new Set<string>()
  for (const entry of afterEvents.activityLog) {
    if (entry.message.toLowerCase().includes('failed')) {
      // Try to match a district ID from the message
      for (const d of afterEvents.districts) {
        if (entry.message.includes(d.districtId)) {
          failedDistrictIds.add(d.districtId)
        }
      }
    }
  }
  const updatedTension: Record<string, number> = { ...afterEvents.districtTension }
  for (const [districtId, tension] of Object.entries(updatedTension)) {
    let t = tension
    // Drift toward 30
    if (t > TENSION_DECAY_TARGET) {
      t = Math.max(TENSION_DECAY_TARGET, t - TENSION_DRIFT)
    } else if (t < TENSION_DECAY_TARGET) {
      t = Math.min(TENSION_DECAY_TARGET, t + TENSION_DRIFT)
    }
    // Failed contract in this district: +5
    if (failedDistrictIds.has(districtId)) {
      t = Math.min(100, t + 5)
    }
    // Debt crisis: +10 to district-the-pale
    if (afterEvents.debtCrisisTriggered && districtId === 'district-the-pale') {
      t = Math.min(100, t + 10)
    }
    updatedTension[districtId] = Math.max(0, Math.min(100, t))
  }
  afterEvents = { ...afterEvents, districtTension: updatedTension }

  // Step 10: Auto-resolve rumor events — pick 1 per day, append to log, remove from pending
  afterEvents = resolveRumorEvents(afterEvents)

  // Step 11: Main quest progression
  return checkMainQuestProgression(afterEvents)
}
