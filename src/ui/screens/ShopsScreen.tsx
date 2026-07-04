import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import rawArmor from '../../../data/definitions/armor.json'
import rawWeapons from '../../../data/definitions/weapons.json'
import { gameActions, selectShopOverview } from '../../application'
import { getDurabilityTier } from '../../application/selectors/durability'
import { describeFactionPriceModifier, describeMarketPressureModifier } from '../../application/selectors/shops'
import { computeRepairCost } from '../../application/commands/durability'
import { getWeaponRepairCost, getWeaponDurabilityMax, getArmorRepairCost, getArmorDurabilityMax } from '../../application/content/equipmentCatalog'
import { selectHouseStorageWeapons, selectHouseStorageArmors } from '../../application/selectors/household'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { VenueContextBanner } from './VenueContextBanner'
import { ConfirmationModal } from '../components/ConfirmationModal'
import { formatMarks, formatMarksAbbrev } from '../../domain/game/currency'

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
  const gameState = useAppSelector((state) => state.game)
  const houseStorageWeapons = useAppSelector(selectHouseStorageWeapons)
  const houseStorageArmors = useAppSelector(selectHouseStorageArmors)
  const roster = gameState.npcRuntimeStates
  const durabilities = gameState.equippedItemDurabilities
  const money = gameState.money
  const hasQuartermaster = roster.some((r) => r.activeTitle === 'title-quartermaster')
  const currentDistrictId = gameState.currentDistrictId

  type PendingSell = { kind: 'weapon' | 'armor'; id: string; name: string; approxPrice: number }
  const [pendingSell, setPendingSell] = useState<PendingSell | null>(null)

  // Build sets of owned weapon/armor IDs for quick lookup
  const ownedWeaponIds = new Set(houseStorageWeapons.map((w) => w.itemId))
  const ownedArmorIds = new Set(houseStorageArmors.map((a) => a.itemId))

  // Only show weapon/armor House Storage when in a district with an arms dealer or weapon_dealer shop type
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

  // Guard: if not in a district, redirect to the district map
  if (!currentDistrictId) {
    return (
      <section className="screen-panel">
        <p className="eyebrow">House Valdris</p>
        <h1>The Market</h1>
        <p className="summary">Markets are found in districts. Travel first, then trade.</p>
        <button
          className="action-button action-button--primary"
          type="button"
          onClick={() => navigate('/district-map')}
        >
          Go to Districts →
        </button>
      </section>
    )
  }

  return (
    <>
    <section className="screen-panel">
      <p className="eyebrow">House Valdris</p>
      <h1>The Market</h1>
      <p className="summary">
        District vendors. What they carry depends on who controls the ward and how much pressure the market is under.
      </p>
      <VenueContextBanner />
      <p className="summary">Available funds: {formatMarks(overview.money)}</p>
      {priceNote ? (
        <p className="badge badge-warning">{priceNote}</p>
      ) : null}
      {overview.shops.length === 0 ? (
        <div className="empty-state-message">
          <p className="summary">
            No traders operate here. Travel to another district to find merchants.
          </p>
          <button
            className="action-button"
            type="button"
            onClick={() => navigate('/district-map')}
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
                  {'marketPressureMod' in shop && typeof shop.marketPressureMod === 'number' && shop.marketPressureMod !== 1.0 && (
                    <span
                      className={shop.marketPressureMod < 1.0 ? 'badge badge-success' : 'badge badge-warning'}
                      title={`Market pressure ${shop.marketPressure ?? '—'}/100`}
                    >
                      {describeMarketPressureModifier(shop.marketPressureMod)}
                    </span>
                  )}
                  {'factionPriceModifier' in shop && typeof shop.factionPriceModifier === 'number' && shop.factionPriceModifier !== 1.0 && (
                    <span
                      className={shop.factionPriceModifier < 1.0 ? 'badge badge-success' : 'badge badge-warning'}
                      title={`${shop.controllingFactionName ?? 'Faction'} standing discount applied`}
                    >
                      {describeFactionPriceModifier(shop.factionPriceModifier)}
                    </span>
                  )}
                </div>
              </header>
              <p>{shop.summary}</p>
              {shop.accessDenied ? (
                <p className="summary badge badge-warning">
                  {'institutionalBlock' in shop && shop.institutionalBlock
                    ? 'This faction has closed their doors to House Valdris. Blacklisted.'
                    : 'This establishment does not welcome you.'}
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
                        <details className="shop-price-breakdown">
                          <summary>Price factors</summary>
                          <p>Base price: {formatMarks(offer.pricingBreakdown.basePrice)}</p>
                          <p>Corridor: x{offer.pricingBreakdown.corridorMod.toFixed(2)}</p>
                          <p>District tension: x{offer.pricingBreakdown.tensionMod.toFixed(2)}</p>
                          <p>Faction standing: x{offer.pricingBreakdown.factionMod.toFixed(2)}</p>
                          <p>Market pressure: x{offer.pricingBreakdown.marketMod.toFixed(2)}</p>
                          <p>Final price: {formatMarks(offer.pricingBreakdown.finalPrice)}</p>
                        </details>
                      </div>
                      <div className="shop-offer-actions">
                        <span>{formatMarksAbbrev(offer.price)}</span>
                        <button
                          className="action-button"
                          onClick={() =>
                            dispatch(
                              gameActions.purchaseItemFromShop({
                                shopId: shop.id,
                                itemId: offer.itemId,
                              }),
                            )
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
        <div className="house-storage-catalog">
          <h3>Weapons</h3>
          <div className="shop-offer-list">
            {(rawWeapons as Array<{ id: string; name: string; weaponClass: string; damageMin: number; damageMax: number; accuracy: number; tier: number; shopPrice: number }>).map((w) => {
              const owned = ownedWeaponIds.has(w.id)
              const canAfford = money >= w.shopPrice
              return (
                <div key={w.id} className="shop-offer-row">
                  <div>
                    <strong>{w.name}</strong>
                    <p>T{w.tier} · {w.weaponClass} · {w.damageMin}–{w.damageMax} dmg · {w.accuracy}% acc</p>
                  </div>
                  <div className="shop-offer-actions">
                    {owned
                      ? (
                        <div style={{ display: 'flex', gap: '0.25rem', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span className="badge badge-positive">In House Storage</span>
                          <button
                            className="action-button action-button-sm"
                            type="button"
                            onClick={() => setPendingSell({
                              kind: 'weapon',
                              id: w.id,
                              name: w.name,
                              approxPrice: Math.floor(getWeaponRepairCost(w.id) * 2.5),
                            })}
                            title="Sell for ~50% market value"
                          >
                            Sell
                          </button>
                        </div>
                      )
                      : (
                        <button
                          className="action-button action-button-sm"
                          type="button"
                          disabled={!canAfford}
                          title={!canAfford ? `Not enough Marks. You need ${formatMarks(w.shopPrice - money)} more.` : undefined}
                          onClick={() => dispatch(gameActions.purchaseWeapon({ weaponId: w.id, price: w.shopPrice }))}
                        >
                          {formatMarksAbbrev(w.shopPrice)}
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
              const owned = ownedArmorIds.has(a.id)
              const canAfford = money >= a.shopPrice
              return (
                <div key={a.id} className="shop-offer-row">
                  <div>
                    <strong>{a.name}</strong>
                    <p>T{a.tier} · {a.armorClass} · {a.soak} soak · -{a.evasionPenalty}% evasion</p>
                  </div>
                  <div className="shop-offer-actions">
                    {owned
                      ? (
                        <div style={{ display: 'flex', gap: '0.25rem', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span className="badge badge-positive">In House Storage</span>
                          <button
                            className="action-button action-button-sm"
                            type="button"
                            onClick={() => setPendingSell({
                              kind: 'armor',
                              id: a.id,
                              name: a.name,
                              approxPrice: Math.floor(getArmorRepairCost(a.id) * 2.5),
                            })}
                            title="Sell for ~50% market value"
                          >
                            Sell
                          </button>
                        </div>
                      )
                      : (
                        <button
                          className="action-button action-button-sm"
                          type="button"
                          disabled={!canAfford}
                          title={!canAfford ? `Not enough Marks. You need ${formatMarks(a.shopPrice - money)} more.` : undefined}
                          onClick={() => dispatch(gameActions.purchaseArmor({ armorId: a.id, price: a.shopPrice }))}
                        >
                          {formatMarksAbbrev(a.shopPrice)}
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
          const weaponRepairCost = computeRepairCost(getWeaponRepairCost(weaponId), hasQuartermaster)
          const armorRepairCost = computeRepairCost(getArmorRepairCost(armorId), hasQuartermaster)

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
                          ? `Not enough Marks. Repair costs ${formatMarksAbbrev(weaponRepairCost)}.`
                          : undefined
                    }
                    onClick={() => dispatch(gameActions.repairItem({ npcId: npc.npcId, slot: 'weapon' }))}
                    type="button"
                  >
                    Repair ({formatMarksAbbrev(weaponRepairCost)})
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
                          ? `Not enough Marks. Repair costs ${formatMarksAbbrev(armorRepairCost)}.`
                          : undefined
                    }
                    onClick={() => dispatch(gameActions.repairItem({ npcId: npc.npcId, slot: 'armor' }))}
                    type="button"
                  >
                    Repair ({formatMarksAbbrev(armorRepairCost)})
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </section>
    {pendingSell && (
      <ConfirmationModal
        heading={`Sell ${pendingSell.name}?`}
        consequence={`This will sell the item from House Storage. You will receive approximately ${formatMarksAbbrev(pendingSell.approxPrice)}.`}
        confirmLabel="Sell item"
        onConfirm={() => {
          if (pendingSell.kind === 'weapon') {
            dispatch(gameActions.sellWeapon({ weaponId: pendingSell.id }))
          } else {
            dispatch(gameActions.sellArmor({ armorId: pendingSell.id }))
          }
          setPendingSell(null)
        }}
        onCancel={() => setPendingSell(null)}
      />
    )}
    </>
  )
}
