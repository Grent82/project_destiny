import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState, Skills } from '../../domain/npc/contracts'
import type { Rng } from './seededRng'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'
import { buildRelationshipKey, getRelationship } from '../../domain/relationships/contracts'
import { RARITY_SKILL_CAPS, skillGainMultiplier } from '../../domain/progression/contracts'
import { hasIntactHouseRoomFunction } from './houseRoomFunctions'
import { applyInterception, applyBlackmailLeverage } from './correspondence'
import { findBlackmailableCorrespondence } from '../../domain/correspondence/contracts'

/**
 * NPC Intellect & Stealth Actions (destiny-aoy7)
 *
 * Real implementations for spy-on, gather-leverage, intercept-communication, people-watch,
 * scout-ahead, investigate-threat, seek-shelter, practice-skill, and train-self.
 *
 * form-squad stays a placeholder — no NPC group/squad runtime concept exists (same gap as
 * lead-group/support-group/recruit-member).
 *
 * npcEscapeAttempt below IS implemented and tested, but deliberately NOT wired into
 * WIRED_INTENTION_TYPES: isNpcBlockedFromIntention() in intentions.ts unconditionally excludes
 * any NPC with captivityState.status === 'captive' from ever having an intention generated —
 * including escape-attempt itself, the one intention that is specifically ABOUT being captive.
 * Wiring it requires a small, deliberate carve-out in that guard (or a separate generation path
 * for captives), which is a decision for its own bead rather than a silent side effect here.
 */

const SKILL_KEYS: (keyof Skills)[] = [
  'melee', 'ranged', 'medicine', 'administration', 'engineering',
  'negotiation', 'survival', 'security', 'crafting', 'performance', 'academics', 'intrigue',
]

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function updateNpcStates(state: GameState, npcId: string, updates: Partial<NpcRuntimeState['states']>): GameState {
  return {
    ...state,
    roster: state.roster.map((n) => (n.npcId === npcId ? { ...n, states: { ...n.states, ...updates } } : n)),
  }
}

function addNpcMemory(state: GameState, npcId: string, event: string, day: number): GameState {
  return {
    ...state,
    roster: state.roster.map((n) =>
      n.npcId === npcId
        ? { ...n, npcMemory: [...n.npcMemory, { day, event, eventType: 'custom' as const, visibility: 'hidden' as const, sentiment: 'neutral' as const }].slice(-20) }
        : n,
    ),
  }
}

/** Gains skill XP for one skill, reusing the same rarity caps/gain-multiplier as formal training. */
function gainSkillXp(state: GameState, npcId: string, skillKey: keyof Skills, baseGain: number): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state
  const npcDef = contentCatalog.npcsById.get(npcId)
  const rarityCap = RARITY_SKILL_CAPS[npcDef?.rarity ?? 'common'] ?? 70
  const currentVal = npc.skills[skillKey] ?? 0
  if (currentVal >= rarityCap) return state

  const effectiveGain = Math.max(1, Math.round(baseGain * skillGainMultiplier(currentVal)))
  const newVal = Math.min(rarityCap, currentVal + effectiveGain)

  return {
    ...state,
    roster: state.roster.map((n) => (n.npcId === npcId ? { ...n, skills: { ...n.skills, [skillKey]: newVal } } : n)),
  }
}

/** NPC spies on another idle NPC, learning their authored private need. Risks being caught. */
export function npcSpyOn(state: GameState, npcId: string, rng: Rng): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const target = state.roster.filter((r) => r.npcId !== npcId && r.assignment === 'idle')[0]
  if (!target) return state

  const successChance = Math.max(
    0.15,
    Math.min(0.9, 0.4 + (npc.skills.intrigue - 50) / 150 + (npc.traits.curiosity - 50) / 200),
  )

  if (rng() < successChance) {
    const privateNeed = contentCatalog.npcsById.get(target.npcId)?.motivation?.privateNeed
    const learned = privateNeed ? `learns something private about ${target.name}` : `watches ${target.name} closely, but learns little of substance`
    const next = addNpcMemory(state, npcId, `Spied on ${target.name}: ${privateNeed ?? 'no clear secret found'}`, state.day)
    return appendActivityLogEntry(next, 'system', `${npc.name} ${learned}.`)
  }

  const next = updateNpcStates(state, target.npcId, { fear: clampPercent(target.states.fear + 6) })
  return appendActivityLogEntry(next, 'system', `${npc.name} is caught spying on ${target.name}.`)
}

