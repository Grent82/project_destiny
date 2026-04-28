import { useState } from 'react'

import { selectRosterDetail, selectRosterEntries } from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
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
      <p className="eyebrow">House Valdric</p>
      <h1>The Roster</h1>
      <p className="summary">
        Personnel in house service. Their condition — health, morale, loyalty — is yours to account for.
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
              <div className="badge-row">
                {entry.assignment === 'deployed' && (
                  <span className="badge assignment-badge assignment-badge--deployed">Deployed</span>
                )}
                {entry.assignment === 'recovering' && (
                  <span className="badge assignment-badge assignment-badge--recovering">Recovering</span>
                )}
                {entry.assignment === 'working' && (
                  <span className="badge assignment-badge assignment-badge--working">Working</span>
                )}
                {entry.assignment === 'training' && (
                  <span className="badge assignment-badge assignment-badge--training">Training</span>
                )}
                {entry.assignment === 'assigned_title' && entry.activeTitle && (
                  <span className="badge assignment-badge assignment-badge--assigned-title">
                    {contentCatalog.titlesById.get(entry.activeTitle)?.name ?? 'Titled'}
                  </span>
                )}
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
            <p className="text-muted">Select a name to view their standing.</p>
          </article>
        )}
      </div>
    </section>
  )
}
