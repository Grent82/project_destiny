/**
 * Renown thresholds and unlocks.
 * Renown is the player's organisational progression metric — earned through
 * quest completions, key decisions, and milestones.
 */

export const RENOWN_THRESHOLDS: {
  level: number
  renown: number
  label: string
  rosterSlots: number
  districtInfluenceSlots: number
  councilSeats: number
}[] = [
  { level: 1, renown: 0, label: 'Unknown', rosterSlots: 4, districtInfluenceSlots: 1, councilSeats: 0 },
  { level: 2, renown: 25, label: 'Whispered', rosterSlots: 5, districtInfluenceSlots: 1, councilSeats: 0 },
  { level: 3, renown: 60, label: 'Noted', rosterSlots: 6, districtInfluenceSlots: 2, councilSeats: 0 },
  { level: 4, renown: 110, label: 'Spoken Of', rosterSlots: 7, districtInfluenceSlots: 2, councilSeats: 1 },
  { level: 5, renown: 175, label: 'Recognized', rosterSlots: 8, districtInfluenceSlots: 3, councilSeats: 1 },
  { level: 6, renown: 260, label: 'Respected', rosterSlots: 9, districtInfluenceSlots: 3, councilSeats: 1 },
  { level: 7, renown: 370, label: 'Feared', rosterSlots: 10, districtInfluenceSlots: 4, councilSeats: 2 },
  { level: 8, renown: 510, label: 'Renowned', rosterSlots: 12, districtInfluenceSlots: 4, councilSeats: 2 },
  { level: 9, renown: 700, label: 'Legendary', rosterSlots: 14, districtInfluenceSlots: 5, councilSeats: 3 },
  { level: 10, renown: 1000, label: 'Ascendant', rosterSlots: 16, districtInfluenceSlots: 6, councilSeats: 4 },
]

export function getRenownLevel(renown: number): (typeof RENOWN_THRESHOLDS)[0] {
  let current = RENOWN_THRESHOLDS[0]!
  for (const threshold of RENOWN_THRESHOLDS) {
    if (renown >= threshold.renown) current = threshold
    else break
  }
  return current
}

export function getRenownProgress(renown: number): { current: number; next: number | null; pct: number } {
  const level = getRenownLevel(renown)
  const levelIndex = RENOWN_THRESHOLDS.findIndex((t) => t.level === level.level)
  const nextThreshold = RENOWN_THRESHOLDS[levelIndex + 1] ?? null
  if (!nextThreshold) return { current: renown, next: null, pct: 100 }
  const pct = Math.floor(((renown - level.renown) / (nextThreshold.renown - level.renown)) * 100)
  return { current: renown, next: nextThreshold.renown, pct }
}

/**
 * Rarity-based skill caps for NPCs.
 * Skills cannot be trained beyond the cap for the NPC's rarity.
 */
export const RARITY_SKILL_CAPS: Record<string, number> = {
  common: 70,
  uncommon: 80,
  rare: 90,
  elite: 95,
  legendary: 100,
}

/**
 * Diminishing returns multiplier for skill training above certain thresholds.
 */
export function skillGainMultiplier(currentSkill: number): number {
  if (currentSkill >= 80) return 0.25
  if (currentSkill >= 60) return 0.5
  return 1.0
}

/**
 * Skill milestones that trigger unlocks when crossed.
 */
export const SKILL_MILESTONES = [25, 45, 55, 70, 85, 100] as const
export type SkillMilestone = (typeof SKILL_MILESTONES)[number]

export function crossedMilestones(oldValue: number, newValue: number): SkillMilestone[] {
  return SKILL_MILESTONES.filter((m) => oldValue < m && newValue >= m)
}
