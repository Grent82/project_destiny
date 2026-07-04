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
  const entryA = state.npcRuntimeStates.find((r) => r.npcId === npcAId)
  const entryB = state.npcRuntimeStates.find((r) => r.npcId === npcBId)

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
 * Try a consensual intimacy encounter between two NPCs already at deep mutual trust.
 *
 * Deterministic once eligible (trust threshold met) — no success/failure roll, unlike
 * tryNpcNpcFlirtation. Distinct from applyHouseholdIntimacy.ts's passive co-presence domestic
 * bond (which never touches stress, and fires from room-sharing, not NPC agency) and from
 * engagePhysicalIntimacy.ts (player-only). This is the NPC-agency-driven equivalent: an NPC
 * actively seeking closeness with a trusted partner, relieving stress in the process.
 */
export function tryNpcNpcSeekIntimacy(
  state: GameState,
  npcAId: string,
  npcBId: string,
  rng: Rng,
): GameState {
  const npcA = contentCatalog.npcsById.get(npcAId)
  const npcB = contentCatalog.npcsById.get(npcBId)

  if (!npcA || !npcB) return state

  const entryA = state.npcRuntimeStates.find((r) => r.npcId === npcAId)
  const entryB = state.npcRuntimeStates.find((r) => r.npcId === npcBId)

  if (!entryA || !entryB || !isEligibleForRomance(entryA) || !isEligibleForRomance(entryB)) {
    return state
  }

  const rel = getAvgRelationship(state, npcAId, npcBId)

  // Require deep mutual trust — this is a much higher bar than flirtation or courtship.
  if (rel.trust < 70) return state
  if (rel.fear > 20) return state

  const abKey = buildRelationshipKey(npcAId, npcBId)
  const baKey = buildRelationshipKey(npcBId, npcAId)
  const newAb = getRelationship(state.relationships, npcAId, npcBId)
  const newBa = getRelationship(state.relationships, npcBId, npcAId)

  const affinityGain = 2 + Math.floor(rng() * 2) // 2-3

  const nextState: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [abKey]: { ...newAb, affinity: Math.min(100, newAb.affinity + affinityGain) },
      [baKey]: { ...newBa, affinity: Math.min(100, newBa.affinity + affinityGain) },
    },
    npcRuntimeStates: state.npcRuntimeStates.map((n) =>
      n.npcId === npcAId || n.npcId === npcBId
        ? { ...n, states: { ...n.states, stress: Math.max(0, n.states.stress - 8) } }
        : n,
    ),
  }

  return appendActivityLogEntry(
    nextState,
    'system',
    `${npcA.name} and ${npcB.name} share a quiet, intimate moment together.`,
  )
}

/**
 * Try a high-risk, high-reward aggressive flirtation — a dominance-driven advance rather than
 * a gentle one. On success, a larger affinity gain than tryNpcNpcFlirtation; on failure, the
 * target's own anger (a mood state, not a relationship axis) rises instead of a quiet no-op.
 * Deliberately separate from tryNpcNpcFlirtation — different risk profile, not a duplicate.
 */
export function tryNpcNpcFlirtAggressively(
  state: GameState,
  npcAId: string,
  npcBId: string,
  rng: Rng,
): GameState {
  const npcA = contentCatalog.npcsById.get(npcAId)
  const npcB = contentCatalog.npcsById.get(npcBId)

  if (!npcA || !npcB) return state

  const entryA = state.npcRuntimeStates.find((r) => r.npcId === npcAId)
  const entryB = state.npcRuntimeStates.find((r) => r.npcId === npcBId)

  if (!entryA || !entryB || !isEligibleForRomance(entryA) || !isEligibleForRomance(entryB)) {
    return state
  }

  const rel = getAvgRelationship(state, npcAId, npcBId)

  // An aggressive advance toward someone already afraid is out of the question.
  if (rel.fear > 15) return state

  // Success chance driven by the actor's dominance/presence/intrigue — a riskier formula than
  // tryNpcNpcFlirtation's gentler empathy-driven one.
  const successChance = 0.3 +
    (npcA.startingTraits.dominance - 50) / 150 +
    (npcA.baseAttributes.presence - 50) / 200 +
    (npcA.startingSkills.intrigue - 50) / 200

  if (rng() < successChance) {
    const abKey = buildRelationshipKey(npcAId, npcBId)
    const baKey = buildRelationshipKey(npcBId, npcAId)
    const newAb = getRelationship(state.relationships, npcAId, npcBId)
    const newBa = getRelationship(state.relationships, npcBId, npcAId)

    return {
      ...state,
      relationships: {
        ...state.relationships,
        [abKey]: { ...newAb, affinity: Math.min(100, newAb.affinity + 8) },
        [baKey]: { ...newBa, affinity: Math.min(100, newBa.affinity + 8) },
      },
    }
  }

  // Failed — the target's own anger rises, distinct from the quiet no-op of a gentle flirt.
  const nextState: GameState = {
    ...state,
    npcRuntimeStates: state.npcRuntimeStates.map((n) =>
      n.npcId === npcBId
        ? { ...n, states: { ...n.states, anger: Math.min(100, n.states.anger + 10) } }
        : n,
    ),
  }

  return appendActivityLogEntry(
    nextState,
    'system',
    `${npcA.name}'s forward advance on ${npcB.name} lands badly.`,
  )
}

/**
 * Check for jealousy/rivalry triggered by one acting NPC's intention.
 *
 * If this NPC has high affinity with a target, and some rival has equal or higher affinity with
 * that same target, the acting NPC might feel jealous of the rival. RNG-gated per rival (fixes
 * the earlier intention-handler version's missing RNG gate — see destiny-2xyp).
 *
 * Called from intentions.ts's jealousyCheckHandler, scoped to the one NPC whose intention this is
 * — not a full-roster sweep (that blanket approach was retired; see the redesign this replaces).
 */
export function checkJealousyForNpc(
  state: GameState,
  jealousNpcId: string,
  rng: Rng,
): GameState {
  const rosterNpcs = state.npcRuntimeStates
    .filter((entry) => isEligibleForRomance(entry) && entry.npcId !== jealousNpcId)
    .map((entry) => entry.npcId)

  if (rosterNpcs.length < 2) return state

  let nextState = state

  for (const targetNpcId of rosterNpcs) {
    // Check if jealousNpc has high affinity with target
    const jealousRel = getRelationship(state.relationships, jealousNpcId, targetNpcId)
    if (jealousRel.affinity < 50) continue

    // Look for rivals (other NPCs with high affinity to target)
    for (const rivalNpcId of rosterNpcs) {
      if (rivalNpcId === targetNpcId) continue

      const rivalRel = getRelationship(state.relationships, rivalNpcId, targetNpcId)
      if (rivalRel.affinity < jealousRel.affinity) continue

      // Rival has higher or equal affinity - jealousy trigger, RNG-gated
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

  return nextState
}
