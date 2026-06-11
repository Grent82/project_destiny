import { DISTRICT_MAP_VIEWBOX, districtMapGeometry } from './districtGeometry'
import { PoiMark } from './mapSymbols'
import './maps.css'

export interface DistrictMapPoi {
  id: string
  name: string
  type: string
  hasContracts: boolean
  hasHireables: boolean
  /** Open in the current time slot. */
  isOpen: boolean
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
  selectedPoiId: string | null
  onSelectPoi: (poiId: string) => void
}

function waterStrip(side: 'west' | 'north' | 'south') {
  switch (side) {
    case 'west':
      return (
        <g>
          <path d="M0,0 L34,0 Q22,120 34,240 L0,240 Z" className="map-water map-water--sea" />
          <path d="M40,6 Q30,120 40,234" className="map-shore-line" />
        </g>
      )
    case 'north':
      return (
        <g>
          <path d="M0,0 L360,0 L360,30 Q180,42 0,30 Z" className="map-water map-water--river" />
          <path d="M4,36 Q180,48 356,36" className="map-shore-line" />
        </g>
      )
    case 'south':
      return (
        <g>
          <path d="M0,240 L360,240 L360,210 Q180,198 0,210 Z" className="map-water map-water--river" />
          <path d="M4,204 Q180,192 356,204" className="map-shore-line" />
        </g>
      )
  }
}

function plateTexture(texture: string) {
  switch (texture) {
    case 'terraces':
      return (
        <g className="map-texture">
          <path d="M40,70 Q180,56 330,70" />
          <path d="M44,78 Q180,64 326,78" />
          <path d="M40,130 Q180,116 330,130" />
          <path d="M40,190 Q180,176 330,190" />
          <path d="M44,198 Q180,184 326,198" />
        </g>
      )
    case 'ruins':
      return (
        <g className="map-texture">
          <path d="M58,42 l8,4 -2,8 -9,-3 z M298,178 l9,3 -1,9 -10,-2 z M178,208 l8,5 -3,7 -8,-4 z M328,38 l7,4 -2,7 -8,-3 z" />
          <path d="M70,58 l6,6 M306,196 l-6,6 M118,42 l5,5" />
        </g>
      )
    case 'marsh':
      return (
        <g className="map-texture">
          <path d="M50,90 q10,-6 20,0 q10,6 20,0 M210,180 q10,-6 20,0 q10,6 20,0 M120,220 q10,-6 20,0 M280,60 q10,-6 20,0" />
          <path d="M64,84 v-9 M70,84 v-7 M76,84 v-10 M224,174 v-9 M230,174 v-7 M294,54 v-8 M300,54 v-6" />
        </g>
      )
    case 'yards':
      return (
        <g className="map-texture">
          <rect x="52" y="42" width="34" height="22" />
          <rect x="270" y="160" width="40" height="24" />
          <rect x="140" y="62" width="28" height="18" />
          <path d="M60,48 h18 M278,168 h24" />
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
          <path d="M38,84 v6 M48,84 v6 M38,144 v6 M46,144 v6 M40,204 v6 M50,204 v6" />
        </g>
      )
    default:
      // 'streets' theme: the real street network carries the plate
      return null
  }
}

export function DistrictMap({ districtId, districtName, pois, npcMarkers, isHere, selectedPoiId, onSelectPoi }: DistrictMapProps) {
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
  const plateHand = geometry.theme.surveyLayer === 'hand'

  return (
    <figure className={`district-map district-map--${geometry.theme.texture}`} aria-label={`Map of ${districtName}`}>
      <svg viewBox={DISTRICT_MAP_VIEWBOX} role="group" className="district-map-svg">
        <defs>
          <filter id="map-plate-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.04" numOctaves="3" seed="4" result="grain" />
            <feColorMatrix
              in="grain"
              type="matrix"
              values="0 0 0 0 0.36  0 0 0 0 0.28  0 0 0 0 0.16  0 0 0 0.14 0"
            />
            <feComposite in2="SourceGraphic" operator="over" />
          </filter>
          <radialGradient id="map-plate-tone" cx="40%" cy="32%" r="100%">
            <stop offset="0%" stopColor="#dccfa8" />
            <stop offset="60%" stopColor="#d0c094" />
            <stop offset="100%" stopColor="#b8a578" />
          </radialGradient>
        </defs>

        <g filter="url(#map-plate-grain)">
          <path
            className="map-sheet"
            d="M5,7 Q90,3 180,5 Q270,2 355,6 Q358,80 354,120 Q358,180 355,234 Q270,238 180,235 Q90,239 5,234 Q2,160 5,120 Q2,60 5,7 Z"
          />
        </g>
        <g className="map-stains" aria-hidden>
          <ellipse cx="318" cy="38" rx="22" ry="14" />
          <ellipse cx="48" cy="216" rx="16" ry="10" />
        </g>

        {geometry.theme.water && waterStrip(geometry.theme.water)}
        {plateTexture(geometry.theme.texture)}

        {/* the ward's streets — drawn as cleared corridors in the ink */}
        <g className={`map-streets map-streets--${geometry.theme.texture}`}>
          {geometry.streets.map((d) => (
            <path key={d} d={d} className="map-street-under" />
          ))}
          {geometry.streets.map((d) => (
            <path key={`over-${d}`} d={d} className="map-street-over" />
          ))}
        </g>

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
                poi.id === selectedPoiId ? 'map-poi--selected' : '',
                poi.isOpen ? '' : 'map-poi--closed',
              ]
                .filter(Boolean)
                .join(' ')}
              role="button"
              tabIndex={0}
              aria-pressed={poi.id === selectedPoiId}
              aria-label={`${poi.name}${poi.isOpen ? '' : ' — closed at this hour'}`}
              onClick={() => onSelectPoi(poi.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectPoi(poi.id)
                }
              }}
            >
              <circle cx={node.x} cy={node.y} r="11" className="map-poi-ring" />
              <PoiMark type={poi.type} x={node.x} y={node.y} size={13} className="map-poi-icon" />
              <text x={node.x} y={node.y + 24} className="map-poi-name">
                {poi.name}
              </text>
              {poi.hasContracts && <circle cx={node.x + 10} cy={node.y - 9} r="3.5" className="map-poi-flag map-poi-flag--work" />}
              {poi.hasHireables && <circle cx={node.x - 10} cy={node.y - 9} r="3.5" className="map-poi-flag map-poi-flag--people" />}
              {!poi.isOpen && (
                <path
                  className="map-poi-closed-mark"
                  d={`M${node.x - 14},${node.y - 10} a5 5 0 1 0 4 -8 a4.4 4.4 0 0 1 -4 8`}
                />
              )}
              {present.length > 0 && (
                <g className="map-npc-marker">
                  <text x={node.x + 16} y={node.y - 12} className="map-npc-glyph">
                    ✦{present.length > 1 ? present.length : ''}
                  </text>
                  <title>{present.map((p) => p.name).join(', ')}</title>
                </g>
              )}
              <title>
                {poi.name}
                {poi.isOpen ? '' : ' — closed at this hour'}
                {present.length > 0 ? ` — here: ${present.map((p) => p.name).join(', ')}` : ''}
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
        <text x="348" y="232" textAnchor="end" className="map-plate-caption">
          {districtName} · {plateHand ? 'the house hand' : 'after the Compact survey'}
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
