import type { GameState, Skills } from '../../domain'
import { RARITY_SKILL_CAPS, skillGainMultiplier, crossedMilestones } from '../../domain/progression/contracts'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'
import type { Rng } from './seededRng'

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

/** Steps 4, 4b, 4c, 4d, 4e: title effects, training gains, working NPC income, house baseline, faction grants. */
export function applyTitleEffects(state: GameState, rng: Rng = Math.random): GameState {
  let next = state

  // Step 4: Title effects
  for (const npc of next.roster) {
    if (!npc.activeTitle) continue
    const npcName = npc.name

    switch (npc.activeTitle) {
      case 'title-medic': {
        const medicineSkill = npc.skills['medicine'] ?? 45
        const healAmount = 8 + Math.floor(Math.max(0, medicineSkill - 45) / 15)
        const injured = next.roster
          .filter((r) => r.states.health < 100)
          .sort((a, b) => a.states.health - b.states.health)[0]
        if (injured) {
          const patientName = injured.name
          next = {
            ...next,
            roster: next.roster.map((r) =>
              r.npcId === injured.npcId
                ? { ...r, states: { ...r.states, health: Math.min(100, r.states.health + healAmount) } }
                : r,
            ),
          }
          next = appendActivityLogEntry(
            next,
            'system',
            `${npcName} tended to ${patientName}'s injuries. (+${healAmount} health)`,
          )
        }
        break
      }

      case 'title-steward': {
        const adminSkill = npc.skills['administration'] ?? 45
        const stewardIncome = Math.min(25, 15 + Math.floor(Math.max(0, adminSkill - 45) / 10) * 2)
        next = { ...next, money: next.money + stewardIncome }
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
          `${npcName} managed the accounts. +${stewardIncome} Marks, +5 food and water.`,
        )
        break
      }

      case 'title-trainer': {
        const meleeSkill = npc.skills['melee'] ?? 45
        const trainCount = meleeSkill >= 70 ? 2 : 1
        const idleNpcs = next.roster.filter(
          (r) => r.assignment === 'idle' && r.npcId !== npc.npcId,
        )
        for (let t = 0; t < Math.min(trainCount, idleNpcs.length); t++) {
          const target = idleNpcs[Math.floor(rng() * idleNpcs.length)]!
          const skillKey = SKILL_KEYS[Math.floor(rng() * SKILL_KEYS.length)]!
          next = {
            ...next,
            roster: next.roster.map((r) =>
              r.npcId === target.npcId
                ? { ...r, skills: { ...r.skills, [skillKey]: Math.min(100, r.skills[skillKey] + 1) } }
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
        const engineeringSkill = npc.skills['engineering'] ?? 50
        const materialGain = 5 + Math.floor(Math.max(0, engineeringSkill - 50) / 10)
        next = {
          ...next,
          cityResources: {
            ...next.cityResources,
            materialStock: Math.min(100, next.cityResources.materialStock + materialGain),
          },
        }
        next = appendActivityLogEntry(
          next,
          'system',
          `${npcName} oversaw workshop output. +${materialGain} materials.`,
        )
        break
      }

      case 'title-quartermaster': {
        const qmAdminSkill = npc.skills['administration'] ?? 40
        const qmIncome = 3 + Math.floor(Math.max(0, qmAdminSkill - 40) / 15)
        next = { ...next, money: next.money + qmIncome }
        next = appendActivityLogEntry(
          next,
          'economy',
          `${npcName} optimised supply routes. +${qmIncome} Marks.`,
        )
        break
      }

      default:
        break
    }
  }

  // Step 4b: Training NPCs gain skills each day
  {
    const hasTrainer = next.roster.some(
      (r) => r.activeTitle === 'title-trainer' && r.assignment !== 'deployed',
    )
    const baseGain = hasTrainer ? 2 : 1

    for (const npc of next.roster.filter((r) => r.assignment === 'training')) {
      const npcDef = contentCatalog.npcsById.get(npc.npcId)
      const rarityCap = RARITY_SKILL_CAPS[npcDef?.rarity ?? 'common'] ?? 70

      const focusedSkill =
        npc.trainingFocus &&
        (npc.skills as Record<string, number>)[npc.trainingFocus] !== undefined
          ? npc.trainingFocus
          : null
      const skillKey = focusedSkill ?? SKILL_KEYS[Math.floor(rng() * SKILL_KEYS.length)]!

      const currentVal = (npc.skills as Record<string, number>)[skillKey] ?? 0
      if (currentVal >= rarityCap) {
        next = appendActivityLogEntry(
          next,
          'system',
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
          next,
          'system',
          `${npc.name} reached a milestone in ${skillKey} (${milestones[0]}). Something has changed in them.`,
        )
      } else {
        next = appendActivityLogEntry(
          next,
          'system',
          `${npc.name} gained +${effectiveGain} ${skillKey}${focusedSkill ? ' (focused training)' : ''}.`,
        )
      }
    }
  }

  // Step 4c: Working NPC passive income
  const prosperityMult =
    next.cityDials.prosperity >= 60 ? 1.1 : next.cityDials.prosperity <= 30 ? 0.9 : 1
  const workingNpcs = next.roster.filter((r) => r.assignment === 'working')
  for (const runtimeNpc of workingNpcs) {
    const npcDef = contentCatalog.npcsById.get(runtimeNpc.npcId)
    if (!npcDef) continue

    const skills = runtimeNpc.skills as Record<string, number>
    const nonCombatSkills = [
      'administration', 'medicine', 'engineering', 'negotiation',
      'security', 'crafting', 'academics',
    ]
    const bestSkill = Math.max(...nonCombatSkills.map((s) => skills[s] ?? 0))
    const income = Math.floor(Math.max(3, Math.min(15, Math.floor(bestSkill / 7))) * prosperityMult)
    next = { ...next, money: next.money + income }

    if (income >= 10) {
      next = appendActivityLogEntry(
        next,
        'economy',
        `${npcDef.name} brings in ${income} Marks from day work.`,
      )
    }
  }

  // Step 4d: House baseline income
  next = { ...next, money: next.money + 5 }
  next = appendActivityLogEntry(next, 'economy', 'The house generates its daily yield. +5 Marks.')

  // Step 4e: Faction income grants — allied factions contribute 3 Marks/day (6 at standing >= 75)
  for (const [factionId, standing] of Object.entries(next.factionStandings)) {
    if (standing >= 50) {
      const grant = standing >= 75 ? 6 : 3
      next = { ...next, money: next.money + grant }
      const factionName = contentCatalog.factionsById.get(factionId)?.name ?? factionId
      next = appendActivityLogEntry(next, 'economy', `Faction support from ${factionName}. +${grant} Marks.`)
    }
  }

  return next
}
