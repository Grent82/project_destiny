export type FactionStandingTier = 'Hostile' | 'Cold' | 'Neutral' | 'Warm' | 'Allied'

interface StandingTierBand {
  tier: FactionStandingTier
  /** Inclusive upper bound of this band on the -100..100 standing scale. */
  max: number
  color: string
}

/**
 * Five equal 40-point bands spanning the -100..100 standing scale. This is the single
 * source of truth for standing tier labels and colors on the faction cards -- previously
 * the tier label (old standingTier) and the bar fill color (old standingBarStyle) used two
 * different, uncoordinated sets of breakpoints, so a standing could show one tier's label
 * with another tier's color (e.g. -45 read "Cold" with an orange fill instead of Cold's own
 * color). Deriving both from the same bands makes that impossible.
 */
export const STANDING_TIER_BANDS: StandingTierBand[] = [
  { tier: 'Hostile', max: -60, color: '#f44336' },
  { tier: 'Cold', max: -20, color: '#ff9800' },
  { tier: 'Neutral', max: 20, color: '#9e9e9e' },
  { tier: 'Warm', max: 60, color: '#ffc107' },
  { tier: 'Allied', max: Infinity, color: '#4caf50' },
]

function bandFor(standing: number): StandingTierBand {
  return STANDING_TIER_BANDS.find((band) => standing <= band.max) ?? STANDING_TIER_BANDS[STANDING_TIER_BANDS.length - 1]
}

export function standingTier(standing: number): FactionStandingTier {
  return bandFor(standing).tier
}

export function standingTierColor(standing: number): string {
  return bandFor(standing).color
}

/** Position (0-100) of the standing dot along a bar spanning the -100..100 scale. */
export function standingDotPercent(standing: number): number {
  const clamped = Math.max(-100, Math.min(100, standing))
  return ((clamped + 100) / 200) * 100
}

export function formatStandingValue(standing: number): string {
  return standing > 0 ? `+${standing}` : `${standing}`
}

export const FACTION_STANDING_TOOLTIP =
  'Standing range: Hostile ≤ −60 · Cold −59 to −20 · Neutral −19 to 20 · Warm 21 to 60 · Allied > 60. Standing shifts with every choice.'
