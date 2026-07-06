import type { TimeSlot } from '../shared/contracts'
import type { NpcIntentionType } from './contracts'

/**
 * Time slot mapping for NPC intention types.
 * Defines which time slots each intention type is valid for.
 */
export interface IntentionTimeSlotDefinition {
  validTimeSlots: TimeSlot[]
  slotSpecificUrgency?: Record<TimeSlot, number>
}

/**
 * Mapping of all 35 NPC intention types to their valid time slots.
 *
 * Time slots:
 * - morning: 06:00-12:00
 * - afternoon: 12:00-18:00
 * - evening: 18:00-22:00
 * - night: 22:00-06:00
 */
export const INTENTION_TIME_SLOT_MAPPING: Record<NpcIntentionType, IntentionTimeSlotDefinition> = {
  // ─── Original 10 types ────────────────────────────────────────────────────
  'lead-group': { validTimeSlots: ['morning', 'afternoon', 'evening'] },
  'support-group': { validTimeSlots: ['morning', 'afternoon', 'evening'] },
  'scout-ahead': { validTimeSlots: ['morning', 'afternoon'] },
  'resource-gather': { validTimeSlots: ['morning', 'afternoon'] },
  'confront-rival': { validTimeSlots: ['morning', 'afternoon', 'evening'] },
  'protect-house': { validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] },
  'investigate-threat': { validTimeSlots: ['morning', 'afternoon', 'evening'] },
  'patrol-district': { validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] },
  'seek-employment': { validTimeSlots: ['morning', 'afternoon'] },
  'socialize': { validTimeSlots: ['afternoon', 'evening'] },

  // ─── Basis-Bedürfnisse (5) ────────────────────────────────────────────────
  'eat-meal': {
    validTimeSlots: ['morning', 'afternoon', 'evening'],
    slotSpecificUrgency: { morning: 5, afternoon: 5, evening: 5, night: 1 },
  },
  'drink': {
    validTimeSlots: ['morning', 'afternoon', 'evening'],
    slotSpecificUrgency: { morning: 3, afternoon: 3, evening: 4, night: 2 },
  },
  'sleep': {
    validTimeSlots: ['night'],
    slotSpecificUrgency: { morning: 1, afternoon: 1, evening: 1, night: 5 },
  },
  'rest': {
    validTimeSlots: ['morning', 'afternoon', 'evening', 'night'],
    slotSpecificUrgency: { morning: 2, afternoon: 3, evening: 2, night: 2 },
  },
  'groom': { validTimeSlots: ['morning', 'evening'] },

  // ─── Sozial/Romantik (5) ──────────────────────────────────────────────────
  'flirt-with': { validTimeSlots: ['afternoon', 'evening'] },
  'court-romantically': { validTimeSlots: ['afternoon', 'evening'] },
  'visit-lover': { validTimeSlots: ['afternoon', 'evening'] },
  'jealousy-check': { validTimeSlots: ['morning', 'afternoon', 'evening'] },
  'spend-time-with': { validTimeSlots: ['afternoon', 'evening'] },

  // ─── Romantik/SexualitÃ¤t (3) ──────────────────────────────────────────────
  'seek-intimacy': { validTimeSlots: ['evening', 'night'] },
  'flirt-aggressively': { validTimeSlots: ['afternoon', 'evening'] },
  'visit-romantic-partner': { validTimeSlots: ['evening', 'night'] },

  // ─── AlltagsaktivitÃ¤ten (4) ───────────────────────────────────────────────
  'shop-for-goods': { validTimeSlots: ['morning', 'afternoon'] },
  'train-self': { validTimeSlots: ['morning', 'afternoon'] },
  'meditate': { validTimeSlots: ['morning', 'night'] },
  'practice-skill': { validTimeSlots: ['morning', 'afternoon'] },

  // ─── Spezial/Quirky (2) ───────────────────────────────────────────────────
  'people-watch': { validTimeSlots: ['afternoon', 'evening'] },
  'gossip': { validTimeSlots: ['afternoon', 'evening'] },

  // ─── Geld verdienen (4) ───────────────────────────────────────────────────
  'seek-tips': { validTimeSlots: ['afternoon', 'evening'] },
  'black-market-trade': { validTimeSlots: ['evening', 'night'] },
  'beg-for-coin': { validTimeSlots: ['morning', 'afternoon'] },
  'scavenge-for-sell': { validTimeSlots: ['morning', 'afternoon'] },

  // ─── NPC Economy (destiny-bkln) ──────────────────────────────────────────
  'repair-equipment': { validTimeSlots: ['morning', 'afternoon'] },
  'use-consumable': { validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] },
  'give-gift': { validTimeSlots: ['morning', 'afternoon', 'evening'] },
  'trade-with-npc': { validTimeSlots: ['morning', 'afternoon', 'evening'] },
  'craft-item': { validTimeSlots: ['morning', 'afternoon'] },

  // ─── Macht/Kontrolle (5) ──────────────────────────────────────────────────
  'assert-dominance': { validTimeSlots: ['morning', 'afternoon', 'evening'] },
  'spy-on': { validTimeSlots: ['evening', 'night'] },
  'intercept-communication': { validTimeSlots: ['morning', 'afternoon', 'evening'] },
  'gather-leverage': { validTimeSlots: ['morning', 'afternoon', 'evening'] },
  'consolidate-power': { validTimeSlots: ['evening', 'night'] },

  // ─── Gruppen/Dynamik (5) ──────────────────────────────────────────────────
  'form-squad': { validTimeSlots: ['morning', 'afternoon'] },
  'recruit-member': { validTimeSlots: ['morning', 'afternoon', 'evening'] },
  'host-gathering': { validTimeSlots: ['evening'] },
  'mediate-conflict': { validTimeSlots: ['morning', 'afternoon'] },
  'challenge-authority': { validTimeSlots: ['afternoon', 'evening'] },

  // ─── Ãberleben/Existenz (5) ───────────────────────────────────────────────
  'scavenge': { validTimeSlots: ['morning', 'afternoon'] },
  'fortify-position': { validTimeSlots: ['morning', 'afternoon', 'evening'] },
  'escape-attempt': { validTimeSlots: ['morning', 'afternoon', 'night'] },
  'seek-shelter': { validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] },
  'care-for-injured': { validTimeSlots: ['morning', 'afternoon', 'evening', 'night'] },

  // ─── NPC cross-district travel (destiny-q80n.10.1) ───────────────────────
  'travel-district': { validTimeSlots: ['morning', 'afternoon'] },
}

