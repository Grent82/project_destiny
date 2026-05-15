import { buildRelationshipKey, type RelationshipAxes } from '../../domain/relationships/contracts'
import type { GameState } from '../../domain'
import { MAX_NPC_MEMORY_ENTRIES } from '../../domain/npc/contracts'
import { calculateBaseCompatibility } from '../../domain/npc/compatibility'

type Axis = keyof RelationshipAxes

const EMPTY_AXES: RelationshipAxes = { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }

/**
 * Write a memory entry to an NPC's npcMemory array (capped at MAX_NPC_MEMORY_ENTRIES).
 * Silently no-ops if the NPC is not in the roster.
 */
export function writeNpcMemory(
  state: GameState,
  npcId: string,
  event: string,
  participants?: string[],
  axisDelta?: Record<string, number>,
): void {
  const npcIndex = state.roster.findIndex((n) => n.npcId === npcId)
  if (npcIndex === -1) return

  const entry = { day: state.day, event, ...(participants ? { participants } : {}), ...(axisDelta ? { axisDelta } : {}) }
  const existing = state.roster[npcIndex]!.npcMemory ?? []
  const updated = [...existing, entry].slice(-MAX_NPC_MEMORY_ENTRIES)
  state.roster[npcIndex] = { ...state.roster[npcIndex]!, npcMemory: updated }
}

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

  // Write memory when delta is meaningful
  if (Math.abs(delta) > 5) {
    const description = `${axis} ${delta > 0 ? '+' : ''}${delta} with ${toId}`
    writeNpcMemory(state, fromId, description, [toId], { [axis]: delta })
    if (toId !== 'player' && toId !== fromId) {
      writeNpcMemory(state, toId, `${axis} ${delta > 0 ? '+' : ''}${delta} with ${fromId}`, [fromId], { [axis]: delta })
    }
  }

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

const BASE_AFFINITY_GAIN = 2
const BASE_RESPECT_GAIN = 2

export function applyProximityGains(state: GameState, npcIds: string[]): void {
  const npcTraitsMap = new Map(
    state.roster
      .filter((n) => npcIds.includes(n.npcId))
      .map((n) => [n.npcId, n.traits]),
  )

  for (let i = 0; i < npcIds.length; i++) {
    for (let j = i + 1; j < npcIds.length; j++) {
      const idA = npcIds[i]!
      const idB = npcIds[j]!
      const traitsA = npcTraitsMap.get(idA)
      const traitsB = npcTraitsMap.get(idB)

      let compatScore = 0
      let curiosityBonus = 0

      if (traitsA && traitsB) {
        compatScore = calculateBaseCompatibility(traitsA, traitsB)
        const bothCurious = traitsA.curiosity > 55 && traitsB.curiosity > 55
        const eitherCurious = traitsA.curiosity > 55 || traitsB.curiosity > 55
        curiosityBonus = bothCurious ? 2 : eitherCurious ? 1 : 0
      }

      const gainMultiplier = 1.0 + compatScore / 50
      const gain = Math.max(BASE_AFFINITY_GAIN, Math.round(BASE_AFFINITY_GAIN * gainMultiplier)) + curiosityBonus

      applyRelationshipDelta(state, idA, idB, 'affinity', gain)
      applyRelationshipDelta(state, idB, idA, 'affinity', gain)
    }

    applyRelationshipDelta(state, 'player', npcIds[i]!, 'respect', BASE_RESPECT_GAIN)
  }
}
