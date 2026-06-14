import { environsDestinations, cityAnchorPoints, ENVIRONS_VIEWBOX, dangerPips } from './environsGeometry'
import './EnvironsMap.css'

interface EnvironsMapProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

/**
 * Environs map component for the ExpeditionPrepScreen.
 * Shows the city as a small anchor with expedition destinations positioned
 * around it in the surrounding Waste.
 */
export function EnvironsMap({ selectedId, onSelect }: EnvironsMapProps) {
  return (
    <div className="environs-map-container">
      <svg
        viewBox={ENVIRONS_VIEWBOX}
        className="environs-map"
        aria-label="Expedition destinations around Valdenmoor"
      >
        {/* Background - the Waste */}
        <rect x="0" y="0" width="600" height="400" fill="#f4e4c1" />

        {/* City anchor - Valdenmoor at the center */}
        <polygon
          points={cityAnchorPoints}
          fill="#4a4a4a"
          stroke="#2a2a2a"
          strokeWidth="2"
        />
        <text x="300" y="190" textAnchor="middle" fontSize="10" fill="#2a2a2a">
          Valdenmoor
        </text>

        {/* Waste roads radiating from the city */}
        <line x1="300" y1="160" x2="300" y2="60" stroke="#c9a67a" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="340" y1="160" x2="500" y2="60" stroke="#c9a67a" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="350" y1="185" x2="580" y2="185" stroke="#c9a67a" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="350" y1="195" x2="580" y2="320" stroke="#c9a67a" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="340" y1="205" x2="460" y2="370" stroke="#c9a67a" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="300" y1="210" x2="300" y2="370" stroke="#c9a67a" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="260" y1="200" x2="140" y2="370" stroke="#c9a67a" strokeWidth="1" strokeDasharray="4,4" />

        {/* Destination markers */}
        {environsDestinations.map((dest) => {
          const isSelected = selectedId === dest.id
          return (
            <g
              key={dest.id}
              onClick={() => onSelect(dest.id)}
              className={`enviros-destination ${isSelected ? 'selected' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              {/* Marker circle */}
              <circle
                cx={dest.x}
                cy={dest.y}
                r={isSelected ? 12 : 8}
                fill={isSelected ? '#8b4513' : '#6b8e23'}
                stroke={isSelected ? '#ffd700' : '#228b22'}
                strokeWidth={isSelected ? 3 : 2}
              />
              {/* Destination label */}
              <text
                x={dest.x}
                y={dest.y - 14}
                textAnchor="middle"
                fontSize="10"
                fill="#333"
                fontWeight={isSelected ? 'bold' : 'normal'}
              >
                {dest.name}
              </text>
              {/* Danger level */}
              <text
                x={dest.x}
                y={dest.y + 4}
                textAnchor="middle"
                fontSize="8"
                fill="#8b0000"
              >
                {dangerPips(dest.dangerLevel)}
              </text>
              {/* Distance indicator (days) */}
              <text
                x={dest.x}
                y={dest.y + 14}
                textAnchor="middle"
                fontSize="7"
                fill="#555"
              >
                {dest.durationDays}d
              </text>
            </g>
          )
        })}

        {/* Legend */}
        <g transform="translate(10, 370)">
          <rect x="0" y="0" width="120" height="25" fill="#fff8dc" stroke="#c9a67a" rx="4" />
          <text x="8" y="12" fontSize="8" fill="#555">Danger:</text>
          <text x="45" y="12" fontSize="8" fill="#8b0000">▲▲▲</text>
          <text x="75" y="12" fontSize="8" fill="#555">| Days:</text>
          <text x="105" y="12" fontSize="8" fill="#555">d</text>
        </g>
      </svg>
    </div>
  )
}
