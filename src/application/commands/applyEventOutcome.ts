import type { GameState } from '../../domain'
import type { EventOutcome } from '../../domain/events/contracts'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { appendActivityLogEntry } from './activityLog'
import { addQuestLeadIfNew } from './questLifecycle'
import { contentCatalog } from '../content/contentCatalog'
import { initializeRosterRelationships } from './initializeRosterRelationships'
import { createRng } from './seededRng'

export function applyOutcomes(state: GameState, outcomes: EventOutcome[]): GameState {
  let next = state
  for (const outcome of outcomes) {
    switch (outcome.type) {
      case 'adjustFactionStanding':
        if (outcome.target && outcome.delta !== undefined) {
          const current = next.factionStandings[outcome.target] ?? 0
          next = {
            ...next,
            factionStandings: {
              ...next.factionStandings,
              [outcome.target]: Math.max(-100, Math.min(100, current + outcome.delta)),
            },
          }
        }
        break
      case 'adjustCityDial':
        if (outcome.target && outcome.delta !== undefined) {
          const validDials = ['control', 'prosperity', 'unrest', 'corruption'] as const
          if (!validDials.includes(outcome.target as typeof validDials[number])) {
            console.warn(`applyEventOutcome: invalid dial target "${outcome.target}"`)
            break
          }
          const dial = outcome.target as typeof validDials[number]
          next = {
            ...next,
            cityDials: {
              ...next.cityDials,
              [dial]: Math.max(0, Math.min(100, next.cityDials[dial] + outcome.delta)),
            },
          }
        }
        break
      case 'adjustCityResource':
        if (outcome.target && outcome.delta !== undefined) {
          const resource = outcome.target as 'foodSecurity' | 'waterAccess' | 'materialStock'
          next = {
            ...next,
            cityResources: {
              ...next.cityResources,
              [resource]: Math.max(0, Math.min(100, next.cityResources[resource] + outcome.delta)),
            },
          }
        }
        break
      case 'addCredits':
        if (outcome.delta !== undefined) {
          next = { ...next, money: Math.max(0, next.money + outcome.delta) }
        }
        break
      case 'setCorridorStatus':
        if (outcome.value) {
          next = {
            ...next,
            cityResources: {
              ...next.cityResources,
              corridorStatus: outcome.value as 'open' | 'disrupted' | 'blocked',
            },
          }
        }
        break
      case 'addActivityLogEntry':
        if (outcome.message) {
          next = appendActivityLogEntry(next, 'system', outcome.message)
        }
        break
      case 'adjustNpcRelationship':
        if (outcome.npcId && outcome.axis && outcome.delta !== undefined) {
          const key = buildRelationshipKey('player', outcome.npcId)
          const existing = next.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
          const axis = outcome.axis as 'affinity' | 'respect' | 'fear' | 'trust' | 'loyalty'
          const newValue = Math.max(-100, Math.min(100, ((existing[axis] as number) ?? 0) + outcome.delta))
          next = {
            ...next,
            relationships: {
              ...next.relationships,
              [key]: { ...existing, [axis]: newValue },
            },
          }
        }
        break
      case 'createQuestLead':
        if (outcome.questId) {
          const mutable = {
            ...next,
            availableQuestLeads: [...next.availableQuestLeads],
            activityLog: [...next.activityLog],
          }
          addQuestLeadIfNew(mutable, outcome.questId, { discoverySource: 'event' })
          next = mutable
        }
        break
      case 'updateQuestStage':
        if (outcome.questId && outcome.stageId) {
          next = {
            ...next,
            activeQuests: next.activeQuests.map((q) =>
              q.questId === outcome.questId
                ? {
                    ...q,
                    stageId: outcome.stageId!,
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
        if (outcome.npcId) {
          const alreadyHired = next.roster.some((r) => r.npcId === outcome.npcId)
          const alreadyOffered = next.availableForHire.some((o) => o.npcId === outcome.npcId)
          if (!alreadyHired && !alreadyOffered) {
            next = {
              ...next,
              availableForHire: [
                ...next.availableForHire,
                {
                  npcId: outcome.npcId,
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
        if (outcome.npcId) {
          const alreadyOnRoster = next.roster.some((r) => r.npcId === outcome.npcId)
          if (!alreadyOnRoster) {
            const npcDef = contentCatalog.npcsById.get(outcome.npcId)
            if (npcDef) {
              const npcArc = outcome.arcId
                ? { arcId: outcome.arcId, stage: 'early-childhood', stageEnteredDay: next.day, stageFlags: {}, driftHistory: [] }
                : null
              const newEntry = {
                npcId: outcome.npcId,
                name: npcDef.name,
                status: npcDef.status,
                assignment: 'idle' as const,
                assignedDistrictId: null,
                activeTitle: null,
                wagesOwedDays: 0,
                trainingFocus: null,
                attributes: { ...npcDef.baseAttributes },
                skills: { ...npcDef.startingSkills },
                traits: { ...npcDef.startingTraits },
                states: { health: 100, fatigue: 0, stress: 0, morale: 50, fear: 0, anger: 0, hunger: 0, injury: 0, intoxication: 0, hygiene: 70 },
                loadout: { primaryWeaponId: null, secondaryWeaponId: null, armorId: null, accessoryIds: [], consumableIds: [] },
                npcMemory: [],
                npcArc,
              }
              next = { ...next, roster: [...next.roster, newEntry] }
              const { rng } = createRng(next.rngSeed)
              next = initializeRosterRelationships(next, rng)
              next = appendActivityLogEntry(next, 'system', `${npcDef.name} has come to stay in the house.`)
            }
          }
        }
        break
      }
    }
  }
  return next
}
