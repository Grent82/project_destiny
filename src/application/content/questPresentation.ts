import type { QuestTemplate } from '../../domain/quests/contracts'
import { contentCatalog } from './contentCatalog'

export type QuestPresentationActorRef =
  | { kind: 'npc'; id: string }
  | { kind: 'faction'; id: string }
  | { kind: 'district'; id: string }
  | { kind: 'offscreen'; label: string }

export type QuestPresentation = {
  categoryLabel: string
  issuerLabel: string
  issuerActors: QuestPresentationActorRef[]
  payerLabel: string
  payerActors: QuestPresentationActorRef[]
  originLabel: string
  stakeholderLabel: string
  stakeholderActors: QuestPresentationActorRef[]
  whyNow: string
  employerIntent: string
  likelyConsequence: string
}

type QuestPresentationMetadata = Pick<
  QuestPresentation,
  'categoryLabel' | 'originLabel' | 'whyNow' | 'employerIntent'
> &
  Partial<
    Pick<
      QuestPresentation,
      | 'payerLabel'
      | 'payerActors'
      | 'stakeholderLabel'
      | 'stakeholderActors'
      | 'likelyConsequence'
    >
  >

const QUEST_PRESENTATION: Record<string, QuestPresentationMetadata> = {
  'quest-harborwatch': {
    categoryLabel: 'Licensed contract',
    payerLabel: 'Civic Compact quartermasters release the fee only if the checkpoint is cleaned up quietly.',
    originLabel: 'Posted at Harbor Guild Hall in Harbor Ward',
    stakeholderLabel: 'Harbor gate wardens and dockside traffic trapped inside the shakedown.',
    stakeholderActors: [
      { kind: 'faction', id: 'faction-civic-compact' },
      { kind: 'district', id: 'district-the-warrens' },
      { kind: 'offscreen', label: 'Harbor gate wardens and dockside traffic' },
    ],
    whyNow: 'Three wardens were hurt last week and the checkpoint shakedown is escalating into a political embarrassment.',
    employerIntent: 'Quietly break the extortion ring and restore the gate without forcing the Compact to file it publicly.',
    likelyConsequence: 'Civic Compact standing +8; Unrest -5.',
  },
  'quest-ledger-recovery': {
    categoryLabel: 'Court petition',
    originLabel: 'Carried through Pale counting-house channels',
    stakeholderLabel: 'Court record-keepers trying to keep the ledger from becoming faction leverage.',
    whyNow: 'The missing ledger can still be contained, but only if it is found before rival hands realise what sits inside it.',
    employerIntent: 'Recover the sealed book before its contents become leverage against the Court.',
    likelyConsequence: 'Court standing rises if the ledger returns before its contents spread.',
  },
  'quest-foundry-escort': {
    categoryLabel: 'Guild escort',
    originLabel: 'Brokered through Foundry League Hall',
    stakeholderLabel: 'Foundry League engineers whose prototype line folds if this route fails again.',
    whyNow: 'Three prior escort attempts failed and the schematics still have to move tonight.',
    employerIntent: 'Put armed bodies around the engineer and get the prototype plans through the route intact.',
    likelyConsequence: 'League standing rises if the schematics move; city prosperity follows the prototype staying alive.',
  },
  'quest-ring-debt': {
    categoryLabel: 'Quiet inquiry',
    originLabel: 'Whispered through Hollows contacts',
    stakeholderLabel: 'Ring collectors and debtors who will both notice who names the impostor first.',
    whyNow: 'Whoever is collecting under a dead name is still moving money right now; if you wait, the trail hardens.',
    employerIntent: 'Find the impostor before the Ring decides the fraud is worth punishing more broadly.',
    likelyConsequence: 'The Ring decides whether House Valdris looks useful or naive once the fraud is pinned down.',
  },
  'quest-restored-appeal': {
    categoryLabel: 'Political favor',
    originLabel: 'Passed by Restored shelter couriers',
    stakeholderLabel: 'The Restored petitioners whose appeal fails if the archive record disappears.',
    whyNow: 'The archive record is about to be sealed and the window for a clean retrieval is nearly gone.',
    employerIntent: 'Get the document out without violence so the Restored can use it in their own appeal.',
    likelyConsequence: 'Restored standing rises if the record survives; the appeal dies if the archive closes first.',
  },
  'quest-warrens-extraction': {
    categoryLabel: 'Off-book recovery',
    originLabel: 'Handed off through Warrens intermediaries',
    stakeholderLabel: 'The employer trying to reclaim a runaway before another house turns shelter into leverage.',
    whyNow: 'The runaway has had three days to disappear; once another house shelters them, the job changes shape entirely.',
    employerIntent: 'Put hands on the missing servant fast and return them before the employer has to make this public.',
    likelyConsequence: 'The paying house keeps its grip if you succeed; delay makes the disappearance a public weakness.',
  },
  'quest-ring-debt-collection': {
    categoryLabel: 'Debt enforcement',
    originLabel: 'Taken from a Tallow Ring collector',
    stakeholderLabel: 'Ring enforcers watching whether Brennik can defy collection without consequence.',
    whyNow: 'Brennik already decided not to pay; waiting makes the Ring look weak and invites other debtors to test them.',
    employerIntent: 'Apply enough pressure that the debt is remembered without burning down an asset the Ring still wants.',
    likelyConsequence: 'Ring standing rises if discipline is restored; a bad collection hardens unrest around their routes.',
  },
  'quest-nightbloom-extract': {
    categoryLabel: 'Grey-market request',
    originLabel: 'Circulated in the Hollows black trade',
    stakeholderLabel: 'Black-market buyers and suppliers who remember who can source contraband without noise.',
    whyNow: 'The buyer wants nightbloom immediately and is paying for speed, silence, and the right contacts.',
    employerIntent: 'Source the extract discreetly and hand it over without creating a paper trail.',
    likelyConsequence: 'Cash arrives quickly, but the real test is whether the handoff expands or damages underground trust.',
  },
  'quest-pale-wagon-escort': {
    categoryLabel: 'Merchant run',
    originLabel: 'Booked through Pale merchants',
    stakeholderLabel: 'Merchants gambling that one more guarded run is cheaper than admitting the route is lost.',
    whyNow: 'Three prior crossings failed, so the cargo moves again only because somebody is desperate enough to keep paying.',
    employerIntent: 'Get the wagon through the Pale in one piece and do not ask what is under the canvas.',
    likelyConsequence: 'Merchant credibility survives if the cargo lands; another failure signals the route belongs to predators now.',
  },
  'quest-foundry-sabotage': {
    categoryLabel: 'Competitive sabotage',
    originLabel: 'Delivered by a rival industrial broker',
    stakeholderLabel: 'A rival Foundry concern betting that slowed output matters more than public blame.',
    whyNow: 'The forge is producing too well right now and a competitor wants its output disrupted before contracts settle.',
    employerIntent: 'Cripple throughput without leaving evidence that points back to the patron.',
    likelyConsequence: 'League relations sour while corruption rises if the sabotage sticks cleanly.',
  },
  'quest-hollows-ledger': {
    categoryLabel: 'Salvage lead',
    originLabel: 'Passed from the last failed retrieval chain',
    stakeholderLabel: 'Everyone who wants the ledger, plus the last crew that never came back out of Soot Lane.',
    whyNow: 'The ledger is still in the abandoned house and nobody has yet made a safer plan than "send another crew."',
    employerIntent: 'Reach the house, find the ledger, and avoid joining the last team that vanished there.',
    likelyConsequence: 'Proof survives only if the ledger comes out intact; fragments help, but they do not settle the matter.',
  },
  'quest-slaver-house-dispute': {
    categoryLabel: 'Neutral arbitration',
    originLabel: 'Referred through Pale contract houses',
    stakeholderLabel: 'Both houses and the bound workers whose status becomes collateral if the dispute turns hot.',
    whyNow: 'The dispute is getting expensive enough that both houses now prefer an outsider to an open feud.',
    employerIntent: 'Stabilise the arrangement without giving either house obvious cause to retaliate.',
    likelyConsequence: 'Court standing shifts with the settlement, and any ugly ruling hardens the city around slave-contract politics.',
  },
  'quest-compact-watch': {
    categoryLabel: 'Surveillance brief',
    originLabel: 'Shared through anti-Compact contacts in the Pale',
    stakeholderLabel: 'Anti-Compact operators who need proof, plus Assessor Vorn if he notices he is being trailed.',
    whyNow: 'Assessor Vorn is on the move this week and whoever hired you needs his route before the books are cleaned.',
    employerIntent: 'Shadow Vorn, document what he is taking, and stay invisible while doing it.',
    likelyConsequence: 'Good surveillance yields proof and leverage; a blown tail warns the Compact before anyone can use the route.',
  },
  'quest-gilded-auction-guard': {
    categoryLabel: 'Visible presence',
    originLabel: 'Issued by the Fold auction office',
    stakeholderLabel: 'Auction bidders who need confidence that the room is controlled before money moves.',
    whyNow: 'The event is scheduled now; they need bodies at the door, not investigation later.',
    employerIntent: 'Be unmistakably dangerous on sight so the auction proceeds without disruption.',
    likelyConsequence: 'The Fold pays for calm; visible failure makes the room look weak to every buyer present.',
  },
  'quest-ironworks-cleanup': {
    categoryLabel: 'Cleanup contract',
    originLabel: 'Routed through an Ironworks warehouse fixer',
    stakeholderLabel: 'Warehouse owners trying to survive inspection without a trail leading back to them.',
    whyNow: 'Morning inspection is coming and whatever happened in the warehouse still looks fresh enough to ruin someone important.',
    employerIntent: 'Remove evidence fast enough that the inspection finds only an ordinary empty building.',
    likelyConsequence: 'Prosperity stays intact if the site passes inspection; loose evidence turns into leverage for someone else.',
  },
  'quest-mira-rescue': {
    categoryLabel: 'House obligation',
    originLabel: 'Tessaly Ash brought this lead out of The Ash in the Pale',
    stakeholderLabel: 'Mira, House Valdris, and anyone the Court can pressure through her captivity.',
    whyNow: 'Mira is alive, but only for now. Waiting turns a rescue into a recovery or something worse.',
    employerIntent: 'Get Mira out before the Court turns her into leverage the house cannot survive.',
    likelyConsequence: 'Rescuing Mira reshapes trust inside the house and cuts off a major piece of Court leverage.',
  },
  'quest-orren-wex-rescue': {
    categoryLabel: 'House obligation',
    originLabel: 'Brought to the house by Marion Vale',
    stakeholderLabel: 'Orren Wex and the house accounts that still prove how the debt was twisted.',
    whyNow: 'Orren is still in custody and still knows exactly how the debt was manipulated. That window will close.',
    employerIntent: 'Reach Orren before the Compact or Court uses him to lock the debt permanently around the house.',
    likelyConsequence: 'If Orren stays lost, the debt hardens into official truth; if he gets out, the house regains proof and loyalty.',
  },
  'quest-house-fall-reckoning': {
    categoryLabel: 'House obligation',
    originLabel: 'Brought to the house by Marion Vale',
    stakeholderLabel: 'The house itself, and whoever chose which ledgers to take the night it fell.',
    whyNow: 'The evidence is already in hand. Sitting on it changes nothing; deciding what to do with it is the first real choice of the fight.',
    employerIntent: 'Confirm the seizure was targeted, not random, and decide whether to act on what that implies.',
    likelyConsequence: 'This is the decision that starts everything else — the debt investigation, the search for Mira, and whatever the house becomes because of both.',
  },
  'quest-cael-cold-case': {
    categoryLabel: 'House obligation',
    originLabel: 'Brought to the house by Marion Vale',
    stakeholderLabel: 'Cael Valdris, whoever staged his death, and whoever ordered it.',
    whyNow: "Orren's proof reopened one closed door in the case files. This one has been waiting since before you knew there was a case.",
    employerIntent: "Prove Cael's death was made to look like an accident, and find out what he knew that made it necessary.",
    likelyConsequence: "The trail stops short of naming who gave the order, but it confirms the house's ruin was planned further and further back than anyone admitted.",
  },
  'quest-gilded-hand-contract': {
    categoryLabel: 'House obligation',
    originLabel: 'Tessaly Ash noticed the pattern first',
    stakeholderLabel: 'Whoever is paying professionals to guard a hostage the Court will not officially acknowledge holding.',
    whyNow: 'Knowing who actually guards the tannery changes what the rescue will require.',
    employerIntent: 'Confirm the Gilded Hand, not the Court itself, is running Mira\'s custody on contract.',
    likelyConsequence: 'A cleaner picture of the opposition before the rescue attempt, at the cost of the Hand knowing someone is asking questions.',
  },
  'quest-forged-note-origin': {
    categoryLabel: 'House obligation',
    originLabel: 'Dael Morw, a former Compact Register assessor',
    stakeholderLabel: 'Whoever in the Register still forges documents to order for the Gilded Court.',
    whyNow: 'The confrontation with whoever ordered the house destroyed will need more than suspicion to matter.',
    employerIntent: 'Trace the forged promissory note back to the clerk who made it, and the fixer who commissioned it.',
    likelyConsequence: 'Confirms the note was manufactured to order rather than merely exaggerated — evidence, not proof, but evidence that holds up.',
  },
  'quest-vorne-confrontation': {
    categoryLabel: 'House obligation',
    originLabel: 'Brought to the house by Marion Vale',
    stakeholderLabel: 'Cassia Vorne, the Court interrogator who built the case that ended House Valdris.',
    whyNow: 'Every piece of evidence the house has gathered points at one name. Waiting longer does not make the confrontation safer.',
    employerIntent: 'Force Cassia Vorne to answer for a case she considers closed, correct, and entirely legal.',
    likelyConsequence: 'No conviction follows — she operated within the law at every step — but the house makes clear it will not be an easy target again.',
  },
}

