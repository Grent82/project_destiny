/** Canonical IDs for world NPCs in data/definitions/npcs.json. */
export const NPC_IDS = {
  ALDRIC_VANE: 'npc-aldric-vane',
  ALIS_VEY: 'npc-alis-vey',
  BREN_ALDOTH: 'npc-bren-aldoth',
  CRESS_ALDMOOR: 'npc-cress-aldmoor',
  DARA_SLINK: 'npc-dara-slink',
  ENEMY_HARLEN_VOSS: 'npc-enemy-harlen-voss',
  ENEMY_THE_DOCKMASTER: 'npc-enemy-the-dockmaster',
  GARET_DOYLE: 'npc-garet-doyle',
  IDA_RHYS: 'npc-ida-rhys',
  LIRA_ASHCROFT: 'npc-lira-ashcroft',
  LIRIEN_ASHCROFT: 'npc-lirien-ashcroft',
  MARET_SUNNE: 'npc-maret-sunne',
  MARION_VALE: 'npc-marion-vale',
  MIRA: 'npc-mira',
  ORREN_WEX: 'npc-orren-wex',
  ORVEN_PELL: 'npc-orven-pell',
  SABLE_WRENT: 'npc-sable-wrent',
  SISTER_VAEL: 'npc-sister-vael',
  TESSALY_ASH: 'npc-tessaly-ash',
  TORVALD_MESSE: 'npc-torvald-messe',
  VEREK_HOLST: 'npc-verek-holst',
} as const

export type NpcId = typeof NPC_IDS[keyof typeof NPC_IDS]
