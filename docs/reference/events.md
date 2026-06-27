# Event System

## Overview

The Event System drives dynamic, reactive gameplay moments that respond to the player's actions, city conditions, and narrative progress. Events create emergent storytelling by presenting situations with meaningful choices that have tangible consequences across factions, resources, NPCs, and the city itself.

Events are content-driven templates defined in JSON, evaluated each game tick against current game state, and resolved through player choices or automatic resolution. They form a core loop of the game's reactive world simulation.

## Event Lifecycle

```
Template Definition (events.json)
        ↓
Condition Evaluation (evaluateEvents.ts)
        ↓
Pending Event Queue (player must resolve)
        ↓
Player Selection / Auto-Resolution
        ↓
Outcome Application (applyEventOutcome.ts)
        ↓
Event Chronicle Entry + Optional Rumor Spawning
```

### Phases

1. **Template Registration**: Event templates are loaded from `data/definitions/events.json` into the content catalog at startup.

2. **Evaluation**: Each game tick, `evaluateEvents()` iterates through all world-mode templates and checks:
   - Is the event already pending?
   - Is the event on cooldown?
   - Do all trigger conditions pass?
   - Does the probability roll succeed?

3. **Pending State**: Events that pass evaluation become "pending" and appear in the player's UI for resolution. World-mode events are capped at 5 per tick (priority/tutorial events excluded).

4. **Resolution**: Player selects a choice, or the event auto-resolves if `isAutoResolved: true`.

5. **Outcome Application**: `applyEventOutcome()` executes the outcomes array, modifying game state (faction standing, resources, NPC states, etc.).

6. **Artifacts**: An event instance is recorded in `eventInstances`, and optionally a rumor is spawned via `spawnEventRumor()`.

## Event Template Schema

```typescript
{
  id: string              // Unique identifier (entity ID format)
  title: string           // Display title shown to player
  description: string     // Full event description
  triggerConditions: {...} // See Trigger Conditions below
  choices: [              // At least one choice required
    {
      id: string          // Unique choice identifier
      label: string       // Player-visible choice text
      outcomes: [...]     // Array of outcome objects
    }
  ]
  isAutoResolved: boolean // Auto-resolve without player input
  tags: [string]          // Categorization labels
  repeatable: boolean     // Can this event fire again?
  cooldownDays: number    // Days between repeats (default: 7)
  sourceDistrictId: string|null  // District origin (null = city-wide)
  sourceNpcId: string|null       // NPC origin (null = impersonal)
  presentationFlavour: string|null // Optional atmospheric text
  firingMode: 'world' | 'system' // See Firing Modes below
}
```

## Trigger Conditions

All conditions are optional. An event fires when ALL specified conditions are satisfied.

### City-State Conditions

| Field | Type | Description |
|-------|------|-------------|
| `minUnrest` | number | Minimum unrest level (0-100) |
| `maxUnrest` | number | Maximum unrest level (0-100) |
| `minFoodSecurity` | number | Minimum food security level (0-100) |
| `maxFoodSecurity` | number | Maximum food security level (0-100) |
| `corridorStatus` | 'open' \| 'disrupted' \| 'blocked' | Exact corridor state match |

### Time Conditions

| Field | Type | Description |
|-------|------|-------------|
| `dayMin` | number | Earliest day event can fire |
| `dayMax` | number | Latest day event can fire |
| `timeSlot` | string | Specific time slot (e.g., 'morning', 'evening') |
| `isFirstRun` | boolean | Only fire on first playthrough |

### Faction Conditions

| Field | Type | Description |
|-------|------|-------------|
| `factionStandingBelow` | `{ factionId, threshold }` | Fires if standing < threshold |
| `factionStandingAbove` | `{ factionId, threshold }` | Fires if standing >= threshold |

### Quest Conditions

| Field | Type | Description |
|-------|------|-------------|
| `activeQuestId` | string | Requires quest to be active |
| `completedQuestCountMin` | number | Minimum quests completed |

### NPC Conditions

