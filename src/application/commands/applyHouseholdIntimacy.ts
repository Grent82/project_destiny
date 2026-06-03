import type { GameState, NpcPairingPolicy, NpcRuntimeState } from '../../domain'
import type { IntimacyStage, RelationshipAxes } from '../../domain/relationships/contracts'
import { buildRelationshipKey, getRelationship } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'

const RESIDENTIAL_ROOM_IDS = new Set([
  'room-quarters',
  'room-master-chamber',
  'room-servant-quarters',
  'room-barracks',
  'room-east-wing',
])

const STAGE_ORDER: IntimacyStage[] = ['none', 'affinity', 'attachment', 'committed']

type DomesticBeatEffect = {
  trust: number
  affinity: number
  loyalty: number
}

function isResidentialRoom(state: GameState, roomId: string | null): boolean {
  if (!roomId || !RESIDENTIAL_ROOM_IDS.has(roomId)) return false
  return state.house.rooms.some((room) => room.roomId === roomId && room.state === 'intact')
}

function isEligibleResident(npc: NpcRuntimeState): boolean {
  if (npc.assignment === 'deployed') return false
  if (npc.captivityState?.status === 'captive') return false
  if (npc.captivityState?.status === 'missing') return false
  if (npc.status === 'ward') return false
  return true
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

export function applyHouseholdIntimacy(state: GameState): GameState {
  const policy = state.house.npcPairingPolicy
  if (policy === 'forbidden') return state

  const residents = state.roster.filter(
    (npc) => isEligibleResident(npc) && isResidentialRoom(state, npc.roomAssignment),
  )
  if (residents.length < 2) return state

  let bestCandidate: {
    npcA: NpcRuntimeState
    npcB: NpcRuntimeState
    roomId: string
    roomName: string
    stage: IntimacyStage
    strength: number
  } | null = null

  for (let i = 0; i < residents.length; i++) {
    for (let j = i + 1; j < residents.length; j++) {
      const npcA = residents[i]!
      const npcB = residents[j]!
      if (!npcA.roomAssignment || npcA.roomAssignment !== npcB.roomAssignment) continue

      const stage = getSharedIntimacyStage(state, npcA.npcId, npcB.npcId)
      const effect = resolveDomesticEffect(stage, policy)
      if (!effect) continue

      const [leftId, rightId] = sortedPairKey(npcA.npcId, npcB.npcId)
      const cooldownKey = `household-domestic-${leftId}-${rightId}-${npcA.roomAssignment}`
      if (isOnCooldown(state, cooldownKey, 5)) continue

      const roomName =
        state.house.rooms.find((room) => room.roomId === npcA.roomAssignment)?.name ?? 'their quarters'
      const strength = relationshipStrength(state, npcA.npcId, npcB.npcId)

      if (
        !bestCandidate ||
        STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(bestCandidate.stage) ||
        (
          stage === bestCandidate.stage &&
          strength > bestCandidate.strength
        )
      ) {
        bestCandidate = {
          npcA,
          npcB,
          roomId: npcA.roomAssignment,
          roomName,
          stage,
          strength,
        }
      }
    }
  }

  if (!bestCandidate) return state

  const effect = resolveDomesticEffect(bestCandidate.stage, policy)
  if (!effect) return state

  const [leftId, rightId] = sortedPairKey(bestCandidate.npcA.npcId, bestCandidate.npcB.npcId)
  const cooldownKey = `household-domestic-${leftId}-${rightId}-${bestCandidate.roomId}`
  const npcNames = [bestCandidate.npcA.name, bestCandidate.npcB.name] as [string, string]
  const summary = buildDomesticSummary(npcNames, bestCandidate.roomName, bestCandidate.stage, policy)

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
      },
    },
  }

  return appendActivityLogEntry(nextState, 'system', summary)
}
