import { useState } from 'react'

import { selectRosterDetail, selectRosterEntries } from '../../application'
import { useAppSelector } from '../app/hooks'

export function RosterScreen() {
  const rosterEntries = useAppSelector(selectRosterEntries)
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(
    rosterEntries[0]?.npcId ?? null,
  )

  const detail = useAppSelector((state) =>
    selectedNpcId ? selectRosterDetail(state, selectedNpcId) : null,
  )

  return (
    <section className="screen-panel">
      <p className="eyebrow">Project Destiny</p>
      <h1>Roster</h1>
      <p className="summary">
        Inspect seeded operatives through application selectors and switch
        between summary and detail views without importing content files into UI
        components.
      </p>

      <div className="roster-layout">
        <div className="list-panel" role="list" aria-label="Roster entries">
          {rosterEntries.map((entry) => (
            <button
              key={entry.npcId}
              className={
                entry.npcId === selectedNpcId
                  ? 'roster-row roster-row-active'
                  : 'roster-row'
              }
              onClick={() => setSelectedNpcId(entry.npcId)}
              type="button"
            >
              <span className="roster-row-title">{entry.name}</span>
              <span>{entry.assignment}</span>
              <span>{entry.status}</span>
              <span>Health {entry.health}</span>
            </button>
          ))}
        </div>

        {detail ? (
          <article className="detail-panel">
            <h2>{detail.name}</h2>
            <p className="summary">{detail.background}</p>
            <div className="detail-grid">
              <div>
                <strong>Status</strong>
                <p>{detail.status}</p>
              </div>
              <div>
                <strong>Assignment</strong>
                <p>{detail.assignment}</p>
              </div>
              <div>
                <strong>Origin</strong>
                <p>{detail.origin}</p>
              </div>
              <div>
                <strong>Resolve</strong>
                <p>{detail.resolve}</p>
              </div>
              <div>
                <strong>Morale</strong>
                <p>{detail.morale}</p>
              </div>
              <div>
                <strong>Stress</strong>
                <p>{detail.stress}</p>
              </div>
              <div>
                <strong>Loyalty</strong>
                <p>{detail.loyalty}</p>
              </div>
              <div>
                <strong>Title Paths</strong>
                <p>{detail.allowedTitleIds.join(', ') || 'None assigned yet'}</p>
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  )
}
