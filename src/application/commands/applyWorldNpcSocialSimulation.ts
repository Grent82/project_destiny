import type { CaptivityState, GameState, NpcDefinition, Rumor } from '../../domain'
import { calculateBaseCompatibility, getFactionFamiliarityBonus, getOriginProximityBonus } from '../../domain/npc/compatibility'
import { buildRelationshipKey, type RelationshipAxes, type SoftBondState } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'
import type { Rng } from './seededRng'
import { contentCatalog } from '../content/contentCatalog'
import { adjustDistrictTension } from './economicConsequences'
import { getNpcCaptivityState, setNpcCaptivityState } from './captivityRegistry'

const SOFT_BOND_CAP = 5
const SOFT_BOND_STRENGTH_FOR_RUMORED = 35
const SOFT_BOND_STRENGTH_FOR_KNOWN = 65
const SOFT_BOND_STRENGTH_FOR_ROMANCE = 50

type WorldSoftBondType =
  | 'friendship'
  | 'mentorship'
  | 'rivalry'
  | 'grudge'
  | 'shared_secret'
  | 'territorial_conflict'
  | 'romantic'

const HEALTHIER_CONDITION: Record<CaptivityState['condition'], CaptivityState['condition']> = {
  healthy: 'healthy',
  hurt: 'healthy',
  broken: 'hurt',
  altered: 'broken',
}

function bondPairId(aId: string, bId: string) {
  return [aId, bId].sort().join('::')
}

function visibilityRank(visibility: SoftBondState['visibility']) {
  switch (visibility) {
    case 'hidden':
      return 0
    case 'rumored':
      return 1
    case 'known':
      return 2
  }
}

function resolveVisibility(strength: number, current: SoftBondState['visibility'] | undefined): SoftBondState['visibility'] {
  const computed: SoftBondState['visibility'] =
    strength >= SOFT_BOND_STRENGTH_FOR_KNOWN
      ? 'known'
      : strength >= SOFT_BOND_STRENGTH_FOR_RUMORED
        ? 'rumored'
        : 'hidden'

  if (!current) return computed
  return visibilityRank(current) > visibilityRank(computed) ? current : computed
}

function resolveScheduleDistrict(def: NpcDefinition, slot: 'morning' | 'afternoon' | 'evening' | 'night') {
  const scheduled = def.schedule[slot]
  if (!scheduled) return def.districtId ?? null
  if (scheduled.startsWith('district-')) return scheduled
  const poi = contentCatalog.poisById.get(scheduled)
  return poi?.districtId ?? def.districtId ?? null
}

function countRoutineOverlap(a: NpcDefinition, b: NpcDefinition) {
  let overlap = 0
  for (const slot of ['morning', 'afternoon', 'evening', 'night'] as const) {
    const aDistrict = resolveScheduleDistrict(a, slot)
    const bDistrict = resolveScheduleDistrict(b, slot)
    if (aDistrict && bDistrict && aDistrict === bDistrict) {
      overlap += 1
    }
  }
  return overlap
}

function computeCompatibility(a: NpcDefinition, b: NpcDefinition) {
  return (
    calculateBaseCompatibility(a.startingTraits, b.startingTraits) +
    getFactionFamiliarityBonus(a, b) +
    getOriginProximityBonus(a, b)
  )
}

function selectSoftBondType(
  a: NpcDefinition,
  b: NpcDefinition,
  compatibility: number,
  existing: RelationshipAxes | undefined,
): WorldSoftBondType | null {
  if (existing?.bondType === 'romantic') return 'romantic'
  if (compatibility >= 26 && a.startingTraits.curiosity > 60 && b.startingTraits.curiosity > 60) {
    return 'shared_secret'
  }
  if (compatibility >= 22 && (a.startingTraits.discipline > 60 || b.startingTraits.discipline > 60)) {
    return 'mentorship'
  }
  if (compatibility >= 18) return 'friendship'
  if (compatibility <= 6 && a.startingTraits.ambition > 60 && b.startingTraits.ambition > 60) {
    return 'rivalry'
  }
  if (compatibility <= 4 && (a.startingTraits.ruthlessness > 55 || b.startingTraits.ruthlessness > 55)) {
    return 'grudge'
  }
  if (compatibility <= 8 && Math.abs(a.startingTraits.dominance - b.startingTraits.dominance) > 35) {
    return 'territorial_conflict'
  }
  return null
}

