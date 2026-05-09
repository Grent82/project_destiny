export type HouseDiscovery = {
  marks: number
  message: string
  finds: string[]
}

const BASE_DISCOVERIES: Record<string, HouseDiscovery> = {
  'room-entrance-hall': {
    marks: 0,
    message: 'Dust, boot-scuffs, and a broken wax seal show how the house was turned over after the seizure.',
    finds: [
      'A snapped house seal from the debt officers',
      'Drag marks leading deeper into the house',
    ],
  },
  'room-marion-quarters': {
    marks: 0,
    message: 'The room is plainly kept but not preserved as a shrine. Marion carved a workable sleeping space out of the ruin and left only what she intended to share.',
    finds: [
      'Folded work clothes and a sharpened ledger quill',
      'Copied notices from the debt proceedings, neatly tied with twine',
    ],
  },
  'room-bureau': {
    marks: 22,
    message: 'A forgotten strongbox behind the panelling still holds old reserve coin and one surviving account note.',
    finds: [
      '22 Marks in pre-Breach reserve coin',
      'An inventory chit naming two ledgers removed the night the house fell',
    ],
  },
  'room-kitchen': {
    marks: 8,
    message: 'Behind the spice rack sits a survivor\'s cache: coin, dried stock, and proof that someone planned for a siege.',
    finds: [
      '8 Marks in kitchen emergency coin',
      'A wrapped bundle of salt and marrow stock fit for two hard meals',
    ],
  },
  'room-study': {
    marks: 15,
    message: 'Between cracked folios you find a promissory note, margin codes in your father\'s hand, and a reference to "the arrangement below."',
    finds: [
      '15 Marks pressed flat in a folio binding',
      'A letter fragment hinting at something hidden beneath the house',
    ],
  },
  'room-master-chamber': {
    marks: 30,
    message: 'Behind the wainscoting is a sealed envelope, a stranger\'s ring, and Mira\'s name written in a hand you trust too much.',
    finds: [
      '30 Marks wrapped inside an old signet pouch',
      'A sealed envelope addressed to Mira',
      'A ring bearing an unfamiliar crest',
    ],
  },
  'room-servant-quarters': {
    marks: 5,
    message: 'Abandoned cots and hurried departures. What remains is practical: coin, blankets, and the sense that people left expecting to return.',
    finds: [
      '5 Marks tucked inside a boot lining',
      'Two usable blankets and a stitched kitchen token',
    ],
  },
  'room-barracks': {
    marks: 12,
    message: 'The racks are half stripped, but a fighter always hides something for the bad week that finally comes.',
    finds: [
      '12 Marks hidden in a cracked practice helm',
      'A serviceable whetstone and two spare bowstrings',
    ],
  },
  'room-garret': {
    marks: 18,
    message: 'The top floor chest gives way to force. Inside: household silver, an old district sketch, and a line-of-sight over the street.',
    finds: [
      '18 Marks worth of unmelted household silver',
      'A hand-drawn watch sketch of the lane outside the house',
    ],
  },
}

const VAULT_DISCOVERY: HouseDiscovery = {
  marks: 0,
  message: "The vault yields a hidden letter in Mira's hand. She left willingly — but not freely.",
  finds: [
    'A sealed letter from Mira',
    'A clue tying her disappearance to the forces moving against the house',
  ],
}

export function getHouseDiscovery(roomId: string, vaultUnlocked: boolean): HouseDiscovery | null {
  if (roomId === 'room-vault') {
    return vaultUnlocked ? VAULT_DISCOVERY : null
  }

  return BASE_DISCOVERIES[roomId] ?? null
}
