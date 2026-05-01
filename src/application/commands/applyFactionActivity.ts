import type { GameState } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { getQuestTemplates } from '../content/contentCatalog'

const FACTION_IDS = [
  'faction-civic-compact',
  'faction-gilded-court',
  'faction-foundry-league',
  'faction-tallow-ring',
  'faction-restored',
]

const FACTION_AGENDA_MESSAGES: Record<string, string> = {
  'faction-civic-compact': 'The Collectors updated their ledgers. Three new accounts flagged for collection.',
  'faction-gilded-court': 'The Iron Compact posted new contract boards in the Docks. Rates competitive.',
  'faction-foundry-league': 'A Pale Court courier was seen near the old annex. No message delivered.',
  'faction-tallow-ring': "The Tangle's network shifted overnight. Two safe-houses changed hands.",
  'faction-restored': 'Ashborn markings appeared on a warehouse wall in the Ashfields.',
}

const TENSION_DECAY_TARGET = 30
const TENSION_DRIFT = 2

/** Step 9 (faction quest bonus): unlock one additional quest per faction per day at standing >= 40. */
export function applyFactionQuestBonus(state: GameState): GameState {
  let next = state
  const allQuests = getQuestTemplates()

  for (const [factionId, standing] of Object.entries(next.factionStandings)) {
    if (standing < 40) continue
    const factionQuest = allQuests.find(
      (q) =>
        q.rewardStandingFactionId === factionId &&
        !next.availableQuests.includes(q.id) &&
        !next.completedQuestIds.includes(q.id) &&
        !next.activeQuests.some((aq) => aq.questId === q.id) &&
        (!q.requiredFactionStanding || standing >= q.requiredFactionStanding.minStanding),
    )
    if (factionQuest) {
      next = { ...next, availableQuests: [...next.availableQuests, factionQuest.id] }
    }
  }

  return next
}

/** Steps 9b–9c: faction daily agenda log + district tension update. */
export function applyFactionActivity(state: GameState): GameState {
  let next = state
  const currentDay = next.day

  // Step 9b: Faction daily agenda log
  const todayFactionId = FACTION_IDS[currentDay % FACTION_IDS.length]!
  const agendaMsg = FACTION_AGENDA_MESSAGES[todayFactionId] ?? `${todayFactionId} acted today.`
  next = appendActivityLogEntry(next, 'system', agendaMsg)

  // Step 9c: District tension update
  const failedDistrictIds = new Set<string>()
  for (const entry of next.activityLog) {
    if (entry.message.toLowerCase().includes('failed')) {
      for (const d of next.districts) {
        if (entry.message.includes(d.districtId)) {
          failedDistrictIds.add(d.districtId)
        }
      }
    }
  }

  const updatedTension: Record<string, number> = { ...next.districtTension }
  for (const [districtId, tension] of Object.entries(updatedTension)) {
    let t = tension
    if (t > TENSION_DECAY_TARGET) {
      t = Math.max(TENSION_DECAY_TARGET, t - TENSION_DRIFT)
    } else if (t < TENSION_DECAY_TARGET) {
      t = Math.min(TENSION_DECAY_TARGET, t + TENSION_DRIFT)
    }
    if (failedDistrictIds.has(districtId)) t = Math.min(100, t + 5)
    if (next.debtCrisisTriggered && districtId === 'district-the-pale') t = Math.min(100, t + 10)
    updatedTension[districtId] = Math.max(0, Math.min(100, t))
  }

  return { ...next, districtTension: updatedTension }
}
