import type { GameState } from '../../domain'
import type { NpcRuntimeState } from '../../domain/npc/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { getDistrictDistance } from '../../domain/districts/adjacency'

/**
 * Ergebnis der Distanz-Berechnung für einen NPC.
 */
export interface NpcDistanceResult {
  npcId: string
  npcName: string
  currentDistrictId: string | null
  distanceToPlayer: number // 0 = same district, 1 = adjacent, etc.
  isPlayerRelevant: boolean // distance < 3
  priorityTier: 'immediate' | 'high' | 'medium' | 'low' | 'background'
}

/**
 * Berechnet die Entfernung aller Roster-NPCs zum Spieler.
 *
 * @param state - Current GameState
 * @returns Array von NpcDistanceResult für jeden NPC
 *
 * Priority Tiers:
 * - immediate: distance = 0 (same district as player)
 * - high: distance = 1 (adjacent district)
 * - medium: distance = 2
 * - low: distance = 3
 * - background: distance >= 4 oder keine Verbindung
 */
export function calculateNpcDistances(state: GameState): NpcDistanceResult[] {
  const playerDistrict = state.currentDistrictId

  return state.npcRuntimeStates.map((npc) => {
    const npcDef = contentCatalog.npcsById.get(npc.npcId)
    const npcDistrict = npcDef?.districtId ?? npc.assignedDistrictId

    let distance = 999
    if (playerDistrict && npcDistrict) {
      distance = getDistrictDistance(playerDistrict, npcDistrict)
    } else if (npcDistrict) {
      distance = 0 // Kein Spieler-District bekannt, nehme an relevant
    }

    const isPlayerRelevant = distance < 3
    const priorityTier = resolvePriorityTier(distance)

    return {
      npcId: npc.npcId,
      npcName: npc.name,
      currentDistrictId: npcDistrict,
      distanceToPlayer: distance,
      isPlayerRelevant,
      priorityTier,
    }
  })
}

/**
 * Filtert NPCs nach Spieler-Relevanz.
 */
export function getPlayerRelevantNpcs(
  distances: NpcDistanceResult[]
): NpcDistanceResult[] {
  return distances.filter((d) => d.isPlayerRelevant)
}

/**
 * Filtert NPCs für Hintergrund-Simulation.
 */
export function getBackgroundNpcs(
  distances: NpcDistanceResult[]
): NpcDistanceResult[] {
  return distances.filter((d) => !d.isPlayerRelevant)
}

/**
 * Bestimmt Priority Tier basierend auf Distanz.
 */
function resolvePriorityTier(distance: number): NpcDistanceResult['priorityTier'] {
  if (distance === 0) return 'immediate'
  if (distance === 1) return 'high'
  if (distance === 2) return 'medium'
  if (distance === 3) return 'low'
  return 'background'
}

/**
 * Berechnet die Entfernung eines einzelnen NPCs zum Spieler.
 */
export function calculateNpcDistance(
  npc: NpcRuntimeState,
  state: GameState
): NpcDistanceResult {
  const distances = calculateNpcDistances(state)
  return distances.find((d) => d.npcId === npc.npcId)!
}
