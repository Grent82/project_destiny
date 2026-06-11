import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { selectRosterDetail, selectRosterEntries } from '../../application'
import { formatNpcAssignmentLabel, formatWorkingIncomePerDay } from '../../application/content/assignmentDisplay'
import { contentCatalog } from '../../application/content/contentCatalog'
import { getJobForNpc } from '../../application/content/jobCatalog'
import { useAppSelector } from '../app/hooks'
import { NpcDetailPanel } from './NpcDetailPanel'
import { EmptyState } from '../components/EmptyState'
import './roster.css'

const ROSTER_GROUPS = [
  { key: 'deployed', label: 'In the field' },
  { key: 'assigned_title', label: 'On duty' },
  { key: 'working', label: 'At work' },
  { key: 'training', label: 'In training' },
  { key: 'idle', label: 'At liberty' },
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
        The muster roll of the house — who serves, in what condition, and at what cost. Every name here
        eats, bleeds, and remembers how they are treated.
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

      <div className="muster-layout">
        <div className="muster-roll" role="list" aria-label="Roster entries">
          <div className="muster-controls" aria-label="Filter and sort roster">
            <label className="muster-control">
              <span className="muster-control__label">Sort</span>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as SortKey); setSortAsc(true) }}
                
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
            <label className="muster-control">
              <span className="muster-control__label">Show</span>
              <select
                value={filterAssignment}
                onChange={(e) => setFilterAssignment(e.target.value as AssignmentFilter)}
                
              >
                <option value="all">All</option>
                {ROSTER_GROUPS.map((g) => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            </label>
            {(sortBy !== 'name' && sortBy !== 'health' && sortBy !== 'morale' && sortBy !== 'stress') && (
              <label className="muster-control">
                <span className="muster-control__label">Min</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={filterSkillMin}
                  onChange={(e) => setFilterSkillMin(Number(e.target.value))}
                  
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
            <div className="muster-section">
              <p className="muster-section-label">
                {filteredEntries.length} name{filteredEntries.length !== 1 ? 's' : ''} — by {SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? sortBy}
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
                <div key={key} className="muster-section">
                  <p className="muster-section-label">{label}</p>
                  {group.map((entry) => (
                    <RosterRow key={entry.npcId} entry={entry} selectedNpcId={selectedNpcId} onSelect={setSelectedNpcId} />
                  ))}
                </div>
              )
            })
          )}
        </div>

        {detail ? (
          <article className="muster-leaf">
            <NpcDetailPanel detail={detail} />
          </article>
        ) : (
          <article className="muster-leaf">
            <p className="muster-leaf-empty">Point at a name on the roll to open their leaf.</p>
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
  function conditionClass(value: number, invert = false): string {
    const score = invert ? 100 - value : value
    if (score < 30) return 'muster-condition-fill muster-condition-fill--crit'
    if (score < 60) return 'muster-condition-fill muster-condition-fill--low'
    return 'muster-condition-fill'
  }
  const roleNote =
    key === 'assigned_title' && entry.activeTitle
      ? (contentCatalog.titlesById.get(entry.activeTitle)?.name ?? 'Titled')
      : key === 'working'
        ? `${getJobForNpc(entry.skills).name} · ~${formatWorkingIncomePerDay(entry.workingIncome)} a day`
        : formatNpcAssignmentLabel(entry.assignment)
  return (
    <button
      className={['muster-entry', entry.npcId === selectedNpcId ? 'muster-entry--active' : ''].filter(Boolean).join(' ')}
      onClick={() => onSelect(entry.npcId)}
      type="button"
    >
      <span className="muster-entry-name">{entry.name}</span>
      <span className="muster-entry-role">{' — '}{roleNote}</span>
      {entry.firstQuirkText && (
        <p className="muster-entry-note">
          {entry.firstQuirkText.charAt(0).toUpperCase() + entry.firstQuirkText.slice(1)}.
        </p>
      )}
      <div className="muster-condition">
        {([
          ['Health', entry.health, false],
          ['Morale', entry.morale, false],
          ['Stress', entry.stress, true],
          ['Hunger', entry.hunger, true],
          ['Fatigue', entry.fatigue, true],
        ] as const).map(([label, value, invert]) => (
          <span key={label} className="muster-condition-item" title={`${label}: ${value}`}>
            {label.slice(0, 3)}
            <span className="muster-condition-track">
              <span className={conditionClass(value, invert)} style={{ width: `${invert ? value : value}%`, display: 'block' }} />
            </span>
          </span>
        ))}
      </div>
      {(entry.stress >= 70 || entry.hunger >= 70 || entry.fatigue >= 70 || entry.health <= 30) && (
        <span className="muster-warning" title="In a bad way — check their states">⚠ in a bad way</span>
      )}
    </button>
  )
}
