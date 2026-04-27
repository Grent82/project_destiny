import type { GameState, NpcStatus, Skills } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'

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
    const definition = contentCatalog.npcsById.get(rosterEntry.npcId)
    if (!definition) continue
    const wage = wageForStatus(definition.status)
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
        `Warning: could not pay ${definition.name}'s wage of ${wage} Marks.`,
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

  // Step 3: Title effects
  for (const npc of next.roster) {
    if (!npc.activeTitle) continue
    const definition = contentCatalog.npcsById.get(npc.npcId)
    const npcName = definition?.name ?? npc.npcId

    switch (npc.activeTitle) {
      case 'title-medic': {
        const injured = next.roster
          .filter((r) => r.states.health < 100)
          .sort((a, b) => a.states.health - b.states.health)[0]
        if (injured) {
          const patientDef = contentCatalog.npcsById.get(injured.npcId)
          const patientName = patientDef?.name ?? injured.npcId
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
          const targetDef = contentCatalog.npcsById.get(target.npcId)
          const targetName = targetDef?.name ?? target.npcId
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

  // Step 4: Advance time
  const nextDay = next.day + 1
  next = { ...next, day: nextDay, timeSlot: 'morning' }
  next = appendActivityLogEntry(next, 'system', `Day ${nextDay} begins.`)

  return next
}
