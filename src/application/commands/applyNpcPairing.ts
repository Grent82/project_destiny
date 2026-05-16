import type { GameState } from '../../domain/game/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import type { IntimacyStage } from '../../domain/relationships/contracts'
import { buildRelationshipKey, getRelationship } from '../../domain/relationships/contracts'
import { calculateBaseCompatibility } from '../../domain/npc/compatibility'
import type { Rng } from './seededRng'

const COMPATIBILITY_THRESHOLD = -10
const DOMINANCE_IMBALANCE_LIMIT = 40
const FEAR_BLOCK_THRESHOLD = -30
const PREGNANCY_DAILY_PROBABILITY = 0.02

const STAGE_ORDER: IntimacyStage[] = ['none', 'affinity', 'attachment', 'committed']

// Relationship thresholds required to advance from current stage
const ADVANCE_CONDITIONS: Record<IntimacyStage, { affinity: number; trust: number; loyalty?: number }> = {
  none:       { affinity: 30, trust: 20 },
  affinity:   { affinity: 45, trust: 40 },
  attachment: { affinity: 60, trust: 55, loyalty: 35 },
  committed:  { affinity: 60, trust: 55 }, // terminal
}

function pairingKey(aId: string, bId: string, suffix: string): string {
  const [a, b] = aId < bId ? [aId, bId] : [bId, aId]
  return `npc-pairing-${a}-${b}-${suffix}`
}

function isOnCooldown(state: GameState, key: string, cooldownDays: number): boolean {
  const last = state.lastFiredDay[key]
  return last !== undefined && state.day - last < cooldownDays
}

function getSharedIntimacyStage(state: GameState, aId: string, bId: string): IntimacyStage {
  const ab = getRelationship(state.relationships, aId, bId)
  const ba = getRelationship(state.relationships, bId, aId)
  const abIdx = STAGE_ORDER.indexOf(ab.intimacyStage ?? 'none')
  const baIdx = STAGE_ORDER.indexOf(ba.intimacyStage ?? 'none')
  return STAGE_ORDER[Math.min(abIdx, baIdx)]!
}

function setIntimacyOnBothEdges(state: GameState, aId: string, bId: string, stage: IntimacyStage): GameState {
  const abKey = buildRelationshipKey(aId, bId)
  const baKey = buildRelationshipKey(bId, aId)
  return {
    ...state,
    relationships: {
      ...state.relationships,
      [abKey]: { ...getRelationship(state.relationships, aId, bId), intimacyStage: stage },
      [baKey]: { ...getRelationship(state.relationships, bId, aId), intimacyStage: stage },
    },
  }
}

function meetsAdvanceCondition(
  state: GameState,
  aId: string,
  bId: string,
  current: IntimacyStage,
): boolean {
  const cond = ADVANCE_CONDITIONS[current]
  const ab = getRelationship(state.relationships, aId, bId)
  const ba = getRelationship(state.relationships, bId, aId)
  const avgAffinity = (ab.affinity + ba.affinity) / 2
  const avgTrust = (ab.trust + ba.trust) / 2
  const avgLoyalty = cond.loyalty !== undefined
    ? ((ab.loyalty ?? 0) + (ba.loyalty ?? 0)) / 2
    : undefined

  if (avgAffinity < cond.affinity) return false
  if (avgTrust < cond.trust) return false
  if (cond.loyalty !== undefined && (avgLoyalty ?? 0) < cond.loyalty) return false
  return true
}

function isEligible(npc: NpcRuntimeState): boolean {
  if (npc.assignment === 'deployed') return false
  if (npc.captivityState?.status === 'captive') return false
  if (npc.captivityState?.status === 'missing') return false
  if (npc.status === 'ward') return false
  return true
}