| Field | Type | Description |
|-------|------|-------------|
| `requiredRosterNpcId` | string | Specific NPC must be on roster |
| `minRosterSize` | number | Minimum roster count |
| `npcRelationshipMin` | `{ npcId, axis, min }` | Minimum relationship value on axis |
| `npcState` | Array of `{ npcId, axis, min?, max? }` | Multiple NPC state checks |

### Economic Conditions

| Field | Type | Description |
|-------|------|-------------|
| `maxCredits` | number | Player money must be <= this value |
| `minRenown` | number | Minimum player renown |
| `debtPaid` | boolean | Whether debt has been paid |

### Location Conditions

| Field | Type | Description |
|-------|------|-------------|
| `currentDistrict` | string | Player must be in specific district |

### Probability

| Field | Type | Description |
|-------|------|-------------|
| `probability` | 0-1 | Chance to fire (default: 1 = 100%) |

### Example Trigger Conditions

```json
// High unrest + early game
{
  "minUnrest": 60,
  "dayMin": 3,
  "probability": 0.6
}

// Faction-specific + mid-game
{
  "factionStandingAbove": {
    "factionId": "faction-gilded-court",
    "threshold": -30
  },
  "dayMin": 5,
  "probability": 0.4
}

// Relationship-gated
{
  "npcRelationshipMin": {
    "npcId": "npc-ida-rhys",
    "axis": "affinity",
    "min": 50
  }
}

// Multiple NPC state checks
{
  "npcState": [
    { "npcId": "npc-ida-rhys", "axis": "stress", "min": 70 },
    { "npcId": "npc-thorn", "axis": "loyalty", "min": 80 }
  ]
}
```

## Outcome Types

Events produce outcomes that modify game state. Each choice has an array of outcomes executed sequentially.

### 1. adjustFactionStanding

Modify standing with a faction (-100 to 100 range).

```json
{
  "type": "adjustFactionStanding",
  "target": "faction-civic-compact",
  "delta": -5
}
```

**Required fields**: `target`, `delta`

### 2. adjustCityDial

Modify city dial values (control, prosperity, unrest, corruption).

```json
{
  "type": "adjustCityDial",
  "target": "unrest",
  "delta": 8
}
```

**Required fields**: `target`, `delta`

### 3. adjustCityResource

Modify city resources (foodSecurity, waterAccess, materialStock).

```json
{
  "type": "adjustCityResource",
  "target": "materialStock",
  "delta": 8
}
```

**Required fields**: `target`, `delta`

### 4. adjustNpcState

Modify an NPC's state values. Supports dynamic subject resolution.

```json
{
  "type": "adjustNpcState",
  "subject": "highest-stress",
  "axis": "stress",
  "delta": -15,
  "message": "{npcName} feels the weight lift."
}
```

**Required fields**: `subject`, `axis`, `delta`

**Subject options**:
- `highest-stress` - NPC with highest stress value
- `lowest-morale` - NPC with lowest morale
- `highest-loyalty` - NPC with highest loyalty trait
- `npcId:{id}` - Specific NPC by ID

**Axis options**: health, fatigue, stress, morale, fear, anger, hunger, injury, intoxication, hygiene, loyalty

### 5. addCredits

Modify player money.

```json
{
  "type": "addCredits",
  "delta": -30
}
```

**Required fields**: `delta` (negative = spend, positive = gain)

### 6. setCorridorStatus

Set the supply corridor state.

```json
{
  "type": "setCorridorStatus",
  "value": "disrupted"
}
```

**Required fields**: `value` ('open', 'disrupted', or 'blocked')

### 7. addActivityLogEntry

Add a player-visible system message.

```json
{
  "type": "addActivityLogEntry",
  "message": "The Compact files a note."
}
```

**Required fields**: `message`

### 8. adjustNpcRelationship

Modify player-NPC relationship on a specific axis.

```json
{
  "type": "adjustNpcRelationship",
  "npcId": "npc-ida-rhys",
  "axis": "affinity",
  "delta": 10
}
```

**Required fields**: `npcId`, `axis`, `delta`

**Axis options**: affinity, respect, fear, trust, loyalty

### 9. createQuestLead

Make a quest available for acceptance.

```json
{
  "type": "createQuestLead",
  "questId": "quest-gilded-auction-guard"
}
```

