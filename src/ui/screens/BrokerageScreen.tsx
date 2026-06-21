import { Link } from 'react-router-dom'

import { gameActions, selectBrokerageOverview } from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import './roster.css'

export function BrokerageScreen() {
  const dispatch = useAppDispatch()
  const overview = useAppSelector(selectBrokerageOverview)

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>Labor Brokerage</h1>
      <p className="summary">
        The old engine of the house: who is bound here, who has been placed elsewhere, and what the kitchen is being fed with.
      </p>

      {!overview.hasBrokerageActivity ? (
        <article className="detail-panel">
          <h2>Refusal Stance</h2>
          <p className="summary">
            The house is not currently running bound placements.
          </p>
          <p className="summary">
            Food output is resting on free or waged hands. If that remains the line, the player still needs paid labor and contracts to keep the kitchen alive.
          </p>
          <div className="resource-status-panel__actions">
            <Link className="action-button action-button--secondary" to={overview.routes.refusalRoute}>
              Seek paid labor
            </Link>
            <Link className="action-button action-button--secondary" to={overview.routes.rosterRoute}>
              Review the roster
            </Link>
          </div>
        </article>
      ) : (
        <>
          <div className="stats-grid">
            <article>
              <h2>House-held</h2>
              <p>{overview.houseHeld.length} under contract</p>
            </article>
            <article>
              <h2>Transferred</h2>
              <p>{overview.transferred.length} placed elsewhere</p>
            </article>
            <article>
              <h2>Kitchen service</h2>
              <p>
                {overview.boundKitchenHands} hand{overview.boundKitchenHands === 1 ? '' : 's'}
                {overview.boundKitchenHands > 0 ? ` · +${overview.boundKitchenOutput} rations/day` : ''}
              </p>
            </article>
          </div>

          <article className="detail-panel" style={{ marginBottom: '1rem' }}>
            <h2>Operational pressure</h2>
            <p className="summary">
              {overview.risks.coerciveHoldCount} coercive contract
              {overview.risks.coerciveHoldCount === 1 ? '' : 's'} under the house.
            </p>
            {overview.risks.monthlyCostsActive ? (
              <>
                <p className="summary">
                  Every {overview.risks.monthlyCostsEveryDays} days: corruption +2, prosperity -1, unrest +1.
                </p>
                <p className="summary">
                  {overview.risks.empathicWitnessCount > 0
                    ? `${overview.risks.empathicWitnessCount} empathic free hand${overview.risks.empathicWitnessCount === 1 ? '' : 's'} will lose morale when the books come due.`
                    : 'No empathic free hands are currently in position to register the books.'}
                </p>
              </>
            ) : (
              <p className="summary">
                No bound contract is currently being worked on the floor. The monthly civic drag is dormant.
              </p>
            )}
            <p className="summary">
              {overview.risks.equalityNoticeDaysRemaining === null
                ? 'No equal-work comparison is active right now.'
                : `Equal-work notice in about ${overview.risks.equalityNoticeDaysRemaining} day${overview.risks.equalityNoticeDaysRemaining === 1 ? '' : 's'}.`}
            </p>
            <p className="summary">
              {overview.risks.heavyHoldActive
                ? 'Holding this many contracts is already drawing daily Court pressure: unrest +1, Gilded Court standing -1.'
                : `Court pressure escalates once the house holds ${overview.risks.heavyHoldThreshold} contracts at once.`}
            </p>
          </article>

          <div className="muster-layout">
            <div className="muster-roll">
              <div className="muster-section">
                <h2 className="muster-section-label">Available intake</h2>
                {overview.intake.length === 0 ? (
                  <p className="muster-entry-note">No one is currently being offered to the house under contract terms.</p>
                ) : (
                  overview.intake.map((entry) => (
                    <div key={entry.npcId} className="muster-entry">
                      <span className="muster-entry-name">{entry.name}</span>
                      <span className="muster-entry-role"> — debt contract candidate</span>
                      <p className="muster-entry-bond">
                        Intake {entry.intakeFee} Marks · Release {entry.contractValue} Marks · Market value {entry.marketValue} Marks · {entry.termDays} day term
                      </p>
                      <p className="muster-entry-note">{entry.background}</p>
                      <div className="bond-status-actions" style={{ marginTop: '0.45rem' }}>
                        <button
                          className="action-button"
                          type="button"
                          onClick={() => dispatch(gameActions.acquireBoundHireOffer({ npcId: entry.npcId }))}
                        >
                          Take under debt contract
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="muster-section">
                <h2 className="muster-section-label">House-held contracts</h2>
                {overview.houseHeld.length === 0 ? (
                  <p className="muster-entry-note">No one is currently held by the house.</p>
                ) : (
                  overview.houseHeld.map((entry) => (
                    <div key={entry.npcId} className="muster-entry">
                      <span className="muster-entry-name">{entry.name}</span>
                      <span className="muster-entry-role"> — {entry.entryReasonLabel}</span>
                      <p className="muster-entry-bond">
                        Buyout {entry.contractValue} Marks · Transfer value {entry.marketValue} Marks
                        {entry.termDays !== null ? ` · ${entry.termDays} day term` : ''}
                      </p>
                      <div className="muster-entry-badges">
                        {entry.forSale ? <span className="badge badge-warning">Marked for transfer</span> : null}
                        {entry.assignedToKitchen ? <span className="badge">Assigned to kitchen service</span> : null}
                      </div>
                      {entry.forSale ? (
                        <div className="detail-panel" style={{ marginTop: '0.75rem', padding: '0.75rem' }}>
                          <h3 style={{ marginTop: 0 }}>Buyer quotes</h3>
                          {entry.saleQuotes.map((quote) => (
                            <div key={`${entry.npcId}-${quote.buyerId}`} style={{ marginTop: '0.5rem' }}>
                              <p className="muster-entry-bond" style={{ marginBottom: '0.25rem' }}>
                                {quote.buyerName} — {quote.offerAmount} Marks
                              </p>
                              <p className="muster-entry-note">{quote.note}</p>
                              <button
                                className="action-button"
                                type="button"
                                onClick={() =>
                                  dispatch(
                                    gameActions.transferBondedNpc({
                                      npcId: entry.npcId,
                                      buyerId: quote.buyerId,
                                    }),
                                  )
                                }
                              >
                                {`Transfer to ${quote.buyerName} (${quote.offerAmount} Marks)`}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="bond-status-actions" style={{ marginTop: '0.45rem' }}>
                        <button
                          className="action-button action-button--secondary"
                          type="button"
                          onClick={() => dispatch(gameActions.freeNpc({ npcId: entry.npcId }))}
                        >
                          Release from bond
                        </button>
                        <button
                          className="action-button"
                          type="button"
                          onClick={() =>
                            dispatch(
                              gameActions.markNpcForSale({
                                npcId: entry.npcId,
                                forSale: !entry.forSale,
                                marketValue: entry.marketValue,
                              }),
                            )
                          }
                        >
                          {entry.forSale ? 'Withdraw transfer offer' : 'Offer for transfer'}
                        </button>
                        {overview.kitchenIsIntact ? (
                          <button
                            className="action-button"
                            type="button"
                            onClick={() => {
                              if (entry.assignedToKitchen) {
                                dispatch(gameActions.setNpcRoomAssignment({ npcId: entry.npcId, roomId: null }))
                                dispatch(gameActions.setNpcAssignment({ npcId: entry.npcId, assignment: 'idle' }))
                                return
                              }
                              dispatch(gameActions.setNpcRoomAssignment({ npcId: entry.npcId, roomId: 'room-kitchen' }))
                              dispatch(gameActions.setNpcAssignment({ npcId: entry.npcId, assignment: 'working' }))
                            }}
                          >
                            {entry.assignedToKitchen ? 'Remove from food service' : 'Place in food service'}
                          </button>
                        ) : (
                          <button className="action-button action-button--secondary" type="button" disabled>
                            Repair kitchen for food service
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <article className="muster-leaf">
              <h2 className="muster-section-label">Transferred away</h2>
              {overview.transferred.length === 0 ? (
                <p className="muster-entry-note">No one is currently held outside the house.</p>
              ) : (
                overview.transferred.map((entry) => (
                  <div key={entry.npcId} className="muster-section" style={{ marginTop: 0 }}>
                    <div className="muster-entry" style={{ borderLeftColor: 'var(--accent-blood, #7a2020)' }}>
                      <span className="muster-entry-name">{entry.name}</span>
                      <span className="muster-entry-role"> — held by {entry.holderName}</span>
                      <p className="muster-entry-bond">
                        {entry.entryReasonLabel} · Filed value {entry.marketValue} Marks · Legal buyout {entry.ransomCost} Marks
                      </p>
                      <p className="muster-entry-note">{entry.holderNote}</p>
                      <div className="bond-status-actions" style={{ marginTop: '0.45rem' }}>
                        <button
                          className="action-button action-button--secondary"
                          type="button"
                          onClick={() => dispatch(gameActions.rescueBondedNpcLegal({ npcId: entry.npcId }))}
                        >
                          {entry.legalRescueLabel}
                        </button>
                        <button
                          className="action-button"
                          type="button"
                          onClick={() => dispatch(gameActions.rescueBondedNpcExtraction({ npcId: entry.npcId }))}
                        >
                          {entry.extractionLabel}
                        </button>
                        <button
                          className="action-button action-button--danger"
                          type="button"
                          onClick={() => dispatch(gameActions.rescueBondedNpcForce({ npcId: entry.npcId }))}
                        >
                          {entry.forceLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </article>
          </div>
        </>
      )}
    </section>
  )
}
