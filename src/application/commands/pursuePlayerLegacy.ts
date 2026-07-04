import type { GameState } from '../../domain'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import type { HeirLegitimacy } from '../../domain/game/contracts'
import type { IntimacyStage, RelationshipAxes } from '../../domain/relationships/contracts'
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
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
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

  for (const npc of state.npcRuntimeStates) {
    if (npc.pregnancyState) continue // already pregnant

    const key = buildRelationshipKey(PLAYER_ID, npc.npcId)
    const edge = state.relationships[key]
    if (!edge?.legacyIntentActive) continue

    if (rng() < DAILY_PROBABILITY) {
      next = {
        ...next,
        npcRuntimeStates: next.npcRuntimeStates.map((n) =>
          n.npcId === npc.npcId
            ? { ...n, pregnancyState: { context: 'consensual' as const, daysElapsed: 0, questTag: null, wanted: null } }
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

function resolveIntimacyStage(
  state: GameState,
  leftId: string,
  rightId: string,
): IntimacyStage {
  const forward = state.relationships[buildRelationshipKey(leftId, rightId)] as RelationshipAxes | undefined
  const backward = state.relationships[buildRelationshipKey(rightId, leftId)] as RelationshipAxes | undefined
  const stages: IntimacyStage[] = [
    forward?.intimacyStage ?? 'none',
    backward?.intimacyStage ?? 'none',
  ]
  if (stages.includes('committed')) return 'committed'
  if (stages.includes('attachment')) return 'attachment'
  if (stages.includes('affinity')) return 'affinity'
  return 'none'
}

function buildBiologicalHeirOrigin(
  state: GameState,
  motherNpcId: string,
  otherParentId: string,
): { originStory: string; legitimacyStatus: HeirLegitimacy; birthContext: string } {
  const mother = state.npcRuntimeStates.find((npc) => npc.npcId === motherNpcId)
  const otherParent = state.npcRuntimeStates.find((npc) => npc.npcId === otherParentId)
  const motherName = mother?.name ?? motherNpcId
  const otherParentName = otherParentId === PLAYER_ID ? 'the house lord' : otherParent?.name ?? otherParentId
  const intimacyStage = resolveIntimacyStage(state, motherNpcId, otherParentId)
  const wardLinked = mother?.status === 'ward' || otherParent?.status === 'ward'

  if (wardLinked) {
    return {
      originStory:
        `${motherName} brought the child to term under house protection while the Register kept its language deliberately thin. ` +
        `The entry was written as ward-born first and kin only in whispers, because that was the safer truth to let stand in public.`,
      legitimacyStatus: 'hidden',
      birthContext: `Born Day ${state.day}, ward-born under house protection; mother: ${motherName}; other parent: ${otherParentName}`,
    }
  }

  if (otherParentId === PLAYER_ID && intimacyStage === 'committed') {
    return {
      originStory:
        `${motherName} delivered the child into a house that already knew the private vow behind it. ` +
        `Servants closed ranks, the register was notified, and what might have been gossip became obligation the house could no longer deny.`,
      legitimacyStatus: 'recognized',
      birthContext: `Born Day ${state.day}, committed player relationship acknowledged by the house; mother: ${motherName}`,
    }
  }

  if (intimacyStage === 'committed') {
    return {
      originStory:
        `${motherName} bore the child out of a bond the parents had already made real in private, even if the house had not yet chosen its public language. ` +
        `The birth entered the books as kin under review, with duty arriving faster than consensus.`,
      legitimacyStatus: 'unknown',
      birthContext: `Born Day ${state.day}, committed private bond; mother: ${motherName}; other parent: ${otherParentName}`,
    }
  }

  if (intimacyStage === 'attachment' || intimacyStage === 'affinity') {
    return {
      originStory:
        `${motherName} presented the child to the house before any public claim had hardened around the parentage. ` +
        `The register took the birth, left one name unwritten, and let silence do the work that law was not yet ready to do.`,
      legitimacyStatus: 'hidden',
      birthContext: `Born Day ${state.day}, acknowledged birth with unnamed parent in register; mother: ${motherName}`,
    }
  }

  return {
    originStory:
      `${motherName} gave birth under a claim that immediately invited scrutiny. ` +
      `The Merrow Registry was notified before the blood was even washed away, and the child's standing entered the house as a matter to be argued rather than assumed.`,
    legitimacyStatus: 'contested',
    birthContext: `Born Day ${state.day}, legitimacy contested and registry notified; mother: ${motherName}; other parent: ${otherParentName}`,
  }
}

/**
 * Tick pregnancyState.daysElapsed for all pregnant NPCs.
 * On resolution (daysElapsed >= GESTATION_DAYS), creates a biological heir in houseHeirs.
 * Called from endDay after all other NPC state updates.
 */
export function tickPregnancyProgress(state: GameState): GameState {
  let next = state

  for (const npc of state.npcRuntimeStates) {
    if (!npc.pregnancyState) continue

    const newDays = npc.pregnancyState.daysElapsed + 1

    if (newDays < GESTATION_DAYS) {
      next = {
        ...next,
        npcRuntimeStates: next.npcRuntimeStates.map((n) =>
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
      npcRuntimeStates: next.npcRuntimeStates.map((n) =>
        n.npcId === npc.npcId ? { ...n, pregnancyState: undefined } : n,
      ),
    }

    // Only create a house heir for consensual / player-origin pregnancies
    if (npc.pregnancyState.context === 'consensual' && next.house.houseHeirs.length < 2) {
      const heirId = `heir-${npc.npcId}-day${state.day}`
      const otherParent = npc.pregnancyState.partnerNpcId ?? PLAYER_ID
      const parentRefs = [npc.npcId, otherParent]
      const { originStory, legitimacyStatus, birthContext } = buildBiologicalHeirOrigin(
        next,
        npc.npcId,
        otherParent,
      )

      next = {
        ...next,
        house: {
          ...next.house,
          houseHeirs: [
            ...next.house.houseHeirs,
            {
              id: heirId,
              name: `Child of ${npc.name}`,
              originStory,
              stage: 'child' as const,
              arrivalDay: next.day,
              origin: 'biological' as const,
              parentRefs,
              legitimacyStatus,
              birthContext,
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
