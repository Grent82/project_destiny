import type { GameState } from '../../domain'
import type { EventOutcome } from '../../domain/events/contracts'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'
import { addQuestLeadIfNew } from './questLifecycle'
import { contentCatalog } from '../content/contentCatalog'
import { initializeRosterRelationships } from './initializeRosterRelationships'
import { createRng } from './seededRng'
import { transferBondedNpc } from './bondTransfer'

export type OutcomeContext = { npcId?: string | null; contextId?: string | null }
type OutcomeRngState = ReturnType<typeof createRng>
type NpcStateSubject = 'highest-stress' | 'lowest-morale' | 'highest-loyalty' | `npcId:${string}`
type AdjustNpcStateAxis =
  | 'health'
  | 'fatigue'
  | 'stress'
  | 'morale'
  | 'fear'
  | 'anger'
  | 'hunger'
  | 'injury'
  | 'intoxication'
  | 'hygiene'
  | 'loyalty'

function warnAndSkip(outcomeType: string, field: string, missingId: string): void {
  console.warn(
    `applyEventOutcome: outcome type "${outcomeType}" references ${field} "${missingId}" which does not exist in contentCatalog — outcome skipped`,
  )
}

function warnMissingFields(outcomeType: EventOutcome['type'], fields: string[]): void {
  console.warn(
    `applyEventOutcome: outcome type "${outcomeType}" is missing required field(s): ${fields.join(', ')}`,
  )
}

function hasRequiredFields(
  outcome: EventOutcome,
  required: Array<keyof EventOutcome>,
): boolean {
  const missing = required.filter((field) => outcome[field] === undefined)
  if (missing.length > 0) {
    warnMissingFields(outcome.type, missing)
    return false
  }
  return true
}

