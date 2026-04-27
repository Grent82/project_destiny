import type React from 'react'

import { selectAllFactions, selectCityDials, selectCouncilSeats, selectInstitutionalStanding } from '../../application'
import type { InstitutionalTier } from '../../domain'
import { useAppSelector } from '../app/hooks'

const COUNCIL_FACTIONS = [
  { id: 'faction-civic-compact', name: 'Civic Compact', shortName: 'Compact' },
  { id: 'faction-gilded-court', name: 'Gilded Court', shortName: 'Court' },
  { id: 'faction-foundry-league', name: 'Foundry League', shortName: 'League' },
]

const TIER_COLORS: Record<InstitutionalTier, string> = {
  allied: 'rgba(215, 191, 130, 0.9)',
  neutral: 'rgba(148, 163, 184, 0.5)',
  watched: 'rgba(251, 191, 36, 0.8)',
  hostile: 'rgba(249, 115, 22, 0.85)',
  blacklisted: 'rgba(239, 68, 68, 0.9)',
}

const TIER_DESCRIPTIONS: Record<InstitutionalTier, string> = {
  allied: 'Recognised ally — council access and licenses available.',
  neutral: 'No institutional relationship. Most services accessible.',
  watched: 'Noted. Some doors are closed without explanation.',
  hostile: 'Institutional arm actively obstructs. Fines and harassment.',
  blacklisted: 'Active enforcement. Arrests and asset seizure may follow.',
}

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
  const institutionalStanding = useAppSelector(selectInstitutionalStanding)
  const councilSeats = useAppSelector(selectCouncilSeats)

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
        <h2>The Institutional Arm</h2>
        <p style={{ fontSize: '0.85em', color: 'var(--color-text-secondary, #999)', marginBottom: '1rem' }}>
          Institutional standing is separate from general faction standing. The Register sees what the street does not.
        </p>
        {COUNCIL_FACTIONS.map((faction) => {
          const tier = (institutionalStanding[faction.id] ?? 'neutral') as InstitutionalTier
          const seats = councilSeats[faction.id] ?? 0
          return (
            <div key={faction.id} className="stat-row" style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span className="stat-label" style={{ minWidth: '10rem' }}>{faction.shortName}</span>
              <span
                className="badge"
                style={{ background: TIER_COLORS[tier], color: '#111', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75em' }}
              >
                {tier}
              </span>
              <span className="stat-value" style={{ marginLeft: '0.5rem' }}>{seats} seat{seats !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: '0.8em', color: 'var(--color-text-secondary, #999)', flexBasis: '100%' }}>
                {TIER_DESCRIPTIONS[tier]}
              </span>
            </div>
          )
        })}
      </article>

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
