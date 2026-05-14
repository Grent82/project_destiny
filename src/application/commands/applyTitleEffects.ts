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

      case 'title-scout': {
        const survivalSkill = npc.skills['survival'] ?? 40
        const tensionReduction = survivalSkill > 55 ? 5 : 3
        const districtId = next.currentDistrictId
        if (districtId) {
          const current = next.districtTension[districtId] ?? 0
          next = {
            ...next,
            districtTension: {
              ...next.districtTension,
              [districtId]: Math.max(0, current - tensionReduction),
            },
          }
          if (current > 0) {
            next = appendActivityLogEntry(
              next,
              'system',
              `${npcName} read the streets. District tension eased by ${tensionReduction}.`,
            )
          }
        }
        break
      }

      case 'title-fence': {
        const intrigueSkill = npc.skills['intrigue'] ?? 40
        const fenceIncome = intrigueSkill > 55 ? 10 : 5
        next = { ...next, money: next.money + fenceIncome }
        next = appendActivityLogEntry(
          next,
          'economy',
          `${npcName} sourced off-register goods. +${fenceIncome} Marks.`,
        )
        break
      }

      case 'title-archivist': {
        const academicsSkill = npc.skills['academics'] ?? 45
        const boostCount = academicsSkill > 60 ? 2 : 1
        const activeRumors = next.rumors.filter((r) => r.heat < 100)
        for (let i = 0; i < Math.min(boostCount, activeRumors.length); i++) {
          const target = activeRumors[i]!
          next = {
            ...next,
            rumors: next.rumors.map((r) =>
              r.id === target.id ? { ...r, heat: Math.min(100, r.heat + 5) } : r,
            ),
          }
        }
        if (activeRumors.length > 0) {
          next = appendActivityLogEntry(
            next,
            'system',
            `${npcName} cross-referenced the house records. ${boostCount === 2 ? 'Two rumors spread faster.' : 'A rumor spread faster.'}`,
          )
        }
        break
      }

      case 'title-warden': {
        const securitySkill = npc.skills['security'] ?? 45
        const recoveryInterval = securitySkill > 60 ? 3 : 5
        const CONDITION_RECOVER: { [k: string]: string } = {
          altered: 'broken',
          broken: 'hurt',
          hurt: 'healthy',
        }
        const captives = next.roster.filter(
          (r) => r.captivityState?.status === 'captive' || r.captivityState?.status === 'missing',
        )
        for (const captive of captives) {
          const cap = captive.captivityState!
          if (cap.condition === 'healthy') continue
          if (next.day % recoveryInterval !== 0) continue
          const newCondition = CONDITION_RECOVER[cap.condition] ?? cap.condition
          next = {
            ...next,
            roster: next.roster.map((r) =>
              r.npcId === captive.npcId
                ? { ...r, captivityState: { ...cap, condition: newCondition as typeof cap.condition } }
                : r,
            ),
          }
          next = appendActivityLogEntry(
            next,
            'system',
            `${npcName} tended to ${captive.name}'s custody conditions. Their state improved.`,
          )
        }
        break
      }

      case 'title-negotiator': {
        const negotiationSkill = npc.skills['negotiation'] ?? 45
        const debtReduction = negotiationSkill > 60 ? 5 : 2
        if (next.debtAmount > 0) {
          next = { ...next, debtAmount: Math.max(0, next.debtAmount - debtReduction) }
          next = appendActivityLogEntry(
            next,
            'economy',
            `${npcName} renegotiated terms. House debt reduced by ${debtReduction} Marks.`,
          )
        }
        break
      }

      default:
        break
    }

    // Faction affinity passive standing: +1 every 2 days, capped at standing 30 from this mechanic
    if (next.day % 2 === 0) {
      const npcDef = contentCatalog.npcsById.get(npc.npcId)
      const affinityFactionId = npcDef?.factionAffinityId
      if (affinityFactionId) {
        const currentStanding = next.factionStandings[affinityFactionId] ?? 0
        if (currentStanding < 30) {
          const newStanding = Math.min(30, currentStanding + 1)
          next = {
            ...next,
            factionStandings: { ...next.factionStandings, [affinityFactionId]: newStanding },
          }
          const factionName = contentCatalog.factionsById.get(affinityFactionId)?.name ?? affinityFactionId
          next = appendActivityLogEntry(
            next,
            'system',
            `${npc.name}'s ties to ${factionName} quietly improve your standing. (+1 standing as ${npc.activeTitle?.replace('title-', '') ?? 'title'})`,
          )
        }
      }
    }
  }

  // Step 4b: Training NPCs gain skills each day
  {
    const hasTrainer = next.roster.some(
      (r) => r.activeTitle === 'title-trainer' && r.assignment !== 'deployed',
    )
    // Study intact: quiet place for study grants +25% training gain
    const studyIntact = next.house.rooms.some((r) => r.roomId === 'room-study' && r.state === 'intact')
    // Time slot affects training retention: morning is best, night is worst
    const timeSlotTrainMult =
      next.timeSlot === 'morning' ? 1.1
      : next.timeSlot === 'evening' ? 0.9
      : next.timeSlot === 'night' ? 0.7
      : 1.0
    const baseGain = hasTrainer ? 2 : 1
    const studyMult = studyIntact ? 1.25 : 1

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
      const rawGain = baseGain * (focusedSkill ? 1.5 : 1) * studyMult * timeSlotTrainMult
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

  // Background perk: Blade gets +1 combat NPC morale daily; Schemer gets +5 Marks/day; Voice gets +2 renown every 5 days
  const backgroundId = next.playerCharacter.backgroundId
  if (backgroundId === 'blade') {
    next = {
      ...next,
      roster: next.roster.map((r) =>
        r.assignment !== 'deployed'
          ? r
          : { ...r, states: { ...r.states, morale: Math.min(100, r.states.morale + 1) } }
      ),
    }
  } else if (backgroundId === 'schemer') {
    next = { ...next, money: next.money + 5 }
  } else if (backgroundId === 'voice' && next.day % 5 === 0) {
    next = {
      ...next,
      playerCharacter: { ...next.playerCharacter, renown: next.playerCharacter.renown + 2 },
    }
  }

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
