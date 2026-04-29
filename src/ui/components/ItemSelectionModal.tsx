import { gameActions } from '../../application/store/gameSlice'
import { selectStashedArmors, selectStashedWeapons } from '../../application/selectors/stash'
import { useAppDispatch, useAppSelector } from '../app/hooks'

type EquipSlot = 'primaryWeaponId' | 'secondaryWeaponId' | 'armorId'

interface WeaponEntry {
  id: string
  name: string
  weaponClass: string
  damageMin: number
  damageMax: number
  accuracy: number
  tier: number
}

interface ArmorEntry {
  id: string
  name: string
  armorClass: string
  soak: number
  evasionPenalty: number
  tier: number
}

interface ItemSelectionModalProps {
  npcId: string
  slot: EquipSlot
  onClose: () => void
}

export function ItemSelectionModal({ npcId, slot, onClose }: ItemSelectionModalProps) {
  const dispatch = useAppDispatch()
  const weapons = useAppSelector(selectStashedWeapons) as WeaponEntry[]
  const armors = useAppSelector(selectStashedArmors) as ArmorEntry[]
  const isWeaponSlot = slot === 'primaryWeaponId' || slot === 'secondaryWeaponId'

  function handleSelect(itemId: string | null) {
    dispatch(gameActions.equipItem({ npcId, slot, itemId }))
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
              ? <p className="summary">No weapons in stash. Acquire weapons from The Market.</p>
              : weapons.map((w) => (
              <button
                key={w.id}
                className="item-selection-option"
                type="button"
                onClick={() => handleSelect(w.id)}
              >
                <span className="item-option-name">{w.name}</span>
                <span className="item-option-meta">
                  T{w.tier} · {w.weaponClass} · {w.damageMin}–{w.damageMax} dmg · {w.accuracy}% acc
                </span>
              </button>
            ))
            : armors.length === 0
              ? <p className="summary">No armor in stash. Acquire armor from The Market.</p>
              : armors.map((a) => (
              <button
                key={a.id}
                className="item-selection-option"
                type="button"
                onClick={() => handleSelect(a.id)}
              >
                <span className="item-option-name">{a.name}</span>
                <span className="item-option-meta">
                  T{a.tier} · {a.armorClass} · {a.soak} soak · -{a.evasionPenalty}% evasion
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