**Required fields**: `questId`

### 10. updateQuestStage

Advance an active quest and optionally add a journal entry.

```json
{
  "type": "updateQuestStage",
  "questId": "quest-main-arc",
  "stageId": "stage-2",
  "objectiveLabel": "Investigate the warehouse",
  "message": "New lead uncovered in the Warrens."
}
```

**Required fields**: `questId`, `stageId`

### 11. unlockNpc

Make an NPC available for hire.

```json
{
  "type": "unlockNpc",
  "npcId": "npc-new-recruit"
}
```

**Required fields**: `npcId`

### 12. addNpcToRoster

Immediately add an NPC to the player's roster.

```json
{
  "type": "addNpcToRoster",
  "npcId": "npc-rescued-mercenary",
  "arcId": "arc-redemption-path"
}
```

**Required fields**: `npcId`

**Optional fields**: `arcId` (triggers NPC arc progression)

### 13. transferBondedNpc

Transfer a bonded NPC to another entity (requires context).

```json
{
  "type": "transferBondedNpc"
}
```

**Required context**: `npcId` and `contextId` (buyer) passed via OutcomeContext

### 14. (Reserved - not in schema but documented)

This slot is available for future outcome types.

### 15. (Reserved - not in schema but documented)

This slot is available for future outcome types.

**Note**: The schema defines 13 outcome types. The enum allows for 15 total, leaving room for expansion.

## Event Tags

Tags categorize events for filtering, analytics, and auto-resolution logic. Common tags include:

| Tag | Purpose |
|-----|---------|
| `economy` | Financial/market events |
| `faction` | Faction relationship events |
| `social` | Community/interpersonal events |
| `political` | Power/governance events |
| `resource` | Supply/scarcity events |
| `crisis` | Urgent/threatening events |
| `npc` | Character-focused events |
| `injury` | Health/combat aftermath |
| `black-market` | Underground/illegal activities |
| `moral` | Ethical dilemmas |
| `legal` | Law/regulation events |
| `market` | Trade/pricing events |
| `rumor` | Auto-resolved events that spawn rumors |

**Special behavior**: Events tagged with `rumor` and `isAutoResolved: true` are auto-selected (one per tick) and spawn rumors via `spawnEventRumor()`.

## Firing Modes

### World Mode (`firingMode: "world"`)

- Evaluated automatically each game tick by `evaluateEvents()`
- Subject to probability rolls and cooldowns
- Appears in pending event queue for player resolution
- Capped at 5 events per tick (priority events excluded)
- Most common mode for narrative/crisis events

### System Mode (`firingMode: "system"`)

- Skipped by `evaluateEvents()` auto-evaluation
- Pushed directly by owning systems (combat, quests, etc.)
- Used for tightly coupled system reactions
- Example: combat victory/defeat reactions, quest completion triggers

## Example Events

### 1. Grumbling in the Ranks (Economy/Social)

```json
{
  "id": "event-unpaid-wages-unrest",
  "title": "Grumbling in the Ranks",
  "description": "Word travels fast in the Warrens. You haven't paid your people on time, and resentment is building. A Compact inspector has taken notice.",
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
        { "type": "addCredits", "delta": -50 },
        { "type": "adjustCityDial", "target": "unrest", "delta": -8 },
        { "type": "addActivityLogEntry", "message": "A goodwill bonus quiets the complaints for now." }
      ]
    },
    {
      "id": "choice-ignore",
      "label": "Ignore it — they'll manage",
      "outcomes": [
        { "type": "adjustCityDial", "target": "unrest", "delta": 5 },
        { "type": "adjustFactionStanding", "target": "faction-civic-compact", "delta": -5 },
        { "type": "addActivityLogEntry", "message": "The complaints are ignored. The Compact files a note." }
      ]
    }
  ],
  "tags": ["economy", "social"],
  "firingMode": "world"
}
```

**Design pattern**: Early-game economic pressure test. Forces player to choose between short-term cost (paying bonus) vs long-term consequences (unrest + faction standing).

### 2. A Gilded Messenger (Faction/Political)

