import { gameStateSchema, type GameState } from '../../domain'
import type { SaveGameStore } from '../../application/ports/saveGameStore'
import { createEmptyChronicle } from '../../domain/chronicle/contracts'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>()

  return {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
  }
}

function isStorageLike(value: unknown): value is StorageLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as StorageLike).getItem === 'function' &&
    typeof (value as StorageLike).setItem === 'function' &&
    typeof (value as StorageLike).removeItem === 'function'
  )
}

function migrateState(raw: unknown): GameState | null {
  const version = (raw as Record<string, unknown>)?.saveVersion ?? 0

  if (version === 0) {
    // v0 → v1: add saveVersion and normalize playerCharacter to attributes/skills/traits shape
    const pc = (raw as Record<string, unknown>)?.playerCharacter as Record<string, unknown> | undefined
    const migrated = {
      ...(raw as object),
      saveVersion: 1,
      playerCharacter: pc?.attributes
        ? pc
        : {
            name: pc?.name ?? 'The Heir',
            attributes: { might: 50, agility: 50, endurance: 50, intellect: 50, perception: 50, presence: 50, resolve: 50 },
            skills: { melee: 30, ranged: 20, medicine: 10, administration: 20, intrigue: 30, negotiation: 20, engineering: 10, academics: 10, performance: 20, survival: 20, security: 20, crafting: 10 },
            traits: { discipline: 40, ambition: 60, empathy: 40, ruthlessness: 40, prudence: 40, curiosity: 40, dominance: 40, loyalty: 50, vanity: 40, zeal: 40 },
            level: 1,
            renown: (pc?.renown as number) ?? 0,
          },
    }
    return gameStateSchema.safeParse(migrated).data ?? null
  }

  if (version === 1) {
    // v1 → v2: add ownedItems from inventory[] + stash (if not already present)
    const raw1 = raw as Record<string, unknown>
    if (!raw1['ownedItems']) {
      const oldInventory = (raw1['inventory'] as Array<{ itemId: string; quantity: number; currentDurability?: number }>) ?? []
      const oldStash = (raw1['stash'] as { weapons?: string[]; armors?: string[] }) ?? {}
      const ownedItems: Array<{
        instanceId: string; itemId: string; location: string; quantity: number; currentDurability?: number
      }> = []
      oldInventory.forEach((entry, i) => {
        ownedItems.push({
          instanceId: `migrated-${entry.itemId}-${i}`,
          itemId: entry.itemId,
          location: 'inventory',
          quantity: entry.quantity,
          ...(entry.currentDurability !== undefined ? { currentDurability: entry.currentDurability } : {}),
        })
      })
      ;(oldStash.weapons ?? []).forEach((id, i) => {
        ownedItems.push({ instanceId: `migrated-stash-w-${id}-${i}`, itemId: id, location: 'house_storage', quantity: 1 })
      })
      ;(oldStash.armors ?? []).forEach((id, i) => {
        ownedItems.push({ instanceId: `migrated-stash-a-${id}-${i}`, itemId: id, location: 'house_storage', quantity: 1 })
      })
      return gameStateSchema.safeParse({ ...raw1, saveVersion: 2, ownedItems }).data ?? null
    }
    return gameStateSchema.safeParse({ ...raw1, saveVersion: 2 }).data ?? null
  }

  if (version === 2) {
    // v2 → v3: add chronicle field
    const raw2 = raw as Record<string, unknown>
    return gameStateSchema.safeParse({ ...raw2, saveVersion: 3, chronicle: createEmptyChronicle() }).data ?? null
  }

  if (version === 3) {
    // v3 → v4: add foodStock and foodCapacity, derive foodStock from foodSecurity
    // foodSecurity = (foodStock / foodCapacity) * 100
    // Therefore: foodStock = (foodSecurity / 100) * foodCapacity
    const raw3 = raw as Record<string, unknown>
    const cityResources = raw3['cityResources'] as Record<string, unknown> | undefined
    if (cityResources) {
      const foodSecurity = cityResources['foodSecurity'] as number | undefined
      const foodCapacity = 1000 // Default capacity
      const foodStock = foodSecurity !== undefined
        ? Math.round((foodSecurity / 100) * foodCapacity)
        : 620 // Default stock (62% of capacity)
      const migratedCityResources = {
        ...cityResources,
        foodStock,
        foodCapacity,
      }
      return gameStateSchema.safeParse({ ...raw3, saveVersion: 4, cityResources: migratedCityResources }).data ?? null
    }
    return gameStateSchema.safeParse({ ...raw3, saveVersion: 4 }).data ?? null
  }

  // Unknown future version — cannot load
  return null
}

export class LocalSaveSnapshotStore implements SaveGameStore {
  private readonly storage: StorageLike
  private readonly key: string

  constructor(storage: StorageLike, key = 'project-destiny.save') {
    this.storage = storage
    this.key = key
  }

  load(): GameState | null {
    const raw = this.storage.getItem(this.key)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    const migrated = migrateState(parsed)

    if (!migrated) {
      console.warn('[SaveStore] Saved state could not be migrated — discarding stale save.')
      this.storage.removeItem(this.key)
      return null
    }

    return migrated
  }

  save(state: GameState): void {
    const validated = gameStateSchema.parse(state)

    this.storage.setItem(this.key, JSON.stringify(validated))
  }

  clear(): void {
    this.storage.removeItem(this.key)
  }
}

export function createBrowserSaveSnapshotStore(key?: string) {
  const storage = isStorageLike(window.localStorage)
    ? window.localStorage
    : createMemoryStorage()

  return new LocalSaveSnapshotStore(storage, key)
}
