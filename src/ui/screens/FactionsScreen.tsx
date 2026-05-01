import type React from 'react'

import { selectAllFactions, selectCityDials, selectCouncilSeats, selectInstitutionalStanding, selectCityStability } from '../../application'
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
  const normalized = ((standing + 100) / 200) * 100
  let color: string
  if (standing > 20) color = 'rgba(74, 222, 128, 0.7)'
  else if (standing >= -20) color = 'rgba(148, 163, 184, 0.45)'
  else if (standing >= -40) color = 'rgba(251, 191, 36, 0.65)'
  else if (standing >= -50) color = 'rgba(249, 115, 22, 0.75)'
  else color = 'rgba(239, 68, 68, 0.8)'
  return { width: `${normalized}%`, background: color }
}

const FACTION_STANDING_TOOLTIP = 'Standing range: Hostile ≤ −60 · Cold −59 to −20 · Neutral −19 to 20 · Warm 21 to 60 · Allied > 60. Standing shifts with every choice.'

const CITY_DIAL_TOOLTIPS: Record<string, string> = {
  control: 'Control — degree of civic order. High control reduces crime and faction conflict.',
  prosperity: 'Prosperity — economic health of the city. Affects market prices and NPC wages.',
  unrest: 'Unrest — public discontent. High unrest increases district danger and faction aggression.',
  corruption: 'Corruption — institutional decay. Affects enforcement and civic services.',
}

export function FactionsScreen() {
  const factions = useAppSelector(selectAllFactions)
  const cityDials = useAppSelector(selectCityDials)
  const institutionalStanding = useAppSelector(selectInstitutionalStanding)
  const councilSeats = useAppSelector(selectCouncilSeats)
  const cityStability = useAppSelector(selectCityStability)

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>Factions</h1>
      <p className="summary">
        Where House Valdric stands with each power in Valdenmoor. Standing shifts with every choice.
      </p>

      <div className="city-stability-section">
        <h3>City Stability</h3>
        <div className="stability-bar-track">
          <div
            className="stability-bar-fill"
            style={{
              width: `${cityStability}%`,
              backgroundColor: cityStability < 30 ? '#8b2020' : cityStability < 60 ? '#8b6a20' : '#2a5c2a',
            }}
          />
        </div>
        <span className="stability-label">{cityStability}/100</span>
      </div>

      <div className="overview-grid">
        {factions.map((faction) => {
          const tier = standingTier(faction.standing)
          return (
            <article key={faction.factionId}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg className="faction-icon" aria-hidden="true">
                  <use href={`/icons.svg#icon-${faction.factionId}`} />
                </svg>
                {faction.name}
              </h2>
              <p style={{ fontStyle: 'italic', fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary, #999)', fontSize: '0.9em', marginBottom: '0.25rem' }}>
                {faction.primer}
              </p>
              <p style={{ fontSize: '0.8em', color: 'var(--color-text-muted, #666)', marginBottom: '0.5rem' }}>
                {faction.agenda}
              </p>
              <div className="stat-row">
                <span className="stat-label" title={FACTION_STANDING_TOOLTIP}>Standing</span>
                <span className="stat-value">{faction.standing}</span>
                <div className="stat-bar">
                  <div
                    className="stat-bar-fill"
                    style={standingBarStyle(faction.standing)}
                  />
                </div>
                <span className="badge">{tier}</span>
              </div>
              {faction.standing < -50 && (
                <p className="summary" style={{ color: 'rgba(239,68,68,0.9)', fontSize: '0.85em', marginTop: '0.25rem' }}>
                  ⛔ Blacklisted — shops closed
                </p>
              )}
              {faction.standing < -40 && faction.standing >= -50 && (
                <p className="summary" style={{ color: 'rgba(249,115,22,0.9)', fontSize: '0.85em', marginTop: '0.25rem' }}>
                  ⚠ Hostile — district travel restricted
                </p>
              )}
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
            <span className="stat-label" style={{ textTransform: 'capitalize' }} title={CITY_DIAL_TOOLTIPS[dial]}>
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
