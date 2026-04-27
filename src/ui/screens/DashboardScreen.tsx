import { selectDashboardSummary } from '../../application'
import { useAppSelector } from '../app/hooks'

export function DashboardScreen() {
  const summary = useAppSelector(selectDashboardSummary)

  return (
    <section className="screen-panel">
      <p className="eyebrow">Project Destiny</p>
      <h1>Dashboard</h1>
      <p className="summary">
        Application state is now flowing through the store boundary rather than
        raw seed files in the UI.
      </p>
      <div className="stats-grid">
        <article>
          <h2>Cycle</h2>
          <p>
            Day {summary.day}, {summary.timeSlot}
          </p>
        </article>
        <article>
          <h2>Funds</h2>
          <p>{summary.money} credits</p>
        </article>
        <article>
          <h2>Roster</h2>
          <p>{summary.rosterCount} operatives tracked</p>
        </article>
        <article>
          <h2>Squad</h2>
          <p>{summary.assignedSquadCount} assigned</p>
        </article>
      </div>
    </section>
  )
}
