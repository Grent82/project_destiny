import { gameActions } from '../../application/store/gameSlice'
import { selectHouseStorageArmors, selectHouseStorageWeapons } from '../../application/selectors/household'
import { useAppDispatch, useAppSelector } from '../app/hooks'

type EquipSlot = 'primaryWeaponId' | 'secondaryWeaponId' | 'armorId'

interface ItemSelectionModalProps {
  npcId: string
  slot: EquipSlot
  onClose: () => void
}

export function ItemSelectionModal({ npcId, slot, onClose }: ItemSelectionModalProps) {
  const dispatch = useAppDispatch()
  const weapons = useAppSelector(selectHouseStorageWeapons)
  const armors = useAppSelector(selectHouseStorageArmors)
  const isWeaponSlot = slot === 'primaryWeaponId' || slot === 'secondaryWeaponId'

  function handleSelect(instanceId: string | null) {
    dispatch(gameActions.equipItem({ npcId, slot, itemId: instanceId }))
    onClose()
  }

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal item-selection-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="event-modal-title">
          {slot === 'primaryWeaponId' ? 'Primary Weapon'
            : slot === 'secondaryWeaponId' ? 'Secondary Weapon'
            : 'Armor'}
        </h2>

        <div className="item-selection-list">
          <button
            className="item-selection-option item-selection-unequip"
            type="button"
            onClick={() => handleSelect(null)}
          >
            — Unequip
          </button>

          {isWeaponSlot
            ? weapons.length === 0
              ? <p className="summary">No weapons in House Storage. Acquire weapons from The Market.</p>
              : weapons.map((w) => (
              <button
                key={w.instanceId}
                className="item-selection-option"
                type="button"
                onClick={() => handleSelect(w.instanceId)}
              >
                <span className="item-option-name">{w.definition.name} <span className="item-source-label">(House Storage)</span></span>
                <span className="item-option-meta">
                  T{w.definition.tier} · {w.definition.weaponClass} · {w.definition.damageMin}–{w.definition.damageMax} dmg · {w.definition.accuracy}% acc
                </span>
              </button>
            ))
            : armors.length === 0
              ? <p className="summary">No armor in House Storage. Acquire armor from The Market.</p>
              : armors.map((a) => (
              <button
                key={a.instanceId}
                className="item-selection-option"
                type="button"
                onClick={() => handleSelect(a.instanceId)}
              >
                <span className="item-option-name">{a.definition.name} <span className="item-source-label">(House Storage)</span></span>
                <span className="item-option-meta">
                  T{a.definition.tier} · {a.definition.armorClass} · {a.definition.soak} soak · -{a.definition.evasionPenalty}% evasion
                </span>
              </button>
            ))}
        </div>

        <button className="action-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
