import type { GameState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'

const PLAYER_ID = 'player'

/**
 * Set legacy intent on a committed relationship.
 *
 * This does NOT directly set pregnancyState. It marks legacyIntentActive on
 * the relationship edge; the world simulation then resolves the outcome over
 * time at low probability. The flag is never surfaced to the player as a
 * "trying" status.
 *
 * Returns state unchanged if the NPC is not at 'committed' stage.
 */
export function pursuePlayerLegacy(state: GameState, npcId: string): GameState {
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return state

  const playerToNpcKey = buildRelationshipKey(PLAYER_ID, npcId)
  const edge = state.relationships[playerToNpcKey]
  if (!edge) return state

  if ((edge.intimacyStage ?? 'none') !== 'committed') return state

  const next: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [playerToNpcKey]: { ...edge, legacyIntentActive: true },
    },
  }

  return appendActivityLogEntry(
    next,
    'system',
    `You and ${npc.name} choose to build something that might outlast the house.`,
  )
}

/**
 * Tick legacy intent: low-probability chance each day to set pregnancyState
 * on an NPC when legacyIntentActive is set on the player→NPC edge.
 *
 * Probability: ~0.33% per day (~1-in-300, resolving within ~300 days on average).
 * Once pregnancyState is set, legacyIntentActive is cleared.
 */
export function tickLegacyIntent(state: GameState, rng: () => number): GameState {
  let next = state
  const DAILY_PROBABILITY = 1 / 300

  for (const npc of state.roster) {
    if (npc.pregnancyState) continue // already pregnant

    const key = buildRelationshipKey(PLAYER_ID, npc.npcId)
    const edge = state.relationships[key]
    if (!edge?.legacyIntentActive) continue

    if (rng() < DAILY_PROBABILITY) {
      next = {
        ...next,
        roster: next.roster.map((n) =>
          n.npcId === npc.npcId
            ? { ...n, pregnancyState: { context: 'consensual' as const, daysElapsed: 0, questTag: null } }
            : n,
        ),
        relationships: {
          ...next.relationships,
          [key]: { ...edge, legacyIntentActive: false },
        },
      }
    }
  }

  return next
}

const GESTATION_DAYS = 270

/**
 * Tick pregnancyState.daysElapsed for all pregnant NPCs.
 * On resolution (daysElapsed >= GESTATION_DAYS), creates a biological heir in houseHeirs.
 * Called from endDay after all other NPC state updates.
 */
export function tickPregnancyProgress(state: GameState): GameState {
  let next = state

  for (const npc of state.roster) {
    if (!npc.pregnancyState) continue

    const newDays = npc.pregnancyState.daysElapsed + 1

    if (newDays < GESTATION_DAYS) {
      next = {
        ...next,
        roster: next.roster.map((n) =>
          n.npcId === npc.npcId
            ? { ...n, pregnancyState: { ...n.pregnancyState!, daysElapsed: newDays } }
            : n,
        ),
      }
      continue
    }

    // Birth: remove pregnancyState, optionally create heir
    next = {
      ...next,
      roster: next.roster.map((n) =>
        n.npcId === npc.npcId ? { ...n, pregnancyState: undefined } : n,
      ),
    }

    // Only create a house heir for consensual / player-origin pregnancies
    if (npc.pregnancyState.context === 'consensual' && next.house.houseHeirs.length < 2) {
      const heirId = `heir-${npc.npcId}-day${state.day}`
      next = {
        ...next,
        house: {
          ...next.house,
          houseHeirs: [
            ...next.house.houseHeirs,
            {
              id: heirId,
              name: `Child of ${npc.name}`,
              originStory: `Born to ${npc.name} within House Valdris.`,
              stage: 'child' as const,
              arrivalDay: next.day,
              origin: 'biological' as const,
              parentRefs: [PLAYER_ID, npc.npcId],
            },
          ],
        },
      }

      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name} has given birth. A child enters the house.`,
      )
    }
  }

  return next
}
