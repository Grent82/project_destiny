import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { selectRosterDetail, selectRosterEntries } from '../../application'
import { formatNpcAssignmentLabel, formatWorkingIncomePerDay } from '../../application/content/assignmentDisplay'
import { contentCatalog } from '../../application/content/contentCatalog'
import { getJobForNpc } from '../../application/content/jobCatalog'
import { useAppSelector } from '../app/hooks'
import { NpcDetailPanel } from './NpcDetailPanel'
import { EmptyState } from '../components/EmptyState'

const ROSTER_GROUPS = [
  { key: 'deployed', label: 'Deployed' },
  { key: 'assigned_title', label: 'On Duty' },
  { key: 'working', label: 'Working' },
  { key: 'training', label: 'Training' },
  { key: 'idle', label: 'Available' },
  { key: 'recovering', label: 'Recovering' },
] as const

type SortKey = 'name' | 'health' | 'morale' | 'stress' | 'melee' | 'ranged' | 'medicine' | 'administration' | 'engineering' | 'negotiation' | 'survival' | 'security' | 'crafting' | 'intrigue'
type AssignmentFilter = 'all' | 'deployed' | 'assigned_title' | 'working' | 'training' | 'idle' | 'recovering'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'health', label: 'Health' },
  { value: 'morale', label: 'Morale' },
  { value: 'stress', label: 'Stress' },
  { value: 'melee', label: 'Melee' },
  { value: 'ranged', label: 'Ranged' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'administration', label: 'Administration' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'survival', label: 'Survival' },
  { value: 'security', label: 'Security' },
  { value: 'crafting', label: 'Crafting' },
  { value: 'intrigue', label: 'Intrigue' },
]

