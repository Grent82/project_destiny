import type { GameState } from '../../domain/game/contracts'
import type { WorldNpcRuntimeState } from '../../domain/npc/contracts'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import type { IntimacyStage } from '../../domain/relationships/contracts'
import { buildRelationshipKey, getRelationship } from '../../domain/relationships/contracts'
import { calculateBaseCompatibility } from '../../domain/npc/compatibility'
import type { Rng } from './seededRng'
import { EVENT_IDS } from '../content/ids'
import { enqueueTemplateEvent } from './eventInstances'
import { isEligibleForHouseholdTogetherness } from './npcTogetherness'

const COMPATIBILITY_THRESHOLD = -10
const DOMINANCE_IMBALANCE_LIMIT = 40
const FEAR_BLOCK_THRESHOLD = -30
const PREGNANCY_DAILY_PROBABILITY = 0.02

const STAGE_ORDER: IntimacyStage[] = ['none', 'affinity', 'attachment', 'committed']

// Relationship thresholds required to advance from current stage.
// This is the single canonical copy — resolveNpcDate.ts and npcNpcRomance.ts import it
// rather than keeping their own (previously drifted) local tables.
export const NPC_INTIMACY_ADVANCE_CONDITIONS: Record<IntimacyStage, { affinity: number; trust: number; loyalty?: number }> = {
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
  const cond = NPC_INTIMACY_ADVANCE_CONDITIONS[current]
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


/**
 * Check compatibility between two NPCs for pairing.
 * Returns true if they pass compatibility, dominance, and fear gates.
 */
function checkPairingCompatibility(
  state: GameState,
  npcA: NpcRuntimeState | WorldNpcRuntimeState,
  npcB: NpcRuntimeState | WorldNpcRuntimeState,
): boolean {
  // Roster NPCs have traits, World NPCs don't - skip compatibility check for World pairs
  const isRosterA = 'traits' in npcA
  const isRosterB = 'traits' in npcB

  if (isRosterA && isRosterB) {
    // Compatibility gate
    const compatScore = calculateBaseCompatibility(npcA.traits, npcB.traits)
    if (compatScore < COMPATIBILITY_THRESHOLD) return false

    // Dominance imbalance gate
    if (Math.abs(npcA.traits.dominance - npcB.traits.dominance) > DOMINANCE_IMBALANCE_LIMIT) return false

    // Fear bond gate
    const abFear = getRelationship(state.relationships, npcA.npcId, npcB.npcId).fear
    const baFear = getRelationship(state.relationships, npcB.npcId, npcA.npcId).fear
    if (abFear < FEAR_BLOCK_THRESHOLD || baFear < FEAR_BLOCK_THRESHOLD) return false
  }

  return true
}

/**
 * Apply intimacy stage progression and pregnancy mechanics for a pair.
 */
function applyPairingToPair(
  state: GameState,
  rng: Rng,
  npcA: NpcRuntimeState | WorldNpcRuntimeState,
  npcB: NpcRuntimeState | WorldNpcRuntimeState,
  policy: 'open' | 'discouraged' | 'forbidden',
): GameState {
  let next = state
  const npcAId = npcA.npcId
  const npcBId = npcB.npcId

  const currentStage = getSharedIntimacyStage(next, npcAId, npcBId)

  // Forbidden policy blocks all new bond formation
  if (policy === 'forbidden' && currentStage === 'none') return next

  // Check compatibility (only for roster-roster pairs)
  if (!checkPairingCompatibility(next, npcA, npcB)) return next

  // Stage progression
  const currentIdx = STAGE_ORDER.indexOf(currentStage)
  if (currentStage !== 'committed' && meetsAdvanceCondition(next, npcAId, npcBId, currentStage)) {
    const targetStage = STAGE_ORDER[currentIdx + 1]!
    const cooldown = currentStage === 'none' ? 14 : currentStage === 'affinity' ? 21 : 30
    const key = pairingKey(npcAId, npcBId, `stage-${targetStage}`)

    if (!isOnCooldown(next, key, cooldown)) {
      next = setIntimacyOnBothEdges(next, npcAId, npcBId, targetStage)
      next = { ...next, lastFiredDay: { ...next.lastFiredDay, [key]: next.day } }

      // Fire noticed event at attachment stage (only for roster NPCs)
      if (targetStage === 'attachment' && 'traits' in npcA && 'traits' in npcB) {
        const eventKey = EVENT_IDS.NPC_PAIRING_NOTICED
        const alreadyPending = next.pendingEvents.some((pe) => pe.eventId === eventKey)
        if (!alreadyPending) {
          next = enqueueTemplateEvent(next, eventKey, { firedOnDay: next.day })
        }
      }
    }
  }

  // Pregnancy check at committed stage (only for roster-roster pairs)
  if (currentStage === 'committed' && policy === 'open' && 'traits' in npcA && 'traits' in npcB) {
    const pregnancyKey = pairingKey(npcAId, npcBId, 'pregnancy')
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
                  wanted: null,
                },
              }
            : n,
        ),
        lastFiredDay: { ...next.lastFiredDay, [pregnancyKey]: next.day },
      }

      // Fire pregnancy discovery event
      const discoveryKey = EVENT_IDS.NPC_PAIRING_PREGNANCY_DISCOVERY
      if (!next.pendingEvents.some((pe) => pe.eventId === discoveryKey)) {
        next = enqueueTemplateEvent(next, discoveryKey, { firedOnDay: next.day })
      }
    }
  }

  return next
}

export function applyNpcPairing(state: GameState, rng: Rng): GameState {
  const policy = state.house.npcPairingPolicy

  // Roster NPCs (existing logic)
  const rosterEligible = state.roster.filter((npc) => isEligibleForHouseholdTogetherness(npc, state.houseDistrictId))

  // World NPCs (new) - all are eligible
  const worldEligible = state.worldNpcStates

  let next = state

  // 1. Roster ↔ Roster pairing
  for (let i = 0; i < rosterEligible.length; i++) {
    for (let j = i + 1; j < rosterEligible.length; j++) {
      next = applyPairingToPair(next, rng, rosterEligible[i]!, rosterEligible[j]!, policy)
    }
  }

  // 2. World ↔ World pairing
  for (let i = 0; i < worldEligible.length; i++) {
    for (let j = i + 1; j < worldEligible.length; j++) {
      next = applyPairingToPair(next, rng, worldEligible[i]!, worldEligible[j]!, policy)
    }
  }

  // 3. Roster ↔ World pairing (cross-type)
  for (const rosterNpc of rosterEligible) {
    for (const worldNpc of worldEligible) {
      next = applyPairingToPair(next, rng, rosterNpc, worldNpc, policy)
    }
  }

  return next
}
