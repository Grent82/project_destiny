import type { GameState } from '../../domain'
import { appendActivityLogEntry } from './activityLog'
import { getCouncilVoteTemplates } from '../content/contentCatalog'
import { simulateRivalOrgs, applyRivalActions } from './simulateRivalOrgs'
import type { Rng } from './seededRng'

/** Steps 7, 7b, 7c, 7d, 7e, 7f: council votes, faction pressure, rival orgs, city stability, debt. */
export function applyPolitics(state: GameState, rng: Rng = Math.random): GameState {
  let next = state
  const currentDay = next.day

  // Step 7: Periodic council vote — fire one every 5 days if none active
  if (currentDay % 5 === 0 && next.activeCouncilVotes.length === 0) {
    const templates = getCouncilVoteTemplates()
    if (templates.length > 0) {
      const template = templates[Math.floor(rng() * templates.length)]!
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
      next = appendActivityLogEntry(
        next,
        'system',
        `The council convenes. A vote is called: "${template.title}".`,
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
  const rivalActions = simulateRivalOrgs(next, [rng() + controlAdj, rng() + controlAdj])
  next = applyRivalActions(next, rivalActions)

  // Step 7d: City stability crisis event
  if ((next.cityStability ?? 60) < 30) {
    const crisisEventId = 'event-city-crisis'
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
  if ((next.factionStandings['faction-gilded-court'] ?? -20) > 30 && currentDay % 10 === 0) {
    const noticeEventId = 'event-gilded-notice'
    const alreadyPending = next.pendingEvents.some((e) => e.eventId === noticeEventId)
    if (!alreadyPending) {
      next = {
        ...next,
        pendingEvents: [...next.pendingEvents, { eventId: noticeEventId, firedOnDay: next.day }],
      }
    }
  }

  // Step 7f: Debt interest — each unpaid day past day 15 adds 10 Marks
  if (!next.debtPaid && next.day > 15) {
    next = { ...next, debtAmount: next.debtAmount + 10 }
    next = appendActivityLogEntry(
      next,
      'system',
      `Interest accrues on the outstanding debt. The house now owes ${next.debtAmount} Marks.`,
    )
  }

  // Step 7f-ii: Rival faction warning at day 20 if debt > 400 Marks remaining
  if (!next.debtPaid && next.day === 20 && next.debtAmount > 400) {
    const warningEventId = 'event-debt-faction-warning'
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
        fs.factionId === 'faction-gilded-court'
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

  // Step 7g: Marion finds the vault key — triggers once after day 5 if not yet unlocked
  if (!next.house.vaultUnlocked && next.day >= 5) {
    const alreadyPending = next.pendingEvents.some((e) => e.eventId === 'event-vault-key-found')
    const alreadyFired = 'event-vault-key-found' in next.lastFiredDay
    if (!alreadyPending && !alreadyFired) {
      next = {
        ...next,
        house: {
          ...next.house,
          vaultUnlocked: true,
          rooms: next.house.rooms.map((r) =>
            r.roomId === 'room-vault' ? { ...r, state: 'intact' as const } : r,
          ),
        },
        lastFiredDay: { ...next.lastFiredDay, 'event-vault-key-found': next.day },
      }
      next = appendActivityLogEntry(
        next,
        'system',
        `Marion comes to you with a tarnished iron key. She found it behind a loose stone in her room — your father's old vault key. "I didn't know what it opened," she says. "Now I do." The vault below can be searched.`,
      )
    }
  }

  // Step 7h: Main quest pressure and lead surfacing
  if (next.mainQuest.stage === 'lead-found' && next.day >= 12) {
    const alreadyFired = 'event-mira-location' in next.lastFiredDay
    if (!alreadyFired) {
      const hasRescueLead =
        next.availableQuests.includes('quest-mira-rescue') ||
        next.activeQuests.some((quest) => quest.questId === 'quest-mira-rescue') ||
        next.completedQuestIds.includes('quest-mira-rescue')
      next = {
        ...next,
        mainQuest: {
          ...next.mainQuest,
          lastClue: 'Tessaly Ash says she can name the place if you are willing to move on it. The Pale Sisters are using an old tannery in the Pale.',
        },
        availableQuests: hasRescueLead ? next.availableQuests : [...next.availableQuests, 'quest-mira-rescue'],
        lastFiredDay: { ...next.lastFiredDay, 'event-mira-location': next.day },
      }
      next = appendActivityLogEntry(
        next,
        'system',
        'Word reaches you: Tessaly Ash has a lead on Mira and is ready to talk if you move now.',
      )
    }
  }

  if (next.mainQuest.stage === 'location-known' && next.day >= 20 && !next.completedQuestIds.includes('quest-mira-rescue')) {
    const alreadyFired = 'event-mira-pressure' in next.lastFiredDay
    if (!alreadyFired) {
      next = {
        ...next,
        lastFiredDay: { ...next.lastFiredDay, 'event-mira-pressure': next.day },
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
