/** Canonical IDs for factions in data/definitions/factions.json. */
export const FACTION_IDS = {
  CIVIC_COMPACT: 'faction-civic-compact',
  FOUNDRY_LEAGUE: 'faction-foundry-league',
  GILDED_COURT: 'faction-gilded-court',
  HOUSE_MERROW: 'faction-house-merrow',
  SYNDICATE: 'faction-syndicate',
  TALLOW_RING: 'faction-tallow-ring',
  THE_RESTORED: 'faction-the-restored',
} as const

export type FactionId = typeof FACTION_IDS[keyof typeof FACTION_IDS]
