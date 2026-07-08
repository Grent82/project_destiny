import type { RootState } from '../store/gameStore'
import { contentCatalog } from '../content/contentCatalog'

export const selectExpeditionState = (state: RootState) => state.game.expeditionState

export const selectExpeditionDestination = (state: RootState) => {
  const id = state.game.expeditionState?.destinationId
  if (!id) return null
  return contentCatalog.expeditionDestinationsById.get(id) ?? null
}

export const selectAllExpeditionDestinations = (_state: RootState) =>
  contentCatalog.expeditionDestinations

export const selectExpeditionStatus = (state: RootState) =>
  state.game.expeditionState?.status ?? 'idle'
