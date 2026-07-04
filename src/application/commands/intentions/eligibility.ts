import { npcIntentionTypeSchema } from '../../../domain/shared/contracts'
import type { NpcIntentionType } from '../../../domain/npc/contracts'
import type { NpcRuntimeState } from '../../../domain/npc/contracts'

/**
 * Intention eligibility by NPC kind + status (destiny-rama.5).
 *
 * Once every NPC type shares one runtime list, the intention system must gate WHICH intention types
 * each person may even want, by their npcType and captivity status. This is the POSITIVE eligibility
 * set. It composes with two other gates (see contract doc §2.2/§6):
 *   1. `WIRED_INTENTION_TYPES` (intentions.ts) — the global allowlist of types that can fire at all.
 *   2. `isNpcBlockedFromIntention` (intentions.ts) — the hard runtime block (assignment, directive,
 *      ward, captivity).
 * An intention is generated for a person only if it is BOTH wired AND in intentionTypesForNpc(npc),
 * and the person is not hard-blocked. This function does not know about wiring — it answers "what is
 * this person, by their nature, even capable of wanting?"
 *
 * Design rationale (the exact world set the contract doc §6 left to this bead):
 * - Roster (the player's recruited operatives): everything. Composition with WIRED does the narrowing.
 * - World / Story NPCs: they LIVE — self-care, ambient socialising, NPC↔NPC romance (already simulated
 *   for world pairs via applyNpcPairing), and district/faction life. Deliberately EXCLUDED for them:
 *     • player-house-only actions (protect-house, fortify-position, care-for-injured) — these act on
 *       the player's house/roster, not the world NPC's own life.
 *     • player-economy / hiring actions (seek-employment, seek-tips, beg-for-coin, black-market-trade,
 *       scavenge-for-sell, resource-gather, scavenge, shop-for-goods) — these feed the player's
 *       economy / hire pool, which a world NPC must not drive.
 *     • roster-coupled intrigue/dominance (spy-on, gather-leverage, intercept-communication,
 *       investigate-threat, scout-ahead, assert-dominance) — their current target selection reaches
 *       into the player's roster; generalising that is D2's job, not an eligibility promise here.
 *     • group/squad actions (lead-group, support-group, form-squad, recruit-member) — no NPC group
 *       runtime concept exists yet (see destiny-nid0).
 *     • host-gathering — needs the player's house rooms.
 *   These borderline exclusions are conservative on purpose: it is safe to widen later once D2 has
 *   generalised the relevant handlers; it is expensive to ship a world NPC silently mutating the
 *   player's house or economy.
 * - Enemy runtime NPCs: no personal agency here (they belong to the combat system).
 * - Captives: empty — they are hard-blocked by isNpcBlockedFromIntention; this is defense-in-depth so
 *   a caller that forgets the hard gate still cannot hand a captive an intention. (escape-attempt is a
 *   deliberate future carve-out handled in that guard, not routed through this positive set.)
 */

const EMPTY: ReadonlySet<NpcIntentionType> = new Set()

/** Every intention type — the roster set (composition with WIRED_INTENTION_TYPES does the narrowing). */
export const ALL_INTENTION_TYPES: ReadonlySet<NpcIntentionType> = new Set(npcIntentionTypeSchema.options)

/** The intention types a World/Story NPC may want. See rationale above. */
export const WORLD_ELIGIBLE_INTENTION_TYPES: ReadonlySet<NpcIntentionType> = new Set<NpcIntentionType>([
  // Self-care / survival
  'eat-meal',
  'drink',
  'sleep',
  'rest',
  'groom',
  'meditate',
  'seek-shelter',
  // Self-improvement
  'train-self',
  'practice-skill',
  // Ambient social
  'socialize',
  'gossip',
  'spend-time-with',
  'people-watch',
  // NPC↔NPC romance (already simulated for world pairs via applyNpcPairing)
  'flirt-with',
  'court-romantically',
  'visit-lover',
  'visit-romantic-partner',
  'jealousy-check',
  'seek-intimacy',
  // District / rivalry / faction life (acts on the NPC's own district, authored rivals, or faction)
  'confront-rival',
  'patrol-district',
  'consolidate-power',
  'mediate-conflict',
  'challenge-authority',
])

/**
 * Returns the set of intention types this person is, by kind and status, eligible to want. Compose
 * with WIRED_INTENTION_TYPES (and isNpcBlockedFromIntention) at the generation site.
 */
export function intentionTypesForNpc(npc: NpcRuntimeState): ReadonlySet<NpcIntentionType> {
  // Defense-in-depth: captives get nothing here even though isNpcBlockedFromIntention is the runtime gate.
  if (npc.captivityState?.status === 'captive') return EMPTY

  switch (npc.npcType) {
    case 'roster':
      return ALL_INTENTION_TYPES
    case 'world':
    case 'story':
      return WORLD_ELIGIBLE_INTENTION_TYPES
    case 'enemy':
      return EMPTY
    default:
      return EMPTY
  }
}
