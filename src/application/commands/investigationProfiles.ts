import {
  INVESTIGATION_APPROACHES,
  type InvestigationApproach,
  type InvestigationOutcome,
} from './investigation'
import type {
  QuestAftermath,
  QuestParticipant,
  QuestRuntime,
} from '../../domain/quests/contracts'
import type { GameState } from '../../domain'
import { contentCatalog } from '../content/contentCatalog'
import { MAX_ACTIVITY_ENTRIES } from './activityLog'
import { FACTION_IDS, NPC_IDS, QUEST_IDS } from '../content/ids'

type InvestigationApproachOverrides = Partial<
  Pick<InvestigationApproach, 'label' | 'description' | 'clueText'>
>

type InvestigationOutcomeCopy = {
  journalEntry: string
  completionMessage?: string
  failureMessage?: string
}

type InvestigationQuestProfile = {
  startObjectiveLabel?: string
  startJournalEntry?: string
  approaches?: Partial<Record<string, InvestigationApproachOverrides>>
  outcomes?: Partial<Record<InvestigationOutcome, InvestigationOutcomeCopy>>
  clues?: QuestClueDefinition[]
  participants?: QuestParticipant[]
  outcomeEffects?: Partial<Record<InvestigationOutcome, InvestigationOutcomeEffects>>
  outcomeHandling?: Partial<Record<InvestigationOutcome, InvestigationOutcomeHandling>>
}

type QuestClueDefinition = {
  clueId: string
  label: string
  branchId: string
}

type InvestigationOutcomeEffects = {
  aftermath?: QuestAftermath
  grantItemIds?: string[]
}

type InvestigationOutcomeHandling = {
  keepQuestActive: true
  stageId: string
  objectiveLabel: string
  journalEntry: string
  activityLogMessage: string
}

const DEFAULT_START_OBJECTIVE_LABEL =
  'Choose how to work this lead - your approach shapes the risk and reward.'
const DEFAULT_START_JOURNAL_ENTRY = 'The house has committed operatives to investigate the lead.'

const DEFAULT_OUTCOME_COPY: Record<InvestigationOutcome, InvestigationOutcomeCopy> = {
  success: {
    journalEntry: 'The lead yielded a decisive result.',
    completionMessage: undefined,
  },
  partial: {
    journalEntry: 'The investigation yielded only part of the truth.',
    completionMessage: undefined,
  },
  failure: {
    journalEntry: 'The lead went cold and the opportunity slipped away.',
    failureMessage: 'The investigation goes nowhere. The opportunity is lost.',
  },
}