function mergeSoftBondEdge(
  current: RelationshipAxes | undefined,
  bondType: WorldSoftBondType,
  strength: number,
  day: number,
): RelationshipAxes {
  const existingSoftBond = current?.softBond
  const visibility = resolveVisibility(strength, existingSoftBond?.visibility)
  const next: RelationshipAxes = {
    affinity: current?.affinity ?? 0,
    respect: current?.respect ?? 0,
    fear: current?.fear ?? 0,
    trust: current?.trust ?? 0,
    loyalty: current?.loyalty ?? 0,
    bondType,
    intimacyStage: current?.intimacyStage,
    legacyIntentActive: current?.legacyIntentActive,
    hardBond: current?.hardBond,
    softBond: {
      strength,
      since: existingSoftBond?.since ?? day,
      visibility,
    },
  }

  if (bondType === 'friendship' || bondType === 'shared_secret' || bondType === 'mentorship') {
    next.affinity = Math.min(100, next.affinity + 4)
    next.trust = Math.min(100, next.trust + 5)
    next.loyalty = Math.min(100, next.loyalty + 2)
  } else if (bondType === 'romantic') {
    next.affinity = Math.min(100, Math.max(next.affinity, 45))
    next.trust = Math.min(100, Math.max(next.trust, 45))
    next.intimacyStage = current?.intimacyStage ?? 'affinity'
  } else {
    next.respect = Math.max(-100, next.respect - 1)
    next.fear = Math.min(100, next.fear + 2)
  }

  return next
}

function pruneSoftBondCap(relationships: Record<string, RelationshipAxes>, npcId: string) {
  const softBondEdges = Object.entries(relationships)
    .filter(([key, rel]) => key.startsWith(`${npcId}→`) && rel.softBond)
    .map(([key, rel]) => ({
      key,
      rel,
      targetId: key.split('→')[1]!,
    }))

  if (softBondEdges.length <= SOFT_BOND_CAP) return relationships

  const next = { ...relationships }
  softBondEdges
    .sort((left, right) => {
      const strengthDelta = (left.rel.softBond?.strength ?? 0) - (right.rel.softBond?.strength ?? 0)
      if (strengthDelta !== 0) return strengthDelta
      return (left.rel.softBond?.since ?? 0) - (right.rel.softBond?.since ?? 0)
    })
    .slice(0, softBondEdges.length - SOFT_BOND_CAP)
    .forEach(({ key, targetId }) => {
      delete next[key]
      delete next[buildRelationshipKey(targetId, npcId)]
    })

  return next
}

function promoteRumorVisibility(
  state: GameState,
  a: NpcDefinition,
  b: NpcDefinition,
  visibility: SoftBondState['visibility'],
): GameState {
  if (visibility === 'hidden') return state

  const pairId = bondPairId(a.id, b.id)
  const currentVisibility = state.bondVisibility[pairId]
  const nextVisibility =
    currentVisibility && visibilityRank(currentVisibility) > visibilityRank(visibility)
      ? currentVisibility
      : visibility

  let nextState: GameState = {
    ...state,
    bondVisibility: {
      ...state.bondVisibility,
      [pairId]: nextVisibility,
    },
  }

  if (!currentVisibility && nextVisibility === 'rumored') {
    nextState = appendActivityLogEntry(
      nextState,
      'system',
      `A district whisper circles through ${a.districtId?.replace('district-', '').replace(/-/g, ' ') ?? 'the ward'}: ${a.name} and ${b.name} have started moving in tandem.`,
    )
  } else if (currentVisibility !== 'known' && nextVisibility === 'known') {
    nextState = appendActivityLogEntry(
      nextState,
      'system',
      `${a.name} and ${b.name} are openly tied now. Doors in their district will not open the same way for everyone.`,
    )
  }

  return nextState
}

