import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '../store/gameStore'

const selectActivityLog = (state: RootState) => state.game.activityLog
const selectActiveCombat = (state: RootState) => state.game.activeCombat

export const selectEventLogEntries = createSelector(
  [selectActivityLog, selectActiveCombat],
  (activityLog, activeCombat) => ({
    activityLog,
    activeCombatOutcome: activeCombat?.outcome ?? null,
    recentCombatEntries: activeCombat?.log.slice(-4).reverse() ?? [],
  }),
)