function clampNpcStateValue(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function resolveNpcStateSubject(
  roster: GameState['roster'],
  subject: NpcStateSubject,
) {
  if (roster.length === 0) return null

  if (subject.startsWith('npcId:')) {
    const npcId = subject.slice('npcId:'.length)
    return roster.find((entry) => entry.npcId === npcId) ?? null
  }

  const candidates = [...roster]
  switch (subject) {
    case 'highest-stress':
      return candidates.reduce((best, current) =>
        current.states.stress > best.states.stress ? current : best,
      )
    case 'lowest-morale':
      return candidates.reduce((best, current) =>
        current.states.morale < best.states.morale ? current : best,
      )
    case 'highest-loyalty':
      return candidates.reduce((best, current) =>
        current.traits.loyalty > best.traits.loyalty ? current : best,
      )
  }
}

export function applyOutcomes(
  state: GameState,
  outcomes: EventOutcome[],
  context?: OutcomeContext,
  seededState?: OutcomeRngState,
): GameState {
  let next = state
  let sharedSeeded = seededState

  const getSeeded = (): OutcomeRngState => {
    if (sharedSeeded) return sharedSeeded
    sharedSeeded = createRng(next.rngSeed)
    return sharedSeeded
  }

  for (const outcome of outcomes) {
    switch (outcome.type) {
      case 'adjustFactionStanding': {
        if (!hasRequiredFields(outcome, ['target', 'delta'])) break
        const standingTarget = outcome.target!
        const standingDelta = outcome.delta!
        const current = next.factionStandings[standingTarget] ?? 0
        next = {
          ...next,
          factionStandings: {
            ...next.factionStandings,
            [standingTarget]: Math.max(-100, Math.min(100, current + standingDelta)),
          },
        }
        break
      }
      case 'adjustCityDial': {
        if (!hasRequiredFields(outcome, ['target', 'delta'])) break
        const validDials = ['control', 'prosperity', 'unrest', 'corruption'] as const
        const dialTarget = outcome.target!
        const dialDelta = outcome.delta!
        if (!validDials.includes(dialTarget as typeof validDials[number])) {
          console.warn(`applyEventOutcome: invalid dial target "${dialTarget}"`)
          break
        }
        const dial = dialTarget as typeof validDials[number]
        next = {
          ...next,
          cityDials: {
            ...next.cityDials,
            [dial]: Math.max(0, Math.min(100, next.cityDials[dial] + dialDelta)),
          },
        }
        break
      }
      case 'adjustCityResource': {
        if (!hasRequiredFields(outcome, ['target', 'delta'])) break
        const validResources = ['foodSecurity', 'waterAccess', 'materialStock'] as const
        const resourceTarget = outcome.target!
        const resourceDelta = outcome.delta!
        if (!validResources.includes(resourceTarget as typeof validResources[number])) {
          console.warn(`applyEventOutcome: invalid resource target "${resourceTarget}"`)
          break
        }
        const resource = resourceTarget as typeof validResources[number]
        next = {
          ...next,
          cityResources: {
            ...next.cityResources,
            [resource]: Math.max(0, Math.min(100, next.cityResources[resource] + resourceDelta)),
          },
        }
        break
      }
      case 'adjustNpcState':
        if (!hasRequiredFields(outcome, ['subject', 'axis', 'delta'])) break
        {
          const subjectKey = outcome.subject!
          const npcStateAxis = outcome.axis! as AdjustNpcStateAxis
          const npcStateDelta = outcome.delta!
          const subject = resolveNpcStateSubject(next.roster, subjectKey as NpcStateSubject)
          if (!subject) {
            console.warn(`applyEventOutcome: outcome type "adjustNpcState" could not resolve subject "${subjectKey}" — outcome skipped`)
            break
          }

          next = {
            ...next,
            roster: next.roster.map((entry) => {
              if (entry.npcId !== subject.npcId) return entry
              if (npcStateAxis === 'loyalty') {
                return {
                  ...entry,
                  traits: {
                    ...entry.traits,
                    loyalty: clampNpcStateValue(entry.traits.loyalty + npcStateDelta),
                  },
                }
              }

              return {
                ...entry,
                states: {
                  ...entry.states,
                  [npcStateAxis]: clampNpcStateValue(entry.states[npcStateAxis] + npcStateDelta),
                },
              }
            }),
          }

          const resolvedMessage = outcome.message?.replaceAll('{npcName}', subject.name)
          if (resolvedMessage) {
            next = appendActivityLogEntry(next, 'system', resolvedMessage)
          }
        }
        break
      case 'addCredits':
        if (!hasRequiredFields(outcome, ['delta'])) break
        {
          const creditDelta = outcome.delta!
          next = { ...next, money: Math.max(0, next.money + creditDelta) }
        }
        break
      case 'setCorridorStatus':
        if (!hasRequiredFields(outcome, ['value'])) break
        {
          const validStatuses = ['open', 'disrupted', 'blocked'] as const
          const corridorValue = outcome.value!
          if (!validStatuses.includes(corridorValue as typeof validStatuses[number])) {
            console.warn(`applyEventOutcome: invalid corridor status "${corridorValue}"`)
            break
          }
          next = {
            ...next,
            cityResources: {
              ...next.cityResources,
              corridorStatus: corridorValue as typeof validStatuses[number],
            },
          }
        }
        break
      case 'addActivityLogEntry':
        if (!hasRequiredFields(outcome, ['message'])) break
        {
          const logMessage = outcome.message!
          next = appendActivityLogEntry(next, 'system', logMessage)
        }
        break
      case 'adjustNpcRelationship':
        if (!hasRequiredFields(outcome, ['npcId', 'axis', 'delta'])) break
        {
          const targetNpcId = outcome.npcId!
          const relationshipAxis = outcome.axis! as 'affinity' | 'respect' | 'fear' | 'trust' | 'loyalty'
          const relationshipDelta = outcome.delta!
          if (!contentCatalog.npcsById.has(targetNpcId)) {
            warnAndSkip(outcome.type, 'npcId', targetNpcId)
            break
          }
          const key = buildRelationshipKey('player', targetNpcId)
          const existing = next.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
          const newValue = Math.max(-100, Math.min(100, ((existing[relationshipAxis] as number) ?? 0) + relationshipDelta))
          next = {
            ...next,
            relationships: {
              ...next.relationships,
              [key]: { ...existing, [relationshipAxis]: newValue },
            },
          }
        }
        break
      case 'createQuestLead':
        if (!hasRequiredFields(outcome, ['questId'])) break
        {
          const questId = outcome.questId!
          if (!contentCatalog.questsById.has(questId)) {
            warnAndSkip(outcome.type, 'questId', questId)
            break
          }
          const mutable = {
            ...next,
            availableQuestLeads: [...next.availableQuestLeads],
            activityLog: [...next.activityLog],
          }
          addQuestLeadIfNew(mutable, questId, { discoverySource: 'event' })
          next = mutable
        }
        break
      case 'updateQuestStage':
        if (!hasRequiredFields(outcome, ['questId', 'stageId'])) break
        {
          const questId = outcome.questId!
          const stageId = outcome.stageId!
          if (!contentCatalog.questsById.has(questId)) {
            warnAndSkip(outcome.type, 'questId', questId)
            break
          }
          next = {
            ...next,
            activeQuests: next.activeQuests.map((q) =>
              q.questId === questId
                ? {
                    ...q,
                    stageId,
                    currentObjectiveLabel: outcome.objectiveLabel ?? q.currentObjectiveLabel,
                    journalEntries: outcome.message
                      ? [...q.journalEntries, outcome.message]
                      : q.journalEntries,
                  }
                : q,
            ),
          }
        }
        break
      case 'unlockNpc': {
        if (!hasRequiredFields(outcome, ['npcId'])) break
        {
          const unlockNpcId = outcome.npcId!
          if (!contentCatalog.npcsById.has(unlockNpcId)) {
            warnAndSkip(outcome.type, 'npcId', unlockNpcId)
            break
          }
          const alreadyHired = next.roster.some((r) => r.npcId === unlockNpcId)
          const alreadyOffered = next.availableForHire.some((o) => o.npcId === unlockNpcId)
          if (!alreadyHired && !alreadyOffered) {
            next = {
              ...next,
              availableForHire: [
                ...next.availableForHire,
                {
                  npcId: unlockNpcId,
                  discoveredInDistrictId: next.currentDistrictId ?? '',
                  wagePerDay: 15,
                  signingBonus: 0,
                  requiredFactionId: null,
                  requiredFactionStanding: 0,
                  turnsAvailable: 5,
                  source: 'event' as const,
                },
              ],
            }
          }
        }
        break
      }
      case 'addNpcToRoster': {
        if (!hasRequiredFields(outcome, ['npcId'])) break
        {
          const addNpcId = outcome.npcId!
          if (!contentCatalog.npcsById.has(addNpcId)) {
            warnAndSkip(outcome.type, 'npcId', addNpcId)
            break
          }
          const alreadyOnRoster = next.roster.some((r) => r.npcId === addNpcId)
          if (!alreadyOnRoster) {
            const npcDef = contentCatalog.npcsById.get(addNpcId)
            if (npcDef) {
              const npcArc = outcome.arcId
                ? { arcId: outcome.arcId, stage: 'early-childhood', stageEnteredDay: next.day, stageFlags: {}, driftHistory: [] }
                : null
              const newEntry = {
                npcId: addNpcId,
                name: npcDef.name,
                status: npcDef.status,
                assignment: 'idle' as const,
                assignedDistrictId: null,
                activeTitle: null,
                wagesOwedDays: 0,
                trainingFocus: null,
                roomAssignment: null,
                attributes: { ...npcDef.baseAttributes },
                skills: { ...npcDef.startingSkills },
                traits: { ...npcDef.startingTraits },
                states: { health: 100, fatigue: 0, stress: 0, morale: 50, fear: 0, anger: 0, hunger: 0, injury: 0, intoxication: 0, hygiene: 70 },
                loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
                npcMemory: [],
                bondStatus: null,
                npcArc,
              }
              next = { ...next, roster: [...next.roster, newEntry] }
              const seeded = getSeeded()
              next = initializeRosterRelationships(next, seeded.rng)
              next = { ...next, rngSeed: seeded.getSeed() }
              next = appendActivityLogEntry(next, 'system', `${npcDef.name} has come to stay in the house.`)
            }
          }
        }
        break
      }
      case 'transferBondedNpc': {
        const npcId = context?.npcId
        const buyerId = context?.contextId
        if (!npcId || !buyerId) {
          warnMissingFields(outcome.type, [
            ...(!npcId ? ['context.npcId'] : []),
            ...(!buyerId ? ['context.contextId'] : []),
          ])
          break
        }
        next = transferBondedNpc(next, npcId, buyerId)
        break
      }
    }
  }
  return next
}