const INVESTIGATION_QUEST_PROFILES: Record<string, InvestigationQuestProfile> = {
  [QUEST_IDS.RESTORED_APPEAL]: {
    startObjectiveLabel:
      'Map the archive routine, identify the sealing chain, and take the record without tripping the Court.',
    startJournalEntry:
      'The house starts charting copyists, porters, and seal clerks around the Court archive before the record is closed for good.',
    approaches: {
      bribe: {
        label: 'Copyists & Porters',
        description:
          'Lean on clerks, runners, and archive labor to learn who can touch the record without drawing the Court.',
        clueText:
          'A porter marks the shelf transfer window: the record leaves the sealed stack for twelve minutes before dusk.',
      },
      surveillance: {
        label: 'Watch the Archive Doors',
        description:
          'Track the sealing routine, guard swaps, and messenger traffic around the archive quarter.',
        clueText:
          'The sealing clerk always crosses the east corridor alone after the bell. That is the cleanest retrieval window you will get.',
      },
      records: {
        label: 'Seal Ledger Cross-Check',
        description:
          'Work the archive indexes, routing marks, and seal books to find where the document is moved before closure.',
        clueText:
          'A routing mark buried in the seal ledger ties the appeal record to a temporary intake room, not the deep archive vault.',
      },
    },
    outcomes: {
      success: {
        journalEntry: 'The appeal record was lifted intact before the seal took hold.',
        completionMessage:
          'The archive break stays quiet. The Restored get the full record and pay in clean coin.',
      },
      partial: {
        journalEntry: 'Only a fragment and clerk notes were recovered before the seal closed.',
        completionMessage:
          'The house gets something out of the archive, but not the full record. Only a partial payment is made.',
      },
      failure: {
        journalEntry: 'The seal closed before the house could touch the archive record.',
        failureMessage:
          'The Court closes the archive window first. The Restored are left without the record.',
      },
    },
    clues: [
      {
        clueId: 'restored-appeal-copyist-window',
        label: 'Copyist route exposes a brief shelf-transfer window before dusk.',
        branchId: 'bribe',
      },
      {
        clueId: 'restored-appeal-east-corridor',
        label: 'The east corridor opens a clean retrieval line during clerk relief.',
        branchId: 'surveillance',
      },
      {
        clueId: 'restored-appeal-intake-room',
        label: 'Seal ledgers place the appeal record in a temporary intake room, not the deep archive.',
        branchId: 'records',
      },
    ],
    outcomeEffects: {
      success: {
        aftermath: {
          worldConsequenceIds: ['restored-appeal-record-secured'],
          factionImpacts: [{ factionId: FACTION_IDS.GILDED_COURT, delta: -4 }],
          unlockNpcIds: [],
          narrativeSummary:
            'The Restored now hold a Court record that was meant to disappear behind seal wax and procedure.',
        },
      },
      partial: {
        aftermath: {
          worldConsequenceIds: ['restored-appeal-fragment-secured'],
          factionImpacts: [],
          unlockNpcIds: [],
          narrativeSummary:
            'Only fragments leave the archive, but even fragments can force the Court to answer uncomfortable questions.',
        },
      },
      failure: {
        aftermath: {
          worldConsequenceIds: ['restored-appeal-window-lost'],
          factionImpacts: [],
          unlockNpcIds: [],
          narrativeSummary:
            'The archive seals first. Procedure closes over the record before the house can touch it.',
        },
      },
    },
    outcomeHandling: {
      partial: {
        keepQuestActive: true,
        stageId: 'setback',
        objectiveLabel:
          'Fragments are not enough. Rebuild the archive route and go back before the record is sealed for good.',
        journalEntry:
          'The house got clerk notes and fragments out, but not the record itself. The archive window is narrowing fast.',
        activityLogMessage:
          'The Restored Ask a Favor remains open. The house has fragments, but the appeal record is still inside the Court archive.',
      },
      failure: {
        keepQuestActive: true,
        stageId: 'setback',
        objectiveLabel:
          'The archive window closed. Find a new route or pressure point before the record disappears behind seal and schedule.',
        journalEntry:
          'The first archive line failed. The Court seal moved faster than the house and the retrieval plan has to change.',
        activityLogMessage:
          'The Restored Ask a Favor does not collapse yet, but the Court closed the first retrieval window.',
      },
    },
  },
  [QUEST_IDS.HOLLOWS_LEDGER]: {
    startObjectiveLabel:
      'Read Soot Lane, reconstruct what happened to the last crew, and find a safe way to the ledger.',
    startJournalEntry:
      'The house begins with the dead house itself: neighbors, entry routes, and the shape of the crew that never walked back out.',
    approaches: {
      bribe: {
        label: 'Buy the Lane',
        description:
          'Pay drunks, neighbors, and scrap-haulers to talk about who went in, who came out, and who still watches the house.',
        clueText:
          'A charcoal seller swears one survivor crawled out the rear court at dawn. The ledger room is upstairs, but the front stairs are trapped.',
      },
      surveillance: {
        label: 'Watch Soot Lane',
        description:
          'Keep the abandoned house under observation and learn who still circles it after dark.',
        clueText:
          'Someone still checks the house every night from the alley wall. The ledger was not abandoned, only left in a place nobody wants to enter first.',
      },
      records: {
        label: 'Dead Tenancy Papers',
        description:
          'Work old tenancy books, ward rolls, and claim records to reconstruct the house and the people tied to it.',
        clueText:
          'The tenancy papers reveal a sealed counting room and a service stair the last retrieval crew probably never knew about.',
      },
    },
    outcomes: {
      success: {
        journalEntry: 'The house entered by the service stair, found the ledger, and got back out alive.',
        completionMessage:
          'The ledger comes out of Soot Lane in one piece. The patron pays because the house did what the last crew could not.',
      },
      partial: {
        journalEntry: 'Loose pages and witness marks were recovered, but not the full ledger.',
        completionMessage:
          'The house salvages fragments from Soot Lane, enough to collect something but not the whole prize.',
      },
      failure: {
        journalEntry: 'Soot Lane consumed the lead. The house never found a safe path to the ledger.',
        failureMessage:
          'The dead house keeps its secrets. The ledger remains where the last crew left it.',
      },
    },
    clues: [
      {
        clueId: 'hollows-ledger-rear-court',
        label: 'A rear-court survivor route bypasses the trapped main stair.',
        branchId: 'bribe',
      },
      {
        clueId: 'hollows-ledger-night-watcher',
        label: 'Someone still checks the house at night, which means the ledger still matters to somebody.',
        branchId: 'surveillance',
      },
      {
        clueId: 'hollows-ledger-service-stair',
        label: 'Old tenancy papers reveal a sealed counting room and a hidden service stair.',
        branchId: 'records',
      },
    ],
    outcomeEffects: {
      success: {
        aftermath: {
          worldConsequenceIds: ['soot-lane-ledger-recovered'],
          factionImpacts: [],
          unlockNpcIds: [],
          narrativeSummary:
            'The house gets in and out of Soot Lane with proof the last retrieval crew never had time to carry home.',
        },
        grantItemIds: ['item-chit-ledger-removal'],
      },
      partial: {
        aftermath: {
          worldConsequenceIds: ['soot-lane-ledger-fragments'],
          factionImpacts: [],
          unlockNpcIds: [],
          narrativeSummary:
            'Loose pages and witness traces come out of the dead house, but the whole ledger remains beyond reach.',
        },
      },
      failure: {
        aftermath: {
          worldConsequenceIds: ['soot-lane-ledger-lost'],
          factionImpacts: [],
          unlockNpcIds: [],
          narrativeSummary:
            'Soot Lane stays hungry. The house finds no path to the ledger that does not end the way the last crew did.',
        },
      },
    },
    outcomeHandling: {
      partial: {
        keepQuestActive: true,
        stageId: 'setback',
        objectiveLabel:
          'You have fragments, not the ledger. Rework the route and go back in before the trail dies.',
        journalEntry:
          'The house came back from Soot Lane with scraps and witness traces, but the ledger itself stayed inside.',
        activityLogMessage:
          'The House on Soot Lane remains open. Fragments were recovered, but the ledger is still in the dead house.',
      },
      failure: {
        keepQuestActive: true,
        stageId: 'setback',
        objectiveLabel:
          'Soot Lane shut the route down. The house needs a safer entry before trying for the ledger again.',
        journalEntry:
          'The first route into Soot Lane failed. The house now knows one way that does not work and must find another.',
        activityLogMessage:
          'The House on Soot Lane does not close, but the latest attempt failed. The ledger remains beyond reach.',
      },
    },
  },
  [QUEST_IDS.SLAVER_HOUSE_DISPUTE]: {
    startObjectiveLabel:
      'Read both houses, find the pressure point in the shared contract, and force a settlement before the table breaks.',
    startJournalEntry:
      'The house starts by sounding out both sides of the bond dispute, looking for terms that can still be enforced without public insult.',
    approaches: {
      bribe: {
        label: 'Private Concessions',
        description:
          'Work stewards, bond clerks, and clients around the table to learn what each house will quietly yield.',
        clueText:
          'One house can absorb the losses if the transport clause is rewritten. The other only needs the insult removed from the paper.',
      },
      surveillance: {
        label: 'Read the Table',
        description:
          'Watch who meets whom, who arrives armed, and which house is bluffing about escalation.',
        clueText:
          'The harder house is posturing. Their escort leaves first, and their steward keeps asking whether witnesses are present.',
      },
      records: {
        label: 'Contract Reconciliation',
        description:
          'Pull prior drafts, debt schedules, and bond ledgers to find the clause that can anchor a neutral settlement.',
        clueText:
          'The copied contract shows the dispute turns on one substituted fee line. Fix that and the whole arrangement can still stand.',
      },
    },
    outcomes: {
      success: {
        journalEntry: 'The contract was stabilized and neither house left the table with clean cause for retaliation.',
        completionMessage:
          'The two houses accept a settlement they can both survive. Payment is made for keeping the feud off the street.',
      },
      partial: {
        journalEntry: 'A stopgap was forced into place, but neither side left satisfied.',
        completionMessage:
          'The dispute is contained for now, but only barely. The house is paid enough to mark the work done.',
      },
      failure: {
        journalEntry: 'The table broke. Both houses returned to open pressure instead of settlement.',
        failureMessage:
          'The mediation collapses and the contract houses go back to raw leverage.',
      },
    },
    clues: [
      {
        clueId: 'slaver-dispute-private-concessions',
        label: 'One house wants money; the other wants the public insult erased from the paper.',
        branchId: 'bribe',
      },
      {
        clueId: 'slaver-dispute-table-bluff',
        label: 'The louder house is bluffing and fears witnesses more than losses.',
        branchId: 'surveillance',
      },
      {
        clueId: 'slaver-dispute-fee-line',
        label: 'A substituted fee line is the real hinge of the contract dispute.',
        branchId: 'records',
      },
    ],
    outcomeEffects: {
      success: {
        aftermath: {
          worldConsequenceIds: ['bond-houses-settlement-held'],
          factionImpacts: [],
          unlockNpcIds: [],
          narrativeSummary:
            'The two houses leave the table with a settlement neither likes, which is why it holds.',
        },
      },
      partial: {
        aftermath: {
          worldConsequenceIds: ['bond-houses-truce-thin'],
          factionImpacts: [],
          unlockNpcIds: [],
          narrativeSummary:
            'The dispute is contained for now, but everyone at the table understands it can reopen with one bad week.',
        },
      },
      failure: {
        aftermath: {
          worldConsequenceIds: ['bond-houses-feud-open'],
          factionImpacts: [],
          unlockNpcIds: [],
          narrativeSummary:
            'Neutral terms fail. What was a contract dispute goes back to naked pressure between houses.',
        },
      },
    },
  },
  [QUEST_IDS.ORREN_WEX_RESCUE]: {
    startObjectiveLabel:
      "Confirm Orren's custody, study the holding room, and prepare a clean breakout.",
    startJournalEntry:
      "The house begins working Orren's custody site, looking for the holding room and a clean extraction window.",
    approaches: {
      bribe: {
        label: 'Buy the Door',
        description:
          'Lean on porters, lock-runners, and Compact-adjacent staff until someone admits how the custody site really works.',
        clueText:
          'A paid dock porter confirms the back entrance is used for food and coal. No one checks faces there if the cart keeps moving.',
      },
      surveillance: {
        label: 'Guard Rotation Watch',
        description:
          'Track the watchers, the refuse route, and the narrow moments when the holding room sits exposed.',
        clueText:
          'The rear door stands unobserved for less than a minute during relief. It is enough time if the house moves cleanly.',
      },
      records: {
        label: 'Custody Ledger',
        description:
          'Search shift books, debt dockets, and warehouse entries to locate the unofficial room and the people covering it.',
        clueText:
          "A falsified storage ledger marks Orren's room as spoilage space. The lie also lists the exact shift handoff that leaves him unattended.",
      },
    },
    outcomes: {
      success: {
        journalEntry: 'Orren was pulled out before the Compact could harden the site or move him deeper into custody.',
        completionMessage:
          "Orren comes out alive, and with him a way to reopen the house's debt story on your terms.",
      },
      partial: {
        journalEntry: 'The house learned the route and routine, but not enough to pull Orren clear this time.',
        completionMessage:
          "The house gets only a fragment of Orren's trail. It is useful, but not enough to break custody cleanly.",
      },
      failure: {
        journalEntry: 'The custody site locked down before the house could reach Orren.',
        failureMessage:
          'Compact custody closes around Orren before the breakout can begin.',
      },
    },
    clues: [
      {
        clueId: 'orren-back-door',
        label: 'The coal and food entrance can be crossed if the cart keeps moving.',
        branchId: 'bribe',
      },
      {
        clueId: 'orren-relief-gap',
        label: 'Guard relief leaves the rear door unwatched for less than a minute.',
        branchId: 'surveillance',
      },
      {
        clueId: 'orren-false-storage-ledger',
        label: 'The false storage ledger identifies the exact handoff that leaves Orren unattended.',
        branchId: 'records',
      },
    ],
    participants: [{ npcId: NPC_IDS.ORREN_WEX, role: 'target', status: 'captured' }],
    outcomeEffects: {
      success: {
        aftermath: {
          worldConsequenceIds: ['orren-wex-freed'],
          factionImpacts: [{ factionId: FACTION_IDS.CIVIC_COMPACT, delta: -3 }],
          unlockNpcIds: [],
          narrativeSummary:
            'Orren leaves custody carrying both his own life and the house debt story back into the open.',
        },
      },
      partial: {
        aftermath: {
          worldConsequenceIds: ['orren-wex-custody-studied'],
          factionImpacts: [],
          unlockNpcIds: [],
          narrativeSummary:
            'The house learns the shape of Orren’s captivity, but not enough to break it outright this time.',
        },
      },
    },
    outcomeHandling: {
      partial: {
        keepQuestActive: true,
        stageId: 'setback',
        objectiveLabel:
          'The route is clearer, but Orren is still inside. Regroup and try another way before custody shifts.',
        journalEntry:
          'The house mapped Orren’s custody more cleanly, but the breakout window closed before he could be pulled clear.',
        activityLogMessage:
          'Old Ledgers remains open. The house learned the custody route, but Orren is still in Compact hands.',
      },
      failure: {
        keepQuestActive: true,
        stageId: 'setback',
        objectiveLabel:
          'Compact custody tightened. Orren is still inside and the house needs a new angle before trying again.',
        journalEntry:
          'The attempt exposed too little or too late. Orren remains in custody and the house must rework the breakout.',
        activityLogMessage:
          'Old Ledgers does not collapse, but the breakout fails. Orren remains in custody while the house regroups.',
      },
    },
  },
  [QUEST_IDS.LEDGER_BURNED]: {
    startObjectiveLabel:
      'Work the ash trail, identify who ordered the burn, and return with a name the Court can use.',
    startJournalEntry:
      'The house starts with what survived the fire: carriers, ash runners, and whoever benefited from the ledger disappearing first.',
    approaches: {
      bribe: {
        label: 'Pay for Names',
        description:
          'Use tavern talk, carriers, and paid whispers to uncover who arranged the fire before the rumor hardens.',
        clueText:
          'Two paid whispers point to the same intermediary: someone bought lamp oil, silence, and a witness with the same purse.',
      },
      surveillance: {
        label: 'Shadow the Survivors',
        description:
          'Watch the surviving contacts and anyone suddenly afraid of being connected to the burn.',
        clueText:
          'One surviving runner still reports to a handler in the Pale. Follow that route and the blame chain starts to close.',
      },
      records: {
        label: 'Ash and Accounts',
        description:
          'Cross-check transport notes, debt ledgers, and fire reports for the hand that profited from the ledger vanishing.',
        clueText:
          'The fire report and the debt postings line up too neatly. Someone needed the ledger gone before a specific account review.',
      },
    },
    outcomes: {
      success: {
        journalEntry: 'The house builds a usable accusation from the ash and surviving paper trail.',
        completionMessage:
          'The Court gets a name it can move on, and pays because the blame now points somewhere useful.',
      },
      partial: {
        journalEntry: 'A likely hand is identified, but the proof remains thin.',
        completionMessage:
          'The house returns with a plausible name, though not enough to bind the accusation cleanly.',
      },
      failure: {
        journalEntry: 'The burn was cleaner than expected. No reliable chain back to the order survived.',
        failureMessage:
          'The ash tells too little. No usable name can be brought back to the Court.',
      },
    },
    clues: [
      {
        clueId: 'ledger-burned-paid-whispers',
        label: 'The same purse paid for lamp oil, silence, and a witness to lie low.',
        branchId: 'bribe',
      },
      {
        clueId: 'ledger-burned-survivor-route',
        label: 'A surviving runner still reports to someone higher in the Pale.',
        branchId: 'surveillance',
      },
      {
        clueId: 'ledger-burned-account-review',
        label: 'The burn happened just ahead of a specific account review, not by chance.',
        branchId: 'records',
      },
    ],
    outcomeEffects: {
      success: {
        aftermath: {
          worldConsequenceIds: ['ledger-burned-name-secured'],
          factionImpacts: [],
          unlockNpcIds: [],
          narrativeSummary:
            'The Court gets a usable name out of the ash, which is all it wanted from the failure.',
        },
      },
      partial: {
        aftermath: {
          worldConsequenceIds: ['ledger-burned-name-thin'],
          factionImpacts: [],
          unlockNpcIds: [],
          narrativeSummary:
            'The accusation can be made, but not cleanly. The ash points, it does not prove.',
        },
      },
      failure: {
        aftermath: {
          worldConsequenceIds: ['ledger-burned-no-name'],
          factionImpacts: [],
          unlockNpcIds: [],
          narrativeSummary:
            'The fire took too much with it. No chain back to the order survives intact.',
        },
      },
    },
  },
}

