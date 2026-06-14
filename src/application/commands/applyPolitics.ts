import type { GameState } from '../../domain'
import type { CouncilVoteEvent } from '../../domain/governance/contracts'
import { appendActivityLogEntry } from './activityLog'
import { formatMarks } from '../../domain/game/currency'
import { contentCatalog, getCouncilVoteTemplates } from '../content/contentCatalog'
import { simulateRivalOrgs, applyRivalActions } from './simulateRivalOrgs'
import type { Rng } from './seededRng'
import { EVENT_IDS, FACTION_IDS, QUEST_IDS } from '../content/ids'
import { adjustCityDial, adjustDistrictTension } from './economicConsequences'
import { getRelationshipPoliticalCapital } from './politicalLeverage'

/**
 * Score a faction's propensity to propose a vote on this day.
 * Returns 0 if the faction has no agendaAxes or no vote templates.
 * Higher score → more likely to propose.
 */
function scoreFactionForProposal(
  factionId: string,
  state: GameState,
  hasTemplates: boolean,
): number {
  if (!hasTemplates) return 0
  const def = contentCatalog.factions.find((f) => f.id === factionId)
  if (!def?.agendaAxes) return 0

  const factionState = state.factionStates.find((fs) => fs.factionId === factionId)
  const pressure = factionState?.activePressure ?? 0
  const { proposesWhen } = def.agendaAxes
  const unrest = state.cityDials.unrest
  const prosperity = state.cityDials.prosperity
  const standing = state.factionStandings[factionId] ?? 0

  // Base score from pressure (0–100)
  let score = pressure

  // Bonuses when conditions are met
  if (proposesWhen.cityUnrestAbove !== undefined && unrest > proposesWhen.cityUnrestAbove) score += 20
  if (proposesWhen.factionPressureAbove !== undefined && pressure > proposesWhen.factionPressureAbove) score += 15
  if (proposesWhen.standingWithPlayerBelow !== undefined && standing < proposesWhen.standingWithPlayerBelow) score += 10
  if (proposesWhen.prosperityBelow !== undefined && prosperity < proposesWhen.prosperityBelow) score += 15

  // Leader trait modifiers
  const leaderNpcId = factionState?.leaderNpcId
  if (leaderNpcId) {
    const leader = contentCatalog.npcsById.get(leaderNpcId)
    const traits = leader?.startingTraits
    if (traits) {
      // High ambition: +20 to proposal score regardless of pressure (proactive)
      if (traits.ambition > 65) score += 20
      // High prudence: requires proposesWhen conditions to be 20% stricter (cautious)
      if (traits.prudence > 65) {
        // Apply a penalty that makes the faction more cautious
        score = Math.floor(score * 0.8)
      }
      // High ruthlessness: prefers targeting weaker factions (adversarial votes)
      if (traits.ruthlessness > 65) {
        // Check if there's a hostile target faction
        const hasHostileTarget = Object.entries(state.factionStandings).some(
          ([fid, st]) => st < -20 && fid !== factionId
        )
        if (hasHostileTarget) score += 15
      }
      // Low loyalty: may act against faction's stated agenda (corruption/defection signal)
      if (traits.loyalty < 35) {
        // Reduce score slightly as leader may defect
        score = Math.floor(score * 0.9)
      }
    }
  }

  return score
}

/**
 * Select a council vote template using faction agenda scoring.
 * Factions with high pressure and matching world conditions get priority.
 * Returns null if no suitable faction/template combination is found.
 */
