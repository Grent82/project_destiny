/**
 * Inked symbols for the House Copy maps. Faction and house marks are
 * inlined from public/icons.svg and public/house-sigils.svg (external
 * <use> fragments are unreliable across browsers); crossing and POI
 * marks are drawn in the same 24×24 stroke vocabulary.
 *
 * Stroke widths live on the elements (1.6 main form, 1.1 detail) —
 * maps.css supplies color and fill only, so the detail survives.
 */
import type { ReactNode } from 'react'

interface SymbolProps {
  x: number
  y: number
  /** Rendered edge length in map units (symbol is authored 24×24). */
  size: number
  className?: string
}

function placed({ x, y, size }: SymbolProps) {
  const scale = size / 24
  return `translate(${x - size / 2}, ${y - size / 2}) scale(${scale})`
}

/** Faction emblems — kept in sync with public/icons.svg. */
const FACTION_EMBLEMS: Record<string, ReactNode> = {
  'faction-civic-compact': (
    <>
      <path strokeWidth="1.5" d="M12 4.2 V16.2" />
      <circle strokeWidth="1.2" cx="12" cy="2.8" r="1.1" />
      <path strokeWidth="1.5" d="M5 6 H19" />
      <path strokeWidth="1.1" d="M5 6 L2.9 9.3 M5 6 L7.1 9.3 M19 6 L16.9 9.3 M19 6 L21.1 9.3" />
      <path strokeWidth="1.4" d="M2.4 9.4 Q5 12.4 7.6 9.4 Z M16.4 9.4 Q19 12.4 21.6 9.4 Z" />
      <path strokeWidth="1.5" d="M9.4 16.4 H14.6 M8 18.4 H16 M6.4 20.6 H17.6" />
    </>
  ),
  'faction-gilded-court': (
    <>
      <path strokeWidth="1.5" d="M3.5 16.5 L3.5 9 L8.2 12.6 L12 6 L15.8 12.6 L20.5 9 L20.5 16.5 Z" />
      <circle strokeWidth="1.2" cx="3.5" cy="7.4" r="1.1" />
      <circle strokeWidth="1.2" cx="12" cy="4.3" r="1.2" />
      <circle strokeWidth="1.2" cx="20.5" cy="7.4" r="1.1" />
      <path strokeWidth="1.5" d="M3.5 19 H20.5" />
      <path strokeWidth="1.1" d="M8 17.8 l1 .95 -1 .95 -1 -.95 Z M12 17.8 l1 .95 -1 .95 -1 -.95 Z M16 17.8 l1 .95 -1 .95 -1 -.95 Z" />
    </>
  ),
  'faction-foundry-league': (
    <>
      <path strokeWidth="1.4" d="M2.8 5.4 L8 3.6 L9 6.4 L3.8 8.2 Z" />
      <path strokeWidth="1.6" d="M6.6 7.6 L18.6 19.4" />
      <path strokeWidth="1.4" d="M21.2 5.4 L16 3.6 L15 6.4 L20.2 8.2 Z" />
      <path strokeWidth="1.6" d="M17.4 7.6 L5.4 19.4" />
      <path strokeWidth="1.1" d="M10.6 14.8 a2.6 2.6 0 0 0 2.8 0" />
    </>
  ),
  'faction-tallow-ring': (
    <>
      <path
        strokeWidth="1.2"
        d="M12 2.4 a9.6 9.6 0 0 1 9.2 6.9 M21.4 13.8 a9.6 9.6 0 0 1 -7.3 7.4 M9.4 21.2 a9.6 9.6 0 0 1 -6.6 -6.3 M2.6 10.2 a9.6 9.6 0 0 1 6 -7.2"
      />
      <path strokeWidth="1.1" d="M7 21.6 v1.6 M16.4 21.2 v1.4" />
      <path strokeWidth="1.4" d="M5 12 C8.2 8 15.8 8 19 12 C15.8 16 8.2 16 5 12 Z" />
      <circle strokeWidth="1.4" cx="12" cy="12" r="2.6" />
      <circle cx="12" cy="12" r="0.7" style={{ fill: 'currentColor', stroke: 'none' }} />
    </>
  ),
  'faction-restored': (
    <>
      <path
        strokeWidth="1.4"
        d="M12 2.6 C10.2 5.4 8.6 7.4 8.6 10.2 C8.6 12.8 10 14.4 12 14.4 C14 14.4 15.4 12.8 15.4 10.2 C15.4 7.4 13.8 5.4 12 2.6 Z"
      />
      <path
        strokeWidth="1.1"
        d="M12 7.4 C11.1 8.8 10.9 10.2 11.3 11.4 M6.6 8.8 C5.8 10.4 5.9 12 6.8 13.4 M17.4 8.8 C18.2 10.4 18.1 12 17.2 13.4"
      />
      <path strokeWidth="1.4" d="M6 16.4 H18 L16.4 19.4 H7.6 Z" />
      <path strokeWidth="1.2" d="M9.6 19.4 L8.6 21.6 M14.4 19.4 L15.4 21.6 M7 21.6 H17" />
    </>
  ),
}

