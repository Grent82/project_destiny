import type { GameState } from '../../domain/game/contracts'
import type { Rng } from './seededRng'
import { contentCatalog } from '../content/contentCatalog'
import { getSymmetricRelationship } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'
import type { NpcDefinition } from '../../domain/npc/contracts'
import type { DateDefinition } from '../../domain/dates/contracts'

type DateTemplate = DateDefinition

const INTIMACY_ORDER = ['none', 'affinity', 'attachment', 'committed'] as const

type IntimacyStage = typeof INTIMACY_ORDER[number]

function intimacyIndex(stage: IntimacyStage): number {
  return INTIMACY_ORDER.indexOf(stage)
}

/**
 * Check if a date template is eligible for the current intimacy stage.
 */
function isDateTemplateEligible(template: DateTemplate, intimacyStage: IntimacyStage): boolean {
  const templateIdx = intimacyIndex(template.requiredIntimacyStage as IntimacyStage)
  const currentIdx = intimacyIndex(intimacyStage)
  return currentIdx >= templateIdx
}

/**
 * Check if a Roster NPC is eligible to propose a date.
 * Idle NPCs (not deployed, not captive, not ward) are eligible.
 */
function isRosterNpcDateEligible(npc: { assignment: string; captivityState?: { status: string } | undefined; status: string }): boolean {
  if (npc.assignment === 'deployed') return false
  if (npc.captivityState?.status === 'captive') return false
  if (npc.captivityState?.status === 'missing') return false
  if (npc.status === 'ward') return false
  return true
}

/**
 * World NPCs are always eligible for dating.
 * No assignment/captivity/ward concepts for World NPCs.
 */
function isWorldNpcDateEligible(): boolean {
  // World NPCs are always eligible for dating
  return true
}

/**
 * Calculate date compatibility score between two NPCs.
 * Considers trait preferences from the date template.
 * Returns 0 for World NPC pairs (no traits available).
 */
function calculateDateCompatibility(
  proposer: NpcDefinition | null,
  target: NpcDefinition | null,
  template: DateTemplate,
): number {
  // If either NPC is a World NPC (no definition), skip compatibility check
  if (!proposer || !target) return 0

  let score = 0

  // Check trait preferences
  for (const [traitName, multiplier] of Object.entries(template.traitPreferences || {})) {
    const proposerTrait = proposer.startingTraits[traitName as keyof typeof proposer.startingTraits] ?? 50
    const targetTrait = target.startingTraits[traitName as keyof typeof target.startingTraits] ?? 50
    const avgTrait = (proposerTrait + targetTrait) / 2
    score += (avgTrait / 100) * ((multiplier as number) - 1) * 10
  }

  // Bonus for similar dominance levels (reduces conflict)
  const dominanceDiff = Math.abs(proposer.startingTraits.dominance - target.startingTraits.dominance)
  score -= dominanceDiff / 10

  return score
}

/**
 * Pick a random date template based on intimacy stage and RNG.
 */
