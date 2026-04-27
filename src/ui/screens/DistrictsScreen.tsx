import { selectDistrictSummaries } from '../../application'
import { useAppSelector } from '../app/hooks'

export function DistrictsScreen() {
  const districts = useAppSelector(selectDistrictSummaries)

  return (
    <section className="screen-panel">
      <p className="eyebrow">Project Destiny</p>
      <h1>Districts</h1>
      <p className="summary">
        District visibility now comes from application selectors that combine
        seeded definitions with runtime market and danger values.
      </p>

      <div className="overview-grid">
        {districts.map((district) => (
          <article key={district.districtId}>
            <h2>{district.name}</h2>
            <p>Control: {district.controllingFactionName}</p>
            <p>Danger: {district.danger}</p>
            <p>Market Pressure: {district.marketPressure}</p>
            <p>Shops: {district.shopTypes.join(', ')}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
