/** Canonical IDs for NPC titles in data/definitions/titles.json. */
export const TITLE_IDS = {
  ARCHIVIST: 'title-archivist',
  CHIEF_ENGINEER: 'title-chief-engineer',
  ENFORCER: 'title-enforcer',
  FENCE: 'title-fence',
  MEDIC: 'title-medic',
  NEGOTIATOR: 'title-negotiator',
  QUARTERMASTER: 'title-quartermaster',
  SCOUT: 'title-scout',
  STEWARD: 'title-steward',
  TRAINER: 'title-trainer',
  WARDEN: 'title-warden',
} as const

export type TitleId = typeof TITLE_IDS[keyof typeof TITLE_IDS]
