import type { GameState } from '../../domain'
import { npcArcDefinitionSchema } from '../../domain/npc/contracts'
import type { Traits } from '../../domain/npc/contracts'
import type { Rng } from './seededRng'
import npcArcsData from '../../../data/definitions/npc-arcs.json'
import { appendActivityLogEntry } from './activityLog'

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
export function checkNpcArcTransitions(state: GameState, _rng: Rng = Math.random): GameState {
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