/**
 * NPC exploits a compromising letter they already hold or intercepted, via the existing
 * (previously unwired) applyBlackmailLeverage command.
 */
export function npcGatherLeverage(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const knownCompromising = state.privateCorrespondence.filter(
    (msg) =>
      !msg.consequenceApplied &&
      (msg.sensitivity === 'compromising' || msg.sensitivity === 'intimate') &&
      (msg.knownBy.includes(npcId) || msg.interceptedBy === npcId),
  )
  const own = findBlackmailableCorrespondence(state.privateCorrespondence, npcId)
  const candidate = knownCompromising[0] ?? own[0]
  if (!candidate) return state

  const targetId = candidate.fromId === npcId ? candidate.toId : candidate.fromId
  let next = applyBlackmailLeverage(state, candidate.id)

  const key = buildRelationshipKey(targetId, npcId)
  const rel = getRelationship(next.relationships, targetId, npcId)
  next = {
    ...next,
    relationships: {
      ...next.relationships,
      [key]: { ...rel, fear: Math.max(-100, Math.min(100, rel.fear + 10)), respect: Math.max(-100, Math.min(100, rel.respect - 5)) },
    },
  }

  return appendActivityLogEntry(next, 'system', `${npc.name} gathers leverage against ${targetId} from a compromising letter.`)
}

/** NPC intercepts a piece of correspondence they aren't a party to, via the existing (previously unwired) applyInterception command. */
export function npcInterceptCommunication(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const candidate = state.privateCorrespondence.find(
    (msg) =>
      msg.fromId !== npcId &&
      msg.toId !== npcId &&
      (msg.status === 'sent' || msg.status === 'delivered') &&
      msg.interceptedBy !== npcId,
  )
  if (!candidate) return state

  const next = applyInterception(state, candidate.id, npcId)
  return appendActivityLogEntry(next, 'system', `${npc.name} intercepts a piece of correspondence between ${candidate.fromId} and ${candidate.toId}.`)
}

/** NPC watches people in their (public) assigned district, picking up a rumor. */
export function npcPeopleWatch(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc || !npc.assignedDistrictId) return state

  const rumorText = contentCatalog.rumors[0]?.text
  const next = addNpcMemory(state, npcId, `People-watched in ${npc.assignedDistrictId}: ${rumorText ?? 'nothing notable'}`, state.day)
  const message = rumorText
    ? `${npc.name} watches the crowds in ${npc.assignedDistrictId} and overhears: ${rumorText}`
    : `${npc.name} watches the crowds in ${npc.assignedDistrictId}.`
  return appendActivityLogEntry(next, 'system', message)
}

/** NPC scouts ahead in their district, occasionally turning up something useful. */
export function npcScoutAhead(state: GameState, npcId: string, rng: Rng): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc || !npc.assignedDistrictId) return state

  const successChance = Math.max(
    0.1,
    Math.min(
      0.7,
      0.25 + (npc.skills.survival - 50) / 200 + (npc.attributes.perception - 50) / 200 + (npc.traits.curiosity - 50) / 200,
    ),
  )

  if (rng() < successChance) {
    const next: GameState = {
      ...state,
      cityResources: { ...state.cityResources, materialStock: Math.min(100, state.cityResources.materialStock + 2) },
    }
    return appendActivityLogEntry(next, 'system', `${npc.name} scouts ahead in ${npc.assignedDistrictId} and finds a small cache.`)
  }

  return appendActivityLogEntry(state, 'system', `${npc.name} scouts ahead in ${npc.assignedDistrictId}, but finds nothing of note.`)
}

