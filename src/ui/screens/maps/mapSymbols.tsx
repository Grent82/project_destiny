/**
 * Inked symbols for the House Copy maps. Faction and house marks are
 * inlined from public/icons.svg and public/house-sigils.svg (external
 * <use> fragments are unreliable across browsers); crossing and POI
 * marks are drawn in the same 24×24 stroke vocabulary.
 */

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

/** Faction control stamps — paths copied from public/icons.svg. */
const FACTION_PATHS: Record<string, string[]> = {
  'faction-civic-compact': [
    'M12 4v16M4 7h16M9 20h6',
    'M4 7v4M20 7v4',
    'M1 11 Q4 15 7 11',
    'M17 11 Q20 15 23 11',
  ],
  'faction-gilded-court': ['M2 17 L2 9 L7 13 L12 5 L17 13 L22 9 L22 17 Z', 'M2 20h20'],
  'faction-foundry-league': ['M11 3h9v6h-9z', 'M13 9 L5 20'],
  'faction-tallow-ring': ['M2 12 C6 6 18 6 22 12 C18 18 6 18 2 12 Z', 'M15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0'],
  'faction-restored': [
    'M12 22 C7 22 4 18 4 14 C4 10 7 8 9 5 C9 8 11 9 11 9 C11 6 13 3 15 2 C15 6 18 8 19 11 C20 8 20 6 19 4 C22 7 20 14 20 14 C20 18 17 22 12 22 Z',
  ],
}

export function FactionStamp({ factionId, ...props }: SymbolProps & { factionId: string }) {
  const paths = FACTION_PATHS[factionId]
  if (!paths) return null
  return (
    <g transform={placed(props)} className={`map-symbol ${props.className ?? ''}`} aria-hidden>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  )
}

/** House Valdris key — from public/house-sigils.svg. */
export function ValdrisKeySigil(props: SymbolProps) {
  return (
    <g transform={placed(props)} className={`map-symbol ${props.className ?? ''}`} aria-hidden>
      <circle cx="7" cy="7" r="4" />
      <path d="M10 7h8M14 7v7M14 10l3 3M14 10l-3 3" />
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
      <ValdrisKeySigil x={x} y={y} size={size * 0.52} className="map-wax-seal-press" />
    </g>
  )
}

/** Crossing marks. */
export function GateMark(props: SymbolProps) {
  return (
    <g transform={placed(props)} className={`map-symbol ${props.className ?? ''}`} aria-hidden>
      <path d="M4 20 V10 a8 8 0 0 1 16 0 V20" />
      <path d="M2 20 h20" />
    </g>
  )
}

export function FerryMark(props: SymbolProps) {
  return (
    <g transform={placed(props)} className={`map-symbol ${props.className ?? ''}`} aria-hidden>
      <path d="M3 16 C7 18 17 18 21 16 L19 20 H5 Z" />
      <path d="M12 16 V5 M12 5 C15 6 17 8 17 10 H12" />
    </g>
  )
}

export function ShaftMark(props: SymbolProps) {
  return (
    <g transform={placed(props)} className={`map-symbol ${props.className ?? ''}`} aria-hidden>
      <path d="M12 3 v14 M6 12 l6 6 6-6" />
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
        <path key={d} d={d} />
      ))}
    </g>
  )
}
