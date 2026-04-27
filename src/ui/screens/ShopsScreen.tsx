import { useState } from 'react'

import { gameActions, selectShopOverview } from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

export function ShopsScreen() {
  const dispatch = useAppDispatch()
  const overview = useAppSelector(selectShopOverview)
  const [lastPurchaseMessage, setLastPurchaseMessage] = useState<string | null>(null)

  return (
    <section className="screen-panel">
      <p className="eyebrow">Project Destiny</p>
      <h1>Shops</h1>
      <p className="summary">
        Browse seeded district-specific offers and buy items through the
        application purchase flow.
      </p>
      <p className="summary">Available funds: {overview.money} credits</p>
      {lastPurchaseMessage ? (
        <p className="purchase-feedback">{lastPurchaseMessage}</p>
      ) : null}

      <div className="overview-grid">
        {overview.shops.map((shop) => (
          <article key={shop.id}>
            <h2>{shop.name}</h2>
            <p>
              {shop.districtName} · {shop.shopType}
            </p>
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
                    <span>{offer.price} cr</span>
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
                            `Purchased ${offer.itemName} from ${shop.name} for ${offer.price} credits.`,
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
