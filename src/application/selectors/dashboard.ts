import type { RootState } from '../store/gameStore'

export function selectDashboardSummary(state: RootState) {
  const roster = state.game.roster

  return {
    day: state.game.day,
    timeSlot: state.game.timeSlot,
    money: state.game.money,
    rosterCount: roster.length,
    deployedCount: roster.filter((npc) => npc.assignment === 'deployed').length,
    recoveringCount: roster.filter((npc) => npc.assignment === 'recovering').length,
    assignedSquadCount: state.game.selectedSquadNpcIds.length,
    politicalDials: state.game.politicalDials,
  }
}
