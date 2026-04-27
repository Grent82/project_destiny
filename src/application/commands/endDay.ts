import type { GameState, NpcStatus, Skills } from '../../domain'
import { NPC_STATE_THRESHOLDS } from '../../domain/npcStateThresholds'
import {
  getLoyaltyDeployStatus,
  getStressMoraleDecay,
} from '../../domain/npcStateModifiers'
import { appendActivityLogEntry } from './activityLog'

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
      return 6
    case 'mercenary':
      return 12
    case 'citizen':
      return 8
    case 'servant':
      return 3
    case 'apprentice':
      return 4
    case 'noble':
      return 20
    case 'criminal':
      return 8
    case 'prisoner':
      return 0
    case 'family':
      return 0
  }
}

export function endDay(state: GameState): GameState {
  let next = state

  // Step 1: Wage deduction
  for (const rosterEntry of state.roster) {
    const wage = wageForStatus(rosterEntry.status)
    if (wage === 0) continue

    if (next.money >= wage) {
      next = { ...next, money: next.money - wage }
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
        `Warning: could not pay ${rosterEntry.name}'s wage of ${wage} Marks.`,
      )
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
        `${npc.name}: high stress is wearing down morale.`,
      )
    }

    // Hunger threshold warning
    if (snap.hunger > NPC_STATE_THRESHOLDS.HUNGER_COMBAT_PENALTY_THRESHOLD) {
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name} is too hungry to fight effectively.`,
      )
    }

    // Loyalty warning
    const loyaltyStatus = getLoyaltyDeployStatus(snap)
    if (loyaltyStatus === 'warning' || loyaltyStatus === 'blocked') {
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name}'s loyalty is dangerously low — they may refuse orders.`,
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

  // Step 5: Resource consequences
  next = applyEndOfDayResources(next)

  // Step 6: Advance time
  const nextDay = next.day + 1
  next = { ...next, day: nextDay, timeSlot: 'morning' }
  next = appendActivityLogEntry(next, 'system', `Day ${nextDay} begins.`)

  return next
}
