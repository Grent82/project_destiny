import type { GameState } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { contentCatalog, getQuestTemplates } from '../content/contentCatalog'
import { adjustCityDial, adjustCityResource, adjustDistrictTension } from './economicConsequences'
import { DISTRICT_IDS } from '../content/ids'

const TENSION_DECAY_TARGET = 30
const TENSION_DRIFT = 2

/** Step 9 (faction quest bonus): high standing points the player toward faction work without auto-posting it to the board. */
export function applyFactionQuestBonus(state: GameState): GameState {
  let next = state
  const allQuests = getQuestTemplates()

  for (const [factionId, standing] of Object.entries(next.factionStandings)) {
    if (standing < 40) continue
    const factionQuest = allQuests.find(
      (q) =>
        q.rewardStandingFactionId === factionId &&
        !next.availableQuestLeads.some((lead) => lead.questId === q.id) &&
        !next.completedQuestIds.includes(q.id) &&
        !next.activeQuests.some((aq) => aq.questId === q.id) &&
        (!q.requiredFactionStanding || standing >= q.requiredFactionStanding.minStanding),
    )
    if (factionQuest) {
      const hintKey = `faction-work-hint-${factionQuest.id}`
      if (next.lastFiredDay[hintKey] === next.day) continue

      const districtName = factionQuest.discoveryDistrictId
        ? contentCatalog.districtsById.get(factionQuest.discoveryDistrictId)?.name ?? factionQuest.discoveryDistrictId
        : 'the city'

      next = appendActivityLogEntry(
        {
          ...next,
          lastFiredDay: {
            ...next.lastFiredDay,
            [hintKey]: next.day,
          },
        },
        'system',
        `Faction contacts hint at work tied to ${districtName}. If you want details, you need to hear it in person.`,
      )
    }
  }

  return next
}

/** Steps 9b–9c: faction daily agenda log + district tension update. */
export function applyFactionActivity(state: GameState): GameState {
  let next = state
  const currentDay = next.day

  // Step 9b: Faction daily agenda log — rotate through factions using data-driven hooks
  const factions = contentCatalog.factions
  const todayFaction = factions[currentDay % factions.length]
  if (todayFaction) {
    const agendaMsg = todayFaction.dailyAgendaHook ?? `${todayFaction.name} acted today.`
    next = appendActivityLogEntry(next, 'system', agendaMsg)

    if (todayFaction.tags.includes('trade')) {
      next = adjustCityDial(next, 'prosperity', 1)
      next = adjustCityResource(next, 'foodSecurity', next.cityResources.corridorStatus === 'open' ? 1 : 0)
    }

    if (todayFaction.tags.includes('industry') || todayFaction.tags.includes('production')) {
      next = adjustCityResource(next, 'materialStock', 1)
      next = adjustCityDial(next, 'prosperity', 1)
    }

    if (todayFaction.tags.includes('black-market') || todayFaction.tags.includes('smuggling')) {
      next = adjustCityDial(next, 'corruption', 1)
      for (const districtId of todayFaction.territory) {
        next = adjustDistrictTension(next, districtId, 4)
      }
    }

    if (todayFaction.tags.includes('community')) {
      next = adjustCityResource(next, 'foodSecurity', 1)
      next = adjustCityDial(next, 'unrest', -1)
    }
  }

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
    if (next.debtCrisisTriggered && districtId === DISTRICT_IDS.THE_PALE) t = Math.min(100, t + 10)
    updatedTension[districtId] = Math.max(0, Math.min(100, t))
  }

  return { ...next, districtTension: updatedTension }
}
