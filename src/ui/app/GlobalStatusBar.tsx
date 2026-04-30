import { gameActions, selectCurrentDistrict, selectDashboardSummary, selectPendingEventsCount, selectPlayerCharacter, selectProtagonistName, selectReputationTier } from '../../application'
import { getRenownLevel } from '../../domain/progression/contracts'
import { useAppDispatch, useAppSelector } from './hooks'

export function GlobalStatusBar() {
  const dispatch = useAppDispatch()
  const summary = useAppSelector(selectDashboardSummary)
  const protagonistName = useAppSelector(selectProtagonistName)
  const playerCharacter = useAppSelector(selectPlayerCharacter)
  const currentDistrict = useAppSelector(selectCurrentDistrict)
  const reputationTier = useAppSelector(selectReputationTier)
  const pendingEventsCount = useAppSelector(selectPendingEventsCount)

  const displayName = playerCharacter.name || protagonistName || 'Valdric'
  const renownLevel = getRenownLevel(playerCharacter.renown)

  return (
    <div className="global-status-bar" role="status" aria-label="Game status">
      <div className="status-zone status-zone--identity">
        <span className="status-house-name">{displayName}</span>
        <span className="status-day">
          Day <strong>{summary.day}</strong> · {summary.timeSlot}
        </span>
      </div>

      <div className="status-zone status-zone--resources">
        <span className="status-marks">
          <strong>{summary.money}</strong> <abbr title="Marks">Mk</abbr>
        </span>
        <span className="status-rep">{reputationTier}</span>
        <span className="status-renown" title={`Renown: ${playerCharacter.renown}`}>
          ✦ {renownLevel.label}
        </span>
        {currentDistrict && (
          <span className="status-district">⬡ {currentDistrict.name}</span>
        )}
      </div>

      <div className="status-zone status-zone--actions">
        {pendingEventsCount > 0 && (
          <span className="badge status-events-badge">● {pendingEventsCount}</span>
        )}
        {summary.deployedCount > 0 && (
          <span className="badge badge-warning">⚔ {summary.deployedCount}</span>
        )}
        <button
          className="action-button status-bar-end-day"
          onClick={() => dispatch(gameActions.endDay())}
          type="button"
        >
          End Day →
        </button>
      </div>
    </div>
  )
}
