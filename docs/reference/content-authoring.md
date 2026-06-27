# Content Authoring Reference

Comprehensive guide for creating JSON content definitions in Project Destiny.

## Overview

Content definitions are JSON files in `data/definitions/` that define static game content. These are loaded at startup into the `contentCatalog` and referenced by runtime state.

**Key Principles:**
- Content is **immutable** - runtime state references content by ID
- All content is **versioned** through save schema versions
- IDs follow **kebab-case** convention
- All definitions are validated against Zod schemas at load time

---

## JSON Definition Files

| File | Purpose | Schema Location |
|------|---------|-----------------|
| `items.json` | Consumables, documents, quest items | `src/domain/items/contracts.ts` |
| `weapons.json` | Weapon definitions with profiles | `src/domain/items/contracts.ts` |
| `armor.json` | Armor definitions with profiles | `src/domain/items/contracts.ts` |
| `clothing-items.json` | Clothing layer definitions | `src/domain/items/contracts.ts` |
| `armor-items.json` | Armor item instances | `src/domain/items/contracts.ts` |
| `npcs.json` | NPC definitions (hireable, world, story, enemy) | `src/domain/npc/contracts.ts` |
| `factions.json` | Faction definitions and relationships | `src/domain/factions/contracts.ts` |
| `districts.json` | District definitions with shops, dangers | `src/domain/districts/contracts.ts` |
| `events.json` | Event templates with choices/outcomes | `src/domain/events/contracts.ts` |
| `quests.json` | Quest definitions with objectives | `src/domain/quests/contracts.ts` |
| `dialogues.json` | Dialogue tree definitions | `src/domain/dialogue/contracts.ts` |
| `titles.json` | Title definitions and effects | `src/domain/titles/contracts.ts` |
| `shops.json` | Shop definitions with inventory | `src/domain/shops/contracts.ts` |
| `encounter-tables.json` | Combat encounter tables | `src/domain/combat/contracts.ts` |
| `expedition-destinations.json` | Expedition destination definitions | `src/domain/expedition/contracts.ts` |
| `council-votes.json` | Council vote event definitions | `src/domain/governance/contracts.ts` |
| `dates.json` | Date template definitions | `src/domain/relationships/contracts.ts` |
| `bond-buyers.json` | Bond buyer definitions | `src/domain/npc/contracts.ts` |
| `event-rumor-templates.json` | Rumor template definitions | `src/domain/rumors/contracts.ts` |
| `rumors.json` | Rumor definitions | `src/domain/rumors/contracts.ts` |
| `threats.json` | Threat definitions | `src/domain/world/runtime.ts` |
| `npc-arcs.json` | NPC arc progression definitions | `src/domain/npc/contracts.ts` |
| `npc-starting-relationships.json` | Initial relationship definitions | `src/domain/relationships/contracts.ts` |
| `pois.json` | Point-of-interest definitions | `src/domain/districts/contracts.ts` |
| `rival-orgs.json` | Rival organization definitions | `src/domain/world/runtime.ts` |
| `worldHouseholds.json` | World household definitions | `src/domain/world/runtime.ts` |
| `enemy-npcs.json` | Enemy NPC definitions | `src/domain/npc/contracts.ts` |

---

## Item Authoring

### Structure

