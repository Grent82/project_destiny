import type { GameState } from '../../domain/game/contracts'
import type { Rng } from './seededRng'
import { getRelationship, buildRelationshipKey } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'

/**
 * NPC-NPC Romance and Flirtation System
 *
 * This module handles autonomous romantic interactions between NPCs:
 * - Flirtation attempts based on traits and relationship state
 * - Romantic courtship progression
 * - Intimacy stage advancement through autonomous actions
 * - Jealousy and rivalry detection
 */

const STAGES: ('none' | 'affinity' | 'attachment' | 'committed')[] = ['none', 'affinity', 'attachment', 'committed']

function getIntimacyIndex(stage: string): number {
  return STAGES.indexOf(stage as typeof STAGES[number])
}

/**
 * Check if an NPC is eligible for romantic interaction.
 */
function isEligibleForRomance(npc: { assignment?: string; status?: string; captivityState?: { status?: string } }): boolean {
  if (npc.assignment !== 'idle' && npc.assignment !== 'working') return false
  if (npc.captivityState?.status === 'captive') return false
  if (npc.captivityState?.status === 'missing') return false
  if (npc.status === 'ward') return false
  return true
}

/**
 * Get the bidirectional relationship between two NPCs.
 */
function getNpcNpcRelationship(state: GameState, npcAId: string, npcBId: string) {
  const ab = getRelationship(state.relationships, npcAId, npcBId)
  const ba = getRelationship(state.relationships, npcBId, npcAId)
  return { ab, ba }
}

/**
 * Get the average relationship axes between two NPCs.
 */
function getAvgRelationship(state: GameState, npcAId: string, npcBId: string) {
  const { ab, ba } = getNpcNpcRelationship(state, npcAId, npcBId)
  return {
    affinity: (ab.affinity + ba.affinity) / 2,
    trust: ((ab.trust ?? 0) + (ba.trust ?? 0)) / 2,
    respect: ((ab.respect ?? 0) + (ba.respect ?? 0)) / 2,
    fear: ((ab.fear ?? 0) + (ba.fear ?? 0)) / 2,
    loyalty: ((ab.loyalty ?? 0) + (ba.loyalty ?? 0)) / 2,
    intimacyStage: STAGES[Math.min(getIntimacyIndex(ab.intimacyStage ?? 'none'), getIntimacyIndex(ba.intimacyStage ?? 'none'))],
  }
}

/**
 * Try a flirtation attempt between two NPCs.
 *
 * Flirtation increases affinity slightly and has a small chance to
 * trigger a romantic intention if conditions are right.
 */
export function tryNpcNpcFlirtation(
  state: GameState,
  npcAId: string,
  npcBId: string,
  rng: Rng,
): GameState {
  const npcA = contentCatalog.npcsById.get(npcAId)
  const npcB = contentCatalog.npcsById.get(npcBId)

  if (!npcA || !npcB) return state

  // Check eligibility
  const entryA = state.roster.find((r) => r.npcId === npcAId)
  const entryB = state.roster.find((r) => r.npcId === npcBId)

  if (!entryA || !entryB || !isEligibleForRomance(entryA) || !isEligibleForRomance(entryB)) {
    return state
  }

  const rel = getAvgRelationship(state, npcAId, npcBId)

  // Require minimum affinity for flirtation
  if (rel.affinity < 25) return state

  // Check fear block
  if (rel.fear > 25) return state

  // Calculate flirtation success based on traits
  const successChance = 0.4 +
    (npcA.startingTraits.empathy - 50) / 200 +
    (npcA.baseAttributes.presence - 50) / 200 +
    (rel.trust / 200)

  if (rng() >= successChance) {
    // Flirtation failed - no effect
    return state
  }

  // Flirtation succeeded - small affinity gain
  const affinityGain = 1 + Math.floor(rng() * 2) // 1-2

  const abKey = buildRelationshipKey(npcAId, npcBId)
  const baKey = buildRelationshipKey(npcBId, npcAId)

  const newAb = getRelationship(state.relationships, npcAId, npcBId)
  const newBa = getRelationship(state.relationships, npcBId, npcAId)

  return {
    ...state,
    relationships: {
      ...state.relationships,
      [abKey]: {
        ...newAb,
        affinity: Math.min(100, newAb.affinity + affinityGain),
      },
      [baKey]: {
        ...newBa,
        affinity: Math.min(100, newBa.affinity + Math.max(0, affinityGain - 1)),
      },
    },
  }
}

