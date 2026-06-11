import type { HouseRoom, RoomState } from '../../../domain/game/contracts'
import { HOUSE_MAP_VIEWBOX, housePlanDecor, houseRoomShapes } from './houseGeometry'
import './maps.css'

const STATE_LABELS: Record<RoomState, string> = {
  intact: 'intact',
  damaged: 'damaged',
  stripped: 'stripped',
  destroyed: 'destroyed',
  locked: 'sealed',
  collapsed: 'collapsed',
}

interface HouseMapProps {
  rooms: HouseRoom[]
  occupantsByRoom: Map<string, string[]>
  selectedRoomId: string | null
  /** Rooms with searched-but-unresolved discoveries — marked on the plan. */
  unresolvedRoomIds: Set<string>
  onSelectRoom: (roomId: string) => void
}

/** State-specific plan rendering: rubble, voids, bars, scaffolds. */
function roomStateDecor(room: HouseRoom, shape: { x: number; y: number; width: number; height: number }) {
  const { x, y, width: w, height: h } = shape
  switch (room.state) {
    case 'damaged':
      return (
        <path
          className="house-plan-crack"
          d={`M${x + w - 14},${y + 2} l5,7 -7,5 6,6 M${x + 2},${y + h - 12} l6,4 -3,6`}
        />
      )
    case 'stripped':
      return (
        <g className="house-plan-void">
          <rect x={x + w * 0.2} y={y + h * 0.25} width={w * 0.28} height={h * 0.2} />
          <rect x={x + w * 0.55} y={y + h * 0.55} width={w * 0.24} height={h * 0.18} />
        </g>
      )
    case 'collapsed':
    case 'destroyed':
      return <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} className="house-plan-rubble" />
    case 'locked':
      return (
        <g className="house-plan-bars">
          {[0.2, 0.4, 0.6, 0.8].map((t) => (
            <line key={t} x1={x + w * t} y1={y + 3} x2={x + w * t} y2={y + h * 0.4} />
          ))}
        </g>
      )
    default:
      return null
  }
}

