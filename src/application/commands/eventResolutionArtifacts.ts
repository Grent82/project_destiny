import type { GameState } from '../../domain'
import type { ChronicleEntry, ChronicleEntryKind } from '../../domain/chronicle/contracts'
import { applyChronicleEviction, addChronicleEntry } from '../../domain/chronicle/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { resolveNpcStateSubject } from './applyEventOutcome'

const relationshipAxisLabels = {
  affinity: 'affinity',
  respect: 'respect',
  fear: 'fear',
  trust: 'trust',
  loyalty: 'loyalty',
} as const

const cityDialLabels = {
  control: 'City control',
  prosperity: 'City prosperity',
  unrest: 'City unrest',
  corruption: 'City corruption',
} as const

const cityResourceLabels = {
  foodSecurity: 'Food security',
  waterAccess: 'Water access',
  materialStock: 'Material stock',
} as const

const npcStateLabels = {
  health: 'health',
  fatigue: 'fatigue',
  stress: 'stress',
  morale: 'morale',
  fear: 'fear',
  anger: 'anger',
  hunger: 'hunger',
  injury: 'injury',
  intoxication: 'intoxication',
  hygiene: 'hygiene',
  loyalty: 'loyalty',
} as const

function describeDelta(delta: number) {
  return delta > 0 ? 'rises' : 'falls'
}

function classifyChronicleKind(
  eventId: string,
  sourceNpcId: string | null,
): ChronicleEntryKind {
  const template = contentCatalog.eventsById.get(eventId)
  if (!template) return 'world'

  if (
    template.firingMode === 'system' ||
    template.tags.some((tag) =>
      ['household', 'ward', 'pairing', 'bond-service', 'heir', 'captivity'].includes(tag),
    )
  ) {
    return 'household'
  }

  if (
    sourceNpcId ||
    template.tags.some((tag) =>
      ['npc', 'personal', 'authored', 'relationship', 'character'].includes(tag),
    )
  ) {
    return 'scene'
  }

  return 'world'
}

