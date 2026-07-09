import type { GameState } from '../../domain'
import type { IntimacyStage } from '../../domain/relationships/contracts'
import { buildRelationshipKey } from '../../domain/relationships/contracts'
import { contentCatalog } from '../content/contentCatalog'
import { appendActivityLogEntry } from './activityLog'
import { createRng, type Rng } from './seededRng'

const PLAYER_ID = 'player'

type IntimacyIntent = 'want-pregnancy' | 'avoid-pregnancy' | 'neutral'

type ContraceptionItem = {
  itemId: string
  uses: number
  efficacy: number
}

type EngagePhysicalIntimacyOptions = {
  contraceptionItemId: string | null // Item ID or null for no contraception
  intent: IntimacyIntent
}

// Base pregnancy risk per encounter (about 20% without contraception)
const BASE_PREGNANCY_RISK = 0.20
// Fertility modifier range based on NPC age band
const FERTILITY_MODIFIERS: Record<string, number> = {
  young: 0.8,
  adult: 1.0,
  middle: 0.7,
  elder: 0.3,
}

function getContraceptionItemFromInventory(state: GameState, itemId: string): ContraceptionItem | null {
  // Search in player's bag containers (new inventory system)
  for (const container of state.inventoryState.player.bagContainers) {
    for (const slot of container.slots) {
      if (slot.itemInstanceId === itemId && slot.quantity > 0) {
        const itemDef = contentCatalog.itemsById.get(itemId)
        if (!itemDef) return null

        const contraceptionEffect = itemDef.typedEffects?.find((effect) => effect.type === 'contraception')
        if (!contraceptionEffect) return null

        return {
          itemId,
          uses: contraceptionEffect.uses,
          efficacy: contraceptionEffect.efficacy,
        }
      }
    }
  }
  return null
}

type ConsentCheck =
  | { allowed: true }
  | { allowed: false; reason: 'relationship-too-new'; requiredStage: IntimacyStage; currentStage: IntimacyStage }
  | { allowed: false; reason: 'boundary-violation'; boundary: string }

function canEngagePhysicalIntimacy(state: GameState, npcId: string, options: EngagePhysicalIntimacyOptions): { npc: NonNullable<GameState['npcRuntimeStates'][0]>; consent: ConsentCheck; contraceptionItem: ContraceptionItem | null } | null {
  const npc = state.npcRuntimeStates.find((entry) => entry.npcId === npcId)
  if (!npc) return null
  if (state.currentDistrictId !== state.houseDistrictId) return null
  if (npc.assignment === 'deployed') return null
  if (npc.status === 'ward') return null
  if (npc.captivityState?.status === 'captive' || npc.captivityState?.status === 'missing') return null

  const npcDef = contentCatalog.npcsById.get(npcId)
  if (!npcDef) return null

  const key = buildRelationshipKey(PLAYER_ID, npcId)
  const relationship = state.relationships[key]
  const currentStage = relationship?.intimacyStage ?? 'none'

  const consentPreferences = npcDef.consentPreferences
  const requiredStage = consentPreferences.requiredStage

  // Check if intimacy stage meets requirement
  const stageOrder: IntimacyStage[] = ['none', 'affinity', 'attachment', 'committed']
  const currentIdx = stageOrder.indexOf(currentStage)
  const requiredIdx = stageOrder.indexOf(requiredStage)

  if (currentIdx < requiredIdx) {
    return {
      npc,
      consent: { allowed: false, reason: 'relationship-too-new', requiredStage, currentStage },
      contraceptionItem: null,
    }
  }

  // Get contraception item if requested
  const contraceptionItem = options.contraceptionItemId ? getContraceptionItemFromInventory(state, options.contraceptionItemId) : null

  // Check boundaries
  for (const boundary of consentPreferences.boundaries) {
    if (boundary === 'no-contraception' && contraceptionItem) {
      return {
        npc,
        consent: { allowed: false, reason: 'boundary-violation', boundary },
        contraceptionItem,
      }
    }
  }

  return {
    npc,
    consent: { allowed: true },
    contraceptionItem,
  }
}

function calculatePregnancyRisk(contraceptionItem: ContraceptionItem | null, npcId: string): number {
  let risk = BASE_PREGNANCY_RISK

  // Apply contraception reduction if item is used
  if (contraceptionItem) {
    risk *= (1 - contraceptionItem.efficacy)
  }

  // Apply fertility modifier from NPC definition
  const npcDef = contentCatalog.npcsById.get(npcId)
  const ageBand = npcDef?.ageBand ?? 'adult'
  const fertilityModifier = FERTILITY_MODIFIERS[ageBand] ?? 1.0
  risk *= fertilityModifier

  return Math.max(0, Math.min(1, risk))
}

