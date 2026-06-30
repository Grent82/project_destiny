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

/**
 * List of NPCs that have custom portrait images in /portraits/.
 * All 49 NPCs have portraits generated (June 2026).
 */
const CUSTOM_PORTRAITS = new Set([
  'aldric-vane',
  'alis-vey',
  'bog',
  'brand',
  'brannic-thule',
  'bren-aldoth',
  'cessa-rill',
  'cress-aldmoor',
  'cutter',
  'dael-morw',
  'dalen-morke',
  'dara-slink',
  'elyn',
  'enemy-catrin-hale',
  'enemy-harlen-voss',
  'enemy-lady-sorn',
  'enemy-the-dockmaster',
  'enemy-tomas-rell',
  'evar-koss',
  'fenwick-pale',
  'garet-doyle',
  'halvard-senn',
  'ida-rhys',
  'irenne-brek',
  'lira-ashcroft',
  'lirien-ashcroft',
  'lissel-crane',
  'maret-sunne',
  'marion-vale',
  'mira',
  'nessa-vain',
  'old-maret',
  'orren-wex',
  'orven-pell',
  'osanna-cray',
  'oswin-farr',
  'petra-sunn',
  'player',
  'rutha-kael',
  'sable-cairn-head',
  'sable-wrent',
  'sanna-veld',
  'sister-vael',
  'tav',
  'tessaly-ash',
  'tessaly-wode',
  'the-wren',
  'torvald-messe',
  'verek-holst',
  'verek-sorn',
  'veyran-malk',
])

/**
 * Check if an NPC has a custom portrait image available.
 * Returns true if the NPC has a custom portrait, false if the fallback should be used.
 *
 * Usage:
 *   hasPortraitAvailable('npc-ida-rhys') → true (has custom portrait)
 *   hasPortraitAvailable('npc-unknown-npc') → false (show fallback with initials)
 */
export function hasPortraitAvailable(npcId: string): boolean {
  const portraitId = npcId.replace(/^npc-/, '').replace(/^enemy-/, '')
  return CUSTOM_PORTRAITS.has(portraitId)
}

/**
 * Get the portrait URL for an NPC. Returns the path to the custom portrait
 * if available, or null if the fallback should be used.
 *
 * Usage:
 *   getPortraitUrl('npc-ida-rhys') → '/portraits/ida-rhys.jpg'
 *   getPortraitUrl('npc-unknown') → null (use fallback)
 */
export function getPortraitUrl(npcId: string): string | null {
  const portraitId = npcId.replace(/^npc-/, '').replace(/^enemy-/, '')
  if (CUSTOM_PORTRAITS.has(portraitId)) {
    return `/portraits/${portraitId}.jpg`
  }
  return null
}