function pickDateTemplate(seed: number, intimacyStage: IntimacyStage): DateTemplate {
  const eligible = contentCatalog.dates.filter((d) => isDateTemplateEligible(d, intimacyStage))
  if (eligible.length === 0) return contentCatalog.dates[0]!

  const index = Math.floor(seededRandom(seed) * eligible.length)
  return eligible[index]!
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function advanceSeed(seed: number): number {
  return (seed * 1103515245 + 12345) & 0x7fffffff
}


/**
 * Generate NPC-NPC date proposals during endDay processing.
 * Each eligible NPC pair has a 1-2% chance to propose a date based on:
 * - Shared intimacy stage (must be at least 'affinity')
 * - Compatibility score (for roster-roster pairs)
 * - RNG roll
 *
 * Supports three pairing types:
 * 1. Roster ↔ Roster
 * 2. World ↔ World
 * 3. Roster ↔ World (cross-type)
 *
 * Returns GameState with new pendingDateProposals added.
 */
export function generateNpcDateProposals(state: GameState, rng: Rng): GameState {
  let nextState = state

  // Collect all eligible NPCs (Roster + World)
  const rosterEligible = state.npcRuntimeStates
    .filter(isRosterNpcDateEligible)
    .map((npc) => ({ npcId: npc.npcId, name: npc.name, isWorldNpc: false }))

  const worldEligible = state.worldNpcStates
    .filter(() => isWorldNpcDateEligible())
    .map((npc) => {
      const def = contentCatalog.npcsById.get(npc.npcId)
      return { npcId: npc.npcId, name: def?.name ?? 'An NPC', isWorldNpc: true }
    })

  // Combine into single pool for cross-type pairing
  const allEligible = [...rosterEligible, ...worldEligible]

  if (allEligible.length < 2) return state

  // Track which NPCs have already proposed today (one proposal per NPC per day)
  const proposedBy = new Set<string>()

  for (let i = 0; i < allEligible.length; i++) {
    for (let j = i + 1; j < allEligible.length; j++) {
      const npcA = allEligible[i]!
      const npcB = allEligible[j]!

      // Skip if either already proposed today
      if (proposedBy.has(npcA.npcId) || proposedBy.has(npcB.npcId)) continue

      // Check relationship intimacy
      const { ab, ba } = getSymmetricRelationship(state.relationships, npcA.npcId, npcB.npcId)
      const abIdx = intimacyIndex(ab.intimacyStage ?? 'none')
      const baIdx = intimacyIndex(ba.intimacyStage ?? 'none')
      const sharedStage = INTIMACY_ORDER[Math.min(abIdx, baIdx)]!

      // Must be at least affinity stage to date
      if (sharedStage === 'none') continue

      // Check cooldown - NPCs can't propose dates too frequently
      const cooldownKey = `npc-date-proposal-${npcA.npcId}-${npcB.npcId}`
      const lastProposal = state.lastFiredDay[cooldownKey]
      if (lastProposal !== undefined && state.day - lastProposal < 7) {
        // Cooldown period of 7 days between proposals for this pair
        continue
      }

      // RNG roll for date proposal (1-2% chance)
      const roll = rng()
      const proposalThreshold = 0.015 // 1.5% base chance

      if (roll > proposalThreshold) continue

      // Get NPC definitions for compatibility check (only for roster-roster pairs)
      const defA = contentCatalog.npcsById.get(npcA.npcId)
      const defB = contentCatalog.npcsById.get(npcB.npcId)

      // Pick a date template based on intimacy stage
      const seed = advanceSeed(state.rngSeed)
      const template = pickDateTemplate(seed, sharedStage)

      // Compatibility check - skip if too incompatible (only for roster-roster)
      if (defA && defB) {
        const compatScore = calculateDateCompatibility(defA, defB, template)
        if (compatScore < -15) continue
      }

      // Determine proposed time slot based on template preference
      const proposedTimeSlot = template.preferredTimeSlot as 'morning' | 'afternoon' | 'evening' | 'night'

      // Create proposal ID
      const proposalId = `date-proposal-${npcA.npcId}-${npcB.npcId}-${state.day}`

      // Get names for activity log (use definition names if available, otherwise fallback)
      const nameA = defA?.name ?? npcA.name
      const nameB = defB?.name ?? npcB.name

      // Add to pending proposals
      const newProposal = {
        proposalId,
        proposerNpcId: npcA.npcId,
        targetNpcId: npcB.npcId,
        dateTemplateId: template.id,
        proposedDay: state.day + 1, // Propose for tomorrow
        proposedTimeSlot: proposedTimeSlot,
        proposedLocation: null, // Will be decided during acceptance (defaults to house)
        status: 'accepted' as const, // NPC-NPC proposals are always auto-accepted
        rejectionReason: null,
        proposedAtDay: state.day,
      }

      nextState = {
        ...nextState,
        pendingDateProposals: [...nextState.pendingDateProposals, newProposal],
        lastFiredDay: {
          ...nextState.lastFiredDay,
          [cooldownKey]: state.day,
        },
      }

      // Mark as proposed
      proposedBy.add(npcA.npcId)
      proposedBy.add(npcB.npcId)

      // Add subtle activity log entry (player notices something happening)
      nextState = appendActivityLogEntry(
        nextState,
        'system',
        `${nameA} and ${nameB} seem to be making plans together.`,
      )
    }
  }

  return nextState
}
