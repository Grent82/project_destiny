import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

export function selectRosterEntries(state: RootState) {
  return state.game.roster.map((npc) => ({
    npcId: npc.npcId,
    name: contentCatalog.npcsById.get(npc.npcId)?.name ?? npc.npcId,
    status: contentCatalog.npcsById.get(npc.npcId)?.status ?? 'citizen',
    assignment: npc.assignment,
    health: npc.states.health,
    morale: npc.states.morale,
    stress: npc.states.stress,
    loyalty: npc.traits.loyalty,
  }))
}

export function selectRosterDetail(state: RootState, npcId: string) {
  const runtime = state.game.roster.find((entry) => entry.npcId === npcId)

  if (!runtime) {
    return null
  }

  const definition = contentCatalog.npcsById.get(npcId)

  return {
    npcId,
    name: definition?.name ?? npcId,
    origin: definition?.origin ?? 'Unknown',
    background: definition?.background ?? 'Unknown',
    status: definition?.status ?? 'citizen',
    assignment: runtime.assignment,
    health: runtime.states.health,
    morale: runtime.states.morale,
    stress: runtime.states.stress,
    resolve: runtime.attributes.resolve,
    loyalty: runtime.traits.loyalty,
    allowedTitleIds: definition?.allowedTitleIds ?? [],
  }
}