function fallbackIssuerLabel(template: QuestTemplate) {
  if (template.sourceNpcId) {
    return contentCatalog.npcsById.get(template.sourceNpcId)?.name ?? template.sourceNpcId
  }

  if (template.employerFactionId) {
    return contentCatalog.factionsById.get(template.employerFactionId)?.name ?? template.employerFactionId
  }

  return template.questType === 'story' ? 'House Valdris' : 'Unnamed patron'
}

function fallbackPayerLabel(template: QuestTemplate) {
  if (template.rewardMarks > 0) {
    if (template.employerFactionId) {
      return `${contentCatalog.factionsById.get(template.employerFactionId)?.name ?? template.employerFactionId} quartermasters release the fee on completion.`
    }
    if (template.sourceNpcId) {
      return `${contentCatalog.npcsById.get(template.sourceNpcId)?.name ?? template.sourceNpcId} is fronting the payment.`
    }
    if (template.questType === 'story') {
      return 'House Valdris is paying in obligations, not open coin.'
    }
    return 'The patron behind the lead is paying through cutouts.'
  }

  if (template.rewardDebtReduction > 0) {
    return `The real payment is ${template.rewardDebtReduction} Marks taken off the house debt.`
  }

  if (template.questType === 'story') {
    return 'The house pays in survival, leverage, or loyalty rather than posted coin.'
  }

  return 'Payment is indirect; reputation and access matter more than marks here.'
}

