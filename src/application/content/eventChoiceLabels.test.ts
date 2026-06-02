import { contentCatalog } from './contentCatalog'

describe('event choice labels', () => {
  it('does not use generic "Accept ..." labels for player-facing event choices', () => {
    const violatingChoices = contentCatalog.events.flatMap((event) =>
      event.choices
        .filter((choice) => /^Accept\b/i.test(choice.label.trim()))
        .map((choice) => `${event.id}:${choice.id}:${choice.label}`),
    )

    expect(violatingChoices).toEqual([])
  })
})
