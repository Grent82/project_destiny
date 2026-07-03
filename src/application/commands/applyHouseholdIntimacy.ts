import type { GameState, NpcPairingPolicy, NpcRuntimeState } from '../../domain'
import type { IntimacyStage, RelationshipAxes } from '../../domain/relationships/contracts'
import { buildRelationshipKey, getRelationship } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'
import { isEligibleForHouseholdTogetherness, shareResidentialRoom, shareDutyPost } from './npcTogetherness'

const STAGE_ORDER: IntimacyStage[] = ['none', 'affinity', 'attachment', 'committed']

type DomesticBeatEffect = {
  trust: number
  affinity: number
  loyalty: number
}

type TriggerType = 'quarters' | 'duty'

type DomesticCandidate = {
  npcA: NpcRuntimeState
  npcB: NpcRuntimeState
  roomId: string
  roomName: string
  stage: IntimacyStage
  strength: number
  triggerType: TriggerType
}

function getSharedIntimacyStage(state: GameState, aId: string, bId: string): IntimacyStage {
  const ab = getRelationship(state.relationships, aId, bId)
  const ba = getRelationship(state.relationships, bId, aId)
  const abIdx = STAGE_ORDER.indexOf(ab.intimacyStage ?? 'none')
  const baIdx = STAGE_ORDER.indexOf(ba.intimacyStage ?? 'none')
  return STAGE_ORDER[Math.min(abIdx, baIdx)]!
}

function isOnCooldown(state: GameState, key: string, cooldownDays: number): boolean {
  const last = state.lastFiredDay[key]
  return last !== undefined && state.day - last < cooldownDays
}

function sortedPairKey(aId: string, bId: string) {
  return aId < bId ? [aId, bId] as const : [bId, aId] as const
}

function relationshipStrength(state: GameState, aId: string, bId: string) {
  const ab = getRelationship(state.relationships, aId, bId)
  const ba = getRelationship(state.relationships, bId, aId)
  return ab.affinity + ba.affinity + ab.trust + ba.trust + (ab.loyalty ?? 0) + (ba.loyalty ?? 0)
}

/** Living together produces a domestic bond. */
function resolveDomesticEffect(stage: IntimacyStage, policy: NpcPairingPolicy): DomesticBeatEffect | null {
  if (policy === 'forbidden') return null
  if (stage === 'committed') {
    return policy === 'open'
      ? { trust: 4, affinity: 3, loyalty: 2 }
      : { trust: 2, affinity: 1, loyalty: 1 }
  }
  if (stage === 'attachment') {
    return policy === 'open'
      ? { trust: 3, affinity: 2, loyalty: 1 }
      : { trust: 1, affinity: 1, loyalty: 0 }
  }
  return null
}

/** Working together produces camaraderie, not domestic partnership — a smaller effect. */
function resolveDutyEffect(stage: IntimacyStage, policy: NpcPairingPolicy): DomesticBeatEffect | null {
  if (policy === 'forbidden') return null
  if (stage === 'committed') {
    return policy === 'open' ? { trust: 2, affinity: 1, loyalty: 1 } : { trust: 1, affinity: 1, loyalty: 0 }
  }
  if (stage === 'attachment') {
    return policy === 'open' ? { trust: 1, affinity: 1, loyalty: 0 } : { trust: 1, affinity: 0, loyalty: 0 }
  }
  return null
}

function resolveEffect(triggerType: TriggerType, stage: IntimacyStage, policy: NpcPairingPolicy): DomesticBeatEffect | null {
  return triggerType === 'quarters' ? resolveDomesticEffect(stage, policy) : resolveDutyEffect(stage, policy)
}

function buildDomesticSummary(
  npcNames: [string, string],
  roomName: string,
  stage: IntimacyStage,
  policy: NpcPairingPolicy,
) {
  const [aName, bName] = npcNames
  if (stage === 'committed') {
    if (policy === 'open') {
      return `${aName} and ${bName} settle into ${roomName} as an openly tolerated household rhythm. Their bond starts to shape the house as much as any repaired wall.`
    }
    return `${aName} and ${bName} keep returning to ${roomName} even under a discouraging house rule. The bond survives through discretion and habit.`
  }

  if (policy === 'open') {
    return `Sharing ${roomName} gives ${aName} and ${bName} private ground to become more than field partners. The house begins to read them as a pair.`
  }

  return `${aName} and ${bName} keep finding one another in ${roomName} despite the house's caution. The attachment holds because the routine does.`
}

function buildDutySummary(
  npcNames: [string, string],
  roomName: string,
  stage: IntimacyStage,
) {
  const [aName, bName] = npcNames
  if (stage === 'committed') {
    return `${aName} and ${bName} have worked ${roomName} together long enough that the whole house treats them as a pair, on duty or off.`
  }
  return `Long shifts in ${roomName} give ${aName} and ${bName} something steadier than field partnership — a routine they keep choosing.`
}

function buildSummary(triggerType: TriggerType, npcNames: [string, string], roomName: string, stage: IntimacyStage, policy: NpcPairingPolicy) {
  return triggerType === 'quarters'
    ? buildDomesticSummary(npcNames, roomName, stage, policy)
    : buildDutySummary(npcNames, roomName, stage)
}

function effectLines(effect: DomesticBeatEffect) {
  const lines = [
    `Trust +${effect.trust} each`,
    `Affinity +${effect.affinity} each`,
  ]
  if (effect.loyalty > 0) {
    lines.push(`Loyalty +${effect.loyalty} each`)
  }
  return lines
}