function fallbackIssuerActors(template: QuestTemplate): QuestPresentationActorRef[] {
  if (template.sourceNpcId) {
    return [{ kind: 'npc', id: template.sourceNpcId }]
  }

  if (template.employerFactionId) {
    return [{ kind: 'faction', id: template.employerFactionId }]
  }

  return template.questType === 'story'
    ? [{ kind: 'offscreen', label: 'House Valdris' }]
    : [{ kind: 'offscreen', label: 'Unnamed patron' }]
}

function fallbackPayerActors(template: QuestTemplate): QuestPresentationActorRef[] {
  if (template.rewardMarks > 0) {
    if (template.employerFactionId) {
      return [{ kind: 'faction', id: template.employerFactionId }]
    }
    if (template.sourceNpcId) {
      return [{ kind: 'npc', id: template.sourceNpcId }]
    }
    if (template.questType === 'story') {
      return [{ kind: 'offscreen', label: 'House Valdris obligations' }]
    }
    return [{ kind: 'offscreen', label: 'Hidden patron through intermediaries' }]
  }

  if (template.rewardDebtReduction > 0) {
    return [{ kind: 'offscreen', label: 'House debt ledger' }]
  }

  return template.questType === 'story'
    ? [{ kind: 'offscreen', label: 'House Valdris' }]
    : [{ kind: 'offscreen', label: 'Indirect patronage' }]
}

