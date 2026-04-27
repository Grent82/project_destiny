import { selectDashboardSummary } from '../../application'
import { useAppSelector } from './hooks'

export function GlobalStatusBar() {
  const summary = useAppSelector(selectDashboardSummary)

  return (
    <div className="global-status-bar" role="status" aria-label="Game status">
      <span className="status-bar-item">
        Day {summary.day} · <span className="status-bar-slot">{summary.timeSlot}</span>
      </span>
      <span className="status-bar-divider" aria-hidden="true" />
      <span className="status-bar-item">
        {summary.money} <abbr title="credits">cr</abbr>
      </span>
      <span className="status-bar-divider" aria-hidden="true" />
      <span className="status-bar-item">
        {summary.assignedSquadCount} in squad
      </span>
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