/**
 * Helper function to check if an intention type is valid for a given time slot.
 */
export function isIntentionValidForTimeSlot(
  intentionType: NpcIntentionType,
  timeSlot: TimeSlot
): boolean {
  return INTENTION_TIME_SLOT_MAPPING[intentionType].validTimeSlots.includes(timeSlot)
}

/**
 * Helper function to get the urgency for an intention type in a specific time slot.
 * Returns the priority if slotSpecificUrgency is defined, otherwise returns 3 (medium).
 */
export function getIntentionUrgencyForSlot(
  intentionType: NpcIntentionType,
  timeSlot: TimeSlot
): number {
  const mapping = INTENTION_TIME_SLOT_MAPPING[intentionType]
  if (mapping.slotSpecificUrgency && mapping.slotSpecificUrgency[timeSlot]) {
    return mapping.slotSpecificUrgency[timeSlot]
  }
  return 3 // Default medium urgency
}

/**
 * Helper function to get all intention types valid for a given time slot.
 */
export function getIntentionTypesForSlot(timeSlot: TimeSlot): NpcIntentionType[] {
  return Object.entries(INTENTION_TIME_SLOT_MAPPING)
    .filter(([, def]) => def.validTimeSlots.includes(timeSlot))
    .map(([type]) => type as NpcIntentionType)
}
