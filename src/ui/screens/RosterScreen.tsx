import { useState } from 'react'

import { selectRosterDetail, selectRosterEntries } from '../../application'
import { useAppSelector } from '../app/hooks'
import { NpcDetailPanel } from './NpcDetailPanel'

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
        Select an operative to inspect their full stat profile across attributes,
        skills, states, and traits.
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
              <span className="text-muted">{entry.assignment.replace('_', ' ')}</span>
              <div className="badge-row">
                <span className="badge">{entry.status}</span>
                <span className={entry.health < 40 ? 'badge badge-warning' : 'badge'}>
                  HP {entry.health}
                </span>
                <span className={entry.morale < 40 ? 'badge badge-warning' : 'badge'}>
                  Mor {entry.morale}
                </span>
              </div>
            </button>
          ))}
        </div>

        {detail ? (
          <article className="detail-panel">
            <NpcDetailPanel detail={detail} />
          </article>
        ) : (
          <article className="detail-panel">
            <p className="text-muted">Select an operative to view their profile.</p>
          </article>
        )}
      </div>
    </section>
  )
}
