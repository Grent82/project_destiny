import type { GameState } from '../../domain'
import { npcArcDefinitionSchema } from '../../domain/npc/contracts'
import type { Traits } from '../../domain/npc/contracts'
import npcArcsData from '../../../data/definitions/npc-arcs.json'
import { appendActivityLogEntry } from './activityLog'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { EVENT_IDS } from '../content/ids'

const npcArcDefinitions = npcArcDefinitionSchema.array().parse(npcArcsData)
const npcArcsById = new Map(npcArcDefinitions.map((a) => [a.arcId, a]))

// The four trait types that can crystallize in arc-becoming
const CRYSTALLIZATION_TRAITS = ['discipline', 'empathy', 'ruthlessness', 'curiosity'] as const
type CrystallizationType = (typeof CRYSTALLIZATION_TRAITS)[number]

const CRYSTALLIZATION_LABEL: Record<CrystallizationType, string> = {
  discipline: 'disciplined',
  empathy: 'empathic',
  ruthlessness: 'ruthless',
  curiosity: 'curious',
}

function dominantCrystallizationTrait(traits: Traits): CrystallizationType {
  let best: CrystallizationType = 'curiosity'
  let bestVal = -1
  for (const t of CRYSTALLIZATION_TRAITS) {
    if (traits[t] > bestVal) {
      bestVal = traits[t]
      best = t
    }
  }
  return best
}

function anyTraitAbove(traits: Traits, trait: string, threshold: number): boolean {
  if (trait === 'any') {
    return Object.values(traits).some((v) => v > threshold)
  }
  const val = traits[trait as keyof Traits]
  return val !== undefined && val > threshold
}

function allTraitsAbove(traits: Traits, threshold: number): boolean {
  return Object.values(traits).every((v) => v > threshold)
}

function resolveEventId(baseId: string, stageFlags: Record<string, boolean>): string {
  // Template substitution: 'lissel-crystallized' → 'lissel-crystallized-empathic' etc.
  if (!baseId.includes('{type}')) {
    const type = stageFlags['type-disciplined']
      ? 'disciplined'
      : stageFlags['type-empathic']
        ? 'empathic'
        : stageFlags['type-ruthless']
          ? 'ruthless'
          : stageFlags['type-curious']
            ? 'curious'
            : null
    if (type && !baseId.endsWith('-disciplined') && !baseId.endsWith('-empathic') && !baseId.endsWith('-ruthless') && !baseId.endsWith('-curious')) {
      // Check if the base event ID looks like it needs a type suffix (arc-becoming crystallized)
      if (baseId === 'lissel-crystallized') {
        return `lissel-crystallized-${type}`
      }
    }
    return baseId
  }
  return baseId
}