/** A worn stamp ring: broken double circle, pressed at a slight angle. */
function SealRings({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={r} className="map-seal-ring" />
      <circle cx={x} cy={y} r={r - 2.4} className="map-seal-ring map-seal-ring--inner" />
    </>
  )
}

export function FactionStamp({ factionId, ...props }: SymbolProps & { factionId: string }) {
  const emblem = FACTION_EMBLEMS[factionId]
  if (!emblem) return null
  const { x, y, size } = props
  return (
    <g transform={`rotate(-7 ${x} ${y})`} className={`map-seal ${props.className ?? ''}`} aria-hidden>
      <SealRings x={x} y={y} r={size / 2} />
      <g transform={placed({ x, y, size: size * 0.62 })} className="map-symbol">
        {emblem}
      </g>
    </g>
  )
}

/** House Valdris ward key — kept in sync with public/house-sigils.svg. */
export function ValdrisKeySigil(props: SymbolProps) {
  return (
    <g transform={placed(props)} className={`map-symbol ${props.className ?? ''}`} aria-hidden>
      <circle strokeWidth="1.6" cx="6.8" cy="7" r="4.4" />
      <circle strokeWidth="1.1" cx="6.8" cy="7" r="2" />
      <path strokeWidth="1.1" d="M6.8 2.6 v1.6 M6.8 9.8 v1.6 M2.4 7 h1.6 M9.6 7 h1.6" />
      <path strokeWidth="1.6" d="M11.2 7 H18 M18 7 V14.6" />
      <path strokeWidth="1.4" d="M18 10.2 h2.8 v2 h-2.8 M18 14.6 h2" />
      <path strokeWidth="1.1" d="M13.4 5.8 v2.4" />
    </g>
  )
}

/** The house mark as it is pressed onto the survey: key in a worn red ring. */
export function HouseStampMark({ x, y, size, className }: SymbolProps) {
  return (
    <g transform={`rotate(6 ${x} ${y})`} className={`map-seal map-seal--house ${className ?? ''}`} aria-hidden>
      <SealRings x={x} y={y} r={size / 2} />
      <ValdrisKeySigil x={x} y={y} size={size * 0.6} />
    </g>
  )
}

/** Wax seal: blob with the Valdris key pressed into it. */
export function WaxSeal({ x, y, size }: SymbolProps) {
  const r = size / 2
  return (
    <g transform={`rotate(-8 ${x} ${y})`} className="map-wax-seal" aria-hidden>
      <path
        className="map-wax-seal-blob"
        d={`M${x - r},${y} C${x - r},${y - r * 0.85} ${x - r * 0.5},${y - r} ${x},${y - r * 0.92}
           C${x + r * 0.6},${y - r * 1.05} ${x + r},${y - r * 0.5} ${x + r * 0.94},${y}
           C${x + r},${y + r * 0.6} ${x + r * 0.45},${y + r} ${x},${y + r * 0.95}
           C${x - r * 0.55},${y + r} ${x - r},${y + r * 0.55} ${x - r},${y} Z`}
      />
      <circle cx={x} cy={y} r={r * 0.62} className="map-wax-seal-rim" />
      <ValdrisKeySigil x={x} y={y} size={size * 0.46} className="map-wax-seal-press" />
    </g>
  )
}

