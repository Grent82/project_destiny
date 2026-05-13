import { useState } from 'react'
import { HouseStoragePanel } from './HouseStoragePanel'
import { MissionPackPanel } from './MissionPackPanel'

export function InventoryDrawer() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'house' | 'pack'>('house')

  return (
    <>
      <button
        className="inventory-drawer__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open inventory"
        aria-expanded={open}
      >
        🎒
      </button>

      {open && (
        <div className="inventory-drawer" role="dialog" aria-label="Inventory">
          <div className="inventory-drawer__header">
            <button
              className={`inventory-drawer__tab ${tab === 'house' ? 'inventory-drawer__tab--active' : ''}`}
              onClick={() => setTab('house')}
            >
              House Storage
            </button>
            <button
              className={`inventory-drawer__tab ${tab === 'pack' ? 'inventory-drawer__tab--active' : ''}`}
              onClick={() => setTab('pack')}
            >
              Mission Pack
            </button>
            <button
              className="inventory-drawer__close"
              onClick={() => setOpen(false)}
              aria-label="Close inventory"
            >
              ✕
            </button>
          </div>

          <div className="inventory-drawer__body">
            {tab === 'house' ? <HouseStoragePanel /> : <MissionPackPanel />}
          </div>
        </div>
      )}
    </>
  )
}
