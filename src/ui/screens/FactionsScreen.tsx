import { selectFactionSummaries } from '../../application'
import { useAppSelector } from '../app/hooks'

export function FactionsScreen() {
  const factions = useAppSelector(selectFactionSummaries)

  return (
    <section className="screen-panel">
      <p className="eyebrow">Project Destiny</p>
      <h1>Factions</h1>
      <p className="summary">
        Faction visibility now combines seeded agendas with runtime power,
        security, and player standing.
      </p>

      <div className="overview-grid">
        {factions.map((faction) => (
          <article key={faction.factionId}>
            <h2>{faction.name}</h2>
            <p>{faction.agenda}</p>
            <p>Power: {faction.power}</p>
            <p>Wealth: {faction.wealth}</p>
            <p>Security: {faction.security}</p>
            <p>Standing: {faction.standingWithPlayer}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
