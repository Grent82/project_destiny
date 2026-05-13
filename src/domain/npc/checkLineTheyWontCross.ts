import { contentCatalog } from '../../application/content/contentCatalog'

/**
 * A minimal action taxonomy for mission context tags.
 * These align with quest types and mission briefing keywords.
 */
export const ACTION_CONTEXT_TAGS = {
  betrayal: ['betray', 'inform', 'denounce', 'report', 'expose', 'sell'],
  violence: ['kill', 'execute', 'harm', 'hurt', 'wound', 'attack', 'eliminate', 'assassinate'],
  profane: ['defile', 'profane', 'desecrate', 'disturb', 'body', 'grave', 'dead', 'corpse'],
  children: ['child', 'children', 'youth', 'minor', 'orphan'],
  captivity: ['capture', 'chain', 'imprison', 'slave', 'own', 'ownership', 'ownership'],
  service: ['serve', 'obey', 'court', 'noble', 'lord', 'master'],
  abandon: ['abandon', 'leave', 'desert', 'flee', 'escape'],
  guest: ['guest', 'host', 'shelter', 'sanctuary'],
  labor: ['cut', 'dismiss', 'lay off', 'deny', 'withhold'],
} satisfies Record<string, string[]>

/**
 * Checks if the given action context conflicts with an NPC's lineTheyWontCross.
 * Returns the violated line text if conflict found, null otherwise.
 *
 * @param npcId - The NPC to check
 * @param actionContext - Array of action context tags (see ACTION_CONTEXT_TAGS)
 */
export function checkLineTheyWontCross(npcId: string, actionContext: string[]): string | null {
  const def = contentCatalog.npcsById.get(npcId)
  const line = def?.motivation?.lineTheyWontCross
  if (!line || actionContext.length === 0) return null

  const lowerLine = line.toLowerCase()
  const allConflictWords = Object.values(ACTION_CONTEXT_TAGS).flat()
  const contextSet = new Set(actionContext.map((t) => t.toLowerCase()))

  for (const word of allConflictWords) {
    if (lowerLine.includes(word) && contextSet.has(word)) {
      return line
    }
  }

  // Also check direct keyword overlap between context tags and line text
  for (const tag of actionContext) {
    if (lowerLine.includes(tag.toLowerCase())) {
      return line
    }
  }

  return null
}
