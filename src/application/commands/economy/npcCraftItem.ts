import type { GameState } from '../../../domain/game/contracts'
import type { NpcRuntimeState } from '../../../domain/npc/contracts'
import type { CraftingRecipe } from '../../../domain/items/contracts'
import { appendActivityLogEntry } from '../activityLog'
import { contentCatalog } from '../../content/contentCatalog'
import { countNpcInventoryItem, consumeNpcInventoryItemById, grantNewItemToNpc } from '../npcInventoryHelpers'

/**
 * NPC crafting (destiny-bkln.7law). Deliberately minimal, thin-slice recipe content
 * (data/definitions/recipes.json) — proves the mechanic rather than building a large recipe
 * library. crafting skill >= MIN_CRAFTING_SKILL_TO_ATTEMPT gates any attempt (per AC); each
 * recipe additionally has its own minCraftingSkill.
 */

export const MIN_CRAFTING_SKILL_TO_ATTEMPT = 30

function recipeIsSatisfiable(state: GameState, npcId: string, recipe: CraftingRecipe): boolean {
  return recipe.requiredMaterials.every((req) => countNpcInventoryItem(state, npcId, req.itemId) >= req.quantity)
}

function findSatisfiableRecipe(state: GameState, npc: NpcRuntimeState): CraftingRecipe | null {
  if (npc.skills.crafting < MIN_CRAFTING_SKILL_TO_ATTEMPT) return null
  for (const recipe of contentCatalog.recipes) {
    if (npc.skills.crafting < recipe.minCraftingSkill) continue
    if (recipeIsSatisfiable(state, npc.npcId, recipe)) return recipe
  }
  return null
}

/** Whether this NPC currently has the crafting skill and materials to complete some recipe. */
export function npcCanCraftItem(state: GameState, npc: NpcRuntimeState): boolean {
  return findSatisfiableRecipe(state, npc) !== null
}

/** NPC consumes a satisfiable recipe's materials from their own inventory and produces the output item. */
export function npcCraftItem(state: GameState, npcId: string): GameState {
  const npc = state.npcRuntimeStates.find((n) => n.npcId === npcId)
  if (!npc) return state

  const recipe = findSatisfiableRecipe(state, npc)
  if (!recipe) return state

  let next: GameState = state
  for (const req of recipe.requiredMaterials) {
    next = consumeNpcInventoryItemById(next, npcId, req.itemId, req.quantity)
  }
  next = grantNewItemToNpc(next, npcId, recipe.outputItemId, 1, 'crafting')

  const outputName = contentCatalog.itemsById.get(recipe.outputItemId)?.name ?? recipe.outputItemId
  return appendActivityLogEntry(next, 'economy', `${npc.name} crafts ${outputName} from salvaged materials.`)
}
