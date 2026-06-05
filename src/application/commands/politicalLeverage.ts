import type { GameState } from '../../domain'
import { getRelationship } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'

export interface LeverageSource {
  npcId: string
  reason: 'intimacy' | 'fear-bond' | 'romantic' | 'lore-bond'
  strength: number
}

export interface RelationshipPoliticalCapital {
  /** Normalized 0–100 aggregate leverage score against the faction. */
  score: number
  /** Per-NPC provenance list so consuming code can explain why leverage exists. */
  sources: LeverageSource[]
}

/**
 * Returns how much political leverage the player holds against a faction
 * via intimate relationships and power-imbalanced bond holdings with NPCs
 * affiliated to that faction.
 *
 * Pure function — no side effects, no state mutations.
 */
export function getRelationshipPoliticalCapital(
  state: GameState,
  factionId: string,
): RelationshipPoliticalCapital {
  const sources: LeverageSource[] = []

  for (const npc of state.roster) {
    const npcDef = contentCatalog.npcsById.get(npc.npcId)
    if (!npcDef || npcDef.factionAffinityId !== factionId) continue

    const playerToNpc = getRelationship(state.relationships, 'player', npc.npcId)
    const npcToPlayer = getRelationship(state.relationships, npc.npcId, 'player')

    // High intimacy edges
    if (playerToNpc.intimacyStage === 'committed') {
      sources.push({ npcId: npc.npcId, reason: 'intimacy', strength: 80 })
    } else if (playerToNpc.intimacyStage === 'attachment') {
      sources.push({ npcId: npc.npcId, reason: 'intimacy', strength: 50 })
    }

    // Fear + player-held bond — coercive dynamic
    const playerHoldsBond =
      npc.bondStatus?.holderId === 'player' && npc.bondStatus?.ownerType === 'player'
    if (npcToPlayer.fear > 50 && playerHoldsBond) {
      sources.push({
        npcId: npc.npcId,
        reason: 'fear-bond',
        strength: Math.round(npcToPlayer.fear * 0.6),
      })
    }

    // Romantic bond type on the player→npc edge
    if (playerToNpc.bondType === 'romantic') {
      sources.push({ npcId: npc.npcId, reason: 'romantic', strength: 60 })
    }

    // Hard / legacy intent lore bonds
    if (playerToNpc.hardBond || playerToNpc.legacyIntentActive) {
      sources.push({ npcId: npc.npcId, reason: 'lore-bond', strength: 40 })
    }
  }

  // Score = sum of all source strengths, capped at 100
  const rawScore = sources.reduce((sum, s) => sum + s.strength, 0)
  const score = Math.min(100, rawScore)

  return { score, sources }
}

export interface BondHolderLeverage {
  /** Whether the player can credibly exert leverage over this person. */
  canExert: boolean
  /** Exposure risk if leverage is pressed (0–100); higher = more backlash. */
  risk: number
  /** Short flavor string suitable for log or tooltip. */
  flavor: string
}

const COERCIVE_ENTRY_REASONS = new Set(['compact-assessment', 'combat-capture', 'debt-settlement'])

/**
 * Returns whether the current power dynamic (fear delta + dominance difference
 * + entry reason) makes a specific bonded NPC available as leverage.
 *
 * Pure function — no side effects, no state mutations.
 */
export function getBondHolderLeverage(state: GameState, npcId: string): BondHolderLeverage {
  const npc = state.roster.find((n) => n.npcId === npcId)

  if (!npc?.bondStatus || npc.bondStatus.holderId !== 'player' || npc.bondStatus.ownerType !== 'player') {
    return { canExert: false, risk: 0, flavor: 'No active bond over this person.' }
  }

  const npcToPlayer = getRelationship(state.relationships, npc.npcId, 'player')
  const playerToNpc = getRelationship(state.relationships, 'player', npc.npcId)

  const fearDelta = npcToPlayer.fear - playerToNpc.fear
  const playerDominance = state.playerCharacter.traits.dominance ?? 40
  const npcDominance = npc.traits.dominance ?? 40
  const dominanceDiff = playerDominance - npcDominance
  const coerciveBonus = COERCIVE_ENTRY_REASONS.has(npc.bondStatus.entryReason) ? 20 : 0

  const leverageScore = fearDelta + dominanceDiff * 0.5 + coerciveBonus
  const canExert = leverageScore > 30

  // Risk rises as the NPC's fear decreases and affinity stays low
  const risk = Math.min(
    100,
    Math.max(0, Math.round(100 - npcToPlayer.fear - playerToNpc.affinity * 0.3)),
  )

  const flavor = canExert
    ? `${npc.name}'s fear and the bond contract make them vulnerable to pressure.`
    : `${npc.name}'s compliance is too uncertain to risk a direct exertion of leverage.`

  return { canExert, risk, flavor }
}