export function selectAgendaVote(
  state: GameState,
  templates: CouncilVoteEvent[],
  rng: Rng,
): CouncilVoteEvent | null {
  if (templates.length === 0) return null

  // Group templates by proposing faction
  const byFaction = new Map<string, CouncilVoteEvent[]>()
  for (const t of templates) {
    const list = byFaction.get(t.proposingFactionId) ?? []
    list.push(t)
    byFaction.set(t.proposingFactionId, list)
  }

  // Score each faction
  const scoredFactions = [...byFaction.keys()].map((factionId) => ({
    factionId,
    score: scoreFactionForProposal(factionId, state, (byFaction.get(factionId)?.length ?? 0) > 0),
  }))

  // Sort by score descending; add small rng tie-break for variety
  scoredFactions.sort((a, b) => b.score - a.score + (rng() - 0.5) * 5)

  // Minimum threshold: at least one faction must be above 0
  const topFaction = scoredFactions.find((f) => f.score > 0) ?? scoredFactions[0]
  if (!topFaction) return null

  const factionTemplates = byFaction.get(topFaction.factionId) ?? []
  const def = contentCatalog.factions.find((f) => f.id === topFaction.factionId)

  // Filter by agenda values tag match if available
  let candidates = factionTemplates
  if (def?.agendaAxes?.values.length) {
    const tagMatched = factionTemplates.filter((t) =>
      t.tags.some((tag) => def.agendaAxes!.values.includes(tag)),
    )
    if (tagMatched.length > 0) candidates = tagMatched
  }

  return candidates[Math.floor(rng() * candidates.length)]!
}

/**
 * Apply all structured mechanical effects of a council vote.
 * Called only when the vote passes.
 */
export function applyVoteEffects(state: GameState, vote: CouncilVoteEvent): GameState {
  let next = state
  for (const effect of vote.mechanicalEffects) {
    switch (effect.type) {
      case 'factionStanding': {
        const curr = next.factionStandings[effect.factionId] ?? 0
        next = {
          ...next,
          factionStandings: {
            ...next.factionStandings,
            [effect.factionId]: Math.max(-100, Math.min(100, curr + effect.delta)),
          },
        }
        break
      }
      case 'cityDial': {
        next = adjustCityDial(next, effect.dial, effect.delta)
        break
      }
      case 'districtTension': {
        next = adjustDistrictTension(next, effect.districtId, effect.delta)
        break
      }
      case 'districtMarketPressure': {
        next = {
          ...next,
          districts: next.districts.map((d) =>
            d.districtId === effect.districtId
              ? { ...d, marketPressure: Math.max(0, Math.min(100, d.marketPressure + effect.delta)) }
              : d,
          ),
        }
        break
      }
      case 'districtDanger': {
        next = {
          ...next,
          districts: next.districts.map((d) =>
            d.districtId === effect.districtId
              ? { ...d, danger: Math.max(0, Math.min(100, d.danger + effect.delta)) }
              : d,
          ),
        }
        break
      }
    }
  }
  return next
}

function resolveDebtInterestIncrement(enforcementStanding: number): number {
  if (enforcementStanding >= 30) return 5
  if (enforcementStanding >= 0) return 10
  if (enforcementStanding >= -40) return 15
  return 20
}

