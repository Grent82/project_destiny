import { contentCatalog } from '../../../application/content/contentCatalog'
import {
  CITY_VIEWBOX,
  cityDistrictShapes,
  cityEnvironMarkers,
  cityShoreLines,
  cityTravelEdges,
  cityWallSegments,
  cityWallTowers,
  cityWasteRoads,
  cityWaterFeatures,
} from './cityGeometry'
import { CompassRose, FactionStamp, FerryMark, GateMark, ShaftMark, ValdrisKeySigil, WaxSeal } from './mapSymbols'
import './maps.css'

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
  controllingFactionId: string | null
  borderTypes: Record<string, string>
}

interface CityMapProps {
  entries: CityMapEntry[]
  houseDistrictId: string | null
  travelTimeCost: number
  onSelectDistrict: (districtId: string, accessRestricted: boolean) => void
  onSelectEnvirons: () => void
}

function CrossingMark({ crossing, x, y }: { crossing: string; x: number; y: number }) {
  switch (crossing) {
    case 'ferry':
      return <FerryMark x={x} y={y} size={17} className="map-crossing-symbol" />
    case 'shaft':
      return <ShaftMark x={x} y={y} size={14} className="map-crossing-symbol" />
    case 'bridge':
      return null // the drawn bridge path is the mark
    default:
      return <GateMark x={x} y={y} size={13} className="map-crossing-symbol" />
  }
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
          <filter id="map-parchment" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.015" numOctaves="3" seed="7" result="grain" />
            <feColorMatrix
              in="grain"
              type="matrix"
              values="0 0 0 0 0.36  0 0 0 0 0.28  0 0 0 0 0.16  0 0 0 0.16 0"
            />
            <feComposite in2="SourceGraphic" operator="over" />
          </filter>
          <filter id="map-ink-rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="11" result="rough" />
            <feDisplacementMap in="SourceGraphic" in2="rough" scale="3.5" />
          </filter>
          <radialGradient id="map-parchment-tone" cx="38%" cy="30%" r="95%">
            <stop offset="0%" stopColor="#dccfa8" />
            <stop offset="55%" stopColor="#d0c094" />
            <stop offset="100%" stopColor="#b8a578" />
          </radialGradient>
        </defs>

        {/* ── The sheet ── */}
        <g filter="url(#map-parchment)">
          <path
            className="map-sheet"
            d="M14,22 Q300,10 600,16 Q920,8 1188,18 Q1194,200 1186,400 Q1192,620 1184,786 Q900,792 600,784 Q300,792 16,782 Q8,600 14,400 Q6,180 14,22 Z"
          />
        </g>
        <g className="map-stains" aria-hidden>
          <ellipse cx="1015" cy="700" rx="64" ry="40" />
          <ellipse cx="150" cy="60" rx="40" ry="26" />
          <ellipse cx="980" cy="395" rx="30" ry="44" />
        </g>

        {/* ── Water, drawn in the clerk's hand ── */}
        {cityWaterFeatures.map((water) => (
          <path key={water.id} d={water.path} className={`map-water map-water--${water.kind}`} />
        ))}
        {cityShoreLines.map((line) => (
          <path key={line} d={line} className="map-shore-line" />
        ))}
        <text x="34" y="730" className="map-water-label" transform="rotate(-90 34 730)">
          The Open Sea
        </text>
        <text x="800" y="304" className="map-water-label">
          the river
        </text>

        {/* ── The city wall, towers, and the roads into the Waste ── */}
        {cityWallSegments.map((segment) => (
          <path key={segment} d={segment} className="map-wall" />
        ))}
        {cityWallTowers.map((tower) => (
          <rect key={`${tower.x},${tower.y}`} x={tower.x - 5} y={tower.y - 5} width="10" height="10" className="map-wall-tower" />
        ))}
        {cityWasteRoads.map((road) => (
          <path key={road} d={road} className="map-waste-road" />
        ))}

        {/* ── Districts: official survey + the house hand ── */}
        {cityDistrictShapes.map((shape) => {
          const entry = entriesById.get(shape.id)
          if (!entry) return null
          const interactive = !entry.accessRestricted
          const classes = [
            'map-district',
            `map-district--${shape.surveyLayer}`,
            `map-district--danger-${entry.dangerLevel}`,
            entry.isCurrent ? 'map-district--current' : '',
            entry.accessRestricted ? 'map-district--restricted' : '',
            shape.unofficial ? 'map-district--unofficial' : '',
          ]
            .filter(Boolean)
            .join(' ')
          const handDrawn = shape.surveyLayer === 'hand'
          return (
            <g key={shape.id} className={handDrawn ? 'map-layer-hand' : 'map-layer-official'}>
              <polygon
                points={shape.points}
                className={classes}
                filter={handDrawn ? 'url(#map-ink-rough)' : undefined}
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
              {entry.controllingFactionId && (
                <FactionStamp
                  factionId={entry.controllingFactionId}
                  x={shape.label.x - 55}
                  y={shape.label.y + 13}
                  size={13}
                  className="map-faction-stamp"
                />
              )}
              <text x={shape.label.x} y={shape.label.y + 18} className="map-district-meta">
                {'▲'.repeat(entry.dangerLevel)}
                {entry.accessRestricted ? ' ✕' : ''}
              </text>
              {shape.id === houseDistrictId && (
                <ValdrisKeySigil x={shape.label.x + 4} y={shape.label.y - 28} size={16} className="map-house-sigil" />
              )}
              {entry.isCurrent && (
                <g className="map-player-marker" aria-hidden>
                  <circle cx={shape.label.x - 18} cy={shape.label.y - 28} r="7" className="map-player-pulse" />
                  <circle cx={shape.label.x - 18} cy={shape.label.y - 28} r="3.5" className="map-player-dot" />
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

        {/* ── Crossings ── */}
        {cityTravelEdges.map((edge) => {
          const fromEntry = entriesById.get(edge.a)
          const borderType = fromEntry?.borderTypes[edge.b] ?? 'open'
          const title = BORDER_TITLES[borderType] ?? borderType
          return (
            <g key={`${edge.a}|${edge.b}`} className={`map-crossing map-crossing--${borderType}`}>
              {edge.path && <path d={edge.path} className={`map-crossing-path map-crossing-path--${edge.crossing}`} />}
              <CrossingMark crossing={edge.crossing} x={edge.x} y={edge.y} />
              <title>{title}</title>
            </g>
          )
        })}

        {/* ── The Waste: bearings in the house hand ── */}
        <text x="1052" y="226" className="map-waste-label">
          the Waste
        </text>
        <text x="1052" y="244" className="map-waste-sub">
          the survey ends at the wall
        </text>
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
              <text x={marker.x} y={marker.y + 21} className="map-environ-name">
                {dest.name}
              </text>
              <text x={marker.x} y={marker.y + 34} className="map-environ-bearing">
                {marker.bearing} · {dest.durationDays}d
              </text>
              <title>{`${dest.name} — ${marker.bearing}, ${dest.durationDays} days out, danger ${dest.dangerLevel}`}</title>
            </g>
          )
        })}

        {/* ── Marginalia ── */}
        <g className="map-marginalia" aria-hidden>
          <path d="M86,442 q6,-7 12,0 q6,7 12,0 M92,452 q5,-5 10,0" />
          <text x="120" y="452">pale eels at low tide</text>
        </g>

        {/* ── Cartouche, compass, seal ── */}
        <g className="map-cartouche" aria-hidden>
          <rect x="938" y="34" width="234" height="92" className="map-cartouche-frame" />
          <rect x="944" y="40" width="222" height="80" className="map-cartouche-frame map-cartouche-frame--inner" />
          <text x="1055" y="66" className="map-cartouche-title">
            VALDENMOOR
          </text>
          <text x="1055" y="84" className="map-cartouche-line">
            Year 84 after the Breach
          </text>
          <text x="1055" y="99" className="map-cartouche-line">
            copied from the Compact survey
          </text>
          <text x="1055" y="112" className="map-cartouche-line map-cartouche-line--warn">
            House Valdris · not for circulation
          </text>
        </g>
        <CompassRose x={988} y={680} size={64} />
        <text x="988" y="734" className="map-scale-note">
          half a day&apos;s walk across the walls
        </text>
        <WaxSeal x={1126} y={690} size={52} />
      </svg>
      <figcaption className="map-legend">
        <span className="map-legend-item">● you are here</span>
        <span className="map-legend-item">⚷ House Valdris</span>
        <span className="map-legend-item">gate · bridge · ferry drawn as marked</span>
        <span className="map-legend-item">◆ expedition territory</span>
        <span className="map-legend-item">▲ danger</span>
        <span className="map-legend-item">✕ restricted</span>
        <span className="map-legend-item">
          travel costs {travelTimeCost} time slot{travelTimeCost === 1 ? '' : 's'}
        </span>
        <span className="map-legend-item map-legend-item--hand">italic entries: added in the house hand</span>
      </figcaption>
    </figure>
  )
}
