import type { GameState } from '../../../domain/game/contracts'
import type { Rng } from '../seededRng'
import { appendActivityLogEntry } from '../activityLog'
import { SERIOUS_INJURY_THRESHOLD } from '../recovery'

/**
 * World NPC harm sources (destiny-s97u/destiny-m916.1).
 *
 * destiny-629x scaffolded health/injury/assignment:'recovering' onto every NpcRuntimeState
 * (world/story included), and the recovery runtime already processes them correctly -- but
 * nothing set a world NPC's injury above 0 until this module. See
 * docs/analysis/world-npc-harm-source-design-2026-07-06.md for why this is a new module rather
 * than an extension of npcAgency/incidentAgency.ts (that module is deliberately, audited-scoped to
 * playerRosterMember && assignment==='working' -- "sent to work a job" has no equivalent for world
 * NPCs) or of npcConfrontRival (too narrow: authored-rival-only, social not physical).
 *
 * Two independent trigger paths, both reusing signals that already exist and are already visible
 * to the player -- no new schema, no new state.
 */

const DANGER_TENSION_THRESHOLD = 40
const DANGER_CHANCE_DIVISOR = 400
const DANGER_INJURY_MIN = 3
const DANGER_INJURY_MAX = 10

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function rollBetween(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function isEligibleWorldPerson(npc: { npcType: string; assignment: string; captivityState?: { status: string } }): boolean {
  // Defense-in-depth, matching intentions/eligibility.ts's precedent: a captive is not out living
  // an ambient life to be endangered by, they're held -- their fate is the captivity system's, not
  // this one's, even though assignment alone would otherwise read as 'idle' for them.
  if (npc.captivityState?.status === 'captive') return false
  return (npc.npcType === 'world' || npc.npcType === 'story') && npc.assignment === 'idle'
}

/**
 * Path 1 -- ambient district danger. Every eligible world/story person assigned to a district has
 * a small daily chance of a "close call" scaled by that district's current tension (already read
 * and drained by patrol-district, already raised by incidentAgency/feud escalation -- a signal the
 * player can already see and act on). Deliberately gated to tension > 40 so calm districts carry
 * zero ambient risk, and the injury roll (3..10) is deliberately weak so a single hit essentially
 * never alone crosses SERIOUS_INJURY_THRESHOLD -- it takes sustained exposure to a genuinely
 * dangerous district over multiple days to escalate that far. Routine sub-threshold hits are not
 * logged (BACKGROUND) to avoid log spam for every random citizen's scrape; only the moment injury
 * actually crosses into assignment:'recovering' is worth a MOMENT-level log line -- applyStateDecay.ts's
 * own Step 2b only logs *ongoing* recovery/completion for people already recovering, not this
 * initial transition, so it belongs here.
 */
export function applyWorldNpcDistrictDangerExposure(state: GameState, rng: Rng): GameState {
  let next = state
  const eligible = next.npcRuntimeStates.filter((n) => isEligibleWorldPerson(n) && n.assignedDistrictId)

  for (const npc of eligible) {
    const districtId = npc.assignedDistrictId!
    const tension = next.districtTension[districtId] ?? 0
    const chance = Math.max(0, tension - DANGER_TENSION_THRESHOLD) / DANGER_CHANCE_DIVISOR
    if (chance <= 0 || rng() >= chance) continue

    const newInjury = clampPercent(npc.states.injury + rollBetween(rng, DANGER_INJURY_MIN, DANGER_INJURY_MAX))
    const entersRecovering = newInjury >= SERIOUS_INJURY_THRESHOLD

    next = {
      ...next,
      npcRuntimeStates: next.npcRuntimeStates.map((n) =>
        n.npcId === npc.npcId
          ? {
              ...n,
              states: { ...n.states, injury: newInjury },
              assignment: entersRecovering ? ('recovering' as const) : n.assignment,
            }
          : n,
      ),
    }

    if (entersRecovering) {
      next = appendActivityLogEntry(
        next,
        'system',
        `${npc.name} was badly hurt in ${districtId} and needs to recover.`,
      )
    }
  }

  return next
}

const FEUD_VIOLENCE_CHANCE = 0.05
const FEUD_INJURY_MIN = 10
const FEUD_INJURY_MAX = 20
const FEUD_TENSION_GAIN = 4
const FEUD_FLAG_PREFIX = 'feud-with:'

/**
 * Path 2 -- feud violence. A world/story person with an active feud-with:<npcId> flag (already
 * produced by applyWorldNpcSocialSimulation.ts's maybeEscalateFeud, itself gated on a
 * rivalry/grudge/territorial_conflict soft bond reaching strength >= 70 -- an already rare,
 * hard-earned relationship state, not something to gate further) has an independent flat 5%/day
 * chance the feud flares into a physical altercation. Requires both parties to actually still be
 * in the same district: destiny-q80n.10's travel-district feature means a feuding pair authored
 * (or previously escalated) while co-located can drift apart afterward -- the feud persists as a
 * flag, but violence needs physical proximity, so a pair now in different districts simmers rather
 * than erupts until they're near each other again. Injures both parties (deliberately higher than
 * path 1's ambient rolls -- a targeted personal conflict, not incidental danger) and raises their
 * shared district's tension. Always logged (MOMENT), matching maybeEscalateFeud's own precedent of
 * always logging feud escalations.
 */
export function applyWorldNpcFeudViolence(state: GameState, rng: Rng): GameState {
  let next = state
  const processedPairs = new Set<string>()

  const feuding = next.npcRuntimeStates.filter(
    (n) => isEligibleWorldPerson(n) && (n.flags ?? []).some((f) => f.startsWith(FEUD_FLAG_PREFIX)),
  )

  for (const npc of feuding) {
    const feudFlag = (npc.flags ?? []).find((f) => f.startsWith(FEUD_FLAG_PREFIX))
    if (!feudFlag) continue
    const targetId = feudFlag.slice(FEUD_FLAG_PREFIX.length)

    const pairKey = [npc.npcId, targetId].sort().join('|')
    if (processedPairs.has(pairKey)) continue
    processedPairs.add(pairKey)

    const target = next.npcRuntimeStates.find((n) => n.npcId === targetId)
    if (!target || !isEligibleWorldPerson(target)) continue
    if (!npc.assignedDistrictId || npc.assignedDistrictId !== target.assignedDistrictId) continue

    if (rng() >= FEUD_VIOLENCE_CHANCE) continue

    const npcNewInjury = clampPercent(npc.states.injury + rollBetween(rng, FEUD_INJURY_MIN, FEUD_INJURY_MAX))
    const targetNewInjury = clampPercent(target.states.injury + rollBetween(rng, FEUD_INJURY_MIN, FEUD_INJURY_MAX))

    next = {
      ...next,
      npcRuntimeStates: next.npcRuntimeStates.map((n) => {
        if (n.npcId === npc.npcId) {
          return {
            ...n,
            states: { ...n.states, injury: npcNewInjury },
            assignment: npcNewInjury >= SERIOUS_INJURY_THRESHOLD ? ('recovering' as const) : n.assignment,
          }
        }
        if (n.npcId === targetId) {
          return {
            ...n,
            states: { ...n.states, injury: targetNewInjury },
            assignment: targetNewInjury >= SERIOUS_INJURY_THRESHOLD ? ('recovering' as const) : n.assignment,
          }
        }
        return n
      }),
    }

    const districtId = npc.assignedDistrictId
    if (next.districtTension[districtId] !== undefined) {
      next = {
        ...next,
        districtTension: {
          ...next.districtTension,
          [districtId]: clampPercent((next.districtTension[districtId] ?? 0) + FEUD_TENSION_GAIN),
        },
      }
    }

    next = appendActivityLogEntry(
      next,
      'system',
      `${npc.name} and ${target.name}'s feud turned violent. Both are hurt.`,
    )
  }

  return next
}

/** Runs both harm-source paths in sequence. Called from handleSocialSimulationPhase. */
export function applyWorldNpcDangerExposure(state: GameState, rng: Rng): GameState {
  let next = applyWorldNpcDistrictDangerExposure(state, rng)
  next = applyWorldNpcFeudViolence(next, rng)
  return next
}
