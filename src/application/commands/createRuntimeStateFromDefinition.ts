import npcArcsData from '../../../data/definitions/npc-arcs.json'
import { contentCatalog } from '../content/contentCatalog'
import {
  npcRuntimeStateSchema,
  npcArcDefinitionSchema,
  type NpcRuntimeState,
  type NpcArc,
  type NpcDefinition,
} from '../../domain/npc/contracts'
import { resolveStartingArmorItemId } from './npcInventoryHelpers'

/**
 * createRuntimeStateFromDefinition (destiny-rama.2)
 *
 * Keystone helper for unifying NPC runtime into one general list
 * (docs/analysis/unified-npc-runtime-contract-2026-07-04.md §5). Given an NPC id, it reads the
 * immutable definition from the content catalog and produces a fully schema-valid NpcRuntimeState
 * with sane defaults — the single place that knows how to hydrate a *person* (world / captive /
 * story) into the runtime shape the intention system and agency loops iterate over.
 *
 * Design decisions (no assumptions — verified against the schema):
 * - Every required, no-default field of npcRuntimeStateSchema is provided explicitly: name, status,
 *   assignment, activeTitle, wagesOwedDays, attributes, skills, traits, states, loadout. Fields that
 *   carry a schema default (assignedDistrictId, personalFunds, arousalState, npcMemory, bondStatus,
 *   currentIntention, worldDisposition, …) are left to the schema and filled by the final `.parse`.
 * - `clothing`/`armor` (the granular per-body-part fields) and `loadout.armorId` ARE seeded here from
 *   `def.startingEquipment`, not left to schema defaults (previously they were, silently dropping
 *   every NPC's authored starting armor — combat.ts/combatants.ts and every "Arms & Armor" UI read
 *   loadout.armorId specifically, so this affects displayed equipment AND combat soak for any
 *   world/enemy/story NPC hydrated through this path). `equipment.armor` (the instance-id-backed
 *   field) is deliberately left null here: this function has no access to state.inventoryState to
 *   register a real itemRegistry entry, and giving every simulated world NPC a real, trackable
 *   equipped instance would be excessive for ambient NPCs who never reach the roster UI. Recruiting
 *   such a person (recruitment.ts's buildRosterEntryFromOffer) re-derives the same armorId from this
 *   NPC's own `armor`/`clothing` (its "existing world-state" priority) and registers a real instance
 *   for it at that point — see registerStartingArmorInstance.
 * - `npcType` comes from the definition (content kind).
 * - `playerRosterMember` defaults to **false**: a person hydrated from a definition is NOT on the
 *   player's roster unless a caller (recruitment, heir formalization, migration of former roster)
 *   explicitly overrides it. This is the discriminator that keeps world NPCs from silently mixing
 *   into the player's roster (owner directive; see contract doc §2.1).
 * - `npcArc` is built from the definition's defaultArcId (matching recruitment.ts / applyEventOutcome),
 *   entering the arc's first stage on `day`.
 * - `overrides` are applied last, so any field (including the ones above) can be tuned by the caller.
 *
 * Throws if no definition exists for `npcId` — hydrating a person with no identity is always a bug,
 * never a silent default.
 */

const npcArcDefsById = new Map(
  npcArcDefinitionSchema.array().parse(npcArcsData).map((arc) => [arc.arcId, arc]),
)

/** Builds the initial arc entry for a definition's defaultArcId, or null when there is none. */
export function buildInitialArc(defaultArcId: string | null | undefined, day: number): NpcArc {
  if (!defaultArcId) return null
  const arcDef = npcArcDefsById.get(defaultArcId)
  if (!arcDef || arcDef.stages.length === 0) return null
  return {
    arcId: defaultArcId,
    stage: arcDef.stages[0]!.id,
    stageEnteredDay: day,
    stageFlags: {},
    driftHistory: [],
  }
}

/** Default runtime states for a freshly hydrated person (mirrors recruitment.ts's baseline). */
function defaultStates(): NpcRuntimeState['states'] {
  return {
    health: 100,
    fatigue: 0,
    stress: 0,
    morale: 50,
    fear: 0,
    anger: 0,
    hunger: 0,
    injury: 0,
    intoxication: 0,
    hygiene: 70,
  }
}

/**
 * Loadout seeded from the definition's authored startingEquipment (armor.lightTorso/heavyTorso/...
 * or clothing.torso/legs/full, whichever resolves to a real armor-category item -- see
 * resolveStartingArmorItemId's own doc comment for why both sub-objects must be checked). Combat
 * (combatants.ts) and every "Arms & Armor" UI read loadout.armorId, not the granular
 * armor{}/clothing{} fields on NpcRuntimeState -- those have no reader anywhere in the codebase, so
 * leaving this at an empty loadout (the previous behavior) meant world/enemy/story NPCs always
 * fought and displayed as fully unarmored regardless of what content authors specified.
 */
function seededLoadout(def: NpcDefinition): NpcRuntimeState['loadout'] {
  const clothing = def.startingEquipment?.clothing
    ?? { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] }
  const armor = def.startingEquipment?.armor
    ?? { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null }
  return {
    primaryWeaponId: null,
    secondaryWeaponId: null,
    armorId: resolveStartingArmorItemId(armor, clothing),
    accessoryIds: [],
    consumableIds: [],
  }
}

export function createRuntimeStateFromDefinition(
  npcId: string,
  overrides: Partial<NpcRuntimeState> = {},
  day = 0,
): NpcRuntimeState {
  const def = contentCatalog.npcsById.get(npcId)
  if (!def) {
    throw new Error(`createRuntimeStateFromDefinition: no NPC definition found for '${npcId}'`)
  }

  const base = {
    npcId,
    name: def.name,
    npcType: def.npcType,
    playerRosterMember: false,
    status: def.status,
    assignment: 'idle' as const,
    activeTitle: null,
    wagesOwedDays: 0,
    attributes: { ...def.baseAttributes },
    skills: { ...def.startingSkills },
    traits: { ...def.startingTraits },
    states: defaultStates(),
    loadout: seededLoadout(def),
    clothing: def.startingEquipment?.clothing
      ?? { head: null, torso: null, arms: null, legs: null, feet: null, full: null, undergarments: null, accessories: [] },
    armor: def.startingEquipment?.armor
      ?? { lightTorso: null, lightLegs: null, heavyTorso: null, heavyLegs: null, shield: null },
    npcArc: buildInitialArc(def.defaultArcId, day),
    ...overrides,
  }

  // Final parse validates the result and fills every remaining defaulted field, so callers always
  // get a fully-formed, schema-valid NpcRuntimeState.
  return npcRuntimeStateSchema.parse(base)
}
