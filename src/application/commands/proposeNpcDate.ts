import type { GameState } from '../../domain/game/contracts'
import type { Rng } from './seededRng'
import { getRelationship } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'
import type { NpcDefinition } from '../../domain/npc/contracts'

/**
 * Check if an NPC is eligible for autonomous dating with another NPC.
 *
 * Eligibility criteria:
 * - Must be on the roster
 * - Must be idle (not deployed, not captive, not missing)
 * - Must not be a ward
 */
function isEligibleForNpcDate(npc: { assignment?: string; status?: string; captivityState?: { status?: string } }): boolean {
  if (npc.assignment === 'deployed') return false
  if (npc.assignment === 'working') return false // Working NPCs can still date, but with lower probability
  if (npc.captivityState?.status === 'captive') return false
  if (npc.captivityState?.status === 'missing') return false
  if (npc.status === 'ward') return false
  return true
}

/**
 * Get the intimacy stage between two NPCs (bidirectional, uses minimum of both edges).
 */
function getNpcNpcIntimacyStage(state: GameState, npcAId: string, npcBId: string): 'none' | 'affinity' | 'attachment' | 'committed' {
  const ab = getRelationship(state.relationships, npcAId, npcBId)
  const ba = getRelationship(state.relationships, npcBId, npcAId)

  const stages: ('none' | 'affinity' | 'attachment' | 'committed')[] = ['none', 'affinity', 'attachment', 'committed']
  const abIndex = stages.indexOf(ab.intimacyStage ?? 'none')
  const baIndex = stages.indexOf(ba.intimacyStage ?? 'none')

  return stages[Math.min(abIndex, baIndex)] ?? 'none'
}

/**
 * Check if an NPC-NPC date proposal would be eligible based on intimacy and other factors.
 */
function checkNpcDateEligibility(
  state: GameState,
  proposer: NpcDefinition,
  target: NpcDefinition,
  dateTemplateId: string,
): { eligible: boolean; reason?: string } {
  const currentIntimacy = getNpcNpcIntimacyStage(state, proposer.id, target.id)

  // Check intimacy requirement from date template
  const dateTemplate = contentCatalog.datesById.get(dateTemplateId)
  if (!dateTemplate) {
    return { eligible: false, reason: 'unknown-date-template' }
  }

  const requiredStage = dateTemplate.requiredIntimacyStage ?? 'affinity'
  const stages: ('none' | 'affinity' | 'attachment' | 'committed')[] = ['none', 'affinity', 'attachment', 'committed']
  const currentIndex = stages.indexOf(currentIntimacy)
  const requiredIndex = stages.indexOf(requiredStage)

  if (currentIndex < requiredIndex) {
    return { eligible: false, reason: 'intimacy-too-low' }
  }

  // Check affinity threshold (bidirectional average)
  const ab = getRelationship(state.relationships, proposer.id, target.id)
  const ba = getRelationship(state.relationships, target.id, proposer.id)
  const avgAffinity = (ab.affinity + ba.affinity) / 2

  // Require minimum affinity based on intimacy stage
  const affinityThreshold = requiredIndex === 3 ? 60 : requiredIndex === 2 ? 45 : 30
  if (avgAffinity < affinityThreshold) {
    return { eligible: false, reason: 'affinity-too-low' }
  }

  // Check for high fear (blocks romantic progression)
  if (ab.fear > 20 || ba.fear > 20) {
    return { eligible: false, reason: 'fear-block' }
  }

  // Check cooldown
  const cooldownKey = `${[proposer.id, target.id].sort().join('-')}-${state.day}`
  if (state.npcDateCooldowns[cooldownKey]) {
    return { eligible: false, reason: 'on-cooldown' }
  }

  return { eligible: true }
}

/**
 * Select a random date template appropriate for the intimacy stage between two NPCs.
 */
function selectDateTemplateForNpcPair(
  state: GameState,
  npcA: NpcDefinition,
  npcB: NpcDefinition,
  rng: Rng,
): string | null {
  const intimacy = getNpcNpcIntimacyStage(state, npcA.id, npcB.id)

  // Filter dates by intimacy requirement
  const eligibleDates = contentCatalog.dates.filter((date) => {
    const stages: ('none' | 'affinity' | 'attachment' | 'committed')[] = ['none', 'affinity', 'attachment', 'committed']
    const intimacyIndex = stages.indexOf(intimacy)
    const requiredIndex = stages.indexOf(date.requiredIntimacyStage)
    return intimacyIndex >= requiredIndex
  })

  if (eligibleDates.length === 0) return null

  // Pick random date from eligible ones
  const index = Math.floor(rng() * eligibleDates.length)
  return eligibleDates[index]?.id ?? null
}