export function HouseMap({ rooms, occupantsByRoom, selectedRoomId, unresolvedRoomIds, onSelectRoom }: HouseMapProps) {
  const roomsById = new Map(rooms.map((room) => [room.roomId, room]))

  return (
    <figure className="house-map district-map" aria-label="Plan of the family seat">
      <svg viewBox={HOUSE_MAP_VIEWBOX} role="group" className="district-map-svg">
        <defs>
          <filter id="house-plate-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.04" numOctaves="3" seed="9" result="grain" />
            <feColorMatrix
              in="grain"
              type="matrix"
              values="0 0 0 0 0.36  0 0 0 0 0.28  0 0 0 0 0.16  0 0 0 0.14 0"
            />
            <feComposite in2="SourceGraphic" operator="over" />
          </filter>
          <pattern id="house-rubble" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
            <line x1="0" y1="0" x2="0" y2="7" className="house-plan-rubble-line" />
          </pattern>
          <radialGradient id="map-plate-tone" cx="40%" cy="32%" r="100%">
            <stop offset="0%" stopColor="#dccfa8" />
            <stop offset="60%" stopColor="#d0c094" />
            <stop offset="100%" stopColor="#b8a578" />
          </radialGradient>
        </defs>

        <g filter="url(#house-plate-grain)">
          <path
            className="map-sheet"
            d="M5,7 Q105,3 210,5 Q315,2 415,6 Q418,84 414,156 Q418,230 415,306 Q315,310 210,307 Q105,311 5,306 Q2,156 5,7 Z"
          />
        </g>
        <g className="map-stains" aria-hidden>
          <ellipse cx="372" cy="282" rx="26" ry="15" />
          <ellipse cx="34" cy="120" rx="14" ry="22" />
        </g>

        {/* fixed plan furniture */}
        <rect
          x={housePlanDecor.mainBlock.x}
          y={housePlanDecor.mainBlock.y}
          width={housePlanDecor.mainBlock.width}
          height={housePlanDecor.mainBlock.height}
          className="house-plan-outer-wall"
        />
        <path d={housePlanDecor.doorPath} className="house-plan-door" />
        <path d={housePlanDecor.stairPath} className="house-plan-stair" />
        <text x={housePlanDecor.yardLabel.x} y={housePlanDecor.yardLabel.y} className="map-margin-note">
          the yard
        </text>
        <text x={housePlanDecor.streetLabel.x} y={housePlanDecor.streetLabel.y} className="map-margin-note">
          the street
        </text>

        {houseRoomShapes.map((shape) => {
          const room = roomsById.get(shape.roomId)
          if (!room) return null
          const occupants = occupantsByRoom.get(shape.roomId) ?? []
          const underRepair = room.repairDaysRemaining > 0
          const classes = [
            'house-plan-room',
            `house-plan-room--${room.state}`,
            shape.roomId === selectedRoomId ? 'house-plan-room--selected' : '',
            shape.annotation ? 'house-plan-room--annotation' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <g
              key={shape.roomId}
              className={classes}
              role="button"
              tabIndex={0}
              aria-pressed={shape.roomId === selectedRoomId}
              aria-label={`${room.name} — ${STATE_LABELS[room.state]}${underRepair ? `, repairs ${room.repairDaysRemaining} days` : ''}`}
              onClick={() => onSelectRoom(shape.roomId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectRoom(shape.roomId)
                }
              }}
            >
              <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} className="house-plan-room-wall" />
              {roomStateDecor(room, shape)}
              {underRepair && (
                <g className="house-plan-scaffold">
                  <path
                    d={`M${shape.x + 4},${shape.y + shape.height - 4} L${shape.x + shape.width - 4},${shape.y + 4} M${shape.x + 4},${shape.y + 4} L${shape.x + shape.width - 4},${shape.y + shape.height - 4}`}
                  />
                  <text x={shape.label.x} y={shape.y + 12} className="house-plan-note">
                    {room.repairDaysRemaining}d of work
                  </text>
                </g>
              )}
              {room.searched && (
                <path
                  className="house-plan-tick"
                  d={`M${shape.x + shape.width - 14},${shape.y + 8} l3,4 6,-7`}
                />
              )}
              {unresolvedRoomIds.has(shape.roomId) && (
                <circle cx={shape.x + 9} cy={shape.y + 9} r="3.5" className="house-plan-lead-mark" />
              )}
              <text x={shape.label.x} y={shape.label.y} className="house-plan-room-name">
                {room.name}
              </text>
              {room.state !== 'intact' && (
                <text x={shape.label.x} y={shape.label.y + 12} className="house-plan-note">
                  {STATE_LABELS[room.state]}
                </text>
              )}
              {room.roomFunction && room.state === 'intact' && (
                <text x={shape.label.x} y={shape.label.y + 12} className="house-plan-note">
                  {room.roomFunction}
                </text>
              )}
              {occupants.length > 0 && (
                <text x={shape.label.x} y={shape.label.y + (room.state !== 'intact' || room.roomFunction ? 24 : 12)} className="house-plan-occupants">
                  {occupants.join(' · ')}
                </text>
              )}
              {shape.annotation && (
                <text x={shape.label.x} y={shape.y - 4} className="house-plan-note">
                  {shape.annotation === 'above' ? 'above' : 'below, sealed'}
                </text>
              )}
              <title>
                {room.name} — {STATE_LABELS[room.state]}
                {underRepair ? `, ${room.repairDaysRemaining} days of work remaining` : ''}
                {occupants.length > 0 ? ` · ${occupants.join(', ')}` : ''}
              </title>
            </g>
          )
        })}

        <text x="12" y="304" className="map-plate-caption">
          Plate I — the family seat · the house hand
        </text>
      </svg>
    </figure>
  )
}
