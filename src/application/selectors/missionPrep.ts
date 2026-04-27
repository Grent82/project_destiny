import type { RootState } from '../store/gameStore'
import { selectRosterEntries } from './roster'

export function selectMissionPrepSummary(state: RootState) {
  const rosterEntries = selectRosterEntries(state)
  const selectedIds = new Set(state.game.selectedSquadNpcIds)

  const selectedSquad = rosterEntries.filter((entry) => selectedIds.has(entry.npcId))
  const availableRoster = rosterEntries.filter((entry) => !selectedIds.has(entry.npcId))

  return {
    selectedSquad,
    availableRoster,
  }
}
