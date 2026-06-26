import type { GameState } from '../../domain'
import type { NpcMemoryEntry } from '../../domain/npc/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { getMemoryDialogueTopicsForNpc } from '../selectors/memoryDialogue'

/**
 * Command to start a memory-based dialogue with an NPC.
 * This allows the player to initiate conversation about specific past events.
 */
export function startMemoryDialogue(
  state: GameState,
  npcId: string,
  memoryEvent: string,
): GameState {
  const npc = contentCatalog.npcsById.get(npcId)
  if (!npc) return state

  // Check if NPC has this memory type
  const topics = getMemoryDialogueTopicsForNpc(state.roster, state.relationships, npcId)
  const availableTopic = topics.find((t) => t.memoryEvent === memoryEvent)

  if (!availableTopic) {
    // No accessible memory of this type
    return state
  }

  // Get the dialogue definition for this NPC
  const dialogueDef = contentCatalog.dialoguesById.get(npc.dialogueId ?? npcId)
  if (!dialogueDef) return state

  // Find or create a memory-specific dialogue node
  const memoryNode = dialogueDef.nodes.find(
    (node) => node.id === `memory-${memoryEvent}-node`
  )

  if (!memoryNode) {
    // No dedicated memory dialogue node exists yet
    // Fall back to generic opening
    return {
      ...state,
      activeDialogueId: dialogueDef.id,
      activeDialogueNodeId: dialogueDef.openingNodeId,
    }
  }

  return {
    ...state,
    activeDialogueId: dialogueDef.id,
    activeDialogueNodeId: memoryNode.id,
  }
}

/**
 * Generate a memory-based dialogue node on-the-fly for NPCs without authored memory dialogue.
 * Creates a dynamic conversation starter based on the memory content.
 */
export function createMemoryDialogueNode(
  npcId: string,
  memory: NpcMemoryEntry,
) {
  const sentimentPhrases: Record<string, string> = {
    positive: 'with a warm smile',
    neutral: 'thoughtfully',
    negative: 'with a furrowed brow',
    traumatic: 'quietly',
  }

  const eventPhrases: Record<string, string> = {
    combat: 'that fierce battle we fought',
    quest_completion: 'the mission we completed together',
    gift_given: 'the gift you gave me',
    gift_received: 'when you accepted my gift',
    courtship: 'our time together',
    intimacy: 'the closeness we share',
    betrayal: 'what happened between us',
    help_received: 'your kindness when I needed it',
    help_given: 'when I stood by you',
    conversation_deep: 'our last deep conversation',
    work_completed: 'the work we accomplished',
    first_meeting: 'the day we first met',
    training: 'our training sessions',
    loss: 'what we lost',
    default: 'the past we share',
  }

  const eventPhrase = eventPhrases[memory.event] ?? eventPhrases.default
  const sentimentPhrase = sentimentPhrases[memory.sentiment] ?? sentimentPhrases.neutral

  return {
    id: `memory-${memory.event}-node`,
    npcId,
    text: `Do you remember ${eventPhrase}? I still think about it ${sentimentPhrase}.`,
    choices: [
      {
        id: `memory-${memory.event}-acknowledge`,
        label: 'Yes, I remember.',
        nextNodeId: null,
        kind: 'commit' as const,
      },
      {
        id: `memory-${memory.event}-elaborate`,
        label: 'Tell me more about it.',
        nextNodeId: `memory-${memory.event}-elaborate-node`,
        kind: 'ask' as const,
      },
      {
        id: `memory-${memory.event}-move-on`,
        label: "Let's talk about something else.",
        nextNodeId: null,
        kind: 'leave' as const,
      },
    ],
  }
}

/**
 * Check if an NPC can initiate memory-based dialogue (proactive agency).
 * NPCs with significant memories and high enough relationship may bring up the past.
 */
export function canNpcInitiateMemoryDialogue(state: GameState, npcId: string): {
  canInitiate: boolean
  suggestedTopic?: string
  reason?: string
} {
  const topics = getMemoryDialogueTopicsForNpc(state.roster, state.relationships, npcId)

  if (topics.length === 0) {
    return { canInitiate: false, reason: 'No accessible memories' }
  }

  // Get NPC traits for agency decision
  const npc = state.roster.find((n) => n.npcId === npcId)
  if (!npc) return { canInitiate: false, reason: 'NPC not found' }

  const empathy = npc.traits.empathy ?? 0
  // Note: quirks are on NpcDefinition, not NpcRuntimeState
  // For now, use a simplified check based on traits only
  const nostalgiaTrigger = empathy >= 70 // High empathy NPCs tend to reminisce

  // NPCs with high empathy or nostalgic quirk are more likely to bring up memories
  const threshold = nostalgiaTrigger ? 30 : empathy >= 60 ? 40 : 70

  // Find a suitable topic
  const suitableTopic = topics.find(
    (t) => (t.minTrust ?? 0) <= threshold || (t.minAffinity ?? 0) <= threshold,
  )

  if (!suitableTopic) {
    return { canInitiate: false, reason: 'No topic meets relationship threshold' }
  }

  // Check if enough days have passed since the memory
  const recentTopic = topics[0]
  const daysSinceMemory = state.day - recentTopic.memoryDay

  // NPCs need some reflection time before bringing up memories
  if (daysSinceMemory < 1) {
    return { canInitiate: false, reason: 'Memory too recent' }
  }

  return {
    canInitiate: true,
    suggestedTopic: suitableTopic.memoryEvent,
    reason: `Has ${suitableTopic.memoryEvent} memory and relationship threshold met`,
  }
}
