/**
 * Player Inventory Screen
 *
 * Displays player inventory (bag containers), equipment slots, and item details.
 * Allows players to equip, unequip, and view items.
 */

import { useState } from 'react'
import { useAppSelector } from '../app/hooks'
import type { RootState } from '../../application'
import { selectPlayerBagContainers, selectPlayerUsedBagSlots, selectPlayerTotalBagSlots, selectPlayerEquipment, selectItemDefinition } from '../../application/selectors/inventory'

/**
 * Equipment slot component - displays an equipped item or empty slot
 */
function EquipmentSlot({ slot, itemInstanceId }: { slot: string; itemInstanceId: string | null }) {
  const itemDef = useAppSelector((state) =>
    itemInstanceId ? selectItemDefinition(state, itemInstanceId) : null
  )

  return (
    <div className={`equipment-slot ${slot} ${itemInstanceId ? 'equipped' : 'empty'}`}>
      <div className="equipment-slot__label">{slot}</div>
      {itemInstanceId ? (
        <div className="equipment-slot__item">
          <span className="equipment-slot__item-icon">
            {itemDef?.category === 'weapon' && '☗'}
            {itemDef?.category === 'armor' && '🛡'}
            {itemDef?.category === 'accessory' && '💍'}
            {!itemDef && '?'}
          </span>
          <span className="equipment-slot__item-name">{itemDef?.name ?? 'Unknown'}</span>
        </div>
      ) : (
        <div className="equipment-slot__empty-message">Empty</div>
      )}
    </div>
  )
}

/**
 * Item slot component - displays an item in the bag grid
 */
