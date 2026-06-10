import { describe, expect, it } from 'vitest'

import { contentCatalog } from '../../../application/content/contentCatalog'
import { CITY_VIEWBOX, cityDistrictShapes, cityEnvironMarkers, cityTravelEdges } from './cityGeometry'
import { DISTRICT_MAP_VIEWBOX, districtMapGeometry } from './districtGeometry'

function viewBoxBounds(viewBox: string) {
  const [minX, minY, width, height] = viewBox.split(' ').map(Number)
  return { minX, minY, maxX: minX + width, maxY: minY + height }
}

describe('city map geometry', () => {
  it('has a shape and label for every district in the catalog', () => {
    for (const def of contentCatalog.districts) {
      const shape = cityDistrictShapes.find((s) => s.id === def.id)
      expect(shape, `missing city map shape for ${def.id}`).toBeDefined()
    }
  })

  it('has no shapes for unknown districts', () => {
    for (const shape of cityDistrictShapes) {
      expect(contentCatalog.districtsById.has(shape.id), `unknown district ${shape.id}`).toBe(true)
    }
  })

  it('covers every adjacency pair with exactly one travel edge marker', () => {
    const pairs = new Set<string>()
    for (const def of contentCatalog.districts) {
      for (const adj of def.adjacentDistrictIds) {
        pairs.add([def.id, adj].sort().join('|'))
      }
    }
    const edgeKeys = cityTravelEdges.map((e) => [e.a, e.b].sort().join('|'))
    expect(new Set(edgeKeys).size, 'duplicate travel edge markers').toBe(edgeKeys.length)
    for (const pair of pairs) {
      expect(edgeKeys, `missing travel edge marker for ${pair}`).toContain(pair)
    }
    for (const key of edgeKeys) {
      expect(pairs.has(key), `travel edge ${key} has no adjacency in content`).toBe(true)
    }
  })

  it('keeps labels and environ markers inside the viewBox', () => {
    const bounds = viewBoxBounds(CITY_VIEWBOX)
    for (const shape of cityDistrictShapes) {
      expect(shape.label.x).toBeGreaterThanOrEqual(bounds.minX)
      expect(shape.label.x).toBeLessThanOrEqual(bounds.maxX)
      expect(shape.label.y).toBeGreaterThanOrEqual(bounds.minY)
      expect(shape.label.y).toBeLessThanOrEqual(bounds.maxY)
    }
    for (const marker of cityEnvironMarkers) {
      expect(marker.x).toBeGreaterThanOrEqual(bounds.minX)
      expect(marker.x).toBeLessThanOrEqual(bounds.maxX)
      expect(marker.y).toBeGreaterThanOrEqual(bounds.minY)
      expect(marker.y).toBeLessThanOrEqual(bounds.maxY)
    }
  })

  it('marks every expedition destination as an environ of the city', () => {
    for (const dest of contentCatalog.expeditionDestinations) {
      const marker = cityEnvironMarkers.find((e) => e.id === dest.id)
      expect(marker, `missing environ marker for ${dest.id}`).toBeDefined()
    }
  })
})

describe('district map geometry', () => {
  it('has a map for every district and a position for every POI', () => {
    for (const def of contentCatalog.districts) {
      const geometry = districtMapGeometry[def.id]
      expect(geometry, `missing district map geometry for ${def.id}`).toBeDefined()
      const pois = contentCatalog.poisByDistrictId.get(def.id) ?? []
      for (const poi of pois) {
        const node = geometry.pois.find((p) => p.id === poi.id)
        expect(node, `missing map position for ${poi.id}`).toBeDefined()
      }
    }
  })

  it('has no positions for unknown POIs and no overlapping nodes', () => {
    const bounds = viewBoxBounds(DISTRICT_MAP_VIEWBOX)
    for (const [districtId, geometry] of Object.entries(districtMapGeometry)) {
      const seen: Array<{ x: number; y: number }> = []
      for (const node of geometry.pois) {
        const poi = contentCatalog.poisById.get(node.id)
        expect(poi, `unknown poi ${node.id}`).toBeDefined()
        expect(poi?.districtId, `${node.id} mapped in wrong district`).toBe(districtId)
        expect(node.x).toBeGreaterThanOrEqual(bounds.minX)
        expect(node.x).toBeLessThanOrEqual(bounds.maxX)
        expect(node.y).toBeGreaterThanOrEqual(bounds.minY)
        expect(node.y).toBeLessThanOrEqual(bounds.maxY)
        for (const other of seen) {
          const distance = Math.hypot(other.x - node.x, other.y - node.y)
          expect(distance, `POI nodes closer than 28 units in ${districtId}`).toBeGreaterThanOrEqual(28)
        }
        seen.push(node)
      }
    }
  })
})
