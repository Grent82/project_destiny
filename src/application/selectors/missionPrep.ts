import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'
import { isDeployable } from '../commands/isDeployable'
import { selectRosterEntries } from './roster'

const selectSelectedSquadNpcIds = (state: RootState) => state.game.selectedSquadNpcIds
const selectRawRoster = (state: RootState) => state.game.roster

export const selectMissionPrepSummary = createSelector(
  [selectRosterEntries, selectRawRoster, selectSelectedSquadNpcIds],
  (rosterEntries, rawRoster, selectedSquadNpcIds) => {
    const selectedIds = new Set(selectedSquadNpcIds)
    const rawById = new Map(rawRoster.map((r) => [r.npcId, r]))

    const selectedSquad = rosterEntries.filter((entry) => selectedIds.has(entry.npcId))
    const availableRoster = rosterEntries.filter((entry) => {
      const raw = rawById.get(entry.npcId)
      return raw !== undefined && !selectedIds.has(entry.npcId) && isDeployable(raw)
    })

    return {
      selectedSquad,
      availableRoster,
    }
  },
)
