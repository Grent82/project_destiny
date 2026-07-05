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
  state: Pick<GameState, 'npcRuntimeStates' | 'completedQuestIds' | 'activeQuests'>,
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
  state: Pick<GameState, 'npcRuntimeStates' | 'completedQuestIds' | 'activeQuests'>,
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
  state: Pick<GameState, 'npcRuntimeStates' | 'completedQuestIds' | 'activeQuests'>,
): string | null {
  const truth = getMiraCustodyTruthForPlayer(state)
  if (!truth || !truth.roomRouteKnown) return null

  return 'the holding floor and inner ring'
}

/**
 * Returns the handler/signer name if the player has earned that truth.
 */
export function getMiraHandlerName(
  state: Pick<GameState, 'npcRuntimeStates' | 'completedQuestIds' | 'activeQuests'>,
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
  state: Pick<GameState, 'npcRuntimeStates' | 'completedQuestIds' | 'activeQuests'>,
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

/**
 * MidQuestBeat represents a dynamic journal entry for Mira quests.
 * Used for runtime-backed custody clues.
 */
export type MidQuestBeat = {
  atStageId: string
  label: string
  journalEntry: string
}

/**
 * Returns runtime-backed mid-quest beats for Mira quests.
 * These beats read actual captivity state instead of using hard-coded prose.
 * Returns empty array if no Mira-specific beats are earned yet.
 */
export function getMiraQuestBeats(
  state: Pick<GameState, 'npcRuntimeStates' | 'completedQuestIds' | 'activeQuests'>,
  questId: string,
): MidQuestBeat[] {
  // Only generate beats for Mira quests
  if (!questId.startsWith('quest-mira-')) return []

  const truth = getMiraCustodyTruthForPlayer(state)
  if (!truth) return []

  const captivity = getAllNpcCaptivityStates(state)['npc-mira']
  if (!captivity) return []

  const beats: MidQuestBeat[] = []

  // Act 2: Tannery Watch beats - reveal site and handler info
  if (questId === 'quest-mira-act2-tannery-watch') {
    if (truth.siteKnown && captivity.siteId) {
      beats.push({
        atStageId: 'investigating',
        label: 'The watch rotates early. Someone tightened security after the courier incident.',
        journalEntry: `The guard pattern changed — the courier must have been more important than expected. The lead points to ${getMiraSiteDescription(state) ?? 'an unknown location'}.`,
      })
    }

    if (truth.roomRouteKnown && truth.handlerKnown) {
      const handlerName = getMiraHandlerName(state)
      const roomRoute = getMiraRoomRouteDescription(state)
      beats.push({
        atStageId: 'on-site',
        label: `The schedule is signed by ${handlerName}. This is not a holding — it is a transfer.`,
        journalEntry: `Mira is being moved soon. ${handlerName}'s name is on the order, which means someone inside the Court's transport chain is managing this personally. The route goes through ${roomRoute ?? 'the inner holding areas'}.`,
      })
    }
  }

  // Rescue quest beats - reveal handler, guards, and condition
  if (questId === 'quest-mira-rescue') {
    if (truth.handlerKnown) {
      const handlerName = getMiraHandlerName(state)
      beats.push({
        atStageId: 'pressured',
        label: 'The Court has doubled the guard rotation. They know you are coming.',
        journalEntry: `A runner from ${getMiraSiteDescription(state) ?? 'the site'} reported back: the Gilded Court has increased the guard count. ${handlerName} has tightened security — someone tipped them off.`,
      })
    }

    if (truth.roomRouteKnown) {
      const roomRoute = getMiraRoomRouteDescription(state)
      beats.push({
        atStageId: 'engaged',
        label: 'Inside the tannery. Enemy handlers hold the yard while guards keep the holding floor.',
        journalEntry: `The outer route and ${roomRoute ?? 'the holding areas'} are heavily guarded. Mira is somewhere past them in the inner ring, which means going through.`,
      })
    }

    if (truth.conditionKnown) {
      const conditionDesc = getMiraConditionDescription(state)
      beats.push({
        atStageId: 'setback',
        label: 'One guard called for relief. The extraction window is closing.',
        journalEntry: `A runner slipped out before the squad could cut the route. They know someone is inside. Time is now the primary enemy — Mira ${conditionDesc ?? 'shows the marks of captivity'}.`,
      })
    }
  }

  return beats
}