function ensureWorldNpcState(state: GameState, npcId: string) {
  let entry = state.worldNpcStates.find((worldNpcState) => worldNpcState.npcId === npcId)
  if (entry) return entry

  entry = {
    npcId,
    lastContactDay: null,
    disposition: 'neutral',
    locationOverride: null,
    flags: [],
  }
  state.worldNpcStates = [...state.worldNpcStates, entry]
  return entry
}

function addWorldNpcFlag(state: GameState, npcId: string, flag: string) {
  const entry = ensureWorldNpcState(state, npcId)
  if (!entry.flags.includes(flag)) {
    entry.flags = [...entry.flags, flag]
  }
}

function appendGeneratedRumor(
  state: GameState,
  args: {
    eventSource: string
    districtId: string
    originNpcId: string
    text: string
    subjectNpcIds: string[]
  },
) {
  if (state.rumors.some((rumor) => rumor.eventSource === args.eventSource)) return state

  const rumor: Rumor = {
    id: `${args.eventSource}-d${state.day}`,
    kind: 'ambient',
    source: 'generated',
    districtId: args.districtId,
    originNpcId: args.originNpcId,
    templateId: null,
    text: args.text,
    subjectNpcIds: args.subjectNpcIds,
    truth: 'true',
    credibility: 58,
    heat: 36,
    createdDay: state.day,
    lastSpreadDay: state.day,
    eventSource: args.eventSource,
  }

  return {
    ...state,
    rumors: [rumor, ...state.rumors],
  }
}

function maybeApplyPatronage(state: GameState, a: NpcDefinition, b: NpcDefinition, forward: RelationshipAxes, reverse: RelationshipAxes): GameState {
  const strength = forward.softBond?.strength ?? 0
  if (strength < 65) return state
  if ((a.startingTraits.dominance - b.startingTraits.dominance) < 5) return state
  if ((reverse.loyalty ?? 0) < 55 || (forward.trust ?? 0) < 45) return state

  const key = buildRelationshipKey(a.id, b.id)
  const reverseKey = buildRelationshipKey(b.id, a.id)
  let nextState: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [key]: { ...forward, bondType: 'patronage' },
      [reverseKey]: { ...reverse, bondType: 'dependency' },
    },
  }

  addWorldNpcFlag(nextState, a.id, `patron-of:${b.id}`)
  addWorldNpcFlag(nextState, b.id, `patronized-by:${a.id}`)
  nextState = appendGeneratedRumor(nextState, {
    eventSource: `world-npc-patronage:${a.id}:${b.id}`,
    districtId: a.districtId ?? b.districtId ?? 'district-the-pale',
    originNpcId: a.id,
    text: `${a.name} has started carrying ${b.name} into rooms that used to stay closed.`,
    subjectNpcIds: [a.id, b.id],
  })

  return appendActivityLogEntry(
    nextState,
    'system',
    `${a.name} has begun acting as ${b.name}'s patron. That tie will move doors, favors, and obligations without the player present.`,
  )
}

function maybeApplyProtectiveIntervention(state: GameState, a: NpcDefinition, b: NpcDefinition, forward: RelationshipAxes): GameState {
  if (forward.bondType !== 'protective') return state
  if ((forward.softBond?.strength ?? 0) < 65) return state

  const captivity = getNpcCaptivityState(state, b.id)
  if (!captivity || captivity.status !== 'captive') return state
  if (a.districtId !== b.districtId) return state

  const nextCaptivity: CaptivityState = {
    ...captivity,
    condition: HEALTHIER_CONDITION[captivity.condition],
    bondType: captivity.bondType === 'fear' ? 'dependency' : captivity.bondType,
  }

  const nextState: GameState = {
    ...state,
    npcCaptivityStates: { ...state.npcCaptivityStates },
  }
  setNpcCaptivityState(nextState, b.id, nextCaptivity)
  addWorldNpcFlag(nextState, a.id, `protecting:${b.id}`)

  const rumorState = appendGeneratedRumor(nextState, {
    eventSource: `world-npc-protection:${a.id}:${b.id}`,
    districtId: a.districtId ?? b.districtId ?? 'district-the-hollows',
    originNpcId: a.id,
    text: `${a.name} is getting small protections through to ${b.name}, even in custody.`,
    subjectNpcIds: [a.id, b.id],
  })

  return appendActivityLogEntry(
    rumorState,
    'system',
    `${a.name} quietly intervenes on ${b.name}'s behalf. Someone in the custody chain is no longer fully reliable.`,
  )
}

