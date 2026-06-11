# Authoring Guide and World Glossary

This document provides terminology and style guidance for all fiction content: quest text, event descriptions, dialogue, activity log entries, and UI copy.

---

## World Glossary

### Geography

| Term | Definition | Usage Note |
|------|------------|------------|
| **Valdenmoor** | The city itself | Use for city-level references |
| **The Pale** | A district within Valdenmoor (noble quarter) | NOT the city — use "Valdenmoor" for city-wide references |
| **The Warrens** | Working-class district, dense housing | |
| **The Tangle** | Markets and trade district | |
| **The Hollows** | Undercity, black market | |
| **Harbor** | Dock district, trade entry | Also called "Harbor Ward" |
| **Ironworks** | Industrial district | Also called "Iron Docks" for waterfront |
| **Cinder Row** | Slum district (sometimes used interchangeably with Warrens) | Prefer "Warrens" for consistency |

### Currency

| Tier | Name | Value | Usage |
|------|------|-------|-------|
| 1 | **Mark** | Base unit | Common transactions, wages, small contracts |
| 2 | **Tally** | 10 Marks | Medium contracts, guild fees |
| 3 | **Weigh** | 100 Marks | Large contracts, property, bonds |

**Rule:** Use the correct tier for the context. A street vendor does not quote prices in Weighs. A house purchase is not quoted in Marks.

### Organizations

| Name | Type | Description |
|------|------|-------------|
| **House Valdris** | Noble house (player) | The protagonist's family seat |
| **House Sorn** | Noble house | Old money, legitimacy gatekeepers |
| **House Merrow** | Noble house | Dock leverage, labor control |
| **House Sable-Cairn** | Noble house | Fallen prestige, fractured |
| **Civic Compact** | Governing body | Law, trade regulation, breeding permits |
| **Gilded Court** | Noble coalition | The ruling elite who displaced House Valdris |
| **Foundry League** | Industrial guild | Forge, manufacturing, engineering |
| **Tallow Ring** | Underground network | Black market, information, debt collection |
| **The Restored** | Zealous movement | Seek to overturn current order |

---

## Voice Guidelines

### Tone Principles

1. **Active verbs, concrete consequences**
   - ✓ "The guard refuses entry until you produce the permit."
   - ✗ "Entry might be denied if documentation is lacking."

2. **No fourth-wall breaks**
   - ✓ Marion warns: "The Court has eyes on this house."
   - ✗ "This quest is hard. Good luck."

3. **Dark fantasy register**
   - The world is dangerous, scarce, and power-aware
   - Heat and want are present, but so is the collar, the debt, the rival listening at the door
   - Avoid glossy optimism or generic heroic framing

4. **Character voice consistency**
   - Each NPC should be identifiable by word choice alone
   - A dockworker speaks differently from a courtier
   - Use traits and background to inform dialogue rhythm

### Activity Log Format

Activity log entries follow a consistent pattern:

```
[Category] Message with concrete outcome
```

**Categories:** `economy`, `combat`, `system`

**Examples:**
- ✓ `[Economy] Paid 45 Marks to repair the kitchen.`
- ✓ `[Combat] Broke the Tallow watch crew at the checkpoint.`
- ✓ `[System] Marion set the household policy to Professional Distance.`

**Avoid:**
- ✗ `[System] You did something.`
- ✗ `[Economy] Money changed hands.`

---

## Fiction Contracts

### Relationship Progression

Relationships advance through defined stages. Text must reflect the current stage:

| Stage | Description | Appropriate Text |
|-------|-------------|------------------|
| **Acquaintance** | First meetings, transactional | Formal, distant, no personal disclosure |
| **Trust** | Repeated positive interaction | Shared information, mild vulnerability |
| **Attachment** | Emotional bond forming | Personal references, care expressed indirectly |
| **Committed** | Deep bond, mutual obligation | Direct intimacy, shared future framing |

**Rule:** Intimate or sensual content is only appropriate at Attachment+ stages and must be earned through prior interaction. Default register is "stark andeutend" (starkly suggestive); direct content requires narrative necessity and character voice justification.

### Quest Outcome States

Quests can be in these states:

| State | Meaning | Player Feedback |
|-------|---------|-----------------|
| **Active** | Quest is in progress | Journal shows current objective |
| **Completed** | Quest succeeded | Reward granted, rumor/sequel may trigger |
| **Failed** | Quest failed | Penalty applied (if any), no reward |
| **Abandoned** | Player gave up | No penalty, no reward, slot freed |

**Rule:** Every outcome must have visible consequence. A quest that ends with "nothing happened" is a design bug.

---

## Common Pitfalls

### Terminology Drift

| Inconsistent | Correct |
|--------------|---------|
| "the city" when meaning "the Pale" | Use "the Pale" for district, "Valdenmoor" for city |
| "money" instead of specific tier | Use "Marks", "Tallies", or "Weighs" |
| "Valdris" vs "Valdris" | **House Valdris** is the player house |

### Overpromising Mechanics

| Avoid | Use Instead |
|-------|-------------|
| "Escort the caravan safely" | "Protect the convoy from ambush" |
| "Extract the prisoner" | "Break the resistance and retrieve the target" |
| "Deliver the package" | "Get the cargo through to its destination" |

**Rule:** Only promise mechanics the runtime currently supports. Combat, investigation, delivery, and survival are the core loops. Escort, extraction, and complex social mechanics require explicit implementation.

---

## Reference Documents

- `docs/narrative.md` — World bible, lore source of truth
- `docs/workflows/design-review.md` — UX and comprehension review
- `docs/workflows/bead-creation.md` — How to create implementation tasks
- `data/definitions/` — Quest, event, NPC, and faction definitions

---

## Version History

| Date | Change |
|------|--------|
| 2026-06-08 | Initial version created (destiny-bxm6) |
