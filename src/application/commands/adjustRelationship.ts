import { buildRelationshipKey, type RelationshipAxes } from '../../domain/relationships/contracts'
import type { GameState } from '../../domain'

type Axis = keyof RelationshipAxes

const EMPTY_AXES: RelationshipAxes = { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }

export function applyRelationshipDelta(
  state: GameState,
  fromId: string,
  toId: string,
  axis: Axis,
  delta: number,
): { key: string; oldValue: number; newValue: number; significant: boolean } {
  const key = buildRelationshipKey(fromId, toId)
  const existing = state.relationships[key] ?? EMPTY_AXES
  const oldValue = existing[axis]
  const newValue = Math.max(-100, Math.min(100, oldValue + delta))
  state.relationships[key] = { ...existing, [axis]: newValue }

  // Significant = crosses a threshold (every 25 points)
  const crossedThreshold =
    Math.floor(Math.abs(oldValue) / 25) !== Math.floor(Math.abs(newValue) / 25)
  return { key, oldValue, newValue, significant: crossedThreshold }
}

export function applyPassiveDrift(state: GameState): void {
  Object.keys(state.relationships).forEach((key) => {
    const rel = state.relationships[key]!
    state.relationships[key] = {
      ...rel,
      affinity: rel.affinity > 0 ? Math.max(0, rel.affinity - 1) : rel.affinity,
      trust: rel.trust > 0 ? Math.max(0, rel.trust - 1) : rel.trust,
    }
  })
}

export function applyProximityGains(state: GameState, npcIds: string[]): void {
  for (let i = 0; i < npcIds.length; i++) {
    for (let j = i + 1; j < npcIds.length; j++) {
      applyRelationshipDelta(state, npcIds[i]!, npcIds[j]!, 'affinity', 1)
    }
    applyRelationshipDelta(state, 'player', npcIds[i]!, 'respect', 1)
  }
}
