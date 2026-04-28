import rawArmor from '../../../data/definitions/armor.json'
import rawWeapons from '../../../data/definitions/weapons.json'
import type { ArmorProfile, WeaponProfile } from '../../domain'

const UNARMED_PROFILE: WeaponProfile = {
  id: 'unarmed',
  damageMin: 1,
  damageMax: 3,
  accuracy: 60,
  armorPiercing: 0,
  critChance: 2,
  staggerChance: 2,
  rangeTypePreference: 'close',
  rangeModifierClose: 0,
  rangeModifierMedium: -10,
  rangeModifierDistant: -25,
}

const UNARMORED_PROFILE: ArmorProfile = {
  id: 'unarmored',
  soak: 0,
  evasionPenalty: 0,
  speedPenalty: 0,
}

function buildWeaponMap(): Map<string, WeaponProfile> {
  const map = new Map<string, WeaponProfile>()
  for (const w of rawWeapons as WeaponProfile[]) {
    map.set(w.id, w)
  }
  return map
}

function buildArmorMap(): Map<string, ArmorProfile> {
  const map = new Map<string, ArmorProfile>()
  for (const a of rawArmor as ArmorProfile[]) {
    map.set(a.id, a)
  }
  return map
}

const weaponsById = buildWeaponMap()
const armorById = buildArmorMap()

export function getWeaponProfile(weaponId: string | null): WeaponProfile {
  if (!weaponId) return UNARMED_PROFILE
  return weaponsById.get(weaponId) ?? UNARMED_PROFILE
}

export function getArmorProfile(armorId: string | null): ArmorProfile {
  if (!armorId) return UNARMORED_PROFILE
  return armorById.get(armorId) ?? UNARMORED_PROFILE
}

export { UNARMED_PROFILE, UNARMORED_PROFILE }

interface RawWeapon {
  id: string
  name?: string
  durabilityMax?: number
  repairCost?: number
  [key: string]: unknown
}

interface RawArmor {
  id: string
  name?: string
  durabilityMax?: number
  repairCost?: number
  [key: string]: unknown
}

const rawWeaponsById = new Map<string, RawWeapon>(
  (rawWeapons as RawWeapon[]).map((w) => [w.id, w])
)

const rawArmorById = new Map<string, RawArmor>(
  (rawArmor as RawArmor[]).map((a) => [a.id, a])
)

export function getWeaponRepairCost(weaponId: string | null): number {
  if (!weaponId) return 0
  return rawWeaponsById.get(weaponId)?.repairCost ?? 40
}

export function getWeaponDurabilityMax(weaponId: string | null): number {
  if (!weaponId) return 100
  return rawWeaponsById.get(weaponId)?.durabilityMax ?? 100
}

export function getArmorRepairCost(armorId: string | null): number {
  if (!armorId) return 0
  return rawArmorById.get(armorId)?.repairCost ?? 40
}

export function getArmorDurabilityMax(armorId: string | null): number {
  if (!armorId) return 100
  return rawArmorById.get(armorId)?.durabilityMax ?? 100
}

export function getWeaponName(weaponId: string | null): string | null {
  if (!weaponId) return null
  return (rawWeaponsById.get(weaponId)?.name as string | undefined) ?? null
}

export function getArmorName(armorId: string | null): string | null {
  if (!armorId) return null
  return (rawArmorById.get(armorId)?.name as string | undefined) ?? null
}