function maybeEscalateFeud(state: GameState, a: NpcDefinition, b: NpcDefinition, forward: RelationshipAxes, reverse: RelationshipAxes): GameState {
  const forwardType = forward.bondType ?? ''
  const reverseType = reverse.bondType ?? ''
  const strength = Math.max(forward.softBond?.strength ?? 0, reverse.softBond?.strength ?? 0)
  const hasRivalry = ['rivalry', 'grudge', 'territorial_conflict', 'feud'].includes(forwardType)
    || ['rivalry', 'grudge', 'territorial_conflict', 'feud'].includes(reverseType)
  if (!hasRivalry || strength < 70) return state

  const key = buildRelationshipKey(a.id, b.id)
  const reverseKey = buildRelationshipKey(b.id, a.id)
  let nextState: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [key]: { ...forward, bondType: 'feud' },
      [reverseKey]: { ...reverse, bondType: 'feud' },
    },
  }

  addWorldNpcFlag(nextState, a.id, `feud-with:${b.id}`)
  addWorldNpcFlag(nextState, b.id, `feud-with:${a.id}`)
  nextState = adjustDistrictTension(nextState, a.districtId ?? b.districtId ?? 'district-harbor', 3)
  nextState = appendGeneratedRumor(nextState, {
    eventSource: `world-npc-feud:${a.id}:${b.id}`,
    districtId: a.districtId ?? b.districtId ?? 'district-harbor',
    originNpcId: a.id,
    text: `${a.name} and ${b.name} have moved past rivalry. People nearby are already choosing sides.`,
    subjectNpcIds: [a.id, b.id],
  })

  return appendActivityLogEntry(
    nextState,
    'system',
    `${a.name} and ${b.name} are no longer merely rivals. Their feud is starting to distort the district around them.`,
  )
}

function maybePromoteRomance(
  current: RelationshipAxes,
  a: NpcDefinition,
  b: NpcDefinition,
  overlap: number,
  rng: Rng,
): RelationshipAxes {
  if (current.bondType === 'romantic') return current
  if ((current.softBond?.strength ?? 0) < SOFT_BOND_STRENGTH_FOR_ROMANCE) return current
  if ((current.trust ?? 0) < 35 || (current.affinity ?? 0) < 30) return current
  if ((current.fear ?? 0) > 20) return current
  if (overlap < 3) return current
  if (a.romanceEligible === false || b.romanceEligible === false) return current
  if (rng() >= 0.08) return current

  return {
    ...current,
    bondType: 'romantic',
    intimacyStage: current.intimacyStage ?? 'affinity',
    softBond: current.softBond
      ? {
          ...current.softBond,
          visibility: resolveVisibility(current.softBond.strength, current.softBond.visibility),
        }
      : current.softBond,
  }
}

function decayDormantSoftBonds(state: GameState, eligiblePairs: Set<string>) {
  const nextRelationships: Record<string, RelationshipAxes> = { ...state.relationships }

  for (const [key, rel] of Object.entries(state.relationships)) {
    if (!rel.softBond) continue
    const [fromId, toId] = key.split('→')
    if (!fromId || !toId) continue
    const pairId = bondPairId(fromId, toId)
    if (eligiblePairs.has(pairId)) continue
    const nextStrength = Math.max(0, rel.softBond.strength - 2)
    if (nextStrength < 10) {
      delete nextRelationships[key]
      continue
    }
    nextRelationships[key] = {
      ...rel,
      softBond: {
        ...rel.softBond,
        strength: nextStrength,
      },
    }
  }

  return { ...state, relationships: nextRelationships }
}

