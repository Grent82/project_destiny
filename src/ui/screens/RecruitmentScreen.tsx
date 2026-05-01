import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { gameActions, selectAvailableForHire } from '../../application'
import { selectLedgerSummary } from '../../application/selectors/ledger'
import { contentCatalog } from '../../application/content/contentCatalog'
import { getRenownLevel, RARITY_SKILL_CAPS } from '../../domain/progression/contracts'
import { useAppDispatch, useAppSelector } from '../app/hooks'

export function RecruitmentScreen() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const offers = useAppSelector(selectAvailableForHire)
  const marks = useAppSelector((state) => state.game.money)
  const rosterSize = useAppSelector((state) => state.game.roster.length)
  const renown = useAppSelector((state) => state.game.playerCharacter.renown)
  const ledger = useAppSelector(selectLedgerSummary)
  const [lastRecruitedName, setLastRecruitedName] = useState<string | null>(null)

  const renownLevel = getRenownLevel(renown)
  const rosterFull = rosterSize >= renownLevel.rosterSlots

  const runwayClass =
    ledger.daysOfRunwayAtCurrentRate < 7
      ? 'text-danger'
      : ledger.daysOfRunwayAtCurrentRate < 21
        ? 'text-warning'
        : 'text-muted'

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>Available for Service</h1>
      <p className="summary">
        Those seeking arrangement with the house. An offer not taken today may not stand tomorrow.
      </p>
      <button
        className="action-button action-button--secondary"
        type="button"
        onClick={() => navigate('/roster')}
        style={{ marginBottom: '1rem' }}
      >
        ← Back to Roster
      </button>

      <div className="burn-rate-panel">
        <span className="badge">Daily wages: {ledger.dailyExpenses} Mk/day</span>
        <span className={`badge ${runwayClass}`}>
          Runway: {ledger.daysOfRunwayAtCurrentRate === 999 ? '∞' : `${ledger.daysOfRunwayAtCurrentRate}d`}
        </span>
        <span className="badge">Treasury: {marks} Mk</span>
      </div>

      {lastRecruitedName && (
        <p className="recruit-confirmation">{lastRecruitedName} has joined the house.</p>
      )}

      {rosterFull && (
        <p className="status-note text-danger">
          Roster full ({rosterSize}/{renownLevel.rosterSlots} slots). Gain renown to expand your household.
        </p>
      )}

      {offers.length === 0 ? (
        <p className="text-muted">
          No one is looking for work in Valdenmoor today. Check back after the next day turns.
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
                    Skill cap: {npcSkillCap}
                  </p>
                )}
                <p className="text-muted" style={{ margin: '0.25rem 0' }}>
                  {offer.background}
                </p>
                <div className="badge-row">
                  <span className="badge">{offer.wagePerDay} Mk/day</span>
                  <span className={`badge ${affordabilityClass}`} title="Weekly ongoing wage cost">
                    {weeklyOngoing} Mk/week ongoing
                  </span>
                  {offer.signingBonus > 0 && (
                    <span className="badge">Signing: {offer.signingBonus} Mk</span>
                  )}
                  <span className="badge">{offer.turnsAvailable} day{offer.turnsAvailable !== 1 ? 's' : ''} remaining</span>
                  {offer.source === 'combat' && (
                    <span className="badge hire-badge--combat">Former Enemy</span>
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
                    disabled={!canAfford || rosterFull}
                    title={
                      rosterFull
                        ? `Roster full (${rosterSize}/${renownLevel.rosterSlots}). Gain renown to unlock more slots.`
                        : !canAfford
                          ? `Not enough Marks. Signing cost is ${offer.signingBonus} Marks.`
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
                  {!canAfford && !rosterFull && (
                    <span className="text-muted" style={{ marginLeft: '0.75rem', fontSize: '0.875rem' }}>
                      Insufficient funds ({offer.signingBonus} Marks required)
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