```json
{
  "id": "event-gilded-court-approach",
  "title": "A Gilded Messenger",
  "description": "A courier in House Aurevaine livery arrives with a sealed letter. The Court proposes a meeting — on their terms. You are not foolish enough to think this is a kindness.",
  "triggerConditions": {
    "factionStandingAbove": {
      "factionId": "faction-gilded-court",
      "threshold": -30
    },
    "dayMin": 5,
    "probability": 0.4
  },
  "choices": [
    {
      "id": "choice-accept-meeting",
      "label": "Attend the meeting on Court terms",
      "outcomes": [
        { "type": "adjustFactionStanding", "target": "faction-gilded-court", "delta": 10 },
        { "type": "adjustCityDial", "target": "corruption", "delta": 5 },
        { "type": "addActivityLogEntry", "message": "You attend. The Court notes your cooperation — and your face." },
        { "type": "createQuestLead", "questId": "quest-gilded-auction-guard" }
      ]
    },
    {
      "id": "choice-decline",
      "label": "Decline — send a polite refusal",
      "outcomes": [
        { "type": "adjustFactionStanding", "target": "faction-gilded-court", "delta": -5 },
        { "type": "addActivityLogEntry", "message": "The messenger leaves without a word. The silence is its own answer." }
      ]
    }
  ],
  "tags": ["faction", "political"],
  "sourceDistrictId": "district-gilded-heights",
  "presentationFlavour": "A sealed letter bearing House Aurevaine's crest. The wax is still warm.",
  "firingMode": "world"
}
```

**Design pattern**: Faction-gated content unlock. High-standing players get access to new questlines, with corruption as a trade-off.

### 3. Supply Shortage in the Harbor (Economy/Market)

```json
{
  "id": "event-market-price-spike",
  "title": "Supply Shortage in the Harbor",
  "description": "A dockworkers' dispute has halted three incoming trade barges. Shop prices in the Harbor Ward are climbing. It won't last more than a week — but this week it matters.",
  "triggerConditions": {
    "probability": 0.3,
    "dayMin": 3
  },
  "choices": [
    {
      "id": "choice-buy-ahead",
      "label": "Buy supplies before prices peak (60 Marks)",
      "outcomes": [
        { "type": "addCredits", "delta": -60 },
        { "type": "adjustCityResource", "target": "materialStock", "delta": 8 },
        { "type": "adjustCityDial", "target": "prosperity", "delta": -3 },
        { "type": "addActivityLogEntry", "message": "You buy in. The supplies arrive before the worst of the spike." }
      ]
    },
    {
      "id": "choice-ride-out-spike",
      "label": "Ride it out",
      "outcomes": [
        { "type": "adjustCityDial", "target": "prosperity", "delta": -6 },
        { "type": "addActivityLogEntry", "message": "The prices bite. You manage, but the margin is thinner than you would like." }
      ]
    }
  ],
  "tags": ["economy", "market"],
  "firingMode": "world"
}
```

**Design pattern**: Low-probability economic event. Tests player preparedness and resource management.

## Commands

### evaluateEvents

```typescript
export function evaluateEvents(
  state: GameState,
  rng: Rng,
  seededState?: ReturnType<typeof createRng>,
): GameState
```

**Purpose**: Main event evaluation loop. Scans all world-mode templates, checks conditions, and queues eligible events.

**Key behaviors**:
- Skips system-mode events (handled by their owners)
- Skips events already pending
- Skips events on cooldown
- Applies probability rolls
- Auto-resolves `isAutoResolved` events (including rumor-tagged)
- Caps regular events at 5 per tick
- Priority (`isFirstRun: true`) events always included

### applyEventOutcome

```typescript
export function applyOutcomes(
  state: GameState,
  outcomes: EventOutcome[],
  context?: OutcomeContext,
  seededState?: OutcomeRngState,
): GameState
```

**Purpose**: Execute an array of outcomes against game state.

**Key behaviors**:
- Each outcome type has required field validation
- Missing required fields log warnings and skip the outcome
- NPC state outcomes support dynamic subject resolution
- All numeric modifications are clamped to valid ranges
- Activity log entries are appended (capped at 100 entries)

### spawnEventRumor

