import type { GameState, NpcStatus, Skills } from '../../domain'
import { NPC_STATE_THRESHOLDS } from '../../domain/npcStateThresholds'
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

  // Step 1b: Loyalty decay for unpaid NPCs
  for (const npc of next.roster) {
    if (npc.wagesOwedDays >= 2) {
      const newLoyalty = Math.max(0, npc.traits.loyalty - 15)
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
        `${npcDef?.name ?? npc.npcId} is recovered. Back on roster.`,
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
        next = appendActivityLogEntry(
          next,
          'economy',
          `${npcName} managed the accounts. +15 Marks.`,
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
        next = appendActivityLogEntry(
          next,
          'system',
          `${npcName} oversaw workshop output.`,
        )
        break
      }

      // title-quartermaster: no daily tick effect
      default:
        break
    }
  }

  // Step 4b: Working NPC passive income
  const workingNpcs = next.roster.filter((r) => r.assignment === 'working')
  for (const runtimeNpc of workingNpcs) {
    const npcDef = contentCatalog.npcsById.get(runtimeNpc.npcId)
    if (!npcDef) continue

    const skills = npcDef.startingSkills as Record<string, number>
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

  // Step 5c: Durability warnings
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

  // Step 8: Evaluate world events
  const afterExpiry = expireHireOffers(next)

  // Step 9: Every 3 days, refresh hire offers for the current district
  if (nextDay % 3 === 0 && afterExpiry.currentDistrictId) {
    const refreshed: GameState = { ...afterExpiry, availableForHire: [...afterExpiry.availableForHire] }
    generateDistrictHireOffers(refreshed, afterExpiry.currentDistrictId)
    return evaluateEvents(refreshed)
  }

  return evaluateEvents(afterExpiry)
}
