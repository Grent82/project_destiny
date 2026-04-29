import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

export function selectRosterEntries(state: RootState) {
  return state.game.roster.map((npc) => {
    const def = contentCatalog.npcsById.get(npc.npcId)
      ?? contentCatalog.enemyNpcsById.get(npc.npcId)
    return {
      npcId: npc.npcId,
      name: def?.name ?? npc.npcId,
      status: (def as any)?.status ?? 'operative',
      assignment: npc.assignment,
      activeTitle: npc.activeTitle,
      health: npc.states.health,
      morale: npc.states.morale,
      stress: npc.states.stress,
      loyalty: npc.traits.loyalty,
      skills: npc.skills,
    }
  })
}

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
  }
}