export function RosterScreen() {
  const navigate = useNavigate()
  const rosterEntries = useAppSelector(selectRosterEntries)
  const currentDistrictId = useAppSelector((state) => state.game.currentDistrictId)
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(
    rosterEntries[0]?.npcId ?? null,
  )
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [filterAssignment, setFilterAssignment] = useState<AssignmentFilter>('all')
  const [filterSkillMin, setFilterSkillMin] = useState<number>(0)

  const detail = useAppSelector((state) =>
    selectedNpcId ? selectRosterDetail(state, selectedNpcId) : null,
  )

  function getSortValue(entry: (typeof rosterEntries)[number]): number | string {
    if (sortBy === 'name') return entry.name.toLowerCase()
    if (sortBy === 'health') return entry.health
    if (sortBy === 'morale') return entry.morale
    if (sortBy === 'stress') return entry.stress
    return (entry.skills as Record<string, number>)[sortBy] ?? 0
  }

  const isFiltered = filterAssignment !== 'all' || filterSkillMin > 0 || sortBy !== 'name'

  const filteredEntries = rosterEntries
    .filter((e) => filterAssignment === 'all' || e.assignment === filterAssignment)
    .filter((e) => {
      if (filterSkillMin <= 0) return true
      if (sortBy === 'name' || sortBy === 'health' || sortBy === 'morale' || sortBy === 'stress') return true
      return ((e.skills as Record<string, number>)[sortBy] ?? 0) >= filterSkillMin
    })
    .slice()
    .sort((a, b) => {
      const av = getSortValue(a)
      const bv = getSortValue(b)
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>The Roster</h1>
      <p className="summary">
        Personnel in house service. Their condition — health, morale, loyalty — is yours to account for.
      </p>
      {currentDistrictId ? (
        <button
          className="action-button action-button--secondary"
          type="button"
          onClick={() => navigate('/recruitment')}
          style={{ marginBottom: '1rem' }}
        >
          + Hire in {currentDistrictId.replace('district-', '').replace(/-/g, ' ')}
        </button>
      ) : (
        <p className="summary text-muted" style={{ marginBottom: '1rem' }}>
          Travel to a district to find available hands.
        </p>
      )}

      <div className="roster-layout">
        <div className="list-panel" role="list" aria-label="Roster entries">
          <div className="roster-controls" aria-label="Filter and sort roster">
            <label className="roster-control">
              <span className="roster-control__label">Sort</span>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as SortKey); setSortAsc(true) }}
                className="roster-control__select"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="action-button action-button--ghost action-button-sm"
              onClick={() => setSortAsc((v) => !v)}
              title={sortAsc ? 'Ascending — click for descending' : 'Descending — click for ascending'}
              aria-label={sortAsc ? 'Sort ascending' : 'Sort descending'}
            >
              {sortAsc ? '↑' : '↓'}
            </button>
            <label className="roster-control">
              <span className="roster-control__label">Show</span>
              <select
                value={filterAssignment}
                onChange={(e) => setFilterAssignment(e.target.value as AssignmentFilter)}
                className="roster-control__select"
              >
                <option value="all">All</option>
                {ROSTER_GROUPS.map((g) => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            </label>
            {(sortBy !== 'name' && sortBy !== 'health' && sortBy !== 'morale' && sortBy !== 'stress') && (
              <label className="roster-control">
                <span className="roster-control__label">Min</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={filterSkillMin}
                  onChange={(e) => setFilterSkillMin(Number(e.target.value))}
                  className="roster-control__input"
                  aria-label={`Minimum ${sortBy} value`}
                />
              </label>
            )}
            {isFiltered && (
              <button
                type="button"
                className="action-button action-button--ghost action-button-sm"
                onClick={() => { setSortBy('name'); setSortAsc(true); setFilterAssignment('all'); setFilterSkillMin(0) }}
              >
                Reset
              </button>
            )}
          </div>
          {filteredEntries.length === 0 ? (
            <EmptyState message="No operatives match the current filter." icon="👤" cta={{ label: 'Reset filters', onClick: () => { setSortBy('name'); setSortAsc(true); setFilterAssignment('all'); setFilterSkillMin(0) } }} />
          ) : isFiltered ? (
            <div className="roster-group">
              <p className="roster-group-label">
                {filteredEntries.length} operative{filteredEntries.length !== 1 ? 's' : ''} — sorted by {SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? sortBy}
              </p>
              {filteredEntries.map((entry) => (
                <RosterRow key={entry.npcId} entry={entry} selectedNpcId={selectedNpcId} onSelect={setSelectedNpcId} />
              ))}
            </div>
          ) : (
            ROSTER_GROUPS.map(({ key, label }) => {
              const group = rosterEntries.filter((e) => e.assignment === key)
              if (group.length === 0) return null
              return (
                <div key={key} className="roster-group">
                  <p className="roster-group-label">{label}</p>
                  {group.map((entry) => (
                    <RosterRow key={entry.npcId} entry={entry} selectedNpcId={selectedNpcId} onSelect={setSelectedNpcId} />
                  ))}
                </div>
              )
            })
          )}
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

type RosterEntry = ReturnType<typeof selectRosterEntries>[number]

function RosterRow({ entry, selectedNpcId, onSelect }: {
  entry: RosterEntry
  selectedNpcId: string | null
  onSelect: (id: string) => void
}) {
  const key = entry.assignment
  return (
    <button
      className={[
        'roster-row',
        `roster-row--${key}`,
        entry.npcId === selectedNpcId ? 'roster-row-active' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onSelect(entry.npcId)}
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
          const job = getJobForNpc(entry.skills)
          return (
            <span className="roster-row-title-role" style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>
              {' — '}{job.name} — ~{formatWorkingIncomePerDay(entry.workingIncome)}
            </span>
          )
        })()}
      </span>
      {entry.firstQuirkText && (
        <p style={{ margin: '0.1rem 0 0', fontSize: 'var(--size-xs, 0.75rem)', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'left', lineHeight: 1.3 }}>
          {entry.firstQuirkText.charAt(0).toUpperCase() + entry.firstQuirkText.slice(1)}.
        </p>
      )}
      <div className="badge-row">
        <span className="badge">{entry.status}</span>
        <span className="badge">{formatNpcAssignmentLabel(entry.assignment)}</span>
      </div>
      <div className="roster-mini-stats">
        <div className="mini-stat">
          <span className="mini-stat-label">HP</span>
          <div className="mini-bar-track">
            <div className={['mini-bar-fill', entry.health < 30 ? 'mini-bar-fill--crit' : entry.health < 60 ? 'mini-bar-fill--low' : 'mini-bar-fill--good'].join(' ')} style={{ width: `${entry.health}%` }} />
          </div>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-label">Mor</span>
          <div className="mini-bar-track">
            <div className={['mini-bar-fill', entry.morale < 30 ? 'mini-bar-fill--crit' : entry.morale < 60 ? 'mini-bar-fill--low' : 'mini-bar-fill--good'].join(' ')} style={{ width: `${entry.morale}%` }} />
          </div>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-label">Str</span>
          <div className="mini-bar-track">
            <div className={['mini-bar-fill', entry.stress > 60 ? 'mini-bar-fill--crit' : entry.stress > 30 ? 'mini-bar-fill--low' : 'mini-bar-fill--good'].join(' ')} style={{ width: `${entry.stress}%` }} />
          </div>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-label">Hng</span>
          <div className="mini-bar-track">
            <div className={['mini-bar-fill', entry.hunger > 60 ? 'mini-bar-fill--crit' : entry.hunger > 30 ? 'mini-bar-fill--low' : 'mini-bar-fill--good'].join(' ')} style={{ width: `${entry.hunger}%` }} />
          </div>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-label">Fat</span>
          <div className="mini-bar-track">
            <div className={['mini-bar-fill', entry.fatigue > 60 ? 'mini-bar-fill--crit' : entry.fatigue > 30 ? 'mini-bar-fill--low' : 'mini-bar-fill--good'].join(' ')} style={{ width: `${entry.fatigue}%` }} />
          </div>
        </div>
      </div>
      {(entry.stress >= 70 || entry.hunger >= 70 || entry.fatigue >= 70 || entry.health <= 30) && (
        <span className="roster-state-warning" title="NPC in danger zone — check their states">⚠ critical state</span>
      )}
    </button>
  )
}
