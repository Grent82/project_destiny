import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { gameActions, selectAvailableForHire, selectRosterCapacity, selectRarityDescriptions, selectRaritySkillCaps } from '../../application'
import { selectLedgerSummary } from '../../application/selectors/ledger'
import { formatMarks, formatMarksPerDay, formatMarksPerWeek } from '../../domain/game/currency'
import { contentCatalog } from '../../application/content/contentCatalog'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { useVenueContext } from './locationContext'
import { VenueContextBanner } from './VenueContextBanner'

export function RecruitmentScreen() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const offersRaw = useAppSelector(selectAvailableForHire)
  const currentDistrictId = useAppSelector((state) => state.game.currentDistrictId)
  const marks = useAppSelector((state) => state.game.money)
  const capacity = useAppSelector(selectRosterCapacity)
  const ledger = useAppSelector(selectLedgerSummary)
  const RARITY_DESCRIPTIONS = selectRarityDescriptions()
  const RARITY_SKILL_CAPS = selectRaritySkillCaps()
  const [lastRecruitedName, setLastRecruitedName] = useState<string | null>(null)
  const venueContext = useVenueContext()

  // Filter: if we are at a specific POI, only show offers from that district
  // Otherwise show all offers (sorted by current district match)
  const offers = useMemo(() => {
    const filtered = venueContext
      ? offersRaw.filter((offer) => offer.discoveredInDistrictId === venueContext.districtId)
      : offersRaw

    // Sort: district-matched offers first, then others
    return [...filtered].sort((a, b) => {
      const targetDistrict = venueContext?.districtId ?? currentDistrictId
      const aMatch = a.discoveredInDistrictId === targetDistrict ? 0 : 1
      const bMatch = b.discoveredInDistrictId === targetDistrict ? 0 : 1
      return aMatch - bMatch
    })
  }, [offersRaw, venueContext, currentDistrictId])

  const { isFull, current: rosterSize, total: totalSlots, houseBonus } = capacity

  const runwayClass =
    ledger.daysOfRunwayAtCurrentRate < 7
      ? 'text-danger'
      : ledger.daysOfRunwayAtCurrentRate < 21
        ? 'text-warning'
        : 'text-muted'


  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>Available for Service</h1>
      <p className="summary">
        Those seeking arrangement with the house. An offer not taken today may not stand tomorrow.
      </p>
      <VenueContextBanner />
      <button
        className="action-button action-button--secondary"
        type="button"
        onClick={() =>
          venueContext
            ? navigate(`/district/${venueContext.districtId}/poi/${venueContext.poiId}`)
            : navigate('/roster')
        }
        style={{ marginBottom: '1rem' }}
      >
        ← {venueContext ? `Back to ${venueContext.poiName}` : 'Back to Roster'}
      </button>

      <div className="burn-rate-panel">
        <span className="badge">Daily wages: {formatMarksPerDay(ledger.dailyExpenses)}</span>
        <span className={`badge ${runwayClass}`}>
          Runway: {ledger.daysOfRunwayAtCurrentRate === 999 ? '∞' : `${ledger.daysOfRunwayAtCurrentRate}d`}
        </span>
        <span className="badge">Treasury: {formatMarks(marks)}</span>
        <span className="badge">
          Roster: {rosterSize}/{totalSlots}{houseBonus > 0 ? ` (+${houseBonus} house)` : ''}
        </span>
      </div>

      {lastRecruitedName && (
        <p className="recruit-confirmation">{lastRecruitedName} has joined the house.</p>
      )}

      {isFull && (
        <p className="status-note text-danger">
          Roster full ({rosterSize}/{totalSlots} slots).{' '}
          {houseBonus > 0
            ? 'Repair more house rooms or gain renown to expand.'
            : 'Repair house rooms (Servant Quarters, Barracks, East Wing) or gain renown to expand.'}
        </p>
      )}

      {offers.length === 0 ? (
        <p className="text-muted">
          {venueContext
            ? `No one is looking for work at ${venueContext.poiName} today. Check back after the next day turns, or visit another location.`
            : 'No one is looking for work in Valdenmoor today. Check back after the next day turns.'}
        </p>
      ) : (
        <div className="list-panel" role="list" aria-label="Available recruits">
          {offers.map((offer) => {
            const canAfford = marks >= offer.signingBonus
            const factionNote = offer.factionAffinity ? ` · ${offer.factionAffinity}` : ''
            const npcDef = contentCatalog.npcsById.get(offer.npcId)
            const npcRarity = npcDef?.rarity ?? null
            const npcSkillCap = npcRarity ? (RARITY_SKILL_CAPS[npcRarity] ?? null) : null

            const weeklyOngoing = offer.wagePerDay * 7
            const newDailyBurn = ledger.dailyExpenses + offer.wagePerDay
            const runwayAfterHire =
              newDailyBurn > 0
                ? Math.floor((marks - offer.signingBonus) / newDailyBurn)
                : 999
            const affordabilityClass =
              !canAfford || runwayAfterHire < 7
                ? 'text-danger'
                : runwayAfterHire < 21
                  ? 'text-warning'
                  : 'text-muted'

            return (
              <article key={offer.npcId} className="roster-row">
                <div>
                  <span className="roster-row-title">{offer.name}</span>
                  <span className="text-muted">{factionNote}</span>
                  {npcRarity && (
                    <span
                      className={`badge hire-badge--rarity hire-badge--rarity-${npcRarity}`}
                      style={{ marginLeft: '0.5rem' }}
                    >
                      {npcRarity.charAt(0).toUpperCase() + npcRarity.slice(1)}
                    </span>
                  )}
                </div>
                {npcSkillCap !== null && (
                  <p className="text-muted" style={{ margin: '0.1rem 0', fontSize: '0.8rem' }}>
                    Skill cap: {npcSkillCap} · {npcRarity ? RARITY_DESCRIPTIONS[npcRarity] : ''}
                  </p>
                )}
                <p className="text-muted" style={{ margin: '0.25rem 0' }}>
                  {offer.background}
                </p>
                <div className="badge-row">
                  <span className="badge">{formatMarksPerDay(offer.wagePerDay)}</span>
                  <span className={`badge ${affordabilityClass}`} title="Weekly ongoing wage cost">
                    {formatMarksPerWeek(weeklyOngoing)} ongoing
                  </span>
                  {offer.signingBonus > 0 && (
                    <span className="badge">Signing: {formatMarks(offer.signingBonus)}</span>
                  )}
                  <span className="badge">{offer.turnsAvailable} day{offer.turnsAvailable !== 1 ? 's' : ''} remaining</span>
                  {offer.source === 'combat' && (
                    <span className="badge hire-badge--combat">Former Enemy</span>
                  )}
                  {offer.discoveredInDistrictName && (
                    <span className="badge hire-badge--district">⬡ {offer.discoveredInDistrictName}</span>
                  )}
                </div>
                {canAfford && (
                  <p className={`${affordabilityClass}`} style={{ fontSize: '0.8rem', margin: '0.2rem 0' }}>
                    Runway after hire: {runwayAfterHire === 999 ? '∞' : `${runwayAfterHire}d`}
                  </p>
                )}
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    className="action-button"
                    type="button"
                    disabled={!canAfford || isFull}
                    title={
                      isFull
                        ? `Roster full (${rosterSize}/${totalSlots}). Repair house rooms or gain renown to unlock more slots.`
                        : !canAfford
                          ? `Not enough Marks. Signing cost is ${formatMarks(offer.signingBonus)}.`
                          : undefined
                    }
                    onClick={() => {
                      dispatch(gameActions.recruitNpc({ npcId: offer.npcId }))
                      setLastRecruitedName(offer.name)
                      setTimeout(() => setLastRecruitedName(null), 3000)
                    }}
                  >
                    Take them on
                  </button>
                  {!canAfford && !isFull && (
                    <span className="text-muted" style={{ marginLeft: '0.75rem', fontSize: '0.875rem' }}>
                      Insufficient funds ({formatMarks(offer.signingBonus)} required)
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
