export type HouseDiscoveryArtifact = {
  itemId: string
  label: string
}

export type HouseDiscovery = {
  marks: number
  message: string
  flavorFinds: string[]
  actionableFinds: HouseDiscoveryArtifact[]
  followUp: string | null
  mainQuestHint?: string
}

const BASE_DISCOVERIES: Record<string, HouseDiscovery> = {
  'room-entrance-hall': {
    marks: 0,
    message: 'Dust, boot-scuffs, and a broken wax seal show how the house was turned over after the seizure.',
    flavorFinds: [
      'A snapped house seal from the debt officers',
      'Drag marks leading deeper into the house',
    ],
    actionableFinds: [],
    followUp: null,
  },
  'room-quarters': {
    marks: 0,
    message: 'The room is plainly kept but not preserved as a shrine. A workable sleeping space was carved out of the ruin, with only practical things left in reach.',
    flavorFinds: [
      'Folded work clothes and a sharpened ledger quill',
      'Copied notices from the debt proceedings, neatly tied with twine',
    ],
    actionableFinds: [],
    followUp: 'The quarters read as practical, not ceremonial. Someone decided what needed to stay close at hand.',
  },
  'room-bureau': {
    marks: 22,
    message: 'A forgotten strongbox behind the panelling still holds old reserve coin and one surviving account note.',
    flavorFinds: [
      '22 Marks in pre-Breach reserve coin',
    ],
    actionableFinds: [
      {
        itemId: 'item-chit-ledger-removal',
        label: 'Removal chit proving two house ledgers were taken during the seizure',
      },
    ],
    followUp: 'Show the removal chit to Marion. It proves the books were selected before the house was stripped.',
  },
  'room-kitchen': {
    marks: 8,
    message: 'Behind the spice rack sits a survivor\'s cache: coin, dried stock, and proof that someone planned for a siege.',
    flavorFinds: [
      '8 Marks in kitchen emergency coin',
      'A wrapped bundle of salt and marrow stock fit for two hard meals',
    ],
    actionableFinds: [],
    followUp: null,
  },
  'room-study': {
    marks: 15,
    message: 'Between cracked folios you find a promissory note, margin codes in your father\'s hand, and a reference to "the arrangement below."',
    flavorFinds: [
      '15 Marks pressed flat in a folio binding',
    ],
    actionableFinds: [
      {
        itemId: 'item-note-arrangement-below',
        label: 'A margin note pointing to a hidden release beneath the house',
      },
    ],
    followUp: 'Pair this note with the removal chit. Together they point to a hidden vault release.',
  },
  'room-master-chamber': {
    marks: 30,
    message: 'Behind the wainscoting is a sealed envelope, a stranger\'s ring, and Mira\'s name written in a hand you trust too much.',
    flavorFinds: [
      '30 Marks wrapped inside an old signet pouch',
    ],
    actionableFinds: [
      {
        itemId: 'item-letter-mira-sealed',
        label: 'A sealed envelope addressed to Mira',
      },
      {
        itemId: 'item-ring-unfamiliar-crest',
        label: 'A ring bearing an unfamiliar crest',
      },
    ],
    followUp: 'The envelope points toward Mira. The ring can be shown to someone old enough to know the crest.',
    mainQuestHint: 'A sealed envelope addressed to Mira was hidden in the master chamber alongside a ring bearing an unfamiliar crest.',
  },
  'room-servant-quarters': {
    marks: 5,
    message: 'Abandoned cots and hurried departures. What remains is practical: coin, blankets, and the sense that people left expecting to return.',
    flavorFinds: [
      '5 Marks tucked inside a boot lining',
      'Two usable blankets and a stitched kitchen token',
    ],
    actionableFinds: [],
    followUp: null,
  },
  'room-barracks': {
    marks: 12,
    message: 'The racks are half stripped, but a fighter always hides something for the bad week that finally comes.',
    flavorFinds: [
      '12 Marks hidden in a cracked practice helm',
      'A serviceable whetstone and two spare bowstrings',
    ],
    actionableFinds: [],
    followUp: null,
  },
  'room-garret': {
    marks: 18,
    message: 'The top floor chest gives way to force. Inside: household silver, an old district sketch, and a line-of-sight over the street.',
    flavorFinds: [
      '18 Marks worth of unmelted household silver',
    ],
    actionableFinds: [
      {
        itemId: 'item-sketch-watch-lane',
        label: 'A hand-drawn watch sketch of the lane outside the house',
      },
    ],
    followUp: 'The sketch could help you read who watched the house — or who expected trouble before it came.',
  },
}

const VAULT_DISCOVERY: HouseDiscovery = {
  marks: 0,
  message: "The vault yields a hidden letter in Mira's hand. She left willingly — but not freely.",
  flavorFinds: [],
  actionableFinds: [
    {
      itemId: 'item-ledger-bureau',
      label: 'A surviving bureau ledger recovered beside Mira\'s hidden letter',
    },
  ],
  followUp: 'Keep the surviving bureau ledger as evidence. The letter points to Mira; the ledger proves records survived the seizure.',
  mainQuestHint: "A letter from Mira, hidden in the vault. She left willingly — but not freely.",
}

export function getHouseDiscovery(roomId: string, vaultUnlocked: boolean): HouseDiscovery | null {
  if (roomId === 'room-vault') {
    return vaultUnlocked ? VAULT_DISCOVERY : null
  }

  return BASE_DISCOVERIES[roomId] ?? null
}