export function getInvestigationApproachesForQuest(
  questId: string | null | undefined,
): readonly InvestigationApproach[] {
  const profile = questId ? INVESTIGATION_QUEST_PROFILES[questId] : undefined
  if (!profile?.approaches) return INVESTIGATION_APPROACHES

  return INVESTIGATION_APPROACHES.map((approach) => ({
    ...approach,
    ...profile.approaches?.[approach.id],
  }))
}

export function getInvestigationApproachForQuest(
  questId: string | null | undefined,
  approachId: string,
): InvestigationApproach | undefined {
  return getInvestigationApproachesForQuest(questId).find((approach) => approach.id === approachId)
}

export function getInvestigationStartCopy(questId: string | null | undefined) {
  const profile = questId ? INVESTIGATION_QUEST_PROFILES[questId] : undefined

  return {
    objectiveLabel: profile?.startObjectiveLabel ?? DEFAULT_START_OBJECTIVE_LABEL,
    journalEntry: profile?.startJournalEntry ?? DEFAULT_START_JOURNAL_ENTRY,
  }
}

export function getInvestigationOutcomeCopy(
  questId: string | null | undefined,
  outcome: InvestigationOutcome,
): InvestigationOutcomeCopy {
  const profile = questId ? INVESTIGATION_QUEST_PROFILES[questId] : undefined
  return {
    ...DEFAULT_OUTCOME_COPY[outcome],
    ...profile?.outcomes?.[outcome],
  }
}

