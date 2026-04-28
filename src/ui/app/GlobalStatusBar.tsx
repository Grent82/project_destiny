import { gameActions, selectCurrentDistrict, selectDashboardSummary, selectPendingEventsCount, selectProtagonistName, selectReputationTier } from '../../application'
import { useAppDispatch, useAppSelector } from './hooks'

export function GlobalStatusBar() {
  const dispatch = useAppDispatch()
  const summary = useAppSelector(selectDashboardSummary)
  const protagonistName = useAppSelector(selectProtagonistName)
  const currentDistrict = useAppSelector(selectCurrentDistrict)
  const reputationTier = useAppSelector(selectReputationTier)
  const pendingEventsCount = useAppSelector(selectPendingEventsCount)

  return (
    <div className="global-status-bar" role="status" aria-label="Game status">
      {protagonistName && (
        <>
          <span className="status-bar-item status-bar-name">{protagonistName}</span>
          <span className="status-bar-divider" aria-hidden="true" />
        </>
      )}
      <span className="status-bar-item">
        Day {summary.day} · <span className="status-bar-slot">{summary.timeSlot}</span>
      </span>
      <span className="status-bar-divider" aria-hidden="true" />
      <span className="status-bar-item">
        {summary.money} <abbr title="Marks">Mk</abbr>
      </span>
      <span className="status-bar-divider" aria-hidden="true" />
      {pendingEventsCount > 0 && (
        <>
          <span className="status-bar-item status-bar-events-alert">
            ● {pendingEventsCount} pending
          </span>
          <span className="status-bar-divider" aria-hidden="true" />
        </>
      )}
      <span className="status-bar-item reputation-tier">Rep: {reputationTier}</span>
      {currentDistrict && (
        <>
          <span className="status-bar-divider" aria-hidden="true" />
          <span className="status-bar-item">In: {currentDistrict.name}</span>
        </>
      )}
      {summary.deployedCount > 0 && (
        <>
          <span className="status-bar-divider" aria-hidden="true" />
          <span className="badge badge-warning status-bar-alert">
            {summary.deployedCount} deployed
          </span>
        </>
      )}
      <span className="status-bar-divider" aria-hidden="true" />
      <button
        className="action-button action-button--primary status-bar-end-day"
        onClick={() => dispatch(gameActions.endDay())}
        type="button"
      >
        End Day →
      </button>
    </div>
  )
}