/** Step 9c: Check arc stage transitions for all NPCs that have an active arc. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function checkNpcArcTransitions(state: GameState, _rng?: () => number): GameState {
  const arcNpcs = state.roster.filter((npc) => npc.npcArc != null)
  if (arcNpcs.length === 0) return state

  let next = state

  for (const npc of arcNpcs) {
    const arc = npc.npcArc!
    const arcDef = npcArcsById.get(arc.arcId)
    if (!arcDef) continue

    const stageDef = arcDef.stages.find((s) => s.id === arc.stage)
    if (!stageDef || stageDef.transitionConditions == null) continue

    const cond = stageDef.transitionConditions
    const daysInStage = state.day - arc.stageEnteredDay

    if (cond.minDaysInStage !== undefined && daysInStage < cond.minDaysInStage) continue
    if (cond.anyTraitAbove !== undefined) {
      if (!anyTraitAbove(npc.traits, cond.anyTraitAbove.trait, cond.anyTraitAbove.threshold)) continue
    }
    if (cond.allTraitsAbove !== undefined) {
      if (!allTraitsAbove(npc.traits, cond.allTraitsAbove.threshold)) continue
    }

    // All conditions met — advance to next stage
    const currentStageIdx = arcDef.stages.findIndex((s) => s.id === arc.stage)
    const nextStage = arcDef.stages[currentStageIdx + 1]
    if (!nextStage) continue

    // Capture crystallization type when entering crystallizing for arc-becoming
    let updatedStageFlags = { ...arc.stageFlags }
    if (arc.arcId === 'arc-becoming' && nextStage.id === 'crystallizing') {
      const dominant = dominantCrystallizationTrait(npc.traits)
      const label = CRYSTALLIZATION_LABEL[dominant]
      updatedStageFlags = { ...updatedStageFlags, [`type-${label}`]: true }
    }

    const updatedNpc = {
      ...npc,
      npcArc: {
        ...arc,
        stage: nextStage.id,
        stageEnteredDay: state.day,
        stageFlags: updatedStageFlags,
      },
    }

    next = {
      ...next,
      roster: next.roster.map((n) => (n.npcId === npc.npcId ? updatedNpc : n)),
    }

    // Fire authored transition event (skip if already pending or no event ID)
    if (stageDef.transitionEventId) {
      const resolvedEventId = resolveEventId(stageDef.transitionEventId, updatedStageFlags)
      const alreadyPending = next.pendingEvents.some((pe) => pe.eventId === resolvedEventId)
      if (!alreadyPending) {
        next = {
          ...next,
          pendingEvents: [
            ...next.pendingEvents,
            { eventId: resolvedEventId, firedOnDay: state.day },
          ],
        }
      }
    }

    // For arc-becoming reaching 'set': also queue lissel-settled
    if (arc.arcId === 'arc-becoming' && nextStage.id === 'set') {
      const alreadyPending = next.pendingEvents.some((pe) => pe.eventId === 'lissel-settled')
      if (!alreadyPending) {
        next = {
          ...next,
          pendingEvents: [
            ...next.pendingEvents,
            { eventId: 'lissel-settled', firedOnDay: state.day },
          ],
        }
      }
    }

    next = appendActivityLogEntry(
      next,
      'system',
      `${npc.name} has changed. Something has settled in them.`,
    )
  }

  return next
}

/** arc-fractured Path A/B branching: called from endDay after normal arc check. */
export function checkFracturedArcBranching(state: GameState): GameState {
  const fracturedNpcs = state.roster.filter(
    (npc) => npc.npcArc?.arcId === 'arc-fractured' && (npc.npcArc.stage === 'cracking' || npc.npcArc.stage === 'broken'),
  )
  if (fracturedNpcs.length === 0) return state

  let next = state

  for (const npc of fracturedNpcs) {
    const arc = npc.npcArc!

    if (arc.stage === 'cracking') {
      const daysInStage = state.day - arc.stageEnteredDay
      if (daysInStage < 30) continue

      // Detect anchor NPC: first roster NPC with empathy > 60 and trust ≥ 40 toward fractured NPC
      let updatedFlags = { ...arc.stageFlags }
      if (!updatedFlags['anchorNpcId']) {
        const anchor = state.roster.find((candidate) => {
          if (candidate.npcId === npc.npcId) return false
          if (candidate.traits.empathy <= 60) return false
          const key = buildRelationshipKey(candidate.npcId, npc.npcId)
          const rel = state.relationships[key]
          return rel !== undefined && rel.trust >= 40
        })
        if (anchor) {
          updatedFlags = { ...updatedFlags, anchorNpcId: true, [`anchor-${anchor.npcId}`]: true }
        }
      }

      const hasAnchor = Boolean(updatedFlags['anchorNpcId'])

      if (hasAnchor) {
        // Path A: advance to healing
        const alreadyPending = next.pendingEvents.some((pe) => pe.eventId === EVENT_IDS.BREN_ANCHOR_FOUND)
        const updatedNpc = {
          ...npc,
          npcArc: { ...arc, stage: 'healing', stageEnteredDay: state.day, stageFlags: updatedFlags },
        }
        next = { ...next, roster: next.roster.map((n) => (n.npcId === npc.npcId ? updatedNpc : n)) }
        if (!alreadyPending) {
          next = { ...next, pendingEvents: [...next.pendingEvents, { eventId: EVENT_IDS.BREN_ANCHOR_FOUND, firedOnDay: state.day }] }
        }
        next = appendActivityLogEntry(next, 'system', `${npc.name} is finding a way back. Something — someone — is holding.`)
      } else {
        // Path B: advance to broken
        const updatedNpc = {
          ...npc,
          npcArc: { ...arc, stage: 'broken', stageEnteredDay: state.day, stageFlags: updatedFlags },
        }
        next = { ...next, roster: next.roster.map((n) => (n.npcId === npc.npcId ? updatedNpc : n)) }
        const alreadyPending = next.pendingEvents.some((pe) => pe.eventId === EVENT_IDS.BREN_LEAVING_WARNING)
        if (!alreadyPending) {
          next = { ...next, pendingEvents: [...next.pendingEvents, { eventId: EVENT_IDS.BREN_LEAVING_WARNING, firedOnDay: state.day }] }
        }
        next = appendActivityLogEntry(next, 'system', `${npc.name} is slipping. The fracture has gone deeper.`)
      }
    }
  }

  // Departure risk in broken stage: escalate departure threshold
  const brokenNpcs = next.roster.filter(
    (npc) => npc.npcArc?.arcId === 'arc-fractured' && npc.npcArc.stage === 'broken',
  )
  for (const npc of brokenNpcs) {
    const arc = npc.npcArc!
    const daysInBroken = state.day - arc.stageEnteredDay
    if (daysInBroken >= 10) {
      const alreadyPending = next.pendingEvents.some((pe) => pe.eventId === EVENT_IDS.BREN_LEFT)
      if (!alreadyPending && !arc.stageFlags['departureQueued']) {
        const updatedNpc = {
          ...npc,
          npcArc: { ...arc, stageFlags: { ...arc.stageFlags, departureQueued: true } },
        }
        next = {
          ...next,
          roster: next.roster.map((n) => (n.npcId === npc.npcId ? updatedNpc : n)),
          pendingEvents: [...next.pendingEvents, { eventId: EVENT_IDS.BREN_LEFT, firedOnDay: state.day }],
        }
      }
    }
  }

  return next
}
