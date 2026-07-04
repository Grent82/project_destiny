import { gameStateSchema, type GameState } from '../../domain'
import type { SaveGameStore } from '../../application/ports/saveGameStore'
import { createEmptyChronicle } from '../../domain/chronicle/contracts'
import { normalizePendingEventInstances } from '../../application/commands/eventInstances'

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

/**
 * v6 → v7 field rename (destiny-rama.7 / unified-npc-runtime-contract §7 step 1): the GameState field
 * `roster` was renamed to `npcRuntimeStates`, and every person gained `npcType` + `playerRosterMember`.
 * Any save written before v7 uses the old `roster` key and lacks those fields, so it would fail the
 * now-strict schema. Rename the key and stamp the fields — every pre-v7 person was a player-roster
 * member (world/captive persons did not yet live in this list). Applied to every version branch below
 * (all of them spread the raw save), and a no-op once the save is already on the new shape.
 */
function migrateRosterFieldToNpcRuntimeStates(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw
  const record = raw as Record<string, unknown>
  if (!Array.isArray(record.roster) || record.npcRuntimeStates !== undefined) return raw
  const npcRuntimeStates = (record.roster as unknown[]).map((entry) =>
    entry && typeof entry === 'object'
      ? { npcType: 'roster', playerRosterMember: true, ...(entry as Record<string, unknown>) }
      : entry,
  )
  const rest: Record<string, unknown> = { ...record }
  delete rest.roster
  return { ...rest, npcRuntimeStates }
}

function migrateState(rawInput: unknown): GameState | null {
  const raw = migrateRosterFieldToNpcRuntimeStates(rawInput)
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
    // v1 → v2: skip ownedItems migration (legacy system removed)
    const raw1 = raw as Record<string, unknown>
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

  if (version === 4) {
    // v4 → v5: normalize pending events into concrete event instances
    const raw4 = raw as Record<string, unknown>
    const migrated = gameStateSchema.safeParse(raw4).data
    if (!migrated) return null
    return normalizePendingEventInstances({ ...migrated, saveVersion: 5 })
  }

  if (version === 5 || version === 6) {
    // v5/v6 → v7: the only structural change is the roster → npcRuntimeStates field rename plus the
    // new npcType/playerRosterMember fields, both already applied by
    // migrateRosterFieldToNpcRuntimeStates above (and the remaining new fields carry schema defaults).
    const rawOld = raw as Record<string, unknown>
    return gameStateSchema.safeParse({ ...rawOld, saveVersion: 7 }).data ?? null
  }

  if (version === 7) {
    // v7 is the current version — validate and return.
    const raw7 = raw as Record<string, unknown>
    return gameStateSchema.safeParse(raw7).data ?? null
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

    return normalizePendingEventInstances(migrated)
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
