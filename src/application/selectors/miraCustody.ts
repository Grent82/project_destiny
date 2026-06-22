import type { GameState } from '../../domain'
import { getAllNpcCaptivityStates } from '../commands/captivityRegistry'

/**
 * MirroredCustodyTruth represents the level of information the player has earned
 * about Mira's captivity. Each stage reveals more specific details.
 */
export type MirroredCustodyTruth = {
  /** Stage 1: Site is known (e.g., "old tannery in The Pale") */
  siteKnown: boolean
  /** Stage 2: Room route is known (e.g., "holding floor and inner ring") */
  roomRouteKnown: boolean
  /** Stage 3: Handler/signer is known (e.g., "Dalen Morke") */
  handlerKnown: boolean
  /** Stage 4: Condition change is known (e.g., "her condition has worsened") */
  conditionKnown: boolean
}

/**
 * Returns the custody truth that the player has earned based on quest progression.
 * This is used by quest text to provide runtime-backed information without leaking
 * too much on a fresh save.
 */
export function getMiraCustodyTruthForPlayer(
  state: Pick<GameState, 'npcCaptivityStates' | 'roster' | 'completedQuestIds' | 'activeQuests'>,
): MirroredCustodyTruth | null {
  const captivity = getAllNpcCaptivityStates(state)['npc-mira']
  if (!captivity || (captivity.status !== 'captive' && captivity.status !== 'missing')) {
    return null
  }

  // Check quest progression to determine what truth the player has earned
  const hasAct1 = state.completedQuestIds.includes('quest-mira-act1-wren-favor')
  const hasAct2 = state.completedQuestIds.includes('quest-mira-act2-tannery-watch')
  const hasRescue = state.completedQuestIds.includes('quest-mira-rescue')
  const isAct2Active = state.activeQuests.some((q) => q.questId === 'quest-mira-act2-tannery-watch')
  const isRescueActive = state.activeQuests.some((q) => q.questId === 'quest-mira-rescue')

  return {
    // Site truth: earned after act1 completes, or when act2 is active/completed
    // (completing act2 implies act1 was completed)
    siteKnown: hasAct1 || hasAct2 || isAct2Active,
    // Room-route truth: earned after act2 completes or during rescue
    roomRouteKnown: hasAct2 || isRescueActive,
    // Handler truth: earned after act2 completes (Dalen Morke signed the order)
    handlerKnown: hasAct2,
    // Condition truth: earned during rescue when seeing Mira's state
    conditionKnown: isRescueActive || hasRescue,
  }
}

/**
 * Returns a text description of Mira's current site if the player has earned that truth.
 */
export function getMiraSiteDescription(
  state: Pick<GameState, 'npcCaptivityStates' | 'roster' | 'completedQuestIds' | 'activeQuests'>,
): string | null {
  const truth = getMiraCustodyTruthForPlayer(state)
  if (!truth || !truth.siteKnown) return null

  const captivity = getAllNpcCaptivityStates(state)['npc-mira']
  if (!captivity?.siteId) return null

  // Map siteId to human-readable description
  if (captivity.siteId === 'site-poi-pale-old-tannery') {
    return 'the old tannery on the Pale\'s eastern edge'
  }

  return captivity.siteId
}

/**
 * Returns a text description of Mira's room route if the player has earned that truth.
 */
export function getMiraRoomRouteDescription(
  state: Pick<GameState, 'npcCaptivityStates' | 'roster' | 'completedQuestIds' | 'activeQuests'>,
): string | null {
  const truth = getMiraCustodyTruthForPlayer(state)
  if (!truth || !truth.roomRouteKnown) return null

  return 'the holding floor and inner ring'
}

/**
 * Returns the handler/signer name if the player has earned that truth.
 */
export function getMiraHandlerName(
  state: Pick<GameState, 'npcCaptivityStates' | 'roster' | 'completedQuestIds' | 'activeQuests'>,
): string | null {
  const truth = getMiraCustodyTruthForPlayer(state)
  if (!truth || !truth.handlerKnown) return null

  // Dalen Morke is the canonical handler who signed the transfer order
  return 'Dalen Morke'
}

/**
 * Returns a description of what captivity has done to Mira if the player has earned that truth.
 */
export function getMiraConditionDescription(
  state: Pick<GameState, 'npcCaptivityStates' | 'roster' | 'completedQuestIds' | 'activeQuests'>,
): string | null {
  const truth = getMiraCustodyTruthForPlayer(state)
  if (!truth || !truth.conditionKnown) return null

  const captivity = getAllNpcCaptivityStates(state)['npc-mira']
  if (!captivity) return null

  // Map condition to descriptive text
  switch (captivity.condition) {
    case 'healthy':
      return 'she appears physically intact, though the tension in her posture tells a different story'
    case 'hurt':
      return 'visible signs of strain — old bruises, a limp that hasn\'t fully healed'
    case 'broken':
      return 'the weight of captivity shows in her eyes; she flinches at sudden movements'
    case 'altered':
      return 'something fundamental has shifted in her — a guarded stillness, as if she\'s learned to disappear even when present'
    default:
      return 'captivity has left its mark'
  }
}
