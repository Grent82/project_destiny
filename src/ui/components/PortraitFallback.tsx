import { useMemo } from 'react'
import { extractInitials, getFactionClass } from './portraitUtils'
import './PortraitFallback.css'

/**
 * PortraitFallbackProps - configuration for the portrait fallback component.
 */
export interface PortraitFallbackProps {
  /** NPC ID (e.g., 'npc-ida-rhys') - used to extract initials */
  npcId: string
  /** Faction ID for color coding (e.g., 'faction-gilded-court') */
  factionId: string | null
  /** Optional name override - if not provided, extracted from npcId */
  nameOverride?: string
  /** Whether this is a primary/story NPC (gets special styling) */
  isPrimary?: boolean
  /** Small size variant (for compact layouts) */
  size?: 'small' | 'medium' | 'large'
}

/**
 * PortraitFallback - displays a styled fallback portrait when custom art is unavailable.
 * Shows faction-colored background with NPC initials.
 *
 * Usage:
 *   <PortraitFallback npcId="npc-ida-rhys" factionId="faction-gilded-court" />
 */
export function PortraitFallback({
  npcId,
  factionId,
  nameOverride,
  isPrimary = false,
  size = 'medium',
}: PortraitFallbackProps) {
  const initials = useMemo(() => extractInitials(npcId, nameOverride), [npcId, nameOverride])
  const factionClass = getFactionClass(factionId)

  const sizeClass = size === 'small' ? 'portrait-fallback--small'
    : size === 'large' ? 'portrait-fallback--large'
    : 'portrait-fallback--medium'

  const primaryClass = isPrimary ? ' portrait-fallback--primary' : ''

  return (
    <div
      className={`portrait-fallback ${sizeClass}${primaryClass} portrait-fallback--${factionClass}`}
      aria-label={`Portrait placeholder for ${nameOverride ?? npcId}`}
    >
      <span className="portrait-fallback-initials">{initials}</span>
      <svg className="portrait-fallback-silhouette" viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="50" cy="28" rx="16" ry="18" fill="currentColor" opacity="0.6"/>
        <path d="M28 32 Q50 15 72 32 Q68 50 50 52 Q32 50 28 32Z" fill="currentColor" opacity="0.5"/>
        <path d="M22 55 Q50 48 78 55 L85 130 H15 Z" fill="currentColor" opacity="0.45"/>
        <path d="M18 58 Q30 52 50 50 Q70 52 82 58 L80 72 Q65 65 50 64 Q35 65 20 72Z" fill="currentColor" opacity="0.55"/>
      </svg>
    </div>
  )
}