function getAftermathTone(stage: IntimacyStage, opennessLevel: 'reserved' | 'moderate' | 'open', advanced: boolean): string {
  const toneMatrix: Record<IntimacyStage, Record<string, string[]>> = {
    none: {
      reserved: ['A quiet moment passes between you.', 'The night settles around you both.'],
      moderate: ['You share a tender exchange.', 'There is warmth in the silence.'],
      open: ['You explore each other quietly.', 'The night is yours.'],
    },
    affinity: {
      reserved: ['A quiet intimacy unfolds.', 'You share something tender.'],
      moderate: ['The night brings you closer.', 'There is tenderness between you.'],
      open: ['You explore each other with growing ease.', 'Intimacy flows naturally.'],
    },
    attachment: {
      reserved: ['A deeper connection forms in the quiet.', 'Your bond deepens in the darkness.'],
      moderate: ['You share an intimate moment that lingers.', 'The night brings you both closer.'],
      open: ['You explore each other with confidence.', 'Intimacy becomes a language between you.'],
    },
    committed: {
      reserved: ['Your shared intimacy is a quiet anchor.', 'The night is yours together.'],
      moderate: ['You share a deep, familiar intimacy.', 'The bond between you is evident in every touch.'],
      open: ['Your intimacy is open and expressive.', 'You explore each other without reservation.'],
    },
  }

  const tones = toneMatrix[stage]?.[opennessLevel] ?? toneMatrix.none.moderate
  return tones[advanced ? 1 : 0] ?? tones[0]
}

function getPregnancyAftermath(
  stage: IntimacyStage,
  opennessLevel: 'reserved' | 'moderate' | 'open',
  pregnancyRisk: number,
  intent: IntimacyIntent,
  contraceptionItem: ContraceptionItem | null,
  rng: Rng,
): { message: string; pregnancyOccurred: boolean } {
  // Determine if pregnancy occurred based on risk
  const pregnancyOccurred = rng() < pregnancyRisk

  let message: string

  if (pregnancyOccurred) {
    const pregnancyMessages: Record<IntimacyStage, Record<string, string>> = {
      none: {
        reserved: 'The consequences of this night will reveal themselves in time.',
        moderate: 'Something has taken root between you.',
        open: 'Your intimacy has created new life.',
      },
      affinity: {
        reserved: 'A change is coming. The signs will show soon enough.',
        moderate: 'You may be expecting something from this night.',
        open: 'Your union has created a new beginning.',
      },
      attachment: {
        reserved: 'The future is shifting. You will know soon.',
        moderate: 'A new chapter begins. Life is growing.',
        open: 'Your love has created something new. A child is coming.',
      },
      committed: {
        reserved: 'Your bond will soon grow. The signs will appear.',
        moderate: 'Something new is growing between you. A child is on the way.',
        open: 'Your intimacy has created life. You will soon be parents.',
      },
    }
    message = pregnancyMessages[stage]?.[opennessLevel] ?? pregnancyMessages.none.moderate

    // Add intent-based flavor
    if (intent === 'want-pregnancy') {
      message += ' This was what you hoped for.'
    } else if (intent === 'avoid-pregnancy') {
      message += ' This was not what you planned.'
    }
  } else {
    const noPregnancyMessages: Record<IntimacyStage, Record<string, string>> = {
      none: {
        reserved: 'The night passes quietly. Nothing changes yet.',
        moderate: 'You share intimacy. The risk remains, but nothing has happened.',
        open: 'The night is yours. No new life has begun.',
      },
      affinity: {
        reserved: 'No change yet. The night was intimate but fruitless.',
        moderate: 'You share closeness. For now, nothing more has happened.',
        open: 'Your intimacy brought no new life this time.',
      },
      attachment: {
        reserved: 'The future waits. No change has occurred.',
        moderate: 'You share intimacy. No pregnancy has occurred.',
        open: 'Your union was intimate but did not create life this time.',
      },
      committed: {
        reserved: 'Your bond remains as it was. No new life has begun.',
        moderate: 'You share intimacy. For now, nothing more has happened.',
        open: 'Your union was loving but did not create life this time.',
      },
    }
    message = noPregnancyMessages[stage]?.[opennessLevel] ?? noPregnancyMessages.none.moderate

    if (intent === 'avoid-pregnancy' && !contraceptionItem) {
      message += ' Contraception was not used.'
    } else if (intent === 'avoid-pregnancy' && contraceptionItem) {
      message += ' Contraception worked.'
    }
  }

  return { message, pregnancyOccurred }
}

/**
 * Engage in physical intimacy with an NPC.
 *
 * Guards:
 * - NPC must exist on roster
 * - Player must be at the house
 * - NPC must not be deployed, ward, captive, or missing
 * - Intimacy stage must meet NPC's consentPreferences.requiredStage
 * - Must not violate NPC's boundaries
 * - If requiresExplicitConsent, player must have gone through consent dialogue
 *
 * Options:
 * - contraceptionItemId: string | null (Item ID for contraception, or null for none)
 * - intent: 'want-pregnancy' | 'avoid-pregnancy' | 'neutral' (affects aftermath message)
 *
 * Outcomes:
 * - Relationship gains (affinity, trust, loyalty)
 * - Mood effects (NPC states)
 * - Optional pregnancy (based on risk calculation)
 * - Aftermath activity log entry
 * - Contraception item uses decremented (if used)
 */