export function applyWorldNpcSocialSimulation(state: GameState, rng: Rng = Math.random): GameState {
  const worldNpcs = contentCatalog.npcs.filter((npc) => npc.npcType === 'world' || npc.npcType === 'story')
  if (worldNpcs.length < 2) return state

  const eligiblePairs = new Set<string>()
  let nextState: GameState = {
    ...state,
    worldNpcStates: state.worldNpcStates.map((entry) => ({ ...entry, flags: [...entry.flags] })),
    npcCaptivityStates: { ...state.npcCaptivityStates },
    rumors: [...state.rumors],
    districtTension: { ...state.districtTension },
  }

  for (let index = 0; index < worldNpcs.length; index += 1) {
    for (let nested = index + 1; nested < worldNpcs.length; nested += 1) {
      const a = worldNpcs[index]!
      const b = worldNpcs[nested]!
      if (!a.districtId || a.districtId !== b.districtId) continue

      const overlap = countRoutineOverlap(a, b)
      if (overlap === 0) continue

      const pairId = bondPairId(a.id, b.id)
      eligiblePairs.add(pairId)

      const compatibility = computeCompatibility(a, b)
      const edgeKey = buildRelationshipKey(a.id, b.id)
      const reverseKey = buildRelationshipKey(b.id, a.id)
      const current = nextState.relationships[edgeKey]
      const currentReverse = nextState.relationships[reverseKey]
      const currentStrength = current?.softBond?.strength ?? 0

      if (current?.softBond && currentReverse?.softBond) {
        const specialized = maybeEscalateFeud(
          maybeApplyProtectiveIntervention(
            maybeApplyPatronage(nextState, a, b, current, currentReverse),
            a,
            b,
            current,
          ),
          a,
          b,
          current,
          currentReverse,
        )

        if (specialized !== nextState) {
          nextState = specialized
          nextState = promoteRumorVisibility(nextState, a, b, current.softBond.visibility)
          continue
        }
      }

      const shouldForm = !current?.softBond && compatibility >= 18 && rng() < 0.35
      const shouldConflict = !current?.softBond && compatibility <= 8 && rng() < 0.2
      const shouldStrengthen = Boolean(current?.softBond) && rng() < 0.7

      if (!shouldForm && !shouldConflict && !shouldStrengthen) {
        continue
      }

      const bondType = selectSoftBondType(a, b, compatibility, current)
      if (!bondType) continue

      const nextStrength = Math.min(
        100,
        currentStrength > 0
          ? currentStrength + (bondType === 'romantic' ? 4 : overlap >= 3 ? 8 : 6)
          : Math.max(18, Math.min(55, 14 + overlap * 6 + Math.round(compatibility / 2))),
      )

      let forward = mergeSoftBondEdge(current, bondType, nextStrength, state.day)
      let reverse = mergeSoftBondEdge(nextState.relationships[reverseKey], bondType, nextStrength, state.day)

      forward = maybePromoteRomance(forward, a, b, overlap, rng)
      reverse = maybePromoteRomance(reverse, a, b, overlap, rng)

      nextState = {
        ...nextState,
        relationships: {
          ...nextState.relationships,
          [edgeKey]: forward,
          [reverseKey]: reverse,
        },
      }

      nextState = maybeApplyPatronage(nextState, a, b, forward, reverse)
      nextState = maybeApplyProtectiveIntervention(nextState, a, b, nextState.relationships[edgeKey] ?? forward)
      nextState = maybeEscalateFeud(
        nextState,
        a,
        b,
        nextState.relationships[edgeKey] ?? forward,
        nextState.relationships[reverseKey] ?? reverse,
      )

      nextState = promoteRumorVisibility(nextState, a, b, forward.softBond?.visibility ?? 'hidden')
      nextState = {
        ...nextState,
        relationships: pruneSoftBondCap(nextState.relationships, a.id),
      }
      nextState = {
        ...nextState,
        relationships: pruneSoftBondCap(nextState.relationships, b.id),
      }
    }
  }

  return decayDormantSoftBonds(nextState, eligiblePairs)
}
