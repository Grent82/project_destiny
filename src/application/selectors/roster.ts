import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import { selectCharacterSignature } from './characterSignature'
import type { Skills } from '../../domain/npc/contracts'

const WORKING_INCOME_SKILLS: (keyof Skills)[] = ['administration', 'medicine', 'engineering', 'negotiation', 'security', 'crafting', 'academics']

export function computeWorkingIncome(skills: Partial<Skills>): number {
  const bestSkill = Math.max(0, ...WORKING_INCOME_SKILLS.map((s) => skills[s] ?? 0))
  return Math.max(3, Math.min(15, Math.floor(bestSkill / 7)))
}

export const selectRosterEntries = createSelector(
  (state: RootState) => state.game.roster,
  (roster) => roster.map((npc) => {
    const npcDef = contentCatalog.npcsById.get(npc.npcId)
    const def = npcDef ?? contentCatalog.enemyNpcsById.get(npc.npcId)
    const quirks = npcDef?.quirks ?? []
    return {
      npcId: npc.npcId,
      name: def?.name ?? npc.npcId,
      status: npcDef?.status ?? 'operative',
      assignment: npc.assignment,
      activeTitle: npc.activeTitle,
      health: npc.states.health,
      morale: npc.states.morale,
      stress: npc.states.stress,
      hunger: npc.states.hunger,
      fatigue: npc.states.fatigue,
      loyalty: npc.traits.loyalty,
      skills: npc.skills,
      workingIncome: computeWorkingIncome(npc.skills),
      // Attachment moment fields
      firstQuirkText: quirks[0]?.text ?? null,
      backgroundPhrase: npcDef?.background ? npcDef.background.split('.')[0] : null,
      ageBand: npcDef?.ageBand ?? null,
      sex: npcDef?.sex ?? null,
    }
  }),
)

export function selectRosterDetail(state: RootState, npcId: string) {
  const runtime = state.game.roster.find((entry) => entry.npcId === npcId)

  if (!runtime) {
    return null
  }

  const definition = contentCatalog.npcsById.get(npcId)
  const factionAffinity = definition?.factionAffinityId
    ? contentCatalog.factionsById.get(definition.factionAffinityId)?.name ?? null
    : null

  return {
    npcId,
    name: definition?.name ?? npcId,
    origin: definition?.origin ?? 'Unknown',
    background: definition?.background ?? 'Unknown',
    status: definition?.status ?? 'citizen',
    assignment: runtime.assignment,
    activeTitle: runtime.activeTitle,
    factionAffinity,
    factionAffinityId: definition?.factionAffinityId ?? null,
    allowedTitleIds: definition?.allowedTitleIds ?? [],
    motivation: definition?.motivation,
    ageBand: definition?.ageBand,
    sex: definition?.sex,
    appearanceTags: definition?.appearanceTags ?? [],
    quirks: definition?.quirks ?? [],
    attributes: {
      might: runtime.attributes.might,
      agility: runtime.attributes.agility,
      endurance: runtime.attributes.endurance,
      intellect: runtime.attributes.intellect,
      perception: runtime.attributes.perception,
      presence: runtime.attributes.presence,
      resolve: runtime.attributes.resolve,
    },
    skills: {
      melee: runtime.skills.melee,
      ranged: runtime.skills.ranged,
      medicine: runtime.skills.medicine,
      administration: runtime.skills.administration,
      engineering: runtime.skills.engineering,
      negotiation: runtime.skills.negotiation,
      survival: runtime.skills.survival,
      security: runtime.skills.security,
      crafting: runtime.skills.crafting,
      performance: runtime.skills.performance,
      academics: runtime.skills.academics,
      intrigue: runtime.skills.intrigue,
    },
    traits: {
      discipline: runtime.traits.discipline,
      ambition: runtime.traits.ambition,
      empathy: runtime.traits.empathy,
      ruthlessness: runtime.traits.ruthlessness,
      prudence: runtime.traits.prudence,
      curiosity: runtime.traits.curiosity,
      dominance: runtime.traits.dominance,
      loyalty: runtime.traits.loyalty,
      vanity: runtime.traits.vanity,
      zeal: runtime.traits.zeal,
    },
    states: {
      health: runtime.states.health,
      fatigue: runtime.states.fatigue,
      stress: runtime.states.stress,
      morale: runtime.states.morale,
      fear: runtime.states.fear,
      anger: runtime.states.anger,
      hunger: runtime.states.hunger,
      injury: runtime.states.injury,
      intoxication: runtime.states.intoxication,
      hygiene: runtime.states.hygiene,
    },
    loadout: {
      primaryWeaponId: runtime.loadout.primaryWeaponId,
      secondaryWeaponId: runtime.loadout.secondaryWeaponId,
      armorId: runtime.loadout.armorId,
    },
    wagesOwedDays: runtime.wagesOwedDays,
    trainingFocus: runtime.trainingFocus,
    rarity: definition?.rarity ?? 'common',
    signature: definition ? selectCharacterSignature(state, npcId) : '',
  }
}