function fallbackCategoryLabel(template: QuestTemplate) {
  if (template.questType === 'story') return 'House obligation'
  if (template.objectiveType === 'investigation') return 'Investigation'
  if (template.objectiveType === 'combat') return 'Field contract'
  if (template.objectiveType === 'delivery') return 'Delivery job'
  return 'Survival contract'
}

function fallbackOriginLabel(template: QuestTemplate) {
  const districtLabel = template.discoveryDistrictId ?? template.districtId
  if (!districtLabel) {
    return 'Circulated through house contacts'
  }

  const districtName =
    contentCatalog.districtsById.get(districtLabel)?.name ?? districtLabel.replace('district-', '')

  return template.discoverySource
    ? `${template.discoverySource.replace('_', ' ')} lead out of ${districtName}`
    : `Lead circulating in ${districtName}`
}

function fallbackStakeholderLabel(template: QuestTemplate) {
  if (template.rewardRelationshipDeltas.length > 0) {
    const npcNames = template.rewardRelationshipDeltas.map((delta) =>
      contentCatalog.npcsById.get(delta.npcId)?.name ?? delta.npcId,
    )
    return `${npcNames.join(', ')} will remember how this job lands.`
  }

  if (template.unlocksNpcId) {
    const npcName = contentCatalog.npcsById.get(template.unlocksNpcId)?.name ?? template.unlocksNpcId
    return `${npcName} is directly tied to what this contract surfaces.`
  }

  if (template.employerFactionId && template.districtId) {
    const factionName = contentCatalog.factionsById.get(template.employerFactionId)?.name ?? template.employerFactionId
    const districtName = contentCatalog.districtsById.get(template.districtId)?.name ?? template.districtId
    return `${factionName} and people in ${districtName} will both feel the result.`
  }

  if (template.employerFactionId) {
    return `${contentCatalog.factionsById.get(template.employerFactionId)?.name ?? template.employerFactionId} is most exposed to the outcome.`
  }

  if (template.districtId) {
    return `${contentCatalog.districtsById.get(template.districtId)?.name ?? template.districtId} absorbs the immediate fallout.`
  }

  return template.questType === 'story'
    ? 'House Valdris absorbs the first shock of whatever follows.'
    : 'Whoever posted the lead keeps score even if their name stays off the paper.'
}

