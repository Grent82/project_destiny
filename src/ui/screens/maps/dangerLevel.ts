/**
 * Shared district danger-level presentation (destiny-s9iy).
 *
 * dangerLevel is an authored 1-5 integer (src/domain/districts/contracts.ts) -- there is no 0-100
 * danger scale anywhere in the schema. districtTension (0-100, dynamic) is a separate, unrelated
 * concept already surfaced via its own "Tension: Calm/Uneasy/Dangerous" badge in
 * DistrictLedgerPanel. Labels here match what DistrictLedgerPanel already shipped (Low/Moderate/
 * Elevated/High/Severe) rather than introducing a second, slightly different label set for the
 * same five tiers.
 */
export const DANGER_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Moderate',
  3: 'Elevated',
  4: 'High',
  5: 'Severe',
}

export function dangerLabel(dangerLevel: number): string {
  return DANGER_LABELS[dangerLevel] ?? String(dangerLevel)
}

/** Badge class per tier, matching the existing tension-badge rgba palette convention. */
export function dangerBadgeClass(dangerLevel: number): string {
  if (dangerLevel <= 1) return 'danger-badge--low'
  if (dangerLevel === 2) return 'danger-badge--moderate'
  if (dangerLevel === 3) return 'danger-badge--elevated'
  if (dangerLevel === 4) return 'danger-badge--high'
  return 'danger-badge--severe'
}

/**
 * A grounded, per-district explanation of why access is restricted -- never a generic
 * placeholder. Districts with an authored minControlFactionStanding get the mechanical
 * requirement; the others (condemned/unofficial districts with no faction gate at all) fall back
 * to their own narrativeSummary, which already explains the reason in-fiction (e.g. "officially
 * evacuated after structural collapse" for the Hollows, "does not appear on any official city
 * map" for the Below) -- confirmed via data/definitions/districts.json, not assumed.
 */
export function restrictionReason(entry: {
  minControlFactionStanding: number | null
  controllingFactionId: string | null
  narrativeSummary: string
}, factionName: (factionId: string) => string): string {
  if (entry.minControlFactionStanding != null && entry.controllingFactionId) {
    return `Requires standing ${entry.minControlFactionStanding}+ with ${factionName(entry.controllingFactionId)}.`
  }
  return entry.narrativeSummary
}
