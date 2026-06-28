# Content Authoring Guidelines

Guidelines for using underutilized schema fields in events.json and quests.json. Based on the 2026-06-24 dead-content audit findings.

## Overview

The dead-content audit found that all schema fields are technically functional but underutilized:
- Only 18% of events use `presentationFlavour`
- Only 1/28 quests uses `complicationRisk` or `retryBehavior`

These guidelines help content authors create richer, more varied content without requiring schema changes.

---

## 1. presentationFlavour

### Purpose
Adds scene-setting text that enriches the narrative context of an event without changing mechanical outcomes.

### When to Use
- **Use** for events that occur in specific locations or social contexts where atmosphere matters
- **Use** when the same mechanical outcome could happen in different narrative contexts
- **Use** for events that build faction identity or district character

### When NOT to Use
- **Avoid** for purely mechanical events (resource transfers, stat changes)
- **Avoid** when the event is part of a tight quest chain where brevity is needed
- **Avoid** for system events that players skip through

### Example from Existing Content

```json
{
  "id": "event-gilded-court-summons",
  "title": "Summons to the Gilded Court",
  "presentationFlavour": "The courier's livery gleams in the gaslight — gold thread on midnight blue. You follow him through the marble halls where whispers carry farther than footsteps.",
  "outcomes": [
    {
      "label": "Attend the summons",
      "effects": [
        { "type": "factionStanding", "factionId": "faction-gilded-court", "delta": 5 }
      ]
    }
  ]
}
```

### Authoring Tip
Keep `presentationFlavour` to 1-2 sentences. It should set the scene, not tell the story.

---

## 2. isAutoResolved

### Purpose
Indicates whether an event resolves automatically without player interaction.

### When to Use
- **Use** for background events that inform the player but don't require action
- **Use** for events that happen during sleep/unavailable time slots
- **Use** for informational updates (rumors, minor faction movements)
- **Use** when the event outcome is predetermined and unavoidable

### When NOT to Use
- **Avoid** for events with meaningful player choice
- **Avoid** for events that could have negative consequences requiring mitigation
- **Avoid** for events that are core to active quest lines

### Example from Existing Content

```json
{
  "id": "event-corridor-clearance-update",
  "title": "Corridor Status Update",
  "isAutoResolved": true,
  "outcomes": [
    {
      "label": "Acknowledged",
      "effects": [
        { "type": "activityLog", "message": "The Green Corridor shows signs of improvement. Supply caravans report fewer incidents." }
      ]
    }
  ]
}
```

### Authoring Tip
Auto-resolved events should still appear in the activity log. They're informational, not invisible.

---

## 3. complicationRisk

### Purpose
Indicates the chance that a quest will have complications or failure states even on successful completion.

### When to Use
- **Use** for high-risk quests (combat-heavy, politically sensitive, time-pressured)
- **Use** when the quest involves unreliable NPCs or unstable situations
- **Use** for quests where success comes at a cost

### When NOT to Use
- **Avoid** for tutorial/early-game quests
- **Avoid** for quests that are already optional or low-stakes
- **Avoid** when the quest is part of a guaranteed progression path

### Example from Existing Content

```json
{
  "id": "quest-rescue-mira",
  "title": "Rescue Mira from the Tannery",
  "complicationRisk": 0.35,
  "steps": [
    {
      "label": "Infiltrate the tannery",
      "description": "The Tallow Ring guards are on high alert."
    }
  ],
  "outcomes": {
    "success": {
      "label": "Mira rescued",
      "effects": [
        { "type": "completeQuest", "reward": 200 }
      ]
    },
    "complication": {
      "label": "Rescue with complications",
      "effects": [
        { "type": "completeQuest", "reward": 100 },
        { "type": "npcInjury", "npcId": "npc-mira", "severity": "moderate" }
      ]
    }
  }
}
```

### Authoring Tip
A `complicationRisk` of 0.2-0.4 is typical. Above 0.5 feels punishing; below 0.1 is barely noticeable.

---

## 4. retryBehavior

### Purpose
Defines whether a failed quest can be rediscovered and attempted again.

### Values
- `"fail"` — Quest cannot be retryable (permanent failure)
- `"retry"` — Quest can be rediscovered after failure
- `"retry-delayed"` — Quest can retry after a cooldown period

### When to Use `"retry"`
- **Use** for quests that are still relevant after failure
- **Use** when failure opens new narrative opportunities
- **Use** for side quests that don't block main progression

### When to Use `"fail"`
- **Use** for time-sensitive quests
- **Use** when failure has irreversible consequences
- **Use** for main-quest critical path items

### When to Use `"retry-delayed"`
- **Use** for quests that need time to reset (NPC relationships, faction standing)
- **Use** when the failure state should be felt before another attempt

### Example from Existing Content

```json
{
  "id": "quest-negotiate-supply-contract",
  "title": "Negotiate Supply Contract with Foundry League",
  "retryBehavior": "retry-delayed",
  "context": {
    "retryCooldownDays": 10
  },
  "outcomes": {
    "success": {
      "label": "Contract secured",
      "effects": [
        { "type": "factionStanding", "factionId": "faction-foundry-league", "delta": 15 }
      ]
    },
    "failure": {
      "label": "Negotiations collapse",
      "effects": [
        { "type": "factionStanding", "factionId": "faction-foundry-league", "delta": -10 }
      ]
    }
  }
}
```

### Authoring Tip
Document retry behavior in the quest briefing so players understand the stakes.

---

## Summary Checklist

Before publishing new content, verify:

- [ ] `presentationFlavour` added for events with strong narrative context
- [ ] `isAutoResolved` set for informational/background events
- [ ] `complicationRisk` considered for high-stakes quests
- [ ] `retryBehavior` explicitly set (not left as default)

---

## Related Documentation

- `docs/engineering-standards.md` — Schema definitions and validation
- `docs/workflows/content-creation.md` — Content authoring workflow
- `data/definitions/events.json` — Event template examples
- `data/definitions/quests.json` — Quest template examples
