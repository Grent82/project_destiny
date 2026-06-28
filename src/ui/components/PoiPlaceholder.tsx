import { useMemo } from 'react'
import { getPoiTypeIcon } from './poiUtils'
import './PoiPlaceholder.css'

/**
 * PoiPlaceholderProps - configuration for the POI placeholder component.
 */
export interface PoiPlaceholderProps {
  /** POI type (e.g., 'guild', 'tavern', 'shop') */
  poiType: string
  /** Optional POI name for aria-label */
  poiName?: string
  /** Optional faction ID for color coding */
  factionId?: string | null
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Whether to show the type label below the icon */
  showLabel?: boolean
}

/**
 * PoiPlaceholder - displays a styled placeholder icon for POI types.
 * Uses SVG icons with faction-colored accents.
 *
 * Usage:
 *   <PoiPlaceholder poiType="tavern" poiName="The Ash" />
 */
export function PoiPlaceholder({
  poiType,
  poiName,
  factionId,
  size = 'medium',
  showLabel = true,
}: PoiPlaceholderProps) {
  const iconData = useMemo(() => getPoiTypeIcon(poiType), [poiType])
  const typeLabel = POI_TYPE_LABELS[poiType] ?? poiType

  const sizeClass = size === 'small' ? 'poi-placeholder--small'
    : size === 'large' ? 'poi-placeholder--large'
    : 'poi-placeholder--medium'

  const factionClass = getFactionClass(factionId ?? null)

  return (
    <div
      className={`poi-placeholder ${sizeClass} poi-placeholder--${factionClass}`}
      aria-label={poiName ? `Venue: ${poiName}` : 'Venue placeholder'}
    >
      <div className="poi-placeholder-icon">
        <svg viewBox={iconData.viewBox} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {iconData.paths.map((path, idx) => (
            <path
              key={idx}
              d={path.d}
              fill={path.fill || 'none'}
              stroke={path.stroke || 'currentColor'}
              strokeWidth={path.strokeWidth || '1'}
              fillOpacity={path.fillOpacity || '1'}
              strokeDasharray={path.strokeDasharray || undefined}
            />
          ))}
        </svg>
      </div>
      {showLabel && (
        <span className="poi-placeholder-label">{typeLabel}</span>
      )}
    </div>
  )
}

const POI_TYPE_LABELS: Record<string, string> = {
  guild: 'Guild Hall',
  tavern: 'Tavern',
  shop: 'Shop',
  court: 'Court',
  residence: 'Residence',
  market: 'Market',
  faction_hq: 'Faction House',
  black_market: 'Black Market',
}

function getFactionClass(factionId: string | null): string {
  if (!factionId) return 'neutral'

  const factionClassMap: Record<string, string> = {
    'faction-civic-compact': 'compact',
    'faction-gilded-court': 'gilded',
    'faction-foundry-league': 'foundry',
    'faction-tallow-ring': 'tallow',
    'faction-restored': 'restored',
  }

  return factionClassMap[factionId] ?? 'neutral'
}
