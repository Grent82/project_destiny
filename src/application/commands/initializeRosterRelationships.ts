import type { GameState } from '../../domain'
import type { Rng } from './seededRng'
import { contentCatalog } from '../content/contentCatalog'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import {
  calculateBaseCompatibility,
  getFactionFamiliarityBonus,
  getOriginProximityBonus,
} from '../../domain/npc/compatibility'

/**
 * Initialize relationship edges for all roster pairs.
 *
 * Priority order:
 *  1. Authored Tier 1 bonds (npc-starting-relationships.json) — used as-is, override nothing
 *  2. Compatibility score + Tier 2 faction familiarity + Tier 3 origin proximity + history variance
 *
 * Should be called once at game init (covering the starting roster who've worked together for months)
 * and on each recruit (pairs with new NPC vs existing roster members only).
 *
 * Pairs that already have a relationship entry in state are skipped.
 */
export function initializeRosterRelationships(state: GameState, rng: Rng = Math.random): GameState {
  const { npcRuntimeStates: roster } = state
  if (roster.length < 2) return state

  const relationships = { ...state.relationships }
  let changed = false

  // Seed Tier 1 authored bonds first (both directions, for all roster pairs)
  for (const npcA of roster) {
    const tier1Bonds = contentCatalog.npcStartingRelationshipsByNpcId.get(npcA.npcId)
    if (!tier1Bonds) continue
    for (const bond of tier1Bonds) {
      const targetOnRoster = roster.some((n) => n.npcId === bond.toNpcId)
      if (!targetOnRoster) continue
      const key = buildRelationshipKey(bond.fromNpcId, bond.toNpcId)
      if (relationships[key] !== undefined) continue
      relationships[key] = bond.axes
      changed = true
    }
  }

  // Fill remaining pairs with compatibility-derived starting affinity
  for (let i = 0; i < roster.length; i++) {
    for (let j = 0; j < roster.length; j++) {
      if (i === j) continue
      const npcA = roster[i]!
      const npcB = roster[j]!
      const key = buildRelationshipKey(npcA.npcId, npcB.npcId)
      if (relationships[key] !== undefined) continue

      const defA = contentCatalog.npcsById.get(npcA.npcId)
      const defB = contentCatalog.npcsById.get(npcB.npcId)
      if (!defA || !defB) continue

      const base = calculateBaseCompatibility(npcA.traits, npcB.traits)
      const factionBonus = getFactionFamiliarityBonus(defA, defB)
      const originBonus = getOriginProximityBonus(defA, defB)

      // History variance rng(-5, +8): biased positive — people mostly figure out coexistence
      const variance = Math.round(rng() * 13 - 5)

      const affinity = Math.max(0, Math.min(70, Math.round(base + factionBonus + originBonus + variance)))
      const trust = Math.floor(affinity * 0.5)

      relationships[key] = { affinity, trust, respect: 0, fear: 0, loyalty: 0 }
      changed = true
    }
  }

  return changed ? { ...state, relationships } : state
}
