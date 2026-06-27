import { entityIdSchema } from '../shared/contracts'
import { z } from 'zod'

/**
 * Schema for district adjacency mapping.
 * Maps each district ID to an array of its directly adjacent neighbor district IDs.
 */
export const districtAdjacencySchema = z.record(
  entityIdSchema,
  z.array(entityIdSchema)
)

export type DistrictAdjacency = z.infer<typeof districtAdjacencySchema>

/**
 * Complete adjacency definition for all districts in Valdenmoor.
 * Each district lists its directly adjacent neighbors based on districts.json.
 *
 * This is an authoring-time constant. Runtime can be modified by expeditions,
 * corridor status, or events that temporarily block/unblock connections.
 *
 * Source: data/definitions/districts.json adjacentDistrictIds fields
 */
export const DISTRICT_ADJACENCY: DistrictAdjacency = {
  'district-harbor': [
    'district-the-pale',
    'district-ironworks',
    'district-the-hollows',
    'district-gilded-heights',
    'district-ash-quay',
  ],
  'district-gilded-heights': ['district-harbor', 'district-the-pale'],
  'district-ironworks': ['district-harbor', 'district-the-pale', 'district-the-warrens'],
  'district-the-pale': [
    'district-harbor',
    'district-ironworks',
    'district-gilded-heights',
    'district-the-warrens',
    'district-the-northbank',
  ],
  'district-the-warrens': ['district-ironworks', 'district-the-pale', 'district-the-hollows'],
  'district-the-hollows': ['district-harbor', 'district-the-warrens'],
  'district-ash-quay': ['district-the-northbank', 'district-cinder-row', 'district-harbor'],
  'district-the-mireward': ['district-cinder-row', 'district-the-northbank'],
  'district-cinder-row': ['district-ash-quay', 'district-the-mireward', 'district-the-below'],
  'district-the-northbank': ['district-ash-quay', 'district-the-mireward', 'district-the-pale'],
  'district-the-below': ['district-cinder-row'],
}

/**
 * Calculates the distance (in district hops) between two districts.
 * Uses Breadth-First Search to find the shortest path.
 *
 * @param fromId - Starting district ID
 * @param toId - Target district ID
 * @returns Distance as integer (0 = same district, 999 = no connection)
 */
export function getDistrictDistance(fromId: string, toId: string): number {
  if (fromId === toId) return 0
  if (!DISTRICT_ADJACENCY[fromId as keyof typeof DISTRICT_ADJACENCY]) return 999
  if (!DISTRICT_ADJACENCY[toId as keyof typeof DISTRICT_ADJACENCY]) return 999

  const queue: [string, number][] = [[fromId, 0]]
  const visited = new Set<string>([fromId])

  while (queue.length > 0) {
    const [current, distance] = queue.shift()!

    const neighbors = DISTRICT_ADJACENCY[current as keyof typeof DISTRICT_ADJACENCY] || []
    for (const neighbor of neighbors) {
      if (neighbor === toId) return distance + 1
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push([neighbor, distance + 1])
      }
    }
  }

  return 999 // No connection found
}

/**
 * Checks if two districts are directly adjacent.
 *
 * @param fromId - First district ID
 * @param toId - Second district ID
 * @returns True if districts share a border
 */
export function areDistrictsAdjacent(fromId: string, toId: string): boolean {
  const neighbors = DISTRICT_ADJACENCY[fromId as keyof typeof DISTRICT_ADJACENCY] || []
  return neighbors.includes(toId)
}

/**
 * Finds all districts within a certain distance from a center district.
 *
 * @param centerId - Center district ID
 * @param maxDistance - Maximum distance to include
 * @returns Array of district IDs within the specified distance
 */
export function getDistrictsWithinDistance(
  centerId: string,
  maxDistance: number
): string[] {
  if (!DISTRICT_ADJACENCY[centerId as keyof typeof DISTRICT_ADJACENCY]) return []

  const result: string[] = [centerId]
  const queue: [string, number][] = [[centerId, 0]]
  const visited = new Set<string>([centerId])

  while (queue.length > 0) {
    const [current, distance] = queue.shift()!

    if (distance >= maxDistance) continue

    const neighbors = DISTRICT_ADJACENCY[current as keyof typeof DISTRICT_ADJACENCY] || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        result.push(neighbor)
        queue.push([neighbor, distance + 1])
      }
    }
  }

  return result
}

/**
 * Validates that the adjacency graph is symmetric (if A→B then B→A).
 * Returns array of asymmetric edges if any found.
 *
 * @returns Empty array if valid, list of "[A] → [B] but not [B] → [A]" strings if invalid
 */
export function validateAdjacencySymmetry(): string[] {
  const errors: string[] = []

  for (const [districtId, neighbors] of Object.entries(DISTRICT_ADJACENCY)) {
    for (const neighbor of neighbors) {
      const reverseNeighbors = DISTRICT_ADJACENCY[neighbor as keyof typeof DISTRICT_ADJACENCY] || []
      if (!reverseNeighbors.includes(districtId)) {
        errors.push(`[${districtId}] → [${neighbor}] but not [${neighbor}] → [${districtId}]`)
      }
    }
  }

  return errors
}
