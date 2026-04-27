import type React from 'react'

import { selectAllFactions, selectCityDials } from '../../application'
import { useAppSelector } from '../app/hooks'

function standingTier(standing: number): string {
  if (standing <= -60) return 'Hostile'
  if (standing <= -20) return 'Cold'
  if (standing <= 20) return 'Neutral'
  if (standing <= 60) return 'Warm'
  return 'Allied'
}

function standingBarStyle(standing: number): React.CSSProperties {
  const tier = standingTier(standing)
  const colorMap: Record<string, string> = {
    Hostile: 'rgba(239, 68, 68, 0.65)',
    Cold: 'rgba(148, 163, 184, 0.45)',
    Neutral: 'rgba(148, 163, 184, 0.3)',
    Warm: 'rgba(251, 191, 36, 0.55)',
    Allied: 'rgba(215, 191, 130, 0.8)',
  }
  const normalized = ((standing + 100) / 200) * 100
  return { width: `${normalized}%`, background: colorMap[tier] ?? colorMap['Neutral'] }
}

export function FactionsScreen() {
  const factions = useAppSelector(selectAllFactions)
  const cityDials = useAppSelector(selectCityDials)

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>Factions</h1>
      <p className="summary">
        Where House Valdric stands with each power in Valdenmoor. Standing shifts with every choice.
      </p>

      <div className="overview-grid">
        {factions.map((faction) => {
          const tier = standingTier(faction.standing)
          return (
            <article key={faction.factionId}>
              <h2>{faction.name}</h2>
              <p>{faction.agenda}</p>
              <div className="stat-row">
                <span className="stat-label">Standing</span>
                <span className="stat-value">{faction.standing}</span>
                <div className="stat-bar">
                  <div
                    className="stat-bar-fill"
                    style={standingBarStyle(faction.standing)}
                  />
                </div>
                <span className="badge">{tier}</span>
              </div>
            </article>
          )
        })}
      </div>

      <article className="detail-panel" style={{ marginTop: '2rem' }}>
        <h2>City Dials</h2>
        {(['control', 'prosperity', 'unrest', 'corruption'] as const).map((dial) => (
          <div key={dial} className="stat-row">
            <span className="stat-label" style={{ textTransform: 'capitalize' }}>
              {dial}
            </span>
            <span className="stat-value">{cityDials[dial]}</span>
            <div className="stat-bar">
              <div
                className="stat-bar-fill"
                style={{ width: `${cityDials[dial]}%` }}
              />
            </div>
          </div>
        ))}
      </article>
    </section>
  )
}
