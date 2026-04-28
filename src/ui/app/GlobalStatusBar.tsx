import { selectCurrentDistrict, selectDashboardSummary, selectProtagonistName, selectReputationTier } from '../../application'
import { useAppSelector } from './hooks'

export function GlobalStatusBar() {
  const summary = useAppSelector(selectDashboardSummary)
  const protagonistName = useAppSelector(selectProtagonistName)
  const currentDistrict = useAppSelector(selectCurrentDistrict)
  const reputationTier = useAppSelector(selectReputationTier)

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
    </div>
  )
}
