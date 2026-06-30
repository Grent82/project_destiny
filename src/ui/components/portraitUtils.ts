/**
 * Portrait utility functions - shared between PortraitFallback and other components.
 * Separated to avoid ESLint fast-refresh warnings.
 */

/**
 * Extracts initials from an NPC name.
 * Examples:
 *   'npc-ida-rhys' -> 'IR'
 *   'npc-enemy-harlen-voss' -> 'HV'
 *   'npc-the-wren' -> 'TW'
 */
export function extractInitials(npcId: string, nameOverride?: string): string {
  if (nameOverride) {
    const parts = nameOverride.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].charAt(0).toUpperCase()
  }

  // Extract from npcId: 'npc-ida-rhys' -> ['ida', 'rhys'] -> 'IR'
  const namePart = npcId.replace(/^npc-/, '').replace(/^enemy-/, '')
  const parts = namePart.split('-').filter((p) => p.length > 1)

  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  if (parts.length === 1) {
    // For single-word names like 'tav', 'bog', 'cutter'
    return parts[0].slice(0, 2).toUpperCase()
  }
  return '??'
}

/**
 * Maps faction ID to CSS class suffix.
 */
export function getFactionClass(factionId: string | null): string {
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

