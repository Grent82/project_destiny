import { DISTRICT_MAP_VIEWBOX, districtMapGeometry } from './districtGeometry'
import './maps.css'

const POI_TYPE_ICONS: Record<string, string> = {
  guild: '⚒',
  tavern: '⬡',
  shop: '⊕',
  court: '⚖',
  residence: '⌂',
  market: '⊞',
  faction_hq: '⚑',
  black_market: '◈',
}

export interface DistrictMapPoi {
  id: string
  name: string
  type: string
  hasContracts: boolean
  hasHireables: boolean
}

export interface DistrictMapNpcMarker {
  npcId: string
  name: string
  /** POI the NPC is anchored to, or null when only district presence is known. */
  poiId: string | null
}

interface DistrictMapProps {
  districtId: string
  districtName: string
  pois: DistrictMapPoi[]
  npcMarkers: DistrictMapNpcMarker[]
  isHere: boolean
  onSelectPoi: (poiId: string) => void
}

function waterStrip(side: 'west' | 'north' | 'south') {
  switch (side) {
    case 'west':
      return <path d="M0,0 L34,0 Q22,120 34,240 L0,240 Z" className="map-water map-water--sea" />
    case 'north':
      return <path d="M0,0 L360,0 L360,30 Q180,42 0,30 Z" className="map-water map-water--river" />
    case 'south':
      return <path d="M0,240 L360,240 L360,210 Q180,198 0,210 Z" className="map-water map-water--river" />
  }
}

function plateTexture(texture: string) {
  switch (texture) {
    case 'terraces':
      return (
        <g className="map-texture">
          <path d="M40,70 Q180,56 330,70" />
          <path d="M40,130 Q180,116 330,130" />
          <path d="M40,190 Q180,176 330,190" />
        </g>
      )
    case 'ruins':
      return (
        <g className="map-texture">
          <path d="M60,40 l10,10 M70,40 l-10,10 M300,180 l10,10 M310,180 l-10,10 M180,210 l10,10 M190,210 l-10,10 M330,40 l8,8 M338,40 l-8,8" />
        </g>
      )
    case 'marsh':
      return (
        <g className="map-texture">
          <path d="M50,90 q10,-6 20,0 q10,6 20,0 M210,180 q10,-6 20,0 q10,6 20,0 M120,220 q10,-6 20,0 M280,60 q10,-6 20,0" />
        </g>
      )
    case 'yards':
      return (
        <g className="map-texture">
          <rect x="52" y="42" width="34" height="22" />
          <rect x="270" y="160" width="40" height="24" />
          <rect x="140" y="62" width="28" height="18" />
        </g>
      )
    case 'tunnels':
      return (
        <g className="map-texture map-texture--tunnels">
          <path d="M40,60 Q120,40 200,72 Q280,104 330,86" />
          <path d="M40,76 Q120,56 200,88 Q280,120 330,102" />
          <path d="M60,180 Q160,200 300,160" />
          <path d="M60,196 Q160,216 300,176" />
        </g>
      )
    case 'docks':
      return (
        <g className="map-texture">
          <path d="M34,80 h26 M34,140 h22 M34,200 h28" />
        </g>
      )
    default:
      return (
        <g className="map-texture">
          <path d="M70,30 L120,210 M210,24 L250,216 M30,120 L330,96" />
        </g>
      )
  }
}

export function DistrictMap({ districtId, districtName, pois, npcMarkers, isHere, onSelectPoi }: DistrictMapProps) {
  const geometry = districtMapGeometry[districtId]
  if (!geometry) return null
  const nodeById = new Map(geometry.pois.map((node) => [node.id, node]))
  const npcCountByPoi = new Map<string, DistrictMapNpcMarker[]>()
  const roamingNpcs: DistrictMapNpcMarker[] = []
  for (const marker of npcMarkers) {
    if (marker.poiId && nodeById.has(marker.poiId)) {
      const list = npcCountByPoi.get(marker.poiId) ?? []
      list.push(marker)
      npcCountByPoi.set(marker.poiId, list)
    } else {
      roamingNpcs.push(marker)
    }
  }
  const roamingLabel =
    roamingNpcs.length > 3
      ? `${roamingNpcs
          .slice(0, 3)
          .map((npc) => npc.name)
          .join(', ')} +${roamingNpcs.length - 3}`
      : roamingNpcs.map((npc) => npc.name).join(', ')

  return (
    <figure className={`district-map district-map--${geometry.theme.texture}`} aria-label={`Map of ${districtName}`}>
      <svg viewBox={DISTRICT_MAP_VIEWBOX} role="group" className="district-map-svg">
        {geometry.theme.water && waterStrip(geometry.theme.water)}
        {plateTexture(geometry.theme.texture)}

        {pois.map((poi) => {
          const node = nodeById.get(poi.id)
          if (!node) return null
          const present = npcCountByPoi.get(poi.id) ?? []
          const isHouse = poi.id === 'poi-pale-house-valdric'
          return (
            <g
              key={poi.id}
              className={[
                'map-poi',
                `map-poi--${poi.type}`,
                isHere ? 'map-poi--reachable' : 'map-poi--distant',
                isHouse ? 'map-poi--house' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="button"
              tabIndex={isHere ? 0 : -1}
              aria-disabled={!isHere}
              aria-label={isHere ? poi.name : `${poi.name} — enter the district to approach`}
              onClick={() => {
                if (isHere) onSelectPoi(poi.id)
              }}
              onKeyDown={(e) => {
                if (isHere && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onSelectPoi(poi.id)
                }
              }}
            >
              <circle cx={node.x} cy={node.y} r="11" className="map-poi-ring" />
              <text x={node.x} y={node.y + 4.5} className="map-poi-icon">
                {POI_TYPE_ICONS[poi.type] ?? '○'}
              </text>
              <text x={node.x} y={node.y + 24} className="map-poi-name">
                {poi.name}
              </text>
              {poi.hasContracts && <circle cx={node.x + 10} cy={node.y - 9} r="3.5" className="map-poi-flag map-poi-flag--work" />}
              {poi.hasHireables && <circle cx={node.x - 10} cy={node.y - 9} r="3.5" className="map-poi-flag map-poi-flag--people" />}
              {present.length > 0 && (
                <g className="map-npc-marker">
                  <text x={node.x + 16} y={node.y - 12} className="map-npc-glyph">
                    ✦{present.length > 1 ? present.length : ''}
                  </text>
                  <title>{present.map((p) => p.name).join(', ')}</title>
                </g>
              )}
              <title>
                {isHere
                  ? `${poi.name}${present.length > 0 ? ` — here: ${present.map((p) => p.name).join(', ')}` : ''}`
                  : `${poi.name} — enter the district to approach`}
              </title>
            </g>
          )
        })}

        {roamingNpcs.length > 0 && (
          <text x="12" y="20" className="map-roaming-note">
            <tspan className="map-npc-glyph">✦ </tspan>
            seen here: {roamingLabel}
            <title>{roamingNpcs.map((npc) => npc.name).join(', ')}</title>
          </text>
        )}
        <text x="12" y="232" className="map-margin-note">
          {geometry.theme.marginNote}
        </text>
        {isHere && (
          <g aria-hidden>
            <circle cx="344" cy="16" r="6" className="map-player-pulse" />
            <circle cx="344" cy="16" r="3" className="map-player-dot" />
            <text x="334" y="20" className="map-presence-note">
              you are in this district
            </text>
          </g>
        )}
      </svg>
    </figure>
  )
}