/** Crossing marks. */
export function GateMark(props: SymbolProps) {
  return (
    <g transform={placed(props)} className={`map-symbol ${props.className ?? ''}`} aria-hidden>
      <path strokeWidth="2" d="M4 20 V10 a8 8 0 0 1 16 0 V20" />
      <path strokeWidth="2" d="M2 20 h20" />
    </g>
  )
}

export function FerryMark(props: SymbolProps) {
  return (
    <g transform={placed(props)} className={`map-symbol ${props.className ?? ''}`} aria-hidden>
      <path strokeWidth="2" d="M3 16 C7 18 17 18 21 16 L19 20 H5 Z" />
      <path strokeWidth="2" d="M12 16 V5 M12 5 C15 6 17 8 17 10 H12" />
    </g>
  )
}

export function ShaftMark(props: SymbolProps) {
  return (
    <g transform={placed(props)} className={`map-symbol ${props.className ?? ''}`} aria-hidden>
      <path strokeWidth="2" d="M12 3 v14 M6 12 l6 6 6-6" />
    </g>
  )
}

/** Compass rose, eight points, inked. */
export function CompassRose({ x, y, size }: SymbolProps) {
  const r = size / 2
  const inner = r * 0.42
  const diag = r * 0.62
  const diagInner = inner * 0.6
  const point = (px: number, py: number, qx: number, qy: number) => `M${x},${y} L${px},${py} L${qx},${qy} Z`
  return (
    <g className="map-compass" aria-hidden>
      <circle cx={x} cy={y} r={r * 0.78} className="map-compass-ring" />
      {/* diagonal points */}
      <path
        className="map-compass-minor"
        d={[
          point(x + diag, y - diag, x + diagInner, y),
          point(x + diag, y + diag, x, y + diagInner),
          point(x - diag, y + diag, x - diagInner, y),
          point(x - diag, y - diag, x, y - diagInner),
        ].join(' ')}
      />
      {/* cardinal points */}
      <path
        className="map-compass-major"
        d={[
          point(x, y - r, x + diagInner * 0.8, y - diagInner * 0.8),
          point(x + r, y, x + diagInner * 0.8, y + diagInner * 0.8),
          point(x, y + r, x - diagInner * 0.8, y + diagInner * 0.8),
          point(x - r, y, x - diagInner * 0.8, y - diagInner * 0.8),
        ].join(' ')}
      />
      <text x={x} y={y - r - 6} className="map-compass-n">
        N
      </text>
    </g>
  )
}

/** Small inked marks for POI types on district plates. */
const POI_TYPE_PATHS: Record<string, string[]> = {
  guild: ['M11 3h9v6h-9z', 'M13 9 L5 20'],
  tavern: ['M7 5 h9 v12 a3 3 0 0 1 -3 3 h-3 a3 3 0 0 1 -3 -3 Z', 'M16 8 h3 a2 2 0 0 1 0 6 h-3'],
  shop: ['M4 9 h16 M5 9 l1.5 -5 h11 L19 9', 'M6 9 v11 h12 V9', 'M9 20 v-6 h6 v6'],
  court: ['M12 3v12M6 6l-3 6h6L6 6zM18 6l-3 6h6l-3-6zM3 19h18'],
  residence: ['M4 12 L12 4 L20 12', 'M6 11 V20 H18 V11', 'M10 20 v-5 h4 v5'],
  market: ['M4 8 h16 l-2 -4 H6 Z', 'M5 8 v12 M19 8 v12', 'M5 13 h14'],
  faction_hq: ['M6 21 V3', 'M6 4 H18 L15 7.5 L18 11 H6'],
  black_market: ['M5 9 C8 5 16 5 19 9 C16 13 8 13 5 9 Z', 'M12 9 m-1.6 0 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0', 'M7 15 l10 4 M7 19 l10 -4'],
}

export function PoiMark({ type, ...props }: SymbolProps & { type: string }) {
  const paths = POI_TYPE_PATHS[type] ?? ['M12 5 a7 7 0 1 0 0.01 0']
  return (
    <g transform={placed(props)} className={`map-symbol ${props.className ?? ''}`} aria-hidden>
      {paths.map((d) => (
        <path key={d} strokeWidth="2.4" d={d} />
      ))}
    </g>
  )
}
