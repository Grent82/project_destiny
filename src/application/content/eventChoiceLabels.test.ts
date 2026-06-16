import { contentCatalog } from './contentCatalog'

const BANNED_GENERIC_LABELS = new Set([
  'listen',
  'noted',
  'noted for now',
  'accept',
  'continue',
  'acknowledge her',
  'acknowledge him',
  'acknowledge it',
  'say nothing',
  'note it',
  'good to know',
  'make a note of it',
  'read the note',
  'review the record',
  'study the notes',
  'hear her out',
  'let him speak',
  'i understand the stakes',
  'i know where to look',
  'take the marks',
])

function normalizeChoiceLabel(label: string) {
  return label.trim().replace(/[.!?]+$/u, '').toLowerCase()
}

describe('event choice labels', () => {
  it('does not use banned generic labels for player-facing event choices', () => {
    const violatingChoices = contentCatalog.events.flatMap((event) =>
      event.isAutoResolved
        ? []
        :
      event.choices
        .filter((choice) => BANNED_GENERIC_LABELS.has(normalizeChoiceLabel(choice.label)))
        .map((choice) => `${event.id}:${choice.id}:${choice.label}`),
    )

    expect(violatingChoices).toEqual([])
  })
})