function pushSystemLog(state: GameState, message: string, key: string) {
  state.activityLog.unshift({
    id: `log-${state.day}-${state.timeSlot}-${key}`,
    day: state.day,
    timeSlot: state.timeSlot,
    category: 'system',
    message,
  })
  if (state.activityLog.length >= MAX_ACTIVITY_ENTRIES) {
    state.activityLog.pop()
  }
}

export function applyInvestigationQuestSetup(runtime: QuestRuntime, questId: string) {
  const profile = INVESTIGATION_QUEST_PROFILES[questId]
  if (!profile) return

  if (runtime.clues.length === 0 && profile.clues) {
    runtime.clues = profile.clues.map((clue) => ({
      clueId: clue.clueId,
      label: clue.label,
      discovered: false,
      discoveredOnDay: null,
      usedInBranchId: clue.branchId,
    }))
  }

  if (profile.participants) {
    const existingNpcIds = new Set(runtime.participants.map((participant) => participant.npcId))
    for (const participant of profile.participants) {
      if (!existingNpcIds.has(participant.npcId)) {
        runtime.participants.push(participant)
      }
    }
  }
}

export function applyInvestigationApproachQuestState(
  runtime: QuestRuntime,
  questId: string,
  approachId: string,
  day: number,
) {
  const profile = INVESTIGATION_QUEST_PROFILES[questId]
  runtime.context.selectedBranchId = approachId
  if (!profile?.clues) return

  const matchingClue = profile.clues.find((clue) => clue.branchId === approachId)
  if (!matchingClue) return

  const runtimeClue = runtime.clues.find((clue) => clue.clueId === matchingClue.clueId)
  if (!runtimeClue || runtimeClue.discovered) return

  runtimeClue.discovered = true
  runtimeClue.discoveredOnDay = day
  runtime.journalEntries = [...runtime.journalEntries, `Clue uncovered: ${runtimeClue.label}`]
}

