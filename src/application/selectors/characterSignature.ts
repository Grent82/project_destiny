import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

/** Threshold values for state-driven signature lines */
const STRESS_HIGH = 70
const HEALTH_LOW = 40
const MORALE_LOW = 35
const FEAR_HIGH = 60
const HUNGER_HIGH = 65
const FATIGUE_HIGH = 65

/**
 * Derives a single witness-observation line per NPC from:
 * 1. Dominant quirk text (first quirk with highest-priority tag)
 * 2. Current emotional/operational state (stress, health, morale, fear, hunger, fatigue)
 *
 * Voice rule: reads like a witness observation, not a game status.
 * Returns empty string if no meaningful signal is found.
 */
export function selectCharacterSignature(state: RootState, npcId: string): string {
  const runtime = state.game.roster.find((r) => r.npcId === npcId)
  const definition = contentCatalog.npcsById.get(npcId)

  if (!runtime || !definition) return ''

  // 1. Dominant quirk — prefer protective/loyal/cautious tags as highest identity signal
  const quirks = definition.quirks ?? []
  const PRIORITY_TAGS = ['protective', 'loyal', 'cautious', 'principled', 'secretive']
  const dominantQuirk =
    PRIORITY_TAGS.reduce<(typeof quirks)[0] | null>((found, tag) => {
      if (found) return found
      return quirks.find((q) => q.tags.includes(tag as never)) ?? null
    }, null) ?? quirks[0] ?? null

  // 2. State signals
  const { stress, health, morale, fear, hunger, fatigue } = runtime.states

  if (fear >= FEAR_HIGH) {
    return dominantQuirk
      ? `Flinches at sudden movement. ${capitalize(dominantQuirk.text)}.`
      : 'Flinches at sudden movement and will not meet your eyes.'
  }
  if (health <= HEALTH_LOW) {
    return dominantQuirk
      ? `Works through the pain. ${capitalize(dominantQuirk.text)}.`
      : 'Moving carefully. Something is wrong with the body.'
  }
  if (stress >= STRESS_HIGH) {
    return dominantQuirk
      ? `Under strain. ${capitalize(dominantQuirk.text)}.`
      : 'Jaw set, words shorter than usual. Running on tension.'
  }
  if (morale <= MORALE_LOW) {
    return dominantQuirk
      ? `Quiet lately. ${capitalize(dominantQuirk.text)}.`
      : 'Keeps to the edge of the room. Waiting for something to matter again.'
  }
  if (hunger >= HUNGER_HIGH) {
    return dominantQuirk
      ? `${capitalize(dominantQuirk.text)}. Has not eaten enough today.`
      : 'Distracted. Has not eaten enough today.'
  }
  if (fatigue >= FATIGUE_HIGH) {
    return dominantQuirk
      ? `${capitalize(dominantQuirk.text)} — though slower than usual.`
      : 'Pushing through it. Too tired to be careful.'
  }

  // 3. Fall back to first quirk alone
  if (dominantQuirk) {
    return capitalize(dominantQuirk.text) + '.'
  }

  return ''
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
