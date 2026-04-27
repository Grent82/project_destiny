import type { RootState } from '../store/gameStore'

export const selectInstitutionalStanding = (state: RootState) => state.game.institutionalStanding

export const selectIsBlacklisted = (factionId: string) => (state: RootState) =>
  state.game.institutionalStanding[factionId] === 'blacklisted'

export const selectCouncilSeats = (state: RootState) => state.game.councilSeats

export const selectActiveCouncilVotes = (state: RootState) => state.game.activeCouncilVotes
