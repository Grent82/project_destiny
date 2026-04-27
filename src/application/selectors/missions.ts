import { contentCatalog } from '../content/contentCatalog'
import type { RootState } from '../store/gameStore'

export const selectActiveMission = (state: RootState) => {
  const id = state.game.activeMissionId
  if (!id) return null
  return contentCatalog.missionsById.get(id) ?? null
}

export const selectAvailableMissions = (_state: RootState) => contentCatalog.missions