/**
 * Check for jealousy/rivalry between NPCs.
 *
 * If NPC A has high affinity with NPC B, and NPC B has high affinity with NPC C,
 * NPC A might feel jealous of NPC C.
 */
export function checkNpcNpcJealousy(
  state: GameState,
  rng: Rng,
): GameState {
  const rosterNpcs = state.roster
    .filter((entry) => isEligibleForRomance(entry))
    .map((entry) => entry.npcId)

  if (rosterNpcs.length < 3) return state

  let nextState = state

  // Check all triplets for jealousy potential
  for (let i = 0; i < rosterNpcs.length; i++) {
    for (let j = 0; j < rosterNpcs.length; j++) {
      if (i === j) continue

      const jealousNpcId = rosterNpcs[i]!
      const targetNpcId = rosterNpcs[j]!

      // Check if jealousNpc has high affinity with target
      const jealousRel = getRelationship(state.relationships, jealousNpcId, targetNpcId)
      if (jealousRel.affinity < 50) continue

      // Look for rivals (other NPCs with high affinity to target)
      for (let k = 0; k < rosterNpcs.length; k++) {
        if (k === i || k === j) continue

        const rivalNpcId = rosterNpcs[k]!

        const rivalRel = getRelationship(state.relationships, rivalNpcId, targetNpcId)
        if (rivalRel.affinity < jealousRel.affinity) continue

        // Rival has higher or equal affinity - jealousy trigger
        const jealousyChance = 0.15 + (jealousRel.affinity - 50) / 200

        if (rng() < jealousyChance) {
          // Jealousy triggered - increase fear or decrease affinity
          const jealousKey = buildRelationshipKey(jealousNpcId, rivalNpcId)
          const currentJealous = getRelationship(state.relationships, jealousNpcId, rivalNpcId)

          nextState = {
            ...nextState,
            relationships: {
              ...nextState.relationships,
              [jealousKey]: {
                ...currentJealous,
                fear: Math.min(100, (currentJealous.fear ?? 0) + 3),
                affinity: Math.max(-100, currentJealous.affinity - 2),
              },
            },
          }

          const jealousNpc = contentCatalog.npcsById.get(jealousNpcId)
          const rivalNpc = contentCatalog.npcsById.get(rivalNpcId)

          if (jealousNpc && rivalNpc) {
            nextState = appendActivityLogEntry(
              nextState,
              'system',
              `${jealousNpc.name} feels a pang of jealousy toward ${rivalNpc.name}.`,
            )
          }
        }
      }
    }
  }

  return nextState
}

/**
 * Run all NPC-NPC romance simulations for the day.
 *
 * This includes:
 * - Flirtation attempts between eligible pairs
 * - Courtship attempts for pairs with existing intimacy
 * - Jealousy checks for complex relationship triangles
 */
export function simulateNpcNpcRomance(
  state: GameState,
  rng: Rng,
): GameState {
  const rosterNpcs = state.roster
    .filter((entry) => isEligibleForRomance(entry))
    .map((entry) => entry.npcId)

  if (rosterNpcs.length < 2) return state

  let nextState = state

  // Track which pairs we've processed to avoid duplicates
  const processedPairs = new Set<string>()

  for (let i = 0; i < rosterNpcs.length; i++) {
    for (let j = i + 1; j < rosterNpcs.length; j++) {
      const npcAId = rosterNpcs[i]!
      const npcBId = rosterNpcs[j]!
      const pairKey = [npcAId, npcBId].sort().join('-')

      if (processedPairs.has(pairKey)) continue
      processedPairs.add(pairKey)

      const rel = getAvgRelationship(state, npcAId, npcBId)

      // Skip pairs with very low affinity
      if (rel.affinity < 20) continue

      // Skip pairs with high fear
      if (rel.fear > 30) continue

      // Try flirtation (higher chance, lower impact)
      const flirtChance = 0.08 + (rel.affinity / 500)
      if (rng() < flirtChance) {
        nextState = tryNpcNpcFlirtation(nextState, npcAId, npcBId, rng)
      }
    }
  }

  // Run jealousy checks separately (involves triplets)
  nextState = checkNpcNpcJealousy(nextState, rng)

  return nextState
}
