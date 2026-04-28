import type { RootState } from '../store/gameStore'

export function selectHouseholdLore(state: RootState) {
  return state.game.householdLore
}