function fallbackStakeholderActors(template: QuestTemplate): QuestPresentationActorRef[] {
  if (template.rewardRelationshipDeltas.length > 0) {
    return template.rewardRelationshipDeltas.map((delta) => ({ kind: 'npc', id: delta.npcId }))
  }

  if (template.unlocksNpcId) {
    return [{ kind: 'npc', id: template.unlocksNpcId }]
  }

  if (template.employerFactionId && template.districtId) {
    return [
      { kind: 'faction', id: template.employerFactionId },
      { kind: 'district', id: template.districtId },
    ]
  }

  if (template.employerFactionId) {
    return [{ kind: 'faction', id: template.employerFactionId }]
  }

  if (template.districtId) {
    return [{ kind: 'district', id: template.districtId }]
  }

  return template.questType === 'story'
    ? [{ kind: 'offscreen', label: 'House Valdris and its dependents' }]
    : [{ kind: 'offscreen', label: 'Unspecified local stakeholders' }]
}

function describeRelationshipDelta(template: QuestTemplate) {
  const deltas = template.rewardRelationshipDeltas.flatMap((delta) => {
    const npcName = contentCatalog.npcsById.get(delta.npcId)?.name ?? delta.npcId
    const entries = [
      delta.trust != null ? `${npcName} trust ${delta.trust > 0 ? '+' : ''}${delta.trust}` : null,
      delta.affinity != null ? `${npcName} affinity ${delta.affinity > 0 ? '+' : ''}${delta.affinity}` : null,
      delta.respect != null ? `${npcName} respect ${delta.respect > 0 ? '+' : ''}${delta.respect}` : null,
      delta.fear != null ? `${npcName} fear ${delta.fear > 0 ? '+' : ''}${delta.fear}` : null,
      delta.loyalty != null ? `${npcName} loyalty ${delta.loyalty > 0 ? '+' : ''}${delta.loyalty}` : null,
    ]
    return entries.filter((entry): entry is string => entry != null)
  })

  return deltas
}

