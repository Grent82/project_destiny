import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'
import { selectCharacterSignature } from './characterSignature'
import type { Skills } from '../../domain/npc/contracts'
import { describeNpcBondSurface } from './bondMarket'

// File-local roster input selector (memoization input for the createSelectors below). The canonical
// EXPORTED player-roster selector lives in selectors/npcs.ts — do not export a duplicate here.
const selectRoster = (state: RootState) => state.game.npcRuntimeStates

export const WORKING_INCOME_SKILLS: (keyof Skills)[] = ['administration', 'medicine', 'engineering', 'negotiation', 'security', 'crafting', 'academics']

export function computeWorkingIncome(skills: Partial<Skills>): number {
  const bestSkill = Math.max(0, ...WORKING_INCOME_SKILLS.map((s) => skills[s] ?? 0))
  return Math.max(3, Math.min(15, Math.floor(bestSkill / 7)))
}

export function calculateWorkingIncome(skills: Partial<Skills>): number {
  return computeWorkingIncome(skills)
}

const TRAIT_LABELS: Record<string, string> = {
  discipline: 'disciplined',
  ambition: 'ambitious',
  empathy: 'empathetic',
  ruthlessness: 'ruthless',
  prudence: 'prudent',
  curiosity: 'curious',
  dominance: 'dominant',
  loyalty: 'loyal',
  vanity: 'vain',
  zeal: 'zealous',
}

const TRAIT_LOW_LABELS: Record<string, string> = {
  discipline: 'undisciplined',
  ambition: 'unambitious',
  empathy: 'callous',
  ruthlessness: 'merciful',
  prudence: 'reckless',
  curiosity: 'incurious',
  dominance: 'submissive',
  loyalty: 'disloyal',
  vanity: 'humble',
  zeal: 'indifferent',
}

/** Returns up to two dominant trait sentences for a given NPC. */
export function selectNpcCharacterDescription(npcId: string) {
  let selector = npcCharacterDescriptionSelectorCache.get(npcId)
  if (!selector) {
    selector = createSelector([selectRoster], (roster): string[] => {
      const runtime = roster.find((r) => r.npcId === npcId)
      if (!runtime) return []
      const traits = runtime.traits
      return Object.entries(traits)
        .filter(([, val]) => val > 65 || val < 35)
        .sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50))
        .slice(0, 2)
        .map(([key, val]) => {
          if (val > 65) return `Highly ${TRAIT_LABELS[key] ?? key}.`
          return `Unusually ${TRAIT_LOW_LABELS[key] ?? key}.`
        })
    })
    npcCharacterDescriptionSelectorCache.set(npcId, selector)
  }
  return selector
}

/** Returns the estimated working income for a given NPC (in Marks). */
export function selectEstimatedNpcIncome(npcId: string) {
  let selector = estimatedNpcIncomeSelectorCache.get(npcId)
  if (!selector) {
    selector = createSelector([selectRoster], (roster): number => {
      const runtime = roster.find((r) => r.npcId === npcId)
      if (!runtime) return 3
      return computeWorkingIncome(runtime.skills)
    })
    estimatedNpcIncomeSelectorCache.set(npcId, selector)
  }
  return selector
}

export const selectRosterEntries = createSelector(
  // playerRosterMember, not the raw unified list (destiny-rama.8) — this is the canonical "who's on
  // the player's roster" view (RosterScreen, MissionPrepScreen's available-squad pool, etc.); world/
  // story/enemy persons sharing the same runtime array must not appear here.
  (state: RootState) => state.game.npcRuntimeStates.filter((npc) => npc.playerRosterMember),
  (roster) => roster.map((npc) => {
    const npcDef = contentCatalog.npcsById.get(npc.npcId)
    const def = npcDef ?? contentCatalog.enemyNpcsById.get(npc.npcId)
    const quirks = npcDef?.quirks ?? []
    const bondSurface = describeNpcBondSurface(npc.bondStatus ?? null)
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
      bondSummary: bondSurface.rosterSummary,
      bondBadges: bondSurface.rosterBadges,
      // Attachment moment fields
      firstQuirkText: quirks[0]?.text ?? null,
      backgroundPhrase: npcDef?.background ? npcDef.background.split('.')[0] : null,
      ageBand: npcDef?.ageBand ?? null,
      sex: npcDef?.sex ?? null,
    }
  }),
)

function buildRosterDetail(root: RootState, npcId: string) {
  const runtime = root.game.npcRuntimeStates.find((entry) => entry.npcId === npcId)

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
    assignedDistrictId: runtime.assignedDistrictId,
    roomAssignment: runtime.roomAssignment,
    dutyPostRoomId: runtime.dutyPostRoomId,
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
    signature: definition ? selectCharacterSignature(root, npcId) : '',
  }
}

type RosterDetailView = ReturnType<typeof buildRosterDetail>

export function selectRosterDetail(state: RootState, npcId: string): RosterDetailView {
  let selector = rosterDetailSelectorCache.get(npcId)
  if (!selector) {
    selector = createSelector([(root: RootState) => root], (root): RosterDetailView => buildRosterDetail(root, npcId))
    rosterDetailSelectorCache.set(npcId, selector)
  }
  return selector(state)
}

const npcCharacterDescriptionSelectorCache = new Map<string, (state: RootState) => string[]>()
const estimatedNpcIncomeSelectorCache = new Map<string, (state: RootState) => number>()
const rosterDetailSelectorCache = new Map<string, (state: RootState) => RosterDetailView>()