/** NPC investigates potential threats in their district, easing tension when they turn up something actionable. */
export function npcInvestigateThreat(state: GameState, npcId: string, rng: Rng): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc || !npc.assignedDistrictId) return state

  const successChance = Math.max(
    0.15,
    Math.min(
      0.75,
      0.3 + (npc.attributes.intellect - 50) / 200 + (npc.skills.intrigue - 50) / 200 + (npc.traits.curiosity - 50) / 200,
    ),
  )
  const districtId = npc.assignedDistrictId
  const currentTension = state.districtTension[districtId] ?? 0

  if (rng() < successChance) {
    const next: GameState = {
      ...state,
      districtTension: { ...state.districtTension, [districtId]: Math.max(0, currentTension - 3) },
    }
    return appendActivityLogEntry(next, 'system', `${npc.name} investigates unrest in ${districtId} and defuses part of the threat.`)
  }

  return appendActivityLogEntry(state, 'system', `${npc.name} investigates ${districtId}, but the threat remains unclear.`)
}

/** NPC seeks shelter, easing fear and stress. Larger effect with intact quarters/barracks available. */
export function npcSeekShelter(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const hasShelter = hasIntactHouseRoomFunction(state, 'quarters') || hasIntactHouseRoomFunction(state, 'barracks')
  const fearReduction = hasShelter ? 10 : 3
  const stressReduction = hasShelter ? 5 : 2

  const next = updateNpcStates(state, npcId, {
    fear: clampPercent(npc.states.fear - fearReduction),
    stress: clampPercent(npc.states.stress - stressReduction),
  })
  const message = hasShelter
    ? `${npc.name} takes shelter in the house's quarters.`
    : `${npc.name} finds what shelter they can.`
  return appendActivityLogEntry(next, 'system', message)
}

/** NPC practices a random skill on their own initiative — a smaller, unconditional counterpart to train-self. */
export function npcPracticeSkill(state: GameState, npcId: string, rng: Rng): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const skillKey = SKILL_KEYS[Math.floor(rng() * SKILL_KEYS.length)]!
  const next = gainSkillXp(state, npcId, skillKey, 1)
  return appendActivityLogEntry(next, 'system', `${npc.name} practices ${skillKey} on their own.`)
}

/**
 * NPC trains self-directed, using their trainingFocus if set. Requires an intact
 * workshop or study — the AC's "Training-Facility" requirement.
 */
export function npcTrainSelf(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state
  if (!hasIntactHouseRoomFunction(state, 'workshop') && !hasIntactHouseRoomFunction(state, 'study')) return state

  const focusedSkill: keyof Skills | null =
    npc.trainingFocus && (SKILL_KEYS as string[]).includes(npc.trainingFocus) ? (npc.trainingFocus as keyof Skills) : null
  const skillKey = focusedSkill ?? SKILL_KEYS[state.day % SKILL_KEYS.length]!

  const next = gainSkillXp(state, npcId, skillKey, focusedSkill ? 2 : 1)
  return appendActivityLogEntry(next, 'system', `${npc.name} trains ${skillKey} on their own initiative.`)
}

/**
 * Captive NPC attempts to escape. Implemented and tested, but not wired — see the module
 * docblock above.
 */
export function npcEscapeAttempt(state: GameState, npcId: string, rng: Rng): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc || npc.captivityState?.status !== 'captive') return state

  const successChance = Math.max(
    0.1,
    Math.min(0.6, 0.25 + (npc.attributes.agility - 50) / 150 + (npc.attributes.perception - 50) / 200),
  )

  if (rng() < successChance) {
    const next: GameState = {
      ...state,
      roster: state.roster.map((n) =>
        n.npcId === npcId && n.captivityState ? { ...n, captivityState: { ...n.captivityState, status: 'missing' } } : n,
      ),
    }
    return appendActivityLogEntry(next, 'system', `${npc.name} slips free of captivity and vanishes.`)
  }

  const next = updateNpcStates(state, npcId, { fear: clampPercent(npc.states.fear + 8) })
  return appendActivityLogEntry(next, 'system', `${npc.name} attempts to escape captivity, but is caught.`)
}
