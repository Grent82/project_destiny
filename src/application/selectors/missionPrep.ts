import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'
import { selectRosterEntries } from './roster'

const selectSelectedSquadNpcIds = (state: RootState) => state.game.selectedSquadNpcIds

export const selectMissionPrepSummary = createSelector(
  [selectRosterEntries, selectSelectedSquadNpcIds],
  (rosterEntries, selectedSquadNpcIds) => {
    const selectedIds = new Set(selectedSquadNpcIds)

    const selectedSquad = rosterEntries.filter((entry) => selectedIds.has(entry.npcId))
    const availableRoster = rosterEntries.filter(
      (entry) =>
        !selectedIds.has(entry.npcId) &&
        entry.assignment !== 'working' &&
        entry.assignment !== 'training' &&
        entry.assignment !== 'assigned_title' &&
        entry.assignment !== 'transferred' &&
        entry.assignment !== 'recovering'
    )

    return {
      selectedSquad,
      availableRoster,
    }
  },
)
