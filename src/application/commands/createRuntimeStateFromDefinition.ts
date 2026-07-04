import npcArcsData from '../../../data/definitions/npc-arcs.json'
import { contentCatalog } from '../content/contentCatalog'
import {
  npcRuntimeStateSchema,
  npcArcDefinitionSchema,
  type NpcRuntimeState,
  type NpcArc,
} from '../../domain/npc/contracts'

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
 *   carry a schema default (assignedDistrictId, equipment, clothing, armor, personalFunds,
 *   arousalState, npcMemory, bondStatus, currentIntention, worldDisposition, …) are left to the
 *   schema and filled by the final `.parse`.
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

/** Empty loadout (no schema default exists for loadoutSchema, so it must be provided). */
function defaultLoadout(): NpcRuntimeState['loadout'] {
  return { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] }
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
    loadout: defaultLoadout(),
    npcArc: buildInitialArc(def.defaultArcId, day),
    ...overrides,
  }

  // Final parse validates the result and fills every remaining defaulted field, so callers always
  // get a fully-formed, schema-valid NpcRuntimeState.
  return npcRuntimeStateSchema.parse(base)
}