function applyEffectToEdge(edge: RelationshipAxes, effect: DomesticBeatEffect): RelationshipAxes {
  return {
    ...edge,
    trust: Math.max(-100, Math.min(100, edge.trust + effect.trust)),
    affinity: Math.max(-100, Math.min(100, edge.affinity + effect.affinity)),
    loyalty: Math.max(-100, Math.min(100, (edge.loyalty ?? 0) + effect.loyalty)),
  }
}

function findCandidates(
  state: GameState,
  eligible: NpcRuntimeState[],
  policy: NpcPairingPolicy,
  triggerType: TriggerType,
  cooldownNamespace: string,
  cooldownDays: number,
  shareCheck: (state: GameState, npcA: NpcRuntimeState, npcB: NpcRuntimeState) => boolean,
  roomIdOf: (npc: NpcRuntimeState) => string | null,
): DomesticCandidate[] {
  const candidates: DomesticCandidate[] = []

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const npcA = eligible[i]!
      const npcB = eligible[j]!
      if (!shareCheck(state, npcA, npcB)) continue

      const roomId = roomIdOf(npcA)
      if (!roomId) continue

      const stage = getSharedIntimacyStage(state, npcA.npcId, npcB.npcId)
      const effect = resolveEffect(triggerType, stage, policy)
      if (!effect) continue

      const [leftId, rightId] = sortedPairKey(npcA.npcId, npcB.npcId)
      const cooldownKey = `${cooldownNamespace}-${leftId}-${rightId}-${roomId}`
      if (isOnCooldown(state, cooldownKey, cooldownDays)) continue

      const roomName = state.house.rooms.find((room) => room.roomId === roomId)?.name ?? 'their quarters'
      const strength = relationshipStrength(state, npcA.npcId, npcB.npcId)

      candidates.push({ npcA, npcB, roomId, roomName, stage, strength, triggerType })
    }
  }

  return candidates
}

function pickBest(candidates: DomesticCandidate[]): DomesticCandidate | null {
  let best: DomesticCandidate | null = null
  for (const candidate of candidates) {
    if (
      !best ||
      STAGE_ORDER.indexOf(candidate.stage) > STAGE_ORDER.indexOf(best.stage) ||
      (candidate.stage === best.stage && candidate.strength > best.strength)
    ) {
      best = candidate
    }
  }
  return best
}

export function applyHouseholdIntimacy(state: GameState): GameState {
  const policy = state.house.npcPairingPolicy
  if (policy === 'forbidden') return state

  const eligible = state.roster.filter((npc) => isEligibleForHouseholdTogetherness(npc, state.houseDistrictId))
  if (eligible.length < 2) return state

  // Shared quarters routine — living together.
  const quartersCandidates = findCandidates(
    state,
    eligible,
    policy,
    'quarters',
    'household-domestic',
    5,
    (s, a, b) => shareResidentialRoom(s, a, b),
    (npc) => npc.roomAssignment,
  )

  // Shared duty routine — working together, distinct from living together.
  const dutyCandidates = findCandidates(
    state,
    eligible,
    policy,
    'duty',
    'household-duty',
    5,
    (s, a, b) => shareDutyPost(s, a, b),
    (npc) => npc.dutyPostRoomId,
  )

  const bestCandidate = pickBest([...quartersCandidates, ...dutyCandidates])
  if (!bestCandidate) return state

  const effect = resolveEffect(bestCandidate.triggerType, bestCandidate.stage, policy)
  if (!effect) return state

  const cooldownNamespace = bestCandidate.triggerType === 'quarters' ? 'household-domestic' : 'household-duty'
  const [leftId, rightId] = sortedPairKey(bestCandidate.npcA.npcId, bestCandidate.npcB.npcId)
  const cooldownKey = `${cooldownNamespace}-${leftId}-${rightId}-${bestCandidate.roomId}`
  const npcNames = [bestCandidate.npcA.name, bestCandidate.npcB.name] as [string, string]
  const summary = buildSummary(bestCandidate.triggerType, npcNames, bestCandidate.roomName, bestCandidate.stage, policy)

  const abKey = buildRelationshipKey(bestCandidate.npcA.npcId, bestCandidate.npcB.npcId)
  const baKey = buildRelationshipKey(bestCandidate.npcB.npcId, bestCandidate.npcA.npcId)

  const nextRelationships = {
    ...state.relationships,
    [abKey]: applyEffectToEdge(getRelationship(state.relationships, bestCandidate.npcA.npcId, bestCandidate.npcB.npcId), effect),
    [baKey]: applyEffectToEdge(getRelationship(state.relationships, bestCandidate.npcB.npcId, bestCandidate.npcA.npcId), effect),
  }

  const nextState: GameState = {
    ...state,
    relationships: nextRelationships,
    lastFiredDay: {
      ...state.lastFiredDay,
      [cooldownKey]: state.day,
    },
    house: {
      ...state.house,
      lastDomesticRelationshipBeat: {
        day: state.day,
        npcIds: [bestCandidate.npcA.npcId, bestCandidate.npcB.npcId],
        npcNames,
        roomId: bestCandidate.roomId,
        roomName: bestCandidate.roomName,
        policy,
        intimacyStage: bestCandidate.stage,
        summary,
        effects: effectLines(effect),
        triggerType: bestCandidate.triggerType,
      },
    },
  }

  return appendActivityLogEntry(nextState, 'system', summary)
}
