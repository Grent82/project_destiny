import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import rawArmor from '../../../data/definitions/armor.json'
import rawWeapons from '../../../data/definitions/weapons.json'
import { gameActions, selectShopOverview } from '../../application'
import { getDurabilityTier } from '../../application/commands/durability'
import { getWeaponRepairCost, getWeaponDurabilityMax, getArmorRepairCost, getArmorDurabilityMax } from '../../application/content/equipmentCatalog'
import { selectStash } from '../../application/selectors/stash'
import { useAppDispatch, useAppSelector } from '../app/hooks'

function DurabilityBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? (current / max) * 100 : 0
  const tier = getDurabilityTier(current)
  const color =
    tier === 'good' ? '#4caf50'
    : tier === 'worn' ? '#ff9800'
    : tier === 'damaged' ? '#f44336'
    : '#9e9e9e'
  return (
    <div className="stat-bar" style={{ width: 80 }}>
      <div className="stat-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export function ShopsScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const overview = useAppSelector(selectShopOverview)
  const [lastPurchaseMessage, setLastPurchaseMessage] = useState<string | null>(null)
  const gameState = useAppSelector((state) => state.game)
  const stash = useAppSelector(selectStash)
  const roster = gameState.roster
  const durabilities = gameState.equippedItemDurabilities
  const money = gameState.money
  const hasQuartermaster = roster.some((r) => r.activeTitle === 'title-quartermaster')
  const currentDistrictId = gameState.currentDistrictId

  // Only show weapon/armor stash when in a district with an arms dealer or weapon_dealer shop type
  const districtShopTypes = overview.shops.map((s: { shopType: string }) => s.shopType)
  const hasArmsDealer = districtShopTypes.some(
    (t: string) => t === 'weapon_dealer' || t === 'black_market' || t === 'workshop',
  )

  const priceNote =
    overview.corridorStatus === 'blocked'
      ? 'Prices +30% (corridor blocked)'
      : overview.corridorStatus === 'disrupted'
        ? 'Prices +15% (corridor disrupted)'
        : null

  return (
    <section className="screen-panel">
      <p className="eyebrow">House Valdric</p>
      <h1>The Market</h1>
      <p className="summary">
        District vendors. What they carry depends on who controls the ward and how much pressure the market is under.
      </p>
      <p className="summary">Available funds: {overview.money} Marks</p>
      {priceNote ? (
        <p className="badge badge-warning">{priceNote}</p>
      ) : null}
      {lastPurchaseMessage ? (
        <p className="purchase-feedback">{lastPurchaseMessage}</p>
      ) : null}

      {overview.shops.length === 0 ? (
        <div className="empty-state-message">
          <p className="summary">
            No traders operate here. Travel to another district to find merchants.
          </p>
          <button
            className="action-button"
            type="button"
            onClick={() => navigate('/city')}
          >
            ← Browse District Map
          </button>
        </div>
      ) : (
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
              {shop.accessDenied ? (
                <p className="summary badge badge-warning">
                  This establishment does not welcome you.
                </p>
              ) : (
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
              )}
            </article>
          ))}
        </div>
      )}
      {!currentDistrictId && (
        <p className="summary text-danger">You are not in a district. Travel to a district to access shops.</p>
      )}
      <section className="repair-section">
        <h2>Equipment Stash</h2>
        {!hasArmsDealer ? (
          <div className="empty-state-message">
            <p className="summary">No arms dealer in this district. Travel to Harbor Ward, Ironworks, or the Warrens to acquire weapons and armor.</p>
            <div className="badge-row" style={{ marginTop: '0.5rem' }}>
              <button className="action-button" type="button" onClick={() => navigate('/district/district-harbor')}>Harbor Ward</button>
              <button className="action-button" type="button" onClick={() => navigate('/district/district-ironworks')}>Ironworks</button>
              <button className="action-button" type="button" onClick={() => navigate('/district/district-the-warrens')}>The Warrens</button>
            </div>
          </div>
        ) : (
        <p className="summary">Acquire weapons and armor to make them available for equipping to roster members.</p>
        )}
        {hasArmsDealer && (
        <div className="stash-catalog">
          <h3>Weapons</h3>
          <div className="shop-offer-list">
            {(rawWeapons as Array<{ id: string; name: string; weaponClass: string; damageMin: number; damageMax: number; accuracy: number; tier: number; shopPrice: number }>).map((w) => {
              const owned = stash.weapons.includes(w.id)
              const canAfford = money >= w.shopPrice
              return (
                <div key={w.id} className="shop-offer-row">
                  <div>
                    <strong>{w.name}</strong>
                    <p>T{w.tier} · {w.weaponClass} · {w.damageMin}–{w.damageMax} dmg · {w.accuracy}% acc</p>
                  </div>
                  <div className="shop-offer-actions">
                    {owned
                      ? <span className="badge badge-positive">In Stash</span>
                      : (
                        <button
                          className="action-button action-button-sm"
                          type="button"
                          disabled={!canAfford}
                          title={!canAfford ? `Not enough Marks. You need ${w.shopPrice - money} more.` : undefined}
                          onClick={() => dispatch(gameActions.addToStash({ type: 'weapon', id: w.id, price: w.shopPrice }))}
                        >
                          {w.shopPrice} Mk
                        </button>
                      )
                    }
                  </div>
                </div>
              )
            })}
          </div>
          <h3>Armor</h3>
          <div className="shop-offer-list">
            {(rawArmor as Array<{ id: string; name: string; armorClass: string; soak: number; evasionPenalty: number; tier: number; shopPrice: number }>).map((a) => {
              const owned = stash.armors.includes(a.id)
              const canAfford = money >= a.shopPrice
              return (
                <div key={a.id} className="shop-offer-row">
                  <div>
                    <strong>{a.name}</strong>
                    <p>T{a.tier} · {a.armorClass} · {a.soak} soak · -{a.evasionPenalty}% evasion</p>
                  </div>
                  <div className="shop-offer-actions">
                    {owned
                      ? <span className="badge badge-positive">In Stash</span>
                      : (
                        <button
                          className="action-button action-button-sm"
                          type="button"
                          disabled={!canAfford}
                          title={!canAfford ? `Not enough Marks. You need ${a.shopPrice - money} more.` : undefined}
                          onClick={() => dispatch(gameActions.addToStash({ type: 'armor', id: a.id, price: a.shopPrice }))}
                        >
                          {a.shopPrice} Mk
                        </button>
                      )
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        )}
      </section>
      <section className="repair-section">
        <h2>Equipment Repair</h2>
        {hasQuartermaster && (
          <p className="badge badge-positive">Quartermaster active — 20% repair discount</p>
        )}
        {roster.map((npc) => {
          const weaponId = npc.loadout.primaryWeaponId
          const armorId = npc.loadout.armorId

          const weaponDurability = durabilities[npc.npcId]?.['weapon'] ?? 100
          const armorDurability = durabilities[npc.npcId]?.['armor'] ?? 100
          const weaponMax = getWeaponDurabilityMax(weaponId)
          const armorMax = getArmorDurabilityMax(armorId)
          const weaponRepairCost = Math.floor(getWeaponRepairCost(weaponId) * (hasQuartermaster ? 0.8 : 1.0))
          const armorRepairCost = Math.floor(getArmorRepairCost(armorId) * (hasQuartermaster ? 0.8 : 1.0))

          return (
            <div key={npc.npcId} className="repair-npc-row">
              <strong>{npc.name}</strong>
              {weaponId && (
                <div className="repair-item-row">
                  <span>Weapon</span>
                  <DurabilityBar current={weaponDurability} max={weaponMax} />
                  <span>{weaponDurability}/{weaponMax}</span>
                  <button
                    className="action-button action-button-sm"
                    disabled={weaponDurability >= weaponMax || money < weaponRepairCost}
                    title={
                      weaponDurability >= weaponMax
                        ? 'Weapon is fully repaired.'
                        : money < weaponRepairCost
                          ? `Not enough Marks. Repair costs ${weaponRepairCost} Mk.`
                          : undefined
                    }
                    onClick={() => dispatch(gameActions.repairItem({ npcId: npc.npcId, slot: 'weapon' }))}
                    type="button"
                  >
                    Repair ({weaponRepairCost} Mk)
                  </button>
                </div>
              )}
              {armorId && (
                <div className="repair-item-row">
                  <span>Armor</span>
                  <DurabilityBar current={armorDurability} max={armorMax} />
                  <span>{armorDurability}/{armorMax}</span>
                  <button
                    className="action-button action-button-sm"
                    disabled={armorDurability >= armorMax || money < armorRepairCost}
                    title={
                      armorDurability >= armorMax
                        ? 'Armor is fully repaired.'
                        : money < armorRepairCost
                          ? `Not enough Marks. Repair costs ${armorRepairCost} Mk.`
                          : undefined
                    }
                    onClick={() => dispatch(gameActions.repairItem({ npcId: npc.npcId, slot: 'armor' }))}
                    type="button"
                  >
                    Repair ({armorRepairCost} Mk)
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </section>
  )
}
