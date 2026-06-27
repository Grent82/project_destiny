import type { GameState } from '../../domain/game/contracts'
import type { Rng } from './seededRng'
import { contentCatalog } from '../content/contentCatalog'
import { getSymmetricRelationship, intimacyStageSchema } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'
import type { NpcDefinition } from '../../domain/npc/contracts'

/**
 * Date template reference (mirrors dates.json structure).
 * Used for eligibility checks without importing the full date definitions.
 */
interface DateTemplate {
  id: string
  requiredIntimacyStage: string
  cost: number
  preferredTimeSlot: string
}

const DATES: DateTemplate[] = [
  { id: 'date-quiet-walk', requiredIntimacyStage: 'affinity', cost: 0, preferredTimeSlot: 'evening' },
  { id: 'date-shared-meal', requiredIntimacyStage: 'affinity', cost: 15, preferredTimeSlot: 'evening' },
  { id: 'date-music-night', requiredIntimacyStage: 'attachment', cost: 5, preferredTimeSlot: 'night' },
  { id: 'date-workshop-project', requiredIntimacyStage: 'affinity', cost: 10, preferredTimeSlot: 'afternoon' },
  { id: 'date-private-ritual', requiredIntimacyStage: 'committed', cost: 0, preferredTimeSlot: 'night' },
  { id: 'date-district-exploration', requiredIntimacyStage: 'attachment', cost: 8, preferredTimeSlot: 'afternoon' },
  { id: 'date-quiet-morning', requiredIntimacyStage: 'attachment', cost: 3, preferredTimeSlot: 'morning' },
]

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
 * Check if an NPC is eligible to propose a date.
 * Idle NPCs (not deployed, not captive, not ward) are eligible.
 */
function isDateEligible(npc: { assignment: string; captivityState?: { status: string } | undefined; status: string }): boolean {
  if (npc.assignment === 'deployed') return false
  if (npc.captivityState?.status === 'captive') return false
  if (npc.captivityState?.status === 'missing') return false
  if (npc.status === 'ward') return false
  return true
}

/**
 * Calculate date compatibility score between two NPCs.
 * Considers trait preferences from the date template.
 */
function calculateDateCompatibility(
  proposer: NpcDefinition,
  target: NpcDefinition,
  template: DateTemplate,
): number {
  let score = 0

  // Check trait preferences
  for (const [traitName, multiplier] of Object.entries(template.traitPreferences ?? {})) {
    const proposerTrait = proposer.startingTraits[traitName as keyof typeof proposer.startingTraits] ?? 50
    const targetTrait = target.startingTraits[traitName as keyof typeof target.startingTraits] ?? 50
    const avgTrait = (proposerTrait + targetTrait) / 2
    score += (avgTrait / 100) * (multiplier - 1) * 10
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
  const eligible = DATES.filter((d) => isDateTemplateEligible(d, intimacyStage))
  if (eligible.length === 0) return DATES[0]!

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
 * Each idle NPC pair has a 1-2% chance to propose a date based on:
 * - Shared intimacy stage (must be at least 'affinity')
 * - Compatibility score
 * - RNG roll
 *
 * Returns GameState with new pendingDateProposals added.
 */
export function generateNpcDateProposals(state: GameState, rng: Rng): GameState {
  let nextState = state

  // Get all eligible NPCs on roster
  const eligible = state.roster.filter(isDateEligible)

  if (eligible.length < 2) return state

  // Track which NPCs have already proposed today (one proposal per NPC per day)
  const proposedBy = new Set<string>()

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const npcA = eligible[i]!
      const npcB = eligible[j]!

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

      // Get NPC definitions for compatibility check
      const defA = contentCatalog.npcsById.get(npcA.npcId)
      const defB = contentCatalog.npcsById.get(npcB.npcId)

      if (!defA || !defB) continue

      // Pick a date template based on intimacy stage
      const seed = advanceSeed(state.rngSeed)
      const template = pickDateTemplate(seed, sharedStage)

      // Compatibility check - skip if too incompatible
      const compatScore = calculateDateCompatibility(defA, defB, template)
      if (compatScore < -15) continue

      // Determine proposed time slot based on template preference
      const proposedTimeSlot = template.preferredTimeSlot as 'morning' | 'afternoon' | 'evening' | 'night'

      // Create proposal ID
      const proposalId = `date-proposal-${npcA.npcId}-${npcB.npcId}-${state.day}`

      // Add to pending proposals
      const newProposal = {
        proposalId,
        proposerNpcId: npcA.npcId,
        targetNpcId: npcB.npcId,
        dateTemplateId: template.id,
        proposedDay: state.day + 1, // Propose for tomorrow
        proposedTimeSlot: proposedTimeSlot,
        proposedLocation: null, // Will be decided during acceptance (defaults to house)
        status: 'pending' as const,
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
        `${defA.name} and ${defB.name} seem to be making plans together.`,
      )
    }
  }

  return nextState
}
