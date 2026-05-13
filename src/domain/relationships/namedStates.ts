/**
 * Named relationship states derived from relationship axes.
 *
 * These are COMPUTED at display/query time — never stored in GameState.
 * Priority order matters: more specific states take precedence over generic ones.
 */

import type { RelationshipAxes } from './contracts'

export type RelationshipState =
  | 'bonded'      // deep trust + high affinity
  | 'trusted'     // high trust, moderate affinity
  | 'dependent'   // high fear + low trust (fear-based compliance)
  | 'rival'       // low affinity + negative respect (competitive antagonism)
  | 'hostile'     // very low affinity + high fear or very low trust
  | 'tense'       // moderate negative indicators
  | 'estranged'   // low everything (disconnected, indifferent)
  | 'neutral'     // default / no strong signal

/**
 * Derive a human-readable relationship state from directed axes.
 *
 * Priority order: bonded > trusted > dependent > rival > hostile > tense > estranged > neutral
 */
export function deriveRelationshipState(axes: RelationshipAxes): RelationshipState {
  const { affinity, trust, fear, loyalty, respect } = axes

  // bonded: deep mutual investment (high trust + high affinity + high loyalty)
  if (trust >= 70 && affinity >= 50 && loyalty >= 50) {
    return 'bonded'
  }

  // trusted: reliable relationship without necessarily being close
  if (trust >= 60) {
    return 'trusted'
  }

  // dependent: coercion bond — high fear, low trust (fear-driven compliance)
  if (fear >= 60 && trust < 25) {
    return 'dependent'
  }

  // rival: actively adversarial — low affinity, low or negative respect, nonzero fear
  if (affinity <= -30 && respect < 0 && trust < 30) {
    return 'rival'
  }

  // hostile: strongly negative without the competitive rivalry pattern
  if (affinity <= -50 || (trust < 10 && fear >= 40)) {
    return 'hostile'
  }

  // estranged: low engagement across the board (nothing strong in any direction)
  // Check this BEFORE tense to avoid false-positive tense labels on zero-signal edges
  if (Math.abs(affinity) < 15 && trust < 25 && fear < 20 && loyalty < 15) {
    return 'estranged'
  }

  // tense: moderate negative signals
  if (affinity <= -15 || fear >= 40 || (trust < 30 && loyalty < 20)) {
    return 'tense'
  }

  return 'neutral'
}

/**
 * Human-readable label for a RelationshipState.
 * Used for display in RosterScreen and NpcDetailPanel.
 */
export const RELATIONSHIP_STATE_LABELS: Record<RelationshipState, string> = {
  bonded: 'Bonded',
  trusted: 'Trusted',
  dependent: 'Dependent',
  rival: 'Rival',
  hostile: 'Hostile',
  tense: 'Tense',
  estranged: 'Estranged',
  neutral: 'Neutral',
}

/**
 * Badge colour hint for UI rendering (semantic, not hex).
 */
export const RELATIONSHIP_STATE_BADGE: Record<RelationshipState, 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'grey'> = {
  bonded: 'green',
  trusted: 'blue',
  dependent: 'orange',
  rival: 'orange',
  hostile: 'red',
  tense: 'yellow',
  estranged: 'grey',
  neutral: 'grey',
}
