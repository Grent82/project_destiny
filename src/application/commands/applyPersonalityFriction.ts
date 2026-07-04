import type { GameState } from '../../domain'
import { calculateBaseCompatibility } from '../../domain/npc/compatibility'
import { applyRelationshipDelta } from './adjustRelationship'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog } from '../content/contentCatalog'
import { TRAIT_HIGH, TRAIT_DOMINANT, TRAIT_MODERATE } from '../../domain/npc/traitThresholds'
import { EVENT_IDS } from '../content/ids'
import { enqueueTemplateEvent } from './eventInstances'

const MAX_EVENTS_PER_CYCLE = 2
const FRICTION_COOLDOWN = 14
const BONDING_COOLDOWN = 7

function frictionKey(npcIdA: string, npcIdB: string, ruleId: string): string {
  const [a, b] = npcIdA < npcIdB ? [npcIdA, npcIdB] : [npcIdB, npcIdA]
  return `friction-${a}-${b}-${ruleId}`
}

function bondingKey(npcIdA: string, npcIdB: string, ruleId: string): string {
  const [a, b] = npcIdA < npcIdB ? [npcIdA, npcIdB] : [npcIdB, npcIdA]
  return `bonding-${a}-${b}-${ruleId}`
}

function isOnCooldown(state: GameState, key: string, cooldownDays: number): boolean {
  const lastDay = state.lastFiredDay[key]
  if (lastDay === undefined) return false
  return state.day - lastDay < cooldownDays
}

