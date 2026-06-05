/** Canonical IDs for authored quests in data/definitions/quests.json. */
export const QUEST_IDS = {
  COMPACT_WATCH: 'quest-compact-watch',
  FOUNDRY_ESCORT: 'quest-foundry-escort',
  HARBORWATCH: 'quest-harborwatch',
  HOLLOWS_LEDGER: 'quest-hollows-ledger',
  LEDGER_BURNED: 'quest-ledger-burned',
  LEDGER_RECOVERY: 'quest-ledger-recovery',
  MIRA_RESCUE: 'quest-mira-rescue',
  NIGHTBLOOM_EXTRACT: 'quest-nightbloom-extract',
  ORREN_WEX_RESCUE: 'quest-orren-wex-rescue',
  PALE_WAGON_ESCORT: 'quest-pale-wagon-escort',
  RESTORED_APPEAL: 'quest-restored-appeal',
  RING_DEBT: 'quest-ring-debt',
  RIVAL_ASHEN_COMPACT_COUNTER: 'quest-rival-ashen-compact-counter',
  RIVAL_GILDED_HAND_COUNTER: 'quest-rival-gilded-hand-counter',
  RIVAL_IRON_COVENANT_COUNTER: 'quest-rival-iron-covenant-counter',
  RIVAL_IRON_COVENANT_COUNTER_LEAD_5: 'quest-rival-iron-covenant-counter-lead-5',
  RIVAL_PALE_SISTERS_COUNTER: 'quest-rival-pale-sisters-counter',
  SLAVER_HOUSE_DISPUTE: 'quest-slaver-house-dispute',
} as const

export type QuestId = typeof QUEST_IDS[keyof typeof QUEST_IDS]