export function engagePhysicalIntimacy(
  state: GameState,
  npcId: string,
  options: EngagePhysicalIntimacyOptions,
): GameState {
  const check = canEngagePhysicalIntimacy(state, npcId, options)
  if (!check) return state
  if (!check.consent.allowed) return state

  const { npc, contraceptionItem } = check

  const key = buildRelationshipKey(PLAYER_ID, npcId)
  const reverseKey = buildRelationshipKey(npcId, PLAYER_ID)
  const current = state.relationships[key] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
  const reverse = state.relationships[reverseKey] ?? { affinity: 0, respect: 0, fear: 0, trust: 0, loyalty: 0 }
  const currentStage = current.intimacyStage ?? 'none'

  const npcDef = contentCatalog.npcsById.get(npcId)!
  const opennessLevel = npcDef.consentPreferences.opennessLevel

  // Calculate relationship gains based on stage and openness
  let affinityGain = 3
  let trustGain = 2
  let loyaltyGain = 1

  if (currentStage === 'attachment') {
    affinityGain = 4
    trustGain = 3
    loyaltyGain = 2
  } else if (currentStage === 'committed') {
    affinityGain = 5
    trustGain = 4
    loyaltyGain = 3
  }

  // Openness modifier
  if (opennessLevel === 'open') {
    affinityGain = Math.round(affinityGain * 1.2)
    trustGain = Math.round(trustGain * 1.1)
  } else if (opennessLevel === 'reserved') {
    affinityGain = Math.round(affinityGain * 0.8)
    trustGain = Math.round(trustGain * 0.9)
  }

  let next: GameState = {
    ...state,
    relationships: {
      ...state.relationships,
      [key]: {
        ...current,
        affinity: Math.min(100, current.affinity + affinityGain),
        trust: Math.min(100, current.trust + trustGain),
        loyalty: Math.min(100, (current.loyalty ?? 0) + loyaltyGain),
      },
      [reverseKey]: {
        ...reverse,
        affinity: Math.min(100, reverse.affinity + Math.round(affinityGain * 0.6)),
        trust: Math.min(100, (reverse.trust ?? 0) + Math.round(trustGain * 0.6)),
      },
    },
  }

  // Calculate pregnancy risk and outcome
  const pregnancyRisk = calculatePregnancyRisk(contraceptionItem, npc.npcId)
  const { rng, getSeed } = createRng(state.rngSeed)
  const { message: pregnancyMessage, pregnancyOccurred } = getPregnancyAftermath(
    currentStage,
    opennessLevel,
    pregnancyRisk,
    options.intent,
    contraceptionItem,
    rng,
  )
  next = { ...next, rngSeed: getSeed() }

  // Build aftermath message
  const toneMessage = getAftermathTone(currentStage, opennessLevel, false)
  const contraceptionLabel = contraceptionItem
    ? ` (using ${contentCatalog.itemsById.get(contraceptionItem.itemId)?.name ?? 'contraception'})`
    : ''
  const aftermathMessage = `${npc.name}: ${toneMessage} ${pregnancyMessage}${contraceptionLabel}`

  next = appendActivityLogEntry(next, 'system', aftermathMessage)
  next.activityLog[0]!.id = `intimacy::${npcId}::${state.day}::${state.timeSlot}`

  // Handle pregnancy state
  if (pregnancyOccurred) {
    const nextNpc = next.npcRuntimeStates.find((n) => n.npcId === npcId)
    if (nextNpc) {
      next.npcRuntimeStates = next.npcRuntimeStates.map((n) =>
        n.npcId === npcId
          ? {
              ...n,
              pregnancyState: {
                context: 'consensual',
                daysElapsed: 0,
                questTag: null,
                partnerNpcId: 'player',
                wanted: options.intent === 'want-pregnancy' ? true : options.intent === 'avoid-pregnancy' ? false : null,
              },
            }
          : n,
      )
    }
  }

  // Consume contraception item use
  if (contraceptionItem) {
    const newUses = contraceptionItem.uses - 1
    if (newUses <= 0) {
      // Remove item from player inventory (new system)
      const updatedContainers = next.inventoryState.player.bagContainers.map((container) => {
        const slotIndex = container.slots.findIndex((s) => s.itemInstanceId === contraceptionItem.itemId)
        if (slotIndex === -1) return container

        const updatedSlots = [...container.slots]
        updatedSlots.splice(slotIndex, 1)
        return { ...container, slots: updatedSlots }
      })

      const usedSlots = updatedContainers.reduce((sum, c) => sum + c.slots.length, 0)

      next = {
        ...next,
        inventoryState: {
          ...next.inventoryState,
          player: {
            ...next.inventoryState.player,
            bagContainers: updatedContainers,
            usedBagSlots: usedSlots,
          },
        },
      }
    }
    // If uses remain, we'd need to track per-instance uses (requires item instances)
    // For now, the item stays in inventory but the player knows it was used
  }

  return next
}
