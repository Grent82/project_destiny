import type { RootState } from '../store/gameStore'

export function selectHouseName(state: RootState): string {
  return state.game.householdLore.houseName
}
