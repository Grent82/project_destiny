import type { GameState } from '../../domain/game/contracts'
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

// Days a pair must wait before advancing again after reaching this stage. Deliberately short —
// the game's core loop deadline is day 30 (debtDueDay); the previous 14/21/30 values made
// 'committed' mathematically unreachable in a normal playthrough (14+21 already exceeds day 30).
export const INTIMACY_ADVANCE_COOLDOWN_DAYS: Record<Exclude<IntimacyStage, 'committed'>, number> = {
  none: 3,
  affinity: 5,
  attachment: 7,
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
 *
 * Every person in the unified list (destiny-rama.8) has real traits now — World NPCs used to be
 * skipped here only because the old thin WorldNpcRuntimeState had no traits field at all (a
 * technical limitation, not a design choice), so the check now runs uniformly for every pair.
 */
function checkPairingCompatibility(
  state: GameState,
  npcA: NpcRuntimeState,
  npcB: NpcRuntimeState,
): boolean {
  // Compatibility gate
  const compatScore = calculateBaseCompatibility(npcA.traits, npcB.traits)
  if (compatScore < COMPATIBILITY_THRESHOLD) return false

  // Dominance imbalance gate
  if (Math.abs(npcA.traits.dominance - npcB.traits.dominance) > DOMINANCE_IMBALANCE_LIMIT) return false

  // Fear bond gate
  const abFear = getRelationship(state.relationships, npcA.npcId, npcB.npcId).fear
  const baFear = getRelationship(state.relationships, npcB.npcId, npcA.npcId).fear
  if (abFear < FEAR_BLOCK_THRESHOLD || baFear < FEAR_BLOCK_THRESHOLD) return false

  return true
}

/**
 * Try to advance a pair's shared intimacy stage by one step, respecting compatibility, thresholds
 * (NPC_INTIMACY_ADVANCE_CONDITIONS), and the per-stage cooldown (INTIMACY_ADVANCE_COOLDOWN_DAYS).
 *
 * Reused by two callers: applyNpcPairing's blanket sweep (world-involving pairs, which can't hold
 * an Intention) and intentions.ts's courtRomanticallyHandler (roster<->roster pairs, intention-gated).
 */
export function tryAdvanceIntimacyStage(
  state: GameState,
  npcA: NpcRuntimeState,
  npcB: NpcRuntimeState,
  policy: 'open' | 'discouraged' | 'forbidden',
): GameState {
  let next = state
  const npcAId = npcA.npcId
  const npcBId = npcB.npcId

  const currentStage = getSharedIntimacyStage(next, npcAId, npcBId)

  // Forbidden policy blocks all new bond formation
  if (policy === 'forbidden' && currentStage === 'none') return next

  // Check compatibility
  if (!checkPairingCompatibility(next, npcA, npcB)) return next

  if (currentStage === 'committed') return next
  if (!meetsAdvanceCondition(next, npcAId, npcBId, currentStage)) return next

  const currentIdx = STAGE_ORDER.indexOf(currentStage)
  const targetStage = STAGE_ORDER[currentIdx + 1]!
  const cooldown = INTIMACY_ADVANCE_COOLDOWN_DAYS[currentStage]
  const key = pairingKey(npcAId, npcBId, `stage-${targetStage}`)

  if (isOnCooldown(next, key, cooldown)) return next

  next = setIntimacyOnBothEdges(next, npcAId, npcBId, targetStage)
  next = { ...next, lastFiredDay: { ...next.lastFiredDay, [key]: next.day } }

  // Fire noticed event at attachment stage (only for pairs who are both player-roster members —
  // see the isRosterRosterPair discriminator in applyPairingToPair below for why playerRosterMember
  // is the correct check post destiny-rama.8, not a structural 'traits in npc' probe).
  if (targetStage === 'attachment' && npcA.playerRosterMember && npcB.playerRosterMember) {
    const eventKey = EVENT_IDS.NPC_PAIRING_NOTICED
    const alreadyPending = next.pendingEvents.some((pe) => pe.eventId === eventKey)
    if (!alreadyPending) {
      next = enqueueTemplateEvent(next, eventKey, { firedOnDay: next.day })
    }
  }

  return next
}

/**
 * Apply intimacy stage progression (world-involving pairs only — see tryAdvanceIntimacyStage's
 * doc comment) and pregnancy mechanics (roster-roster only) for a pair.
 */
function applyPairingToPair(
  state: GameState,
  rng: Rng,
  npcA: NpcRuntimeState,
  npcB: NpcRuntimeState,
  policy: 'open' | 'discouraged' | 'forbidden',
): GameState {
  let next = state
  const npcAId = npcA.npcId
  const npcBId = npcB.npcId
  // "Roster<->roster" means both sides currently work for the player — playerRosterMember is the
  // sole correct discriminator (destiny-rama.8 contract §2.1). Before the unify fold this was
  // (wrongly, in hindsight) approximated via `'traits' in npc`, which only worked because the old
  // thin WorldNpcRuntimeState had no traits field; now every person has traits, so that check would
  // always be true and silently stop the world-involving blanket sweep from ever running.
  const isRosterRosterPair = npcA.playerRosterMember && npcB.playerRosterMember

  // Roster<->roster stage progression is intention-driven (courtRomanticallyHandler) — World NPCs
  // have no currentIntention, so world-involving pairs still advance through this blanket sweep.
  if (!isRosterRosterPair) {
    next = tryAdvanceIntimacyStage(next, npcA, npcB, policy)
  }

  const currentStage = getSharedIntimacyStage(next, npcAId, npcBId)

  // Pregnancy check at committed stage (only for roster-roster pairs)
  if (currentStage === 'committed' && policy === 'open' && isRosterRosterPair) {
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
        npcRuntimeStates: next.npcRuntimeStates.map((n) =>
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

  // Roster NPCs (existing logic). playerRosterMember is required explicitly (destiny-rama.8): now
  // that world persons share the same list, isEligibleForHouseholdTogetherness alone is not enough
  // to exclude them — an idle world NPC with no assignedDistrictId would otherwise pass it too and
  // get double-counted in both this loop and the world loop below.
  const rosterEligible = state.npcRuntimeStates.filter(
    (npc) => npc.playerRosterMember && isEligibleForHouseholdTogetherness(npc, state.houseDistrictId),
  )

  // World NPCs (new) - all non-player-roster persons are eligible, matching the old worldNpcStates
  // array's "all are eligible" behavior (which included story/enemy-typed custody-chain persons who
  // happened to have a runtime entry there — preserved here via playerRosterMember, not npcType).
  const worldEligible = state.npcRuntimeStates.filter((npc) => !npc.playerRosterMember)

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
