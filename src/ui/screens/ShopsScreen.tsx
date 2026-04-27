import { useState } from 'react'

import { gameActions, selectShopOverview } from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

export function ShopsScreen() {
  const dispatch = useAppDispatch()
  const overview = useAppSelector(selectShopOverview)
  const [lastPurchaseMessage, setLastPurchaseMessage] = useState<string | null>(null)

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>The Market</h1>
      <p className="summary">
        District vendors. What they carry depends on who controls the ward and how much pressure the market is under.
      </p>
      <p className="summary">Available funds: {overview.money} Marks</p>
      {lastPurchaseMessage ? (
        <p className="purchase-feedback">{lastPurchaseMessage}</p>
      ) : null}

      <div className="overview-grid">
        {overview.shops.map((shop) => (
          <article key={shop.id}>
            <header className="shop-district-header">
              <div>
                <h2>{shop.name}</h2>
                <p className="shop-district-context">
                  {shop.districtName}
                  {shop.controllingFactionName ? ` · ${shop.controllingFactionName}` : ''}
                  {' · '}
                  {shop.shopType.replace('_', ' ')}
                </p>
              </div>
              <div className="badge-row shop-district-badges">
                {shop.danger !== null && (
                  <span className={shop.danger > 50 ? 'badge badge-warning' : 'badge'}>
                    Danger {shop.danger}
                  </span>
                )}
                {shop.marketPressure !== null && shop.marketPressure > 40 && (
                  <span className="badge badge-warning">
                    Market pressure {shop.marketPressure}
                  </span>
                )}
              </div>
            </header>
            <p>{shop.summary}</p>
            <div className="shop-offer-list">
              {shop.offers.map((offer) => (
                <div key={`${shop.id}-${offer.itemId}`} className="shop-offer-row">
                  <div>
                    <strong>{offer.itemName}</strong>
                    <p>
                      {offer.category} · Owned {offer.ownedQuantity}
                    </p>
                    <div className="badge-row">
                      {offer.bestPrice ? (
                        <span className="badge badge-positive">Best price</span>
                      ) : (
                        <span className="badge">+{offer.priceDelta} over best</span>
                      )}
                      <span
                        className={
                          offer.affordable ? 'badge badge-positive' : 'badge badge-warning'
                        }
                      >
                        {offer.affordable ? 'Affordable' : 'Insufficient funds'}
                      </span>
                    </div>
                  </div>
                  <div className="shop-offer-actions">
                    <span>{offer.price} Mk</span>
                    <button
                      className="action-button"
                      disabled={!offer.affordable}
                      onClick={() =>
                        {
                          dispatch(
                            gameActions.purchaseItemFromShop({
                              shopId: shop.id,
                              itemId: offer.itemId,
                            }),
                          )
                          setLastPurchaseMessage(
                            `Purchased ${offer.itemName} from ${shop.name} for ${offer.price} Marks.`,
                          )
                        }
                      }
                      type="button"
                    >
                      Buy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
