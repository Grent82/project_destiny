import { useState } from 'react'

import { gameActions, selectAvailableForHire } from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

export function RecruitmentScreen() {
  const dispatch = useAppDispatch()
  const offers = useAppSelector(selectAvailableForHire)
  const marks = useAppSelector((state) => state.game.money)
  const [lastRecruitedName, setLastRecruitedName] = useState<string | null>(null)

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>Available for Service</h1>
      <p className="summary">
        Those seeking arrangement with the house. An offer not taken today may not stand tomorrow.
      </p>

      {lastRecruitedName && (
        <p className="recruit-confirmation">{lastRecruitedName} has joined the house.</p>
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

            return (
              <article key={offer.npcId} className="roster-row">
                <div>
                  <span className="roster-row-title">{offer.name}</span>
                  <span className="text-muted">{factionNote}</span>
                </div>
                <p className="text-muted" style={{ margin: '0.25rem 0' }}>
                  {offer.background}
                </p>
                <div className="badge-row">
                  <span className="badge">{offer.wagePerDay} Marks/day</span>
                  {offer.signingBonus > 0 && (
                    <span className="badge">Signing: {offer.signingBonus} Marks</span>
                  )}
                  <span className="badge">{offer.turnsAvailable} day{offer.turnsAvailable !== 1 ? 's' : ''} remaining</span>
                  {offer.source === 'combat' && (
                    <span className="badge hire-badge--combat">Former Enemy</span>
                  )}
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    disabled={!canAfford}
                    title={
                      !canAfford
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
                  {!canAfford && (
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
