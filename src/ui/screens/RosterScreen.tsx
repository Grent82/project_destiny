import { useState } from 'react'

import { selectRosterDetail, selectRosterEntries } from '../../application'
import { contentCatalog } from '../../application/content/contentCatalog'
import { getJobForNpc } from '../../application/content/jobCatalog'
import { useAppSelector } from '../app/hooks'
import { NpcDetailPanel } from './NpcDetailPanel'

const ROSTER_GROUPS = [
  { key: 'deployed', label: 'Deployed' },
  { key: 'assigned_title', label: 'On Duty' },
  { key: 'working', label: 'Working' },
  { key: 'training', label: 'Training' },
  { key: 'idle', label: 'Available' },
  { key: 'recovering', label: 'Recovering' },
] as const

function computeWorkingIncome(skills: Record<string, number>): number {
  const nonCombatSkills = ['administration', 'medicine', 'engineering', 'negotiation', 'security', 'crafting', 'academics']
  const bestSkill = Math.max(...nonCombatSkills.map((s) => skills[s] ?? 0))
  return Math.max(3, Math.min(15, Math.floor(bestSkill / 7)))
}

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
          {ROSTER_GROUPS.map(({ key, label }) => {
            const group = rosterEntries.filter((e) => e.assignment === key)
            if (group.length === 0) return null
            return (
              <div key={key} className="roster-group">
                <p className="roster-group-label">
                  {key === 'assigned_title'
                    ? label
                    : label}
                </p>
                {group.map((entry) => (
                  <button
                    key={entry.npcId}
                    className={[
                      'roster-row',
                      `roster-row--${key}`,
                      entry.npcId === selectedNpcId ? 'roster-row-active' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => setSelectedNpcId(entry.npcId)}
                    type="button"
                  >
                    <span className="roster-row-title">
                      {entry.name}
                      {key === 'assigned_title' && entry.activeTitle && (
                        <span className="roster-row-title-role">
                          {' — '}{contentCatalog.titlesById.get(entry.activeTitle)?.name ?? 'Titled'}
                        </span>
                      )}
                      {key === 'working' && (() => {
                        const skills = entry.skills as Record<string, number>
                        const job = getJobForNpc(skills)
                        return (
                          <span className="roster-row-title-role" style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>
                            {' — '}{job.name} — ~{computeWorkingIncome(skills)} Marks/day
                          </span>
                        )
                      })()}
                    </span>
                    <div className="badge-row">
                      <span className="badge">{entry.status}</span>
                    </div>
                    <div className="roster-mini-stats">
                      <div className="mini-stat">
                        <span className="mini-stat-label">HP</span>
                        <div className="mini-bar-track">
                          <div
                            className={[
                              'mini-bar-fill',
                              entry.health < 30 ? 'mini-bar-fill--crit' :
                              entry.health < 60 ? 'mini-bar-fill--low' : 'mini-bar-fill--good',
                            ].join(' ')}
                            style={{ width: `${entry.health}%` }}
                          />
                        </div>
                      </div>
                      <div className="mini-stat">
                        <span className="mini-stat-label">Mor</span>
                        <div className="mini-bar-track">
                          <div
                            className={[
                              'mini-bar-fill',
                              entry.morale < 30 ? 'mini-bar-fill--crit' :
                              entry.morale < 60 ? 'mini-bar-fill--low' : 'mini-bar-fill--good',
                            ].join(' ')}
                            style={{ width: `${entry.morale}%` }}
                          />
                        </div>
                      </div>
                      <div className="mini-stat">
                        <span className="mini-stat-label">Str</span>
                        <div className="mini-bar-track">
                          <div
                            className={[
                              'mini-bar-fill',
                              entry.stress > 60 ? 'mini-bar-fill--crit' :
                              entry.stress > 30 ? 'mini-bar-fill--low' : 'mini-bar-fill--good',
                            ].join(' ')}
                            style={{ width: `${entry.stress}%` }}
                          />
                        </div>
                      </div>
                      <div className="mini-stat">
                        <span className="mini-stat-label">Hng</span>
                        <div className="mini-bar-track">
                          <div
                            className={[
                              'mini-bar-fill',
                              entry.hunger > 60 ? 'mini-bar-fill--crit' :
                              entry.hunger > 30 ? 'mini-bar-fill--low' : 'mini-bar-fill--good',
                            ].join(' ')}
                            style={{ width: `${entry.hunger}%` }}
                          />
                        </div>
                      </div>
                      <div className="mini-stat">
                        <span className="mini-stat-label">Fat</span>
                        <div className="mini-bar-track">
                          <div
                            className={[
                              'mini-bar-fill',
                              entry.fatigue > 60 ? 'mini-bar-fill--crit' :
                              entry.fatigue > 30 ? 'mini-bar-fill--low' : 'mini-bar-fill--good',
                            ].join(' ')}
                            style={{ width: `${entry.fatigue}%` }}
                          />
                        </div>
                      </div>
                      {(entry.stress >= 70 || entry.hunger >= 70 || entry.fatigue >= 70 || entry.health <= 30) && (
                        <span className="roster-state-warning" title="NPC in danger zone — check their states">⚠</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )
          })}
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