export function buildResolvedEventArtifacts(
  state: GameState,
  eventId: string,
  choiceId: string,
  sourceNpcId: string | null,
  sourceDistrictId: string | null,
  options?: { autoResolved?: boolean },
) {
  const template = contentCatalog.eventsById.get(eventId)
  if (!template) return null

  const choice = template.choices.find((entry) => entry.id === choiceId)
  if (!choice) return null

  const sourceNpcName = sourceNpcId
    ? (contentCatalog.npcsById.get(sourceNpcId)?.name ?? null)
    : null
  const sourceDistrictName = sourceDistrictId
    ? (contentCatalog.districtsById.get(sourceDistrictId)?.name ?? null)
    : null

  const playerEffects: string[] = []
  const npcEffects: string[] = []
  const worldEffects: string[] = []
  const narrativeOutcomeLines: string[] = []

  for (const outcome of choice.outcomes) {
    switch (outcome.type) {
      case 'addCredits':
        if (typeof outcome.delta === 'number' && outcome.delta !== 0) {
          playerEffects.push(
            outcome.delta > 0
              ? `You gain ${outcome.delta} marks.`
              : `You lose ${Math.abs(outcome.delta)} marks.`,
          )
        }
        break
      case 'adjustNpcRelationship': {
        const npcId = outcome.npcId ?? outcome.target ?? sourceNpcId
        const npcName = npcId ? contentCatalog.npcsById.get(npcId)?.name ?? 'The contact' : 'The contact'
        if (outcome.axis && typeof outcome.delta === 'number' && outcome.delta !== 0) {
          const relationshipAxis = outcome.axis as keyof typeof relationshipAxisLabels
          npcEffects.push(
            `${npcName}'s ${relationshipAxisLabels[relationshipAxis]} ${describeDelta(outcome.delta)}.`,
          )
        }
        break
      }
      case 'adjustFactionStanding': {
        const factionName = outcome.target
          ? contentCatalog.factionsById.get(outcome.target)?.name ?? 'A faction'
          : 'A faction'
        if (typeof outcome.delta === 'number' && outcome.delta !== 0) {
          worldEffects.push(
            `${factionName} standing ${outcome.delta > 0 ? 'improves' : 'worsens'}.`,
          )
        }
        break
      }
      case 'adjustCityDial':
        if (outcome.target && typeof outcome.delta === 'number' && outcome.delta !== 0) {
          const label = cityDialLabels[outcome.target as keyof typeof cityDialLabels] ?? outcome.target
          worldEffects.push(`${label} ${describeDelta(outcome.delta)}.`)
        }
        break
      case 'adjustCityResource':
        if (outcome.target && typeof outcome.delta === 'number' && outcome.delta !== 0) {
          const label = cityResourceLabels[outcome.target as keyof typeof cityResourceLabels] ?? outcome.target
          worldEffects.push(`${label} ${describeDelta(outcome.delta)}.`)
        }
        break
      case 'adjustNpcState': {
        if (outcome.subject && outcome.axis && typeof outcome.delta === 'number' && outcome.delta !== 0) {
          const npc = resolveNpcStateSubject(
            state.roster,
            outcome.subject as `npcId:${string}` | 'highest-stress' | 'lowest-morale' | 'highest-loyalty',
          )
          const npcName = npc?.name ?? 'A retainer'
          const label = npcStateLabels[outcome.axis as keyof typeof npcStateLabels] ?? outcome.axis
          npcEffects.push(`${npcName}'s ${label} ${describeDelta(outcome.delta)}.`)
        }
        break
      }
      case 'setCorridorStatus':
        if (outcome.value) {
          worldEffects.push(`Corridor status shifts to ${outcome.value}.`)
        }
        break
      case 'createQuestLead': {
        const questTitle = outcome.questId
          ? contentCatalog.questsById.get(outcome.questId)?.title ?? outcome.questId
          : 'A new lead'
        playerEffects.push(`New lead added: ${questTitle}.`)
        break
      }
      case 'updateQuestStage':
        playerEffects.push(
          outcome.objectiveLabel
            ? `Active work updates: ${outcome.objectiveLabel}.`
            : 'An active quest changes stage.',
        )
        break
      case 'unlockNpc': {
        const npcName = outcome.npcId
          ? contentCatalog.npcsById.get(outcome.npcId)?.name ?? 'A new contact'
          : 'A new contact'
        playerEffects.push(`${npcName} becomes available to the house.`)
        break
      }
      case 'addNpcToRoster': {
        const npcName = outcome.npcId
          ? contentCatalog.npcsById.get(outcome.npcId)?.name ?? 'A new retainer'
          : 'A new retainer'
        playerEffects.push(`${npcName} joins the house.`)
        break
      }
      case 'transferBondedNpc':
        worldEffects.push('A bonded transfer is set in motion.')
        break
      case 'addActivityLogEntry':
        if (outcome.message) {
          narrativeOutcomeLines.push(outcome.message)
        }
        break
    }
  }

  const narrativeOutcome = narrativeOutcomeLines[0] ?? null
  const kind = classifyChronicleKind(eventId, sourceNpcId)
  const dayKey = state.day.toString()
  const bucketSize = state.chronicle.entriesByDay[dayKey]?.entries.length ?? 0
  const detailLines = options?.autoResolved
    ? [...(narrativeOutcome ? [narrativeOutcome] : [])]
    : [`You chose: ${choice.label}`, ...(narrativeOutcome ? [narrativeOutcome] : [])]

  const chronicleEntry: ChronicleEntry = {
    entryId: `event-${eventId}-${state.day}-${state.timeSlot}-${bucketSize + 1}`,
    day: state.day,
    timeSlot: state.timeSlot,
    kind,
    headline: template.title,
    detailLines,
    actors: sourceNpcId && sourceNpcName
      ? [{ actorId: sourceNpcId, actorName: sourceNpcName, actorType: 'npc' }]
      : [],
    places: sourceDistrictId && sourceDistrictName
      ? [{ placeId: sourceDistrictId, placeName: sourceDistrictName, placeType: 'district' }]
      : [],
    effects: {
      playerEffects,
      npcEffects,
      worldEffects,
    },
    linkedTarget: {
      targetType: 'event',
      targetId: eventId,
    },
  }

  return {
    summary: {
      eventId,
      title: template.title,
      choiceLabel: choice.label,
      day: state.day,
      timeSlot: state.timeSlot,
      sourceNpcName,
      narrativeOutcome,
      playerEffects,
      npcEffects,
      worldEffects,
    },
    chronicleEntry,
  }
}

export function appendEventChronicleEntry(
  state: GameState,
  eventId: string,
  choiceId: string,
  sourceNpcId: string | null,
  sourceDistrictId: string | null,
  options?: { autoResolved?: boolean },
): GameState {
  const artifacts = buildResolvedEventArtifacts(
    state,
    eventId,
    choiceId,
    sourceNpcId,
    sourceDistrictId,
    options,
  )
  if (!artifacts) return state

  return {
    ...state,
    chronicle: applyChronicleEviction(
      addChronicleEntry(state.chronicle, artifacts.chronicleEntry),
      state.day,
    ),
  }
}