function ItemSlot({
  slot,
  isSelected,
  onClick,
}: {
  slot: { slotId: string; itemInstanceId: string | null; quantity: number }
  isSelected: boolean
  onClick: () => void
}) {
  const itemDef = useAppSelector(
    slot.itemInstanceId ? (state: RootState) => selectItemDefinition(state, slot.itemInstanceId!) : () => null
  )

  return (
    <div
      className={`item-slot ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="item-slot__icon">
        {itemDef?.category === 'consumable' && '🍖'}
        {itemDef?.category === 'weapon' && '☗'}
        {itemDef?.category === 'armor' && '🛡'}
        {itemDef?.category === 'accessory' && '💍'}
        {itemDef?.category === 'document' && '📜'}
        {itemDef?.category === 'gift' && '🎁'}
        {itemDef?.category === 'tool' && '🔧'}
        {!itemDef && '❓'}
      </div>
      {slot.quantity > 1 && <span className="item-slot__quantity">{slot.quantity}</span>}
    </div>
  )
}

/**
 * Item detail modal - shows item information
 * Note: Equip/Unequip functionality requires Redux actions to be added to gameSlice
 */
function ItemDetailModal({
  itemInstanceId,
  onClose,
}: {
  itemInstanceId: string
  onClose: () => void
}) {
  const itemDef = useAppSelector((state: RootState) => selectItemDefinition(state, itemInstanceId))

  return (
    <div className="item-detail-modal" onClick={onClose}>
      <div className="item-detail-modal__content" onClick={(e) => e.stopPropagation()}>
        <h3>{itemDef?.name ?? 'Unknown Item'}</h3>
        <p className="item-detail-modal__category">{itemDef?.category ?? 'Unknown'}</p>
        <p className="item-detail-modal__description">{itemDef?.description ?? 'No description available.'}</p>

        {itemDef?.category === 'weapon' && (
          <div className="item-stats">
            <span>Weapon (details TBD)</span>
          </div>
        )}
        {itemDef?.category === 'armor' && (
          <div className="item-stats">
            <span>Armor (details TBD)</span>
          </div>
        )}

        <div className="item-detail-modal__actions">
          <button onClick={onClose} className="btn btn--secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Main player inventory screen component
 */
export function PlayerInventoryScreen() {
  const equipment = useAppSelector(selectPlayerEquipment)
  const bagContainers = useAppSelector(selectPlayerBagContainers)
  const usedSlots = useAppSelector(selectPlayerUsedBagSlots)
  const totalSlots = useAppSelector(selectPlayerTotalBagSlots)

  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  const allBagSlots = bagContainers.flatMap((c: { slots: Array<{ slotId: string; itemInstanceId: string | null; quantity: number }> }) => c.slots)

  return (
    <div className="player-inventory-screen">
      <header className="player-inventory-screen__header">
        <h1>Inventory</h1>
        <span className="capacity-indicator">
          {usedSlots} / {totalSlots} slots used
        </span>
      </header>

      <div className="player-inventory-screen__content">
        {/* Left: Equipment Panel */}
        <section className="equipment-panel">
          <h2>Equipment</h2>
          <EquipmentSlot slot="weapon" itemInstanceId={equipment.weapon} />
          <EquipmentSlot slot="armor" itemInstanceId={equipment.armor} />
          <EquipmentSlot slot="accessory_1" itemInstanceId={equipment.accessory_1} />
          <EquipmentSlot slot="accessory_2" itemInstanceId={equipment.accessory_2} />
        </section>

        {/* Right: Bag View */}
        <section className="bag-panel">
          <h2>Bag</h2>
          <div className="bag-grid">
            {allBagSlots.map((slot: { slotId: string; itemInstanceId: string | null; quantity: number }) => (
              <ItemSlot
                key={slot.slotId}
                slot={slot}
                isSelected={selectedItem === slot.itemInstanceId}
                onClick={() => setSelectedItem(slot.itemInstanceId)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && <ItemDetailModal itemInstanceId={selectedItem} onClose={() => setSelectedItem(null)} />}

      <style>{`
        .player-inventory-screen {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 1rem;
          background: #1a1a2e;
          color: #eaeaea;
        }

        .player-inventory-screen__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 1rem;
          border-bottom: 1px solid #444;
        }

        .player-inventory-screen__header h1 {
          margin: 0;
          font-size: 1.5rem;
        }

        .capacity-indicator {
          color: #888;
          font-size: 0.9rem;
        }

        .player-inventory-screen__content {
          display: flex;
          gap: 2rem;
          flex: 1;
          overflow: hidden;
        }

        .equipment-panel {
          width: 280px;
          background: #16213e;
          padding: 1rem;
          border-radius: 8px;
        }

        .equipment-panel h2 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          color: #aaa;
        }

        .equipment-slot {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem;
          margin-bottom: 0.75rem;
          background: #0f0f23;
          border-radius: 6px;
          border: 1px solid #333;
        }

        .equipment-slot__label {
          font-size: 0.8rem;
          color: #666;
          text-transform: uppercase;
        }

        .equipment-slot.equipped {
          border-color: #4a4;
        }

        .equipment-slot.empty {
          opacity: 0.5;
        }

        .equipment-slot__item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .equipment-slot__item-icon {
          font-size: 1.2rem;
        }

        .equipment-slot__item-name {
          font-size: 0.9rem;
        }

        .equipment-slot__empty-message {
          font-size: 0.85rem;
          color: #666;
          font-style: italic;
        }

        .bag-panel {
          flex: 1;
          background: #16213e;
          padding: 1rem;
          border-radius: 8px;
          overflow-y: auto;
        }

        .bag-panel h2 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          color: #aaa;
        }

        .bag-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
          gap: 0.5rem;
        }

        .item-slot {
          position: relative;
          aspect-ratio: 1;
          background: #0f0f23;
          border: 2px solid #333;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.5rem;
        }

        .item-slot:hover {
          border-color: #666;
        }

        .item-slot.selected {
          border-color: #4a4;
          background: #1a2a1a;
        }

        .item-slot__quantity {
          position: absolute;
          bottom: 2px;
          right: 4px;
          font-size: 0.7rem;
          color: #aaa;
        }

        .item-detail-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .item-detail-modal__content {
          background: #1a1a2e;
          padding: 1.5rem;
          border-radius: 12px;
          max-width: 400px;
          width: 90%;
          border: 1px solid #444;
        }

        .item-detail-modal__content h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.2rem;
        }

        .item-detail-modal__category {
          color: #888;
          font-size: 0.9rem;
          margin: 0 0 1rem 0;
        }

        .item-detail-modal__description {
          color: #ccc;
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        .item-stats {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          color: #888;
        }

        .item-detail-modal__actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .btn--primary {
          background: #4a4;
          color: #000;
        }

        .btn--secondary {
          background: #444;
          color: #fff;
        }
      `}</style>
    </div>
  )
}
