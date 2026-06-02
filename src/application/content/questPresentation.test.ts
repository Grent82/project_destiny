import { getQuestTemplates, contentCatalog } from './contentCatalog'
import { getQuestPresentation } from './questPresentation'

describe('questPresentation stakeholder truth', () => {
  it('resolves surfaced actors to real entities or explicit off-screen abstractions', () => {
    for (const template of getQuestTemplates()) {
      const presentation = getQuestPresentation(template)
      const actorRefs = [
        ...presentation.issuerActors,
        ...presentation.payerActors,
        ...presentation.stakeholderActors,
      ]

      expect(actorRefs.length).toBeGreaterThan(0)

      for (const actor of actorRefs) {
        switch (actor.kind) {
          case 'npc':
            expect(contentCatalog.npcsById.has(actor.id)).toBe(true)
            break
          case 'faction':
            expect(contentCatalog.factionsById.has(actor.id)).toBe(true)
            break
          case 'district':
            expect(contentCatalog.districtsById.has(actor.id)).toBe(true)
            break
          case 'offscreen':
            expect(actor.label.trim().length).toBeGreaterThan(0)
            break
        }
      }
    }
  })

  it('marks non-entity Harborwatch stakeholders as explicit off-screen actors instead of pretending they are trackable NPCs', () => {
    const harborwatch = getQuestTemplates().find((template) => template.id === 'quest-harborwatch')
    if (!harborwatch) {
      throw new Error('Expected Harborwatch quest template in fixtures.')
    }

    const presentation = getQuestPresentation(harborwatch)

    expect(presentation.stakeholderActors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'offscreen',
          label: 'Harbor gate wardens and dockside traffic',
        }),
      ]),
    )
  })
})