```json
{
  "id": "item-medkit-field",
  "name": "Field Medkit",
  "category": "consumable",
  "tier": 1,
  "value": 85,
  "weight": 1.2,
  "rarity": "common",
  "tags": ["healing", "mission"],
  "effects": [
    {
      "type": "heal",
      "value": 25
    }
  ],
  "description": "A sealed canvas roll of League-surplus dressings...",
  "shopPrice": 15,
  "typedEffects": [
    {
      "type": "heal",
      "value": 25
    }
  ]
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (kebab-case) |
| `name` | string | Yes | Display name |
| `category` | string | Yes | `consumable`, `document`, `material`, `quest`, `equipment` |
| `tier` | number | Yes | Item tier (1-5) |
| `value` | number | Yes | Base trade value |
| `weight` | number | Yes | Weight in kg |
| `rarity` | string | Yes | `common`, `uncommon`, `rare`, `unique` |
| `tags` | string[] | Yes | Tags for filtering and effects |
| `effects` | object[] | Yes | Effect definitions |
| `description` | string | Yes | Flavour text |
| `shopPrice` | number | Yes | Base shop price (0 if not sold) |
| `typedEffects` | object[] | Yes | Typed version of effects |

### Effect Types

| Type | Parameters | Description |
|------|------------|-------------|
| `heal` | `value` | Restore health |
| `cureInjury` | `value` | Reduce injury |
| `cureFatigue` | `value` | Reduce fatigue |
| `cureStress` | `value` | Reduce stress |
| `enableAction` | `action` | Unlock special action |
| `adjustRelationship` | `npcId`, `axis`, `delta` | Change relationship |
| `adjustFactionStanding` | `factionId`, `delta` | Change faction standing |

---

## Quest Authoring

### Structure

```json
{
  "id": "quest-harborwatch",
  "title": "The Harborwatch Dispute",
  "employerFactionId": "faction-civic-compact",
  "enemyFactionId": "faction-tallow-ring",
  "districtId": "district-the-warrens",
  "briefing": "A Compact checkpoint at the harbor gate is being shaken down...",
  "objectiveType": "combat",
  "rewardMarks": 180,
  "rewardStandingFactionId": "faction-civic-compact",
  "rewardStandingDelta": 8,
  "penaltyStandingDelta": -5,
  "timeLimitDays": 5,
  "linkedQuestId": null,
  "discoverySource": "guild",
  "discoveryDistrictId": "district-harbor",
  "requiredFactionStanding": null,
  "enemyNpcId": "npc-enemy-the-dockmaster",
  "rewardCityDialId": "unrest",
  "rewardCityDialDelta": -5,
  "successorQuestId": "quest-harborwatch-followup",
  "successorRumorIds": ["rumor-valdris-cleared-harborwatch"],
  "midQuestBeats": [...],
  "sourceNpcId": "npc-garet-doyle",
  "rewardRelationshipDeltas": [...],
  "aftermathText": "The checkpoint holds. Three Ring men in the morgue..."
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `title` | string | Yes | Quest title |
| `employerFactionId` | string | Yes | Who offers the quest |
| `enemyFactionId` | string | No | Opposing faction |
| `districtId` | string | Yes | Where quest takes place |
| `briefing` | string | Yes | Quest description |
| `objectiveType` | string | Yes | `combat`, `investigation`, `delivery`, `survival` |
| `rewardMarks` | number | Yes | Monetary reward |
| `rewardStandingFactionId` | string | No | Faction for standing reward |
| `rewardStandingDelta` | number | No | Standing change on success |
| `penaltyStandingDelta` | number | No | Standing change on failure |
| `timeLimitDays` | number | No | Days to complete |
| `linkedQuestId` | string | No | Related quest |
| `discoverySource` | string | Yes | `guild`, `court`, `rival`, `world` |
| `discoveryDistrictId` | string | Yes | Where discovered |
| `requiredFactionStanding` | number | No | Minimum standing required |
| `enemyNpcId` | string | No | Primary enemy NPC |
| `rewardCityDialId` | string | No | City dial affected |
| `rewardCityDialDelta` | number | No | Dial change |
| `successorQuestId` | string | No | Quest on success |
| `successorOnFailQuestId` | string | No | Quest on failure |
| `successorRumorIds` | string[] | No | Rumors spawned on success |
| `midQuestBeats` | object[] | No | Journal entries at stages |
| `sourceNpcId` | string | No | NPC who gives quest |
| `rewardRelationshipDeltas` | object[] | No | Relationship changes |
| `aftermathText` | string | No | Post-completion text |

### Objective Types

| Type | Description | Supported Mechanics |
|------|-------------|---------------------|
| `combat` | Defeat enemies | Combat encounter |
| `investigation` | Gather information | Investigation approach |
| `delivery` | Transport goods | On-site progression |
| `survival` | Survive duration | Watch-based progress |

### Mid Quest Beats

```json
{
  "atStageId": "pressured",
  "label": "The Tallow Ring has moved up their timeline.",
  "journalEntry": "The Ring learned about the Compact's request..."
}
```

**Stage IDs**: `initial`, `pressured`, `on-site-prep`, `on-site`, `engaged`, `setback`, `resolving`

---

## Event Authoring

### Structure

```json
{
  "id": "event-unpaid-wages-unrest",
  "title": "Grumbling in the Ranks",
  "description": "Word travels fast in the Warrens. You haven't paid your people...",
  "triggerConditions": {
    "minUnrest": 60,
    "probability": 0.6,
    "dayMin": 3
  },
  "choices": [
    {
      "id": "choice-pay-extra",
      "label": "Pay a goodwill bonus (50 Marks)",
      "outcomes": [
        {
          "type": "addCredits",
          "delta": -50
        },
        {
          "type": "adjustCityDial",
          "target": "unrest",
          "delta": -8
        }
      ]
    }
  ],
  "isAutoResolved": false,
  "tags": ["economy", "social"],
  "sourceDistrictId": null,
  "sourceNpcId": null,
  "presentationFlavour": null,
  "firingMode": "world"
}
```

### Trigger Conditions

| Condition | Type | Description |
|-----------|------|-------------|
| `minUnrest` | number | Minimum unrest dial |
| `maxUnrest` | number | Maximum unrest dial |
| `minFoodSecurity` | number | Minimum food security |
| `maxFoodSecurity` | number | Maximum food security |
| `corridorStatus` | string | Corridor status |
| `factionStandingBelow` | object | Faction standing threshold |
| `factionStandingAbove` | object | Faction standing threshold |
| `dayMin` | number | Minimum game day |
| `dayMax` | number | Maximum game day |
| `currentDistrict` | string | Current district |
| `activeQuestId` | string | Active quest requirement |
| `requiredRosterNpcId` | string | Required roster NPC |
| `maxCredits` | number | Maximum money |
| `minRenown` | number | Minimum renown |
| `debtPaid` | boolean | Debt paid status |
| `minRosterSize` | number | Minimum roster size |
| `completedQuestCountMin` | number | Minimum completed quests |
| `npcRelationshipMin` | object | NPC relationship minimum |
| `timeSlot` | string | Time slot requirement |
| `npcState` | object[] | NPC state requirements |
| `isFirstRun` | boolean | First run flag |
| `probability` | number | Probability (0-1) |

### Outcome Types

| Type | Parameters | Description |
|------|------------|-------------|
| `adjustFactionStanding` | `target`, `delta` | Change faction standing |
| `adjustCityDial` | `target`, `delta` | Change city dial |
| `adjustCityResource` | `target`, `delta` | Change city resource |
| `adjustNpcState` | `npcId`, `axis`, `delta` | Change NPC state |
| `addCredits` | `delta` | Add/remove money |
| `addActivityLogEntry` | `message` | Log entry |
| `setCorridorStatus` | `target` | Set corridor status |
| `adjustNpcRelationship` | `npcId`, `axis`, `delta` | Change relationship |
| `createQuestLead` | `questId` | Create quest lead |
| `updateQuestStage` | `questId`, `stageId` | Update quest stage |
| `unlockNpc` | `npcId` | Unlock NPC |
| `addNpcToRoster` | `npcId` | Add to roster |
| `transferBondedNpc` | `npcId`, `buyerId` | Transfer bond |

---

## NPC Authoring

### Structure

```json
{
  "id": "npc-marion-vale",
  "name": "Marion Vale",
  "npcType": "story",
  "districtId": "district-the-pale",
  "description": "Former house factor, now your chief of staff.",
  "origin": "The Pale",
  "background": "Marion served House Valdris for twenty years...",
  "rarity": "common",
  "status": "citizen",
  "factionAffinityId": null,
  "baseAttributes": {
    "might": 35,
    "agility": 40,
    "endurance": 45,
    "intellect": 70,
    "perception": 65,
    "presence": 55,
    "resolve": 60
  },
  "startingSkills": {
    "melee": 10,
    "ranged": 12,
    "medicine": 35,
    "administration": 75,
    "engineering": 20,
    "negotiation": 60,
    "survival": 15,
    "security": 25,
    "crafting": 18,
    "performance": 22,
    "academics": 45,
    "intrigue": 50
  },
  "startingTraits": {
    "discipline": 65,
    "ambition": 50,
    "empathy": 60,
    "ruthlessness": 35,
    "prudence": 70,
    "curiosity": 45,
    "dominance": 40,
    "loyalty": 75,
    "vanity": 25,
    "zeal": 30
  },
  "allowedTitleIds": [],
  "dialogueId": "dialogue-marion-vale",
  "ageBand": "adult",
  "sex": "woman",
  "appearanceTags": ["practical dress", "accountant's fingers"],
  "quirks": [...],
  "motivation": {
    "publicGoal": "Restore House Valdris to former glory.",
    "privateNeed": "Redemption for past failures."
  },
  "loyalties": [...]
}
```

### NPC Types

| Type | Description | Available for Hire |
|------|-------------|-------------------|
| `hireable` | Available in hire pool | Yes |
| `world` | World NPC, not hireable | No |
| `story` | Story-critical NPC | No |
| `enemy` | Enemy faction NPC | No |

### Status Values

| Status | Description |
|--------|-------------|
| `citizen` | Regular citizen |
| `mercenary` | Available mercenary |
| `retainer` | House retainer |
| `servant` | Household servant |
| `noble` | Noble status |
| `criminal` | Criminal status |

---

## Faction Authoring

### Structure

```json
{
  "id": "faction-civic-compact",
  "name": "Civic Compact",
  "description": "Governing body of Valdenmoor.",
  "symbol": "scale-and-key",
  "color": "#4a6fa5",
  "baseStanding": 0,
  "directives": [...],
  "rivalries": [...],
  "alliances": [...]
}
```

---

## District Authoring

### Structure

```json
{
  "id": "district-the-pale",
  "name": "The Pale",
  "summary": "Noble quarter of Valdenmoor.",
  "controllingFactionId": "faction-gilded-court",
  "contestedByFactionIds": ["faction-house-merrow"],
  "shopTypes": ["shop-pale-general", "shop-pale-apothecary"],
  "tags": ["noble", "wealthy", "political"],
  "dangerLevel": 2,
  "accessRestricted": false,
  "narrativeSummary": "The Pale is the oldest...",
  "adjacentDistrictIds": ["district-gilded-heights", "district-the-tangle"],
  "poiIds": ["poi-pale-palace", "poi-pale-market"],
  "encounterTableId": "table-pale"
}
```

---

## Balance Guidelines

### Item Pricing

| Tier | Marks | Examples |
|------|-------|----------|
| 1 | 5-50 | Basic supplies, common items |
| 2 | 50-200 | Quality goods, specialized tools |
| 3 | 200-500 | Premium equipment, rare items |
| 4 | 500-1000 | Luxury goods, masterwork items |
| 5 | 1000+ | Unique items, artifacts |

### Quest Rewards

| Difficulty | Marks | Standing |
|------------|-------|----------|
| Trivial | 50-100 | 2-5 |
| Easy | 100-200 | 5-8 |
| Medium | 200-400 | 8-12 |
| Hard | 400-800 | 12-18 |
| Epic | 800+ | 18+ |

### Wage Rates

| Status | Base Wage |
|--------|-----------|
| Servant | 2 Mk/day |
| Apprentice | 3 Mk/day |
| Retainer | 4 Mk/day |
| Mercenary | 8 Mk/day |
| Citizen | 5 Mk/day |
| Noble | 14 Mk/day |

---

## Validation

All content is validated against Zod schemas at load time. Invalid content will cause the game to fail to start.

**Common Validation Errors:**
- Missing required fields
- Invalid ID format (must be kebab-case)
- References to non-existent IDs
- Out-of-range numeric values
- Invalid enum values

---

## See Also

- [Authoring Guide](../authoring-guide.md) - Voice and terminology guidance
- [Narrative](../narrative.md) - World bible and lore
- [Command API Reference](./commands.md) - Commands that interact with content