/**
 * Generate an autonomous NPC-NPC date proposal during endDay processing.
 *
 * This is called during the social simulation phase with 1-2% chance per idle NPC pair.
 */
export function proposeNpcDate(
  state: GameState,
  proposerId: string,
  targetId: string,
  rng: Rng,
): GameState {
  const proposer = contentCatalog.npcsById.get(proposerId)
  const target = contentCatalog.npcsById.get(targetId)

  if (!proposer || !target) return state

  // Select appropriate date template first
  const dateTemplateId = selectDateTemplateForNpcPair(state, proposer, target, rng)
  if (!dateTemplateId) return state

  // Check eligibility with the selected date template
  const eligibility = checkNpcDateEligibility(state, proposer, target, dateTemplateId)
  if (!eligibility.eligible) return state

  // Create the proposal
  const proposal = {
    proposalId: `npc-proposal-${proposerId}-${targetId}-${state.day}`,
    proposerNpcId: proposerId,
    targetNpcId: targetId,
    dateTemplateId,
    proposedDay: state.day + 1, // Propose for next day
    proposedTimeSlot: 'evening' as const, // Default to evening for NPC-NPC dates
    proposedLocation: null,
    status: 'accepted' as const, // NPC-NPC proposals are auto-accepted if eligible
    rejectionReason: null as null,
    proposedAtDay: state.day,
  }

  // Set cooldown
  const sortedIds = [proposerId, targetId].sort()
  const cooldownKey = `${sortedIds[0]}-${sortedIds[1]}-${state.day + 1}`
  const newCooldowns = {
    ...state.npcDateCooldowns,
    [cooldownKey]: state.day + 1,
  }

  // Add to pending proposals
  return {
    ...state,
    pendingDateProposals: [...state.pendingDateProposals, proposal],
    npcDateCooldowns: newCooldowns,
  }
}

/**
 * Scan all eligible NPC pairs and generate autonomous date proposals.
 *
 * Called during endDay social simulation phase.
 * Each idle NPC pair has a 1-2% chance to propose a date.
 */
export function proposeNpcDatesForAllEligiblePairs(
  state: GameState,
  rng: Rng,
): GameState {
  const rosterNpcs = state.roster
    .filter((entry) => isEligibleForNpcDate(entry))
    .map((entry) => entry.npcId)

  if (rosterNpcs.length < 2) return state

  let nextState = state
  const pairsAttempted: Set<string> = new Set()

  for (let i = 0; i < rosterNpcs.length; i++) {
    for (let j = i + 1; j < rosterNpcs.length; j++) {
      const npcAId = rosterNpcs[i]!
      const npcBId = rosterNpcs[j]!
      const pairKey = [npcAId, npcBId].sort().join('-')

      // Skip if already attempted this day
      if (pairsAttempted.has(pairKey)) continue
      pairsAttempted.add(pairKey)

      // 1-2% chance per pair (using rng for determinism)
      const proposalChance = 0.01 + (rng() * 0.01) // 0.01 to 0.02
      if (rng() >= proposalChance) continue

      // Check if they have any relationship at all
      const ab = getRelationship(state.relationships, npcAId, npcBId)
      const ba = getRelationship(state.relationships, npcBId, npcAId)

      // Require at least some positive affinity in at least one direction
      if (ab.affinity < 20 && ba.affinity < 20) continue

      // Attempt proposal
      const result = proposeNpcDate(nextState, npcAId, npcBId, rng)
      if (result !== nextState) {
        // Proposal was created - log it
        const proposer = contentCatalog.npcsById.get(npcAId)
        const target = contentCatalog.npcsById.get(npcBId)
        if (proposer && target) {
          nextState = appendActivityLogEntry(
            nextState,
            'system',
            `${proposer.name} and ${target.name} have made plans to spend time together tomorrow.`,
          )
        }
      }
    }
  }

  return nextState
}
