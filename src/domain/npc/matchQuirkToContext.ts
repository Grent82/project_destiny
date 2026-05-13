import type { NpcDefinition, NpcQuirk } from './contracts'

/**
 * Returns the first quirk whose triggerKeywords overlap with the provided context tags.
 * Returns null if no match or if the NPC has no quirks.
 */
export function matchQuirkToContext(
  npc: NpcDefinition,
  contextTags: string[],
): NpcQuirk | null {
  if (!npc.quirks || npc.quirks.length === 0 || contextTags.length === 0) return null
  const ctxSet = new Set(contextTags.map((t) => t.toLowerCase()))
  return (
    npc.quirks.find((q) =>
      q.triggerKeywords.some((kw) => ctxSet.has(kw.toLowerCase())),
    ) ?? null
  )
}
