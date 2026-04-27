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