```typescript
export function spawnEventRumor(
  state: GameState,
  params: EventRumorParams,
): GameState

type EventRumorParams =
  | { eventType: 'combat-victory' | 'combat-defeat', districtId, enemyFactionId? }
  | { eventType: 'quest-complete', districtId?, questOutcomeType }
  | { eventType: 'faction-milestone', factionId, milestone }
```

**Purpose**: Generate world-reaction rumors from significant events.

**Key behaviors**:
- Matches templates based on event type and context
- Faction-milestone rumors are deduplicated (fire once per playthrough)
- Returns null if no matching template exists
- Rumor includes district, credibility, heat, and subject NPCs

## Authoring Guidelines

### When to Create a New Event

Create an event when:
- A game state threshold should trigger a reactive moment
- A faction relationship should unlock new content
- A city condition (unrest, resources) needs player attention
- An NPC relationship milestone deserves recognition
- You want to create emergent narrative through system interaction

### Template Structure

1. **Start with trigger conditions**: Define the exact game state that should make this event relevant
2. **Write evocative title/description**: These are the player's first touchpoints
3. **Design 2-4 meaningful choices**: Each should have distinct consequences
4. **Layer outcomes**: Combine immediate effects (credits, dials) with long-term effects (quests, relationships)
5. **Add presentation flavor**: Atmospheric text for immersion
6. **Tag appropriately**: Helps with filtering and auto-resolution logic

### Balance Guidelines

- **Early game (days 1-5)**: Lower thresholds, higher probabilities
- **Mid game (days 6-15)**: Moderate thresholds, varied probabilities
- **Late game (day 15+)**: Higher thresholds, story-critical events
- **Probability**: Use 0.3-0.5 for rare events, 0.6-0.8 for common, 1.0 for guaranteed
- **Cooldown**: 7 days default, 3-5 for frequent events, 14+ for major story beats

### Outcome Composition

- **Single-choice outcomes**: 2-4 outcomes per choice typically
- **Layer effects**: Combine immediate (credits) + systemic (faction) + narrative (log entry)
- **Avoid outcome bloat**: More than 5 outcomes per choice becomes hard to track
- **Use messages**: Activity log entries provide player feedback on invisible changes

### Testing Checklist

- [ ] Trigger conditions fire at expected game states
- [ ] All choices have meaningful consequences
- [ ] No outcome references non-existent IDs
- [ ] Tags reflect event category and behavior
- [ ] Presentation flavor matches tone of choice
- [ ] Repeatable events have appropriate cooldowns
- [ ] Auto-resolved events don't block player agency unnecessarily

### Common Patterns

**Crisis Response**: High unrest + player has resources to spend
```json
{ "minUnrest": 60, "probability": 0.6 }
```

**Faction Gating**: Relationship threshold unlocks content
```json
{ "factionStandingAbove": { "factionId": "faction-X", "threshold": 20 } }
```

**Relationship Milestone**: NPC bond triggers personal event
```json
{ "npcRelationshipMin": { "npcId": "npc-Y", "axis": "affinity", "min": 75 } }
```

**Location-Based**: District-specific flavor
```json
{ "currentDistrict": "district-the-hollows" }
```

**Time-Gated**: Story progression gates
```json
{ "dayMin": 10, "dayMax": 20 }
```

## Event Instance Structure

When an event fires, it creates an instance tracked in `GameState.eventInstances`:

```typescript
{
  instanceId: string,        // Unique runtime ID
  eventId: string,           // Template ID reference
  firedOnDay: number,        // Day event triggered
  resolvedOnDay: number|null,// Day resolved (null if pending)
  chosenOptionId: string|null,// Player's choice (null if auto)
  sourceDistrictId: string|null,// Origin district
  sourceNpcId: string|null,  // Origin NPC
  presentationText: string|null,// Custom presentation text
  contextId: string|null,    // Additional context
  expiresOnDay: number|null  // Optional expiration
}
```

This structure enables:
- Event chronicle (player history)
- Cooldown tracking via `lastFiredDay`
- Rumor generation with provenance
- Replayability analysis

---

*See `src/domain/events/contracts.ts` for schema definitions and `data/definitions/events.json` for content examples.*
