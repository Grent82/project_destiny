import type { QuestTemplate } from '../../domain/quests/contracts'
import { contentCatalog } from './contentCatalog'

export type QuestPresentation = {
  categoryLabel: string
  issuerLabel: string
  originLabel: string
  whyNow: string
  employerIntent: string
}

const QUEST_PRESENTATION: Record<string, Omit<QuestPresentation, 'issuerLabel'>> = {
  'quest-harborwatch': {
    categoryLabel: 'Licensed contract',
    originLabel: 'Posted at Harbor Guild Hall in Harbor Ward',
    whyNow: 'Three wardens were hurt last week and the checkpoint shakedown is escalating into a political embarrassment.',
    employerIntent: 'Quietly break the extortion ring and restore the gate without forcing the Compact to file it publicly.',
  },
  'quest-ledger-recovery': {
    categoryLabel: 'Court petition',
    originLabel: 'Carried through Pale counting-house channels',
    whyNow: 'The missing ledger can still be contained, but only if it is found before rival hands realise what sits inside it.',
    employerIntent: 'Recover the sealed book before its contents become leverage against the Court.',
  },
  'quest-foundry-escort': {
    categoryLabel: 'Guild escort',
    originLabel: 'Brokered through Foundry League Hall',
    whyNow: 'Three prior escort attempts failed and the schematics still have to move tonight.',
    employerIntent: 'Put armed bodies around the engineer and get the prototype plans through the route intact.',
  },
  'quest-ring-debt': {
    categoryLabel: 'Quiet inquiry',
    originLabel: 'Whispered through Hollows contacts',
    whyNow: 'Whoever is collecting under a dead name is still moving money right now; if you wait, the trail hardens.',
    employerIntent: 'Find the impostor before the Ring decides the fraud is worth punishing more broadly.',
  },
  'quest-restored-appeal': {
    categoryLabel: 'Political favor',
    originLabel: 'Passed by Restored shelter couriers',
    whyNow: 'The archive record is about to be sealed and the window for a clean retrieval is nearly gone.',
    employerIntent: 'Get the document out without violence so the Restored can use it in their own appeal.',
  },
  'quest-warrens-extraction': {
    categoryLabel: 'Off-book recovery',
    originLabel: 'Handed off through Warrens intermediaries',
    whyNow: 'The runaway has had three days to disappear; once another house shelters them, the job changes shape entirely.',
    employerIntent: 'Put hands on the missing servant fast and return them before the employer has to make this public.',
  },
  'quest-ring-debt-collection': {
    categoryLabel: 'Debt enforcement',
    originLabel: 'Taken from a Tallow Ring collector',
    whyNow: 'Brennik already decided not to pay; waiting makes the Ring look weak and invites other debtors to test them.',
    employerIntent: 'Apply enough pressure that the debt is remembered without burning down an asset the Ring still wants.',
  },
  'quest-nightbloom-extract': {
    categoryLabel: 'Grey-market request',
    originLabel: 'Circulated in the Hollows black trade',
    whyNow: 'The buyer wants nightbloom immediately and is paying for speed, silence, and the right contacts.',
    employerIntent: 'Source the extract discreetly and hand it over without creating a paper trail.',
  },
  'quest-pale-wagon-escort': {
    categoryLabel: 'Merchant run',
    originLabel: 'Booked through Pale merchants',
    whyNow: 'Three prior crossings failed, so the cargo moves again only because somebody is desperate enough to keep paying.',
    employerIntent: 'Get the wagon through the Pale in one piece and do not ask what is under the canvas.',
  },
  'quest-foundry-sabotage': {
    categoryLabel: 'Competitive sabotage',
    originLabel: 'Delivered by a rival industrial broker',
    whyNow: 'The forge is producing too well right now and a competitor wants its output disrupted before contracts settle.',
    employerIntent: 'Cripple throughput without leaving evidence that points back to the patron.',
  },
  'quest-hollows-ledger': {
    categoryLabel: 'Salvage lead',
    originLabel: 'Passed from the last failed retrieval chain',
    whyNow: 'The ledger is still in the abandoned house and nobody has yet made a safer plan than "send another crew."',
    employerIntent: 'Reach the house, find the ledger, and avoid joining the last team that vanished there.',
  },
  'quest-slaver-house-dispute': {
    categoryLabel: 'Neutral arbitration',
    originLabel: 'Referred through Pale contract houses',
    whyNow: 'The dispute is getting expensive enough that both houses now prefer an outsider to an open feud.',
    employerIntent: 'Stabilise the arrangement without giving either house obvious cause to retaliate.',
  },
  'quest-compact-watch': {
    categoryLabel: 'Surveillance brief',
    originLabel: 'Shared through anti-Compact contacts in the Pale',
    whyNow: 'Assessor Vorn is on the move this week and whoever hired you needs his route before the books are cleaned.',
    employerIntent: 'Shadow Vorn, document what he is taking, and stay invisible while doing it.',
  },
  'quest-gilded-auction-guard': {
    categoryLabel: 'Visible presence',
    originLabel: 'Issued by the Fold auction office',
    whyNow: 'The event is scheduled now; they need bodies at the door, not investigation later.',
    employerIntent: 'Be unmistakably dangerous on sight so the auction proceeds without disruption.',
  },
  'quest-ironworks-cleanup': {
    categoryLabel: 'Cleanup contract',
    originLabel: 'Routed through an Ironworks warehouse fixer',
    whyNow: 'Morning inspection is coming and whatever happened in the warehouse still looks fresh enough to ruin someone important.',
    employerIntent: 'Remove evidence fast enough that the inspection finds only an ordinary empty building.',
  },
  'quest-mira-rescue': {
    categoryLabel: 'House obligation',
    originLabel: 'Tessaly Ash brought this lead out of The Ash in the Pale',
    whyNow: 'Mira is alive, but only for now. Waiting turns a rescue into a recovery or something worse.',
    employerIntent: 'Get Mira out before the Court turns her into leverage the house cannot survive.',
  },
  'quest-orren-wex-rescue': {
    categoryLabel: 'House obligation',
    originLabel: 'Brought to the house by Marion Vale',
    whyNow: 'Orren is still in custody and still knows exactly how the debt was manipulated. That window will close.',
    employerIntent: 'Reach Orren before the Compact or Court uses him to lock the debt permanently around the house.',
  },
}

function fallbackIssuerLabel(template: QuestTemplate) {
  if (template.sourceNpcId) {
    return contentCatalog.npcsById.get(template.sourceNpcId)?.name ?? template.sourceNpcId
  }

  if (template.employerFactionId) {
    return contentCatalog.factionsById.get(template.employerFactionId)?.name ?? template.employerFactionId
  }

  return template.questType === 'story' ? 'House Valdric' : 'Unnamed patron'
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

export function getQuestPresentation(template: QuestTemplate): QuestPresentation {
  const metadata = QUEST_PRESENTATION[template.id]

  return {
    categoryLabel: metadata?.categoryLabel ?? fallbackCategoryLabel(template),
    issuerLabel: fallbackIssuerLabel(template),
    originLabel: metadata?.originLabel ?? fallbackOriginLabel(template),
    whyNow: metadata?.whyNow ?? template.briefing,
    employerIntent: metadata?.employerIntent ?? template.briefing,
  }
}
