import { gameActions } from '../../application/store/gameSlice'
import { selectHouseStorageArmors, selectHouseStorageWeapons } from '../../application/selectors/household'
import { selectNpcInventoryItems } from '../../application/selectors/inventory'
import { contentCatalog } from '../../application/content/contentCatalog'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import type { WeaponDefinition, ArmorDefinition } from '../../domain/items/contracts'

type EquipSlot = 'primaryWeaponId' | 'secondaryWeaponId' | 'armorId'

interface ItemSelectionModalProps {
  npcId: string
  slot: EquipSlot
  onClose: () => void
}

export function ItemSelectionModal({ npcId, slot, onClose }: ItemSelectionModalProps) {
  const dispatch = useAppDispatch()
  const houseWeapons = useAppSelector(selectHouseStorageWeapons)
  const houseArmors = useAppSelector(selectHouseStorageArmors)
  const npcItems = useAppSelector((state) => selectNpcInventoryItems(state, npcId))
  const isWeaponSlot = slot === 'primaryWeaponId' || slot === 'secondaryWeaponId'

  // Items an NPC unequipped previously land in their own personal inventory (see
  // PersonalEffectsSection in NpcDetailPanel.tsx) -- equipItem.ts's getAccessibleContainersForNpc
  // already searches that container first, so these are just as equippable as House Storage items.
  // The picker only ever queried House Storage, so a player could see "Personal Effects" list an
  // item yet have no way to re-equip it from here without first shuttling it through House Storage.
  const npcWeapons = npcItems
    .map((item) => {
      const def = contentCatalog.itemsById.get(item.itemId)
      return def && def.category === 'weapon'
        ? { ...item, definition: def as WeaponDefinition, source: 'Personal' }
        : null
    })
    .filter((item): item is { instanceId: string; itemId: string; quantity: number; definition: WeaponDefinition; source: string } => item !== null)
  const npcArmors = npcItems
    .map((item) => {
      const def = contentCatalog.itemsById.get(item.itemId)
      return def && def.category === 'armor'
        ? { ...item, definition: def as ArmorDefinition, source: 'Personal' }
        : null
    })
    .filter((item): item is { instanceId: string; itemId: string; quantity: number; definition: ArmorDefinition; source: string } => item !== null)

  const weapons = [
    ...houseWeapons.map((w) => ({ ...w, source: 'House Storage' })),
    ...npcWeapons,
  ]
  const armors = [
    ...houseArmors.map((a) => ({ ...a, source: 'House Storage' })),
    ...npcArmors,
  ]

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
              ? <p className="summary">No weapons in House Storage or on this operative. Acquire weapons from The Market.</p>
              : weapons.map((w) => (
              <button
                key={w.instanceId}
                className="item-selection-option"
                type="button"
                onClick={() => handleSelect(w.instanceId)}
              >
                <span className="item-option-name">{w.definition.name} <span className="item-source-label">({w.source})</span></span>
                <span className="item-option-meta">
                  T{w.definition.tier} · {w.definition.weaponClass} · {w.definition.damageMin}–{w.definition.damageMax} dmg · {w.definition.accuracy}% acc
                </span>
              </button>
            ))
            : armors.length === 0
              ? <p className="summary">No armor in House Storage or on this operative. Acquire armor from The Market.</p>
              : armors.map((a) => (
              <button
                key={a.instanceId}
                className="item-selection-option"
                type="button"
                onClick={() => handleSelect(a.instanceId)}
              >
                <span className="item-option-name">{a.definition.name} <span className="item-source-label">({a.source})</span></span>
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