/** Monthly pass: evaluates all eligible roster pairs for personality friction and bonding moments. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function applyPersonalityFriction(state: GameState, _rng?: () => number): GameState {
  const eligible = state.npcRuntimeStates.filter(
    (npc) =>
      npc.assignment !== 'recovering' &&
      npc.captivityState?.status !== 'captive' &&
      npc.captivityState?.status !== 'missing',
  )

  if (eligible.length < 2) return state

  let next = state
  let generated = 0

  outer: for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      if (generated >= MAX_EVENTS_PER_CYCLE) break outer

      const npcA = eligible[i]!
      const npcB = eligible[j]!
      const score = calculateBaseCompatibility(npcA.traits, npcB.traits)

      // --- BONDING EVENTS (score > +20, both idle or deployed) ---
      if (score > 20) {
        const coPresent =
          (npcA.assignment === 'deployed' || npcA.assignment === 'idle') &&
          (npcB.assignment === 'deployed' || npcB.assignment === 'idle')

        if (coPresent) {
          // Late conversation: both high curiosity
          if (npcA.traits.curiosity > TRAIT_MODERATE && npcB.traits.curiosity > TRAIT_MODERATE) {
            const key = bondingKey(npcA.npcId, npcB.npcId, 'late-conversation')
            if (!isOnCooldown(next, key, BONDING_COOLDOWN)) {
              next = { ...next, relationships: { ...next.relationships } }
              const r1 = applyRelationshipDelta(next, npcA.npcId, npcB.npcId, 'affinity', 3); next = r1.state
              const r2 = applyRelationshipDelta(next, npcB.npcId, npcA.npcId, 'affinity', 3); next = r2.state
              const r3 = applyRelationshipDelta(next, npcA.npcId, npcB.npcId, 'trust', 2); next = r3.state
              const r4 = applyRelationshipDelta(next, npcB.npcId, npcA.npcId, 'trust', 2); next = r4.state
              next = appendActivityLogEntry(
                next,
                'system',
                `${npcA.name} and ${npcB.name} were still talking when the lamps went out.`,
              )
              next = { ...next, lastFiredDay: { ...next.lastFiredDay, [key]: next.day } }
              generated++
              continue
            }
          }

          // Quiet respect: both high discipline
          if (npcA.traits.discipline > TRAIT_HIGH && npcB.traits.discipline > TRAIT_HIGH) {
            const key = bondingKey(npcA.npcId, npcB.npcId, 'quiet-respect')
            if (!isOnCooldown(next, key, BONDING_COOLDOWN)) {
              next = { ...next, relationships: { ...next.relationships } }
              const r1 = applyRelationshipDelta(next, npcA.npcId, npcB.npcId, 'respect', 4); next = r1.state
              const r2 = applyRelationshipDelta(next, npcB.npcId, npcA.npcId, 'respect', 4); next = r2.state
              next = appendActivityLogEntry(
                next,
                'system',
                `${npcA.name} noted ${npcB.name}'s reliability without saying so.`,
              )
              next = { ...next, lastFiredDay: { ...next.lastFiredDay, [key]: next.day } }
              generated++
              continue
            }
          }
        }
      }

      // --- FRICTION EVENTS (rule conditions, independent of global score) ---

      // Rule 1: Dominance rivalry — both dominance >65, no title differentiation
      if (npcA.traits.dominance > TRAIT_HIGH && npcB.traits.dominance > TRAIT_HIGH) {
        const sameTitleStatus = (npcA.activeTitle === null) === (npcB.activeTitle === null)
        if (sameTitleStatus) {
          const key = frictionKey(npcA.npcId, npcB.npcId, 'dominance-rivalry')
          if (!isOnCooldown(next, key, FRICTION_COOLDOWN)) {
            next = enqueueTemplateEvent(
              { ...next, lastFiredDay: { ...next.lastFiredDay, [key]: next.day } },
              EVENT_IDS.NPC_DOMINANCE_TENSION,
              { firedOnDay: next.day },
            )
            generated++
            continue
          }
        }
      }

      // Rule 2: Moral methods disagreement — one ruthless >60, one empathic >60
      if (
        (npcA.traits.ruthlessness > TRAIT_DOMINANT && npcB.traits.empathy > TRAIT_DOMINANT) ||
        (npcB.traits.ruthlessness > TRAIT_DOMINANT && npcA.traits.empathy > TRAIT_DOMINANT)
      ) {
        const key = frictionKey(npcA.npcId, npcB.npcId, 'moral-methods')
        if (!isOnCooldown(next, key, FRICTION_COOLDOWN)) {
          next = enqueueTemplateEvent(
            { ...next, lastFiredDay: { ...next.lastFiredDay, [key]: next.day } },
            EVENT_IDS.NPC_METHODS_DISAGREEMENT,
            { firedOnDay: next.day },
          )
          generated++
          continue
        }
      }

      // Rule 3: Ambition rivalry — both ambition >65, neither has a title
      if (
        npcA.traits.ambition > TRAIT_HIGH &&
        npcB.traits.ambition > TRAIT_HIGH &&
        npcA.activeTitle === null &&
        npcB.activeTitle === null
      ) {
        const key = frictionKey(npcA.npcId, npcB.npcId, 'ambition-rivalry')
        if (!isOnCooldown(next, key, FRICTION_COOLDOWN)) {
          next = enqueueTemplateEvent(
            { ...next, lastFiredDay: { ...next.lastFiredDay, [key]: next.day } },
            EVENT_IDS.NPC_AMBITION_COMPARISON,
            { firedOnDay: next.day },
          )
          generated++
          continue
        }
      }

      // Rule 4: Vanity recognition competition — both vanity >60
      if (npcA.traits.vanity > TRAIT_DOMINANT && npcB.traits.vanity > TRAIT_DOMINANT) {
        const key = frictionKey(npcA.npcId, npcB.npcId, 'vanity-recognition')
        if (!isOnCooldown(next, key, FRICTION_COOLDOWN)) {
          next = enqueueTemplateEvent(
            { ...next, lastFiredDay: { ...next.lastFiredDay, [key]: next.day } },
            EVENT_IDS.NPC_RECOGNITION_RIVALRY,
            { firedOnDay: next.day },
          )
          generated++
          continue
        }
      }

      // Rule 5: Zeal clash — both zeal >60, opposing faction affiliations
      if (npcA.traits.zeal > TRAIT_DOMINANT && npcB.traits.zeal > TRAIT_DOMINANT) {
        const defA = contentCatalog.npcsById.get(npcA.npcId)
        const defB = contentCatalog.npcsById.get(npcB.npcId)
        if (
          defA?.factionAffinityId &&
          defB?.factionAffinityId &&
          defA.factionAffinityId !== defB.factionAffinityId
        ) {
          const key = frictionKey(npcA.npcId, npcB.npcId, 'zeal-clash')
          if (!isOnCooldown(next, key, FRICTION_COOLDOWN)) {
            next = enqueueTemplateEvent(
              { ...next, lastFiredDay: { ...next.lastFiredDay, [key]: next.day } },
              EVENT_IDS.NPC_IDEOLOGICAL_FRICTION,
              { firedOnDay: next.day },
            )
            generated++
            continue
          }
        }
      }
    }
  }

  return next
}
