import { contentCatalog } from '../../../application/content/contentCatalog'
import {
  CITY_VIEWBOX,
  cityDistrictShapes,
  cityEnvironMarkers,
  cityTravelEdges,
  cityWaterFeatures,
} from './cityGeometry'
import './maps.css'

const CROSSING_GLYPHS: Record<string, string> = {
  gate: '▣',
  bridge: '╫',
  ferry: '⚓',
  shaft: '▼',
}

const BORDER_TITLES: Record<string, string> = {
  open: 'Open passage',
  compact_checkpoint: 'Compact checkpoint',
  ring_toll: 'Ring toll gate',
  condemned_barrier: 'Condemned — dangerous crossing',
  restricted_gate: 'Restricted — clearance required',
}

export interface CityMapEntry {
  id: string
  name: string
  dangerLevel: number
  accessRestricted: boolean
  isCurrent: boolean
  borderTypes: Record<string, string>
}

interface CityMapProps {
  entries: CityMapEntry[]
  houseDistrictId: string | null
  travelTimeCost: number
  onSelectDistrict: (districtId: string, accessRestricted: boolean) => void
  onSelectEnvirons: () => void
}

export function CityMap({ entries, houseDistrictId, travelTimeCost, onSelectDistrict, onSelectEnvirons }: CityMapProps) {
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]))

  return (
    <figure className="city-map" aria-label="Map of the city and its environs">
      <svg viewBox={CITY_VIEWBOX} role="group" className="city-map-svg">
        <defs>
          <pattern id="map-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" className="map-hatch-line" />
          </pattern>
        </defs>

        {cityWaterFeatures.map((water) => (
          <path key={water.id} d={water.path} className={`map-water map-water--${water.kind}`} />
        ))}
        <text x="30" y="730" className="map-water-label" transform="rotate(-90 30 730)">
          The Open Sea
        </text>
        <text x="840" y="302" className="map-water-label">
          the river
        </text>

        {cityDistrictShapes.map((shape) => {
          const entry = entriesById.get(shape.id)
          if (!entry) return null
          const interactive = !entry.accessRestricted
          const classes = [
            'map-district',
            `map-district--danger-${entry.dangerLevel}`,
            entry.isCurrent ? 'map-district--current' : '',
            entry.accessRestricted ? 'map-district--restricted' : '',
            shape.unofficial ? 'map-district--unofficial' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <g key={shape.id}>
              <polygon
                points={shape.points}
                className={classes}
                role="button"
                tabIndex={interactive ? 0 : -1}
                aria-disabled={!interactive}
                aria-label={`${entry.name}${entry.isCurrent ? ' — you are here' : ''}${entry.accessRestricted ? ' — access restricted' : ''}`}
                onClick={() => onSelectDistrict(shape.id, entry.accessRestricted)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectDistrict(shape.id, entry.accessRestricted)
                  }
                }}
              >
                <title>
                  {entry.name}
                  {entry.accessRestricted
                    ? ' — access restricted'
                    : entry.isCurrent
                      ? ' — you are here'
                      : ` — travel: ${travelTimeCost} time slot${travelTimeCost === 1 ? '' : 's'}`}
                </title>
              </polygon>
              <text x={shape.label.x} y={shape.label.y} className="map-district-name">
                {entry.name}
              </text>
              <text x={shape.label.x} y={shape.label.y + 18} className="map-district-meta">
                {'▲'.repeat(entry.dangerLevel)}
                {entry.accessRestricted ? ' ✕' : ''}
              </text>
              {shape.id === houseDistrictId && (
                <text x={shape.label.x} y={shape.label.y - 20} className="map-house-marker">
                  ⌂
                </text>
              )}
              {entry.isCurrent && (
                <g className="map-player-marker" aria-hidden>
                  <circle cx={shape.label.x - 16} cy={shape.label.y - 26} r="7" className="map-player-pulse" />
                  <circle cx={shape.label.x - 16} cy={shape.label.y - 26} r="3.5" className="map-player-dot" />
                </g>
              )}
              {shape.unofficial && (
                <text x={shape.label.x} y={shape.label.y + 38} className="map-district-note">
                  beneath Cinder Row — no official survey
                </text>
              )}
            </g>
          )
        })}

        {cityTravelEdges.map((edge) => {
          const fromEntry = entriesById.get(edge.a)
          const borderType = fromEntry?.borderTypes[edge.b] ?? 'open'
          const title = BORDER_TITLES[borderType] ?? borderType
          return (
            <g key={`${edge.a}|${edge.b}`} className={`map-crossing map-crossing--${borderType}`}>
              {edge.path && <path d={edge.path} className={`map-crossing-path map-crossing-path--${edge.crossing}`} />}
              <text x={edge.x} y={edge.y} className="map-crossing-glyph">
                {CROSSING_GLYPHS[edge.crossing]}
                <title>{title}</title>
              </text>
            </g>
          )
        })}

        {cityEnvironMarkers.map((marker) => {
          const dest = contentCatalog.expeditionDestinationsById.get(marker.id)
          if (!dest) return null
          return (
            <g
              key={marker.id}
              className="map-environ"
              role="button"
              tabIndex={0}
              aria-label={`${dest.name} — expedition territory`}
              onClick={onSelectEnvirons}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectEnvirons()
                }
              }}
            >
              <path
                d={`M${marker.x},${marker.y - 8} L${marker.x + 8},${marker.y} L${marker.x},${marker.y + 8} L${marker.x - 8},${marker.y} Z`}
                className="map-environ-diamond"
              />
              <text x={marker.x} y={marker.y + 22} className="map-environ-name">
                {dest.name}
              </text>
              <title>{`${dest.name} — ${dest.durationDays} days out, danger ${dest.dangerLevel}`}</title>
            </g>
          )
        })}
      </svg>
      <figcaption className="map-legend">
        <span className="map-legend-item">● you are here</span>
        <span className="map-legend-item">⌂ House Valdris</span>
        <span className="map-legend-item">▣ gate</span>
        <span className="map-legend-item">╫ bridge</span>
        <span className="map-legend-item">⚓ ferry</span>
        <span className="map-legend-item">◆ expedition territory</span>
        <span className="map-legend-item">▲ danger</span>
        <span className="map-legend-item">✕ restricted</span>
        <span className="map-legend-item">
          travel costs {travelTimeCost} time slot{travelTimeCost === 1 ? '' : 's'}
        </span>
      </figcaption>
    </figure>
  )
}