function fallbackLikelyConsequence(template: QuestTemplate) {
  const consequences: string[] = []

  if (template.rewardStandingFactionId && template.rewardStandingDelta !== 0) {
    const factionName =
      contentCatalog.factionsById.get(template.rewardStandingFactionId)?.name ?? template.rewardStandingFactionId
    consequences.push(`${factionName} standing ${template.rewardStandingDelta > 0 ? '+' : ''}${template.rewardStandingDelta}`)
  }

  if (template.rewardCityDialId && template.rewardCityDialDelta !== 0) {
    const cityDialLabel = template.rewardCityDialId[0].toUpperCase() + template.rewardCityDialId.slice(1)
    consequences.push(`${cityDialLabel} ${template.rewardCityDialDelta > 0 ? '+' : ''}${template.rewardCityDialDelta}`)
  }

  if (template.rewardDebtReduction > 0) {
    consequences.push(`Debt ${template.rewardDebtReduction > 0 ? '-' : ''}${template.rewardDebtReduction}`)
  }

  consequences.push(...describeRelationshipDelta(template))

  if (template.unlocksNpcId) {
    const npcName = contentCatalog.npcsById.get(template.unlocksNpcId)?.name ?? template.unlocksNpcId
    consequences.push(`May surface ${npcName}`)
  }

  if (consequences.length > 0) {
    return `${consequences.join('; ')}.`
  }

  return 'Cash is only part of the story; this lead mainly changes who owes, notices, or remembers the result.'
}

export function getQuestPresentation(template: QuestTemplate): QuestPresentation {
  const metadata = QUEST_PRESENTATION[template.id]
  const issuerLabel = fallbackIssuerLabel(template)

  return {
    categoryLabel: metadata?.categoryLabel ?? fallbackCategoryLabel(template),
    issuerLabel,
    issuerActors: fallbackIssuerActors(template),
    payerLabel: metadata?.payerLabel ?? fallbackPayerLabel(template),
    payerActors: metadata?.payerActors ?? fallbackPayerActors(template),
    originLabel: metadata?.originLabel ?? fallbackOriginLabel(template),
    stakeholderLabel: metadata?.stakeholderLabel ?? fallbackStakeholderLabel(template),
    stakeholderActors: metadata?.stakeholderActors ?? fallbackStakeholderActors(template),
    whyNow: metadata?.whyNow ?? template.briefing,
    employerIntent: metadata?.employerIntent ?? template.briefing,
    likelyConsequence: metadata?.likelyConsequence ?? fallbackLikelyConsequence(template),
  }
}