/** Steps 7, 7b, 7c, 7d, 7e, 7f: council votes, faction pressure, rival orgs, city stability, debt. */
export function applyPolitics(state: GameState, rng: Rng = Math.random): GameState {
  let next = state
  const currentDay = next.day

  // Step 7: Periodic council vote — fire one every 5 days if none active
  if (currentDay % 5 === 0 && next.activeCouncilVotes.length === 0) {
    const templates = getCouncilVoteTemplates()
    const template = selectAgendaVote(next, templates, rng)
    if (template) {
      // Relationship leverage is available for future agenda/intrigue consumers.
      // No mechanical effect yet — proof that the data is reachable from here.
      void getRelationshipPoliticalCapital(next, template.proposingFactionId)
      next = {
        ...next,
        activeCouncilVotes: [
          ...next.activeCouncilVotes,
          {
            ...template,
            id: `${template.id}-day-${currentDay}`,
            expiresOnDay: currentDay + 7,
            outcome: 'pending' as const,
            playerVote: null,
          },
        ],
      }
      const factionState = next.factionStates.find((f) => f.factionId === template.proposingFactionId)
      const leaderNpcId = factionState?.leaderNpcId
      const leaderName = leaderNpcId ? contentCatalog.npcsById.get(leaderNpcId)?.name : null
      const proposerText = leaderName ? `${leaderName} of the ${contentCatalog.factionsById.get(template.proposingFactionId)?.name ?? 'Council'}` : 'The council'
      next = appendActivityLogEntry(
        next,
        'system',
        `${proposerText} calls a vote on "${template.title}".`,
      )
    }
  }

  // Step 7a: Auto-resolve expired council votes
  const expiredVotes = next.activeCouncilVotes.filter(
    (v) => v.outcome === 'pending' && v.expiresOnDay > 0 && currentDay > v.expiresOnDay,
  )
  for (const vote of expiredVotes) {
    // Player support = 70% pass; player oppose = 30% pass; neutral = 50%
    const baseChance = vote.playerVote === 'support' ? 0.7 : vote.playerVote === 'oppose' ? 0.3 : 0.5
    const passes = rng() < baseChance
    const factionName = vote.proposingFactionId.replace('faction-', '').replace(/-/g, ' ')
    next = appendActivityLogEntry(
      next,
      'system',
      `The council vote "${vote.title}" has concluded — ${passes ? 'passed' : 'failed'}. ${passes ? vote.effect : `${factionName}'s proposal was blocked.`}`,
    )
    if (passes) {
      next = applyVoteEffects(next, vote)
    }
    // Standing consequence for having influenced the vote
    if (vote.playerVote) {
      const standingDelta = passes ? 5 : -3
      const current = next.factionStandings[vote.proposingFactionId] ?? 0
      next = {
        ...next,
        factionStandings: {
          ...next.factionStandings,
          [vote.proposingFactionId]: Math.max(-100, Math.min(100, current + (vote.playerVote === 'support' ? standingDelta : -standingDelta))),
        },
      }
    }
  }
  next = {
    ...next,
    activeCouncilVotes: next.activeCouncilVotes
      .filter((v) => !expiredVotes.some((e) => e.id === v.id))
      .map((v) => v),
  }

  // Step 7b: Faction pressure escalation
  next = {
    ...next,
    factionStates: next.factionStates.map((factionState) => {
      const standing = next.factionStandings[factionState.factionId] ?? 0
      if (standing < -40) {
        return { ...factionState, activePressure: Math.min(100, factionState.activePressure + 5) }
      }
      return { ...factionState, activePressure: Math.max(0, factionState.activePressure - 2) }
    }),
  }
  for (const factionState of next.factionStates) {
    const standing = next.factionStandings[factionState.factionId] ?? 0
    if (standing < -40 && factionState.activePressure >= 60) {
      next = appendActivityLogEntry(
        next,
        'system',
        `${factionState.factionId.replace('faction-', '')} pressure on the house is mounting.`,
      )
    }
  }

  // Step 7c: Rival org simulation
  const controlAdj = next.cityDials.control >= 60 ? 0.05 : next.cityDials.control <= 30 ? -0.05 : 0
  const rivalActions = simulateRivalOrgs(next, [
    rng() + controlAdj, rng() + controlAdj, rng() + controlAdj, rng() + controlAdj, // action selection for each org
    rng(), rng(), rng(), rng(), // bribe target faction selection for each org
  ])
  next = applyRivalActions(next, rivalActions)

  // Step 7d: City stability crisis event
  if ((next.cityStability ?? 60) < 30) {
    const crisisEventId = EVENT_IDS.CITY_CRISIS
    const alreadyPending = next.pendingEvents.some((e) => e.eventId === crisisEventId)
    const alreadyFired = next.lastFiredDay[crisisEventId] !== undefined
    if (!alreadyPending && !alreadyFired) {
      next = {
        ...next,
        pendingEvents: [...next.pendingEvents, { eventId: crisisEventId, firedOnDay: next.day }],
        lastFiredDay: { ...next.lastFiredDay, [crisisEventId]: next.day },
      }
    }
  }

  // Step 7e: Household antagonist faction notice — fires every 10 days if standing > 30
  if ((next.factionStandings[FACTION_IDS.GILDED_COURT] ?? -20) > 30 && currentDay % 10 === 0) {
    const noticeEventId = EVENT_IDS.GILDED_NOTICE
    const alreadyPending = next.pendingEvents.some((e) => e.eventId === noticeEventId)
    if (!alreadyPending) {
      next = {
        ...next,
        pendingEvents: [...next.pendingEvents, { eventId: noticeEventId, firedOnDay: next.day }],
      }
    }
  }

  // Step 7f: Debt interest — enforcement pressure is worse when standing is hostile
  if (!next.debtPaid && next.day > 15) {
    const enforcementFactionId = next.debtEnforcementFactionId
    const enforcementName =
      contentCatalog.factionsById.get(enforcementFactionId)?.name ??
      enforcementFactionId.replace('faction-', '').replace(/-/g, ' ')
    const claimantName =
      contentCatalog.npcsById.get(next.debtClaimantNpcId)?.name ?? next.debtClaimantNpcId
    const enforcementStanding = next.factionStandings[enforcementFactionId] ?? 0
    const interestIncrement = resolveDebtInterestIncrement(enforcementStanding)
    next = { ...next, debtAmount: next.debtAmount + interestIncrement }
    next = appendActivityLogEntry(
      next,
      'system',
      `Interest accrues on the note ${claimantName} holds under ${enforcementName} protection. The house now owes ${formatMarks(next.debtAmount)}.`,
    )
  }

  // Step 7f-ii: Rival faction warning at day 20 if debt > 400 Marks remaining
  if (!next.debtPaid && next.day === 20 && next.debtAmount > 400) {
    const warningEventId = EVENT_IDS.DEBT_FACTION_WARNING
    const alreadyPending = next.pendingEvents.some((e) => e.eventId === warningEventId)
    if (!alreadyPending) {
      next = {
        ...next,
        pendingEvents: [...next.pendingEvents, { eventId: warningEventId, firedOnDay: next.day }],
        lastFiredDay: { ...next.lastFiredDay, [warningEventId]: next.day },
      }
      next = appendActivityLogEntry(
        next,
        'system',
        `⚠ A courier bearing the Gilded Court seal arrives. The message is terse: the debt is noted, the deadline approaches, and patience is not unlimited. Rival factions are watching.`,
      )
    }
  }

  // Step 7f-iii: Debt crisis consequences
  if (next.debtCrisisTriggered && !next.debtPaid) {
    next = {
      ...next,
      factionStates: next.factionStates.map((fs) =>
        fs.factionId === FACTION_IDS.GILDED_COURT
          ? { ...fs, activePressure: Math.min(100, fs.activePressure + 10) }
          : fs,
      ),
    }
    if (next.day >= 35) {
      const departing = next.roster.filter(
        (npc) => npc.traits.loyalty < 40 && npc.assignment !== 'deployed',
      )
      for (const npc of departing) {
        next = appendActivityLogEntry(
          next,
          'system',
          `${npc.name} has left. With the house seized and no prospects, they could not stay.`,
        )
      }
      const departingIds = new Set(departing.map((n) => n.npcId))
      next = {
        ...next,
        roster: next.roster.filter((n) => !departingIds.has(n.npcId)),
        selectedSquadNpcIds: next.selectedSquadNpcIds.filter((id) => !departingIds.has(id)),
      }
    }
  }

  // Step 7g: Main quest pressure after Orren's clue has surfaced
  if (next.mainQuest.stage === 'lead-found' && next.day >= 12) {
    const alreadyFired = EVENT_IDS.MIRA_LOCATION in next.lastFiredDay
    if (!alreadyFired) {
      next = {
        ...next,
        lastFiredDay: { ...next.lastFiredDay, [EVENT_IDS.MIRA_LOCATION]: next.day },
      }
      next = appendActivityLogEntry(
        next,
        'system',
        'If Orren was right, Tessaly Ash is still waiting at the Wren Safe House in the Pale. The lead will not walk itself to your door.',
      )
    }
  }

  if (next.mainQuest.stage === 'location-known' && next.day >= 20 && !next.completedQuestIds.includes(QUEST_IDS.MIRA_RESCUE)) {
    const alreadyFired = EVENT_IDS.MIRA_PRESSURE in next.lastFiredDay
    if (!alreadyFired) {
      next = {
        ...next,
        lastFiredDay: { ...next.lastFiredDay, [EVENT_IDS.MIRA_PRESSURE]: next.day },
      }
      next = appendActivityLogEntry(
        next,
        'system',
        'Mira is still inside the Pale tannery. Every day you wait makes the rescue worse.',
      )
    }
  }

  return next
}