export function applyNpcPairing(state: GameState, rng: Rng): GameState {
  const policy = state.house.npcPairingPolicy
  const eligible = state.roster.filter(isEligible)
  if (eligible.length < 2) return state

  let next = state

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const npcA = eligible[i]!
      const npcB = eligible[j]!

      const currentStage = getSharedIntimacyStage(next, npcA.npcId, npcB.npcId)

      // Forbidden policy blocks all new bond formation
      if (policy === 'forbidden' && currentStage === 'none') continue

      // Compatibility gate
      const compatScore = calculateBaseCompatibility(npcA.traits, npcB.traits)
      if (compatScore < COMPATIBILITY_THRESHOLD) continue

      // Dominance imbalance gate
      if (Math.abs(npcA.traits.dominance - npcB.traits.dominance) > DOMINANCE_IMBALANCE_LIMIT) continue

      // Fear bond gate — high fear from either direction blocks
      const abFear = getRelationship(next.relationships, npcA.npcId, npcB.npcId).fear
      const baFear = getRelationship(next.relationships, npcB.npcId, npcA.npcId).fear
      if (abFear < FEAR_BLOCK_THRESHOLD || baFear < FEAR_BLOCK_THRESHOLD) continue

      // Stage progression
      const currentIdx = STAGE_ORDER.indexOf(currentStage)
      if (currentStage !== 'committed' && meetsAdvanceCondition(next, npcA.npcId, npcB.npcId, currentStage)) {
        const targetStage = STAGE_ORDER[currentIdx + 1]!
        const cooldown = currentStage === 'none' ? 14 : currentStage === 'affinity' ? 21 : 30
        const key = pairingKey(npcA.npcId, npcB.npcId, `stage-${targetStage}`)

        if (!isOnCooldown(next, key, cooldown)) {
          next = setIntimacyOnBothEdges(next, npcA.npcId, npcB.npcId, targetStage)
          next = { ...next, lastFiredDay: { ...next.lastFiredDay, [key]: next.day } }

          // Fire noticed event at attachment stage
          if (targetStage === 'attachment') {
            const eventKey = 'event-npc-pairing-noticed'
            const alreadyPending = next.pendingEvents.some((pe) => pe.eventId === eventKey)
            if (!alreadyPending) {
              next = {
                ...next,
                pendingEvents: [...next.pendingEvents, { eventId: eventKey, firedOnDay: next.day }],
              }
            }
          }
        }
      }

      // Pregnancy check at committed stage
      if (currentStage === 'committed' && policy === 'open') {
        const pregnancyKey = pairingKey(npcA.npcId, npcB.npcId, 'pregnancy')
        const alreadyPregnant = npcA.pregnancyState || npcB.pregnancyState
        if (!alreadyPregnant && !isOnCooldown(next, pregnancyKey, 30) && rng() < PREGNANCY_DAILY_PROBABILITY) {
          // Pick the bearing parent (first by sort order for determinism, then rng if both eligible)
          const bearerA = !npcA.pregnancyState
          const bearerB = !npcB.pregnancyState
          const chooseA = bearerA && bearerB ? rng() < 0.5 : bearerA

          const [bearerId, partnerId] = chooseA
            ? [npcA.npcId, npcB.npcId]
            : [npcB.npcId, npcA.npcId]

          next = {
            ...next,
            roster: next.roster.map((n) =>
              n.npcId === bearerId
                ? {
                    ...n,
                    pregnancyState: {
                      context: 'consensual' as const,
                      daysElapsed: 0,
                      questTag: null,
                      partnerNpcId: partnerId,
                    },
                  }
                : n,
            ),
            lastFiredDay: { ...next.lastFiredDay, [pregnancyKey]: next.day },
          }

          // Fire pregnancy discovery event
          const discoveryKey = 'event-npc-pairing-pregnancy-discovery'
          if (!next.pendingEvents.some((pe) => pe.eventId === discoveryKey)) {
            next = {
              ...next,
              pendingEvents: [...next.pendingEvents, { eventId: discoveryKey, firedOnDay: next.day }],
            }
          }
        }
      }
    }
  }

  return next
}