function grantInvestigationItem(state: GameState, itemId: string, questId: string) {
  const itemDef = contentCatalog.itemsById.get(itemId)
  if (!itemDef) return

  const existingOwned = state.ownedItems.find(
    (entry) => entry.itemId === itemId && entry.location === 'inventory',
  )
  if (existingOwned) {
    existingOwned.quantity += 1
  } else {
    state.ownedItems.push({
      instanceId: `inst-${itemId}-${state.day}-${questId}`,
      itemId,
      location: 'inventory',
      quantity: 1,
    })
  }

  pushSystemLog(
    state,
    `${itemDef.name} was secured during the investigation and added to inventory.`,
    `investigation-item-${itemId}`,
  )
}

export function applyInvestigationOutcomeQuestState(
  state: GameState,
  runtime: QuestRuntime,
  questId: string,
  outcome: InvestigationOutcome,
) {
  const profile = INVESTIGATION_QUEST_PROFILES[questId]
  const effects = profile?.outcomeEffects?.[outcome]
  if (!effects) return

  if (effects.aftermath) {
    runtime.aftermath = effects.aftermath
  }

  for (const itemId of effects.grantItemIds ?? []) {
    grantInvestigationItem(state, itemId, questId)
  }
}

export function getInvestigationOutcomeHandling(
  questId: string | null | undefined,
  outcome: InvestigationOutcome,
): InvestigationOutcomeHandling | null {
  const profile = questId ? INVESTIGATION_QUEST_PROFILES[questId] : undefined
  return profile?.outcomeHandling?.[outcome] ?? null
}
