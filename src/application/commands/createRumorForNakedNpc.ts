import type { GameState } from '../../domain'
import type { Rumor } from '../../domain/rumors/contracts'
import { isNpcNaked } from '../../domain/npc/isNpcNaked'
import { contentCatalog } from '../content/contentCatalog'

/**
 * Parameters for creating a rumor about a naked NPC seen in public.
 */
export type CreateRumorForNakedNpcParams = {
  /** The NPC who was seen naked */
  npcId: string
  /** The district where the incident occurred */
  districtId: string
  /** The day the incident occurred */
  day: number
}

/**
 * Generates a unique rumor ID for a naked NPC incident.
 */
function generateRumorId(npcId: string, districtId: string, day: number): string {
  return `naked-npc-${npcId}-${districtId}-d${day}`
}

/**
 * Builds a rumor entry for a naked NPC seen in public.
 * Returns null if the NPC is not actually naked (safety check).
 */
export function buildNakedNpcRumor(
  npcId: string,
  districtId: string,
  day: number,
  roster: GameState['npcRuntimeStates'],
): Rumor | null {
  // Find the NPC in the roster
  const npc = roster.find((r) => r.npcId === npcId)
  if (!npc) return null

  // Safety check: only create rumor if NPC is actually naked
  if (!isNpcNaked(npc)) return null

  // Get NPC name from content catalog
  const npcDef = contentCatalog.npcsById.get(npcId)
  const npcName = npcDef?.name ?? npcId

  return {
    id: generateRumorId(npcId, districtId, day),
    kind: 'ambient',
    source: 'generated',
    districtId,
    originNpcId: null, // No specific origin - this is public gossip
    templateId: null,
    text: `${npcName} wurde nackt auf der Strasse gesehen`,
    subjectNpcIds: [npcId],
    truth: 'true',
    credibility: 80, // High credibility - public scandals are believable
    heat: 50,
    createdDay: day,
    lastSpreadDay: day,
  }
}

/**
 * Command: Creates a rumor when a naked NPC is seen in a public district.
 * Returns the state unchanged if the NPC is not naked or not found.
 *
 * This is integrated into the social simulation phase to generate
 * scandals when NPCs wander around naked in public areas.
 */
export function createRumorForNakedNpc(
  state: GameState,
  params: CreateRumorForNakedNpcParams,
): GameState {
  const rumor = buildNakedNpcRumor(params.npcId, params.districtId, params.day, state.npcRuntimeStates)

  if (!rumor) return state

  // Check if this rumor already exists (deduplication)
  if (state.rumors.some((r) => r.id === rumor.id)) return state

  return {
    ...state,
    rumors: [...state.rumors, rumor],
  }
}
