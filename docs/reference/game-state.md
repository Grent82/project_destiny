# GameState Data Dictionary

Comprehensive documentation of the `GameState` structure used throughout Project Destiny.

## Overview

`GameState` is the central state object in the Application layer. It represents the complete mutable state of the game at any point in time. All commands are pure state transformers that take `GameState` as input and return a new `GameState` with transformations applied.

**Location**: `src/domain/game/contracts.ts`

**Schema**: `gameStateSchema` (Zod)

**Type**: `GameState = z.infer<typeof gameStateSchema>`

---

## Core Principles

1. **Immutability**: Commands never mutate state directly - they return new state objects
2. **Determinism**: Given the same `rngSeed`, state transformations are deterministic
3. **Validation**: State is validated with Zod schemas on load and before persistence
4. **Versioning**: `saveVersion` field tracks schema version for migration

---

## Top-Level Fields

### Time & Progression

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `day` | `number` | 1 | Current game day (1-indexed) | R: All, W: `handleTimeAdvancePhase` |
| `timeSlot` | `'morning' \| 'afternoon' \| 'evening' \| 'night'` | `'morning'` | Current time slot within the day | R: All, W: `handleTimeAdvancePhase` |
| `rngSeed` | `number` | 42 | Seed for deterministic RNG | R: Commands needing randomness, W: After each random operation |

### Player State

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `protagonistName` | `string` | "" | Player character name | R: UI, W: Character creation |
| `hasSeenOpening` | `boolean` | false | Whether player has seen opening sequence | R: UI, W: After opening |
| `money` | `number` | 0 | Player's current coin (Mark) | R: Economy commands, W: `applyWages`, `purchaseItemFromShop`, `sellItem` |
| `playerCharacter` | `PlayerCharacter` | See below | Player attributes, skills, traits, combat state | R: All player actions, W: Level-up, training |
| `debtAmount` | `number` | 800 | Outstanding debt (main quest driver) | R: Debt checks, W: `payDebt` |
| `debtPaid` | `boolean` | false | Whether debt has been paid | R: Quest checks, W: `payDebt` |
| `debtDueDay` | `number` | 30 | Day debt is due | R: Debt warnings, W: None (static) |

### Political State

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `cityDials` | `CityDial` | See below | City stability dials (order, freedom, prosperity) | R: UI, W: `adjustCityDial` |
| `factionStandings` | `Record<string, number>` | {} | Standing with each faction (-100 to 100) | R: Travel, recruitment, W: `applyRelationshipDelta` |
| `factionStates` | `FactionRuntimeState[]` | [] | Detailed faction runtime state | R: Faction commands, W: `applyFactionActivity` |
| `councilSeats` | `CouncilSeatCount` | {} | Council seats held by faction | R: Politics UI, W: `applyVoteEffects` |
| `houseWardSeats` | `number` | 0 | House ward seats held | R: Politics UI, W: `houseWard` |
| `institutionalStanding` | `Record<string, InstitutionalTier>` | {} | Standing with institutions | R: Access checks, W: Title effects |
| `districtTension` | `Record<string, number>` | {} | Tension level per district (0-100) | R: Encounter generation, W: `adjustDistrictTension` |

### Districts & Travel

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `districts` | `DistrictRuntimeState[]` | [] | Runtime state of all districts | R: Travel, encounters, W: `applyFactionActivity` |
| `currentDistrictId` | `string \| null` | null | Current district (null if in house) | R: Shop access, W: `travelToDistrict` |
| `houseDistrictId` | `string` | `'district-the-pale'` | House location district | R: House commands, W: House move |

### Roster & NPCs

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `roster` | `NpcRuntimeState[]` | [] | NPCs currently in player's employ | R: All roster operations, W: `recruitNpc`, `dismissNpc` |
| `worldNpcStates` | `WorldNpcRuntimeState[]` | [] | World NPCs (not in roster) | R: Social simulation, W: `applyWorldNpcSocialSimulation` |
| `availableForHire` | `HireOffer[]` | [] | NPCs available for hire | R: Hire UI, W: `generateDistrictHireOffers`, `recruitNpc` |
| `npcCaptivityStates` | `Record<string, CaptivityState>` | {} | Captive NPC states | R: Captivity UI, W: `setNpcCaptivityState` |
| `npcSitePresences` | `NpcSitePresence[]` | [] | NPCs at sites (expeditions, etc.) | R: Site management, W: Expedition commands |
| `bondVisibility` | `Record<string, BondVisibility>` | {} | Bond status visibility | R: Bond UI, W: Bond operations |

### Inventory

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `inventoryState` | `InventoryState` | See below | Player and NPC inventory state | R: All inventory ops, W: `equipItem`, `transferItem` |
| `houseStorageCapacity` | `number` | 40 | House storage slot capacity | R: Storage UI, W: `installModule` |
| `installedHouseModules` | `InstalledModule[]` | [] | Installed house modules | R: Module effects, W: `installModule` |

### Combat

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `selectedSquadNpcIds` | `string[]` | [] | NPCs selected for squad (max 6) | R: Combat, expeditions, W: Squad commands |
| `activeCombat` | `ActiveCombatState \| null` | null | Current combat encounter | R: Combat resolution, W: `startCombatEncounter`, `concludeCombatEncounter` |
| `lastEncounterSummary` | `EncounterSummary \| null` | null | Summary of last combat | R: Chronicle, W: `concludeCombatEncounter` |
| `equippedItemDurabilities` | `Record<string, Record<slot, number>>` | {} | Durability of equipped items | R: Combat, W: `performCombatAction` |

### Quests

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `availableQuestLeads` | `QuestLeadRuntime[]` | [] | Available quest leads | R: Quest UI, W: `addQuestLeadIfNew` |
| `activeQuests` | `QuestRuntime[]` | [] | Currently active quests | R: Quest tracking, W: Quest lifecycle |
| `completedQuestIds` | `string[]` | [] | IDs of completed quests | R: Quest checks, W: `settleQuestSuccess` |
| `failedQuestIds` | `string[]` | [] | IDs of failed quests | R: Quest checks, W: `settleQuestFailure` |
| `questHistory` | `QuestRuntime[]` | [] | All quests (completed, failed, active) | R: History UI, W: Quest settlement |
| `activeInvestigation` | `InvestigationState \| null` | null | Current investigation state | R: Investigation UI, W: `investigation` |
| `lastInvestigationResult` | `LastInvestigationResult \| null` | null | Result of last investigation | R: Chronicle, W: `investigation` |
| `mainQuest` | `MainQuestState` | `{ stage: 'searching' }` | Main quest (Mira rescue) stage | R: Main UI, W: `checkMainQuestProgression` |

### Events

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `pendingEvents` | `PendingEvent[]` | [] | Events waiting to be published | R: Event resolution, W: `createPendingEvent` |
| `eventInstances` | `EventInstance[]` | [] | Resolved event instances | R: Event history, W: `publishEvent` |
| `lastResolvedEventSummary` | `LastResolvedEventSummary \| null` | null | Summary of last event | R: Chronicle, W: `applyEventOutcome` |
| `worldEvents` | `WorldEvent[]` | [] | World events (max 100) | R: Event system, W: Event publishing |

### Relationships

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `relationships` | `Record<string, RelationshipAxes>` | {} | Relationship axes per NPC | R: Social commands, W: `applyRelationshipDelta` |
| `house.relationshipMilestones` | `RelationshipMilestone[]` | [] | Relationship milestone history | R: UI, W: `advanceRomanceArc` |
| `house.lastDomesticRelationshipBeat` | `DomesticRelationshipBeat \| null` | null | Last NPC pairing event | R: Chronicle, W: `applyNpcPairing` |

### Date & Romance

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `pendingDateProposals` | `DateProposal[]` | [] | Pending date proposals | R: Date UI, W: `proposeDate` |
| `scheduledDates` | `ScheduledDate[]` | [] | Scheduled dates | R: Date calendar, W: Date scheduling |
| `npcDateCooldowns` | `Record<string, number>` | {} | Date cooldowns per NPC | R: Date checks, W: Date completion |

### House

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `house` | `HouseState` | See below | House rooms, policies, heirs | R: House UI, W: House commands |
| `houseDistrictId` | `string` | `'district-the-pale'` | House location | R: House commands, W: House move |

### City Resources

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `cityResources` | `CityResources` | See below | Food, water, materials, corridor | R: Resource UI, W: `applyFoodConsumption`, `applyCorridorImport` |

### Expedition

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `expeditionState` | `ExpeditionState` | `{ status: 'idle' }` | Current expedition state | R: Expedition UI, W: Expedition commands |

### Chronicle & Logging

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `activityLog` | `ActivityLogEntry[]` | [] | Activity log (max 100) | R: UI, W: `appendActivityLogEntry` |
| `chronicle` | `Chronicle` | `{ entriesByDay: {}, version: 1 }` | Chronicle entries by day | R: Chronicle UI, W: Chronicle updates |
| `rumors` | `Rumor[]` | [] | Active rumors | R: Rumor UI, W: `spawnEventRumor` |

### Debt & Main Quest

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `debtAmount` | `number` | 800 | Outstanding debt | R: Debt warnings, W: `payDebt` |
| `debtClaimantNpcId` | `string` | `'npc-enemy-harlen-voss'` | Debt claimant NPC | R: Debt UI, W: None |
| `debtEnforcementFactionId` | `string` | `'faction-gilded-court'` | Enforcement faction | R: Debt UI, W: None |
| `debtBeneficiaryFactionId` | `string` | `'faction-house-merrow'` | Beneficiary faction | R: Debt UI, W: None |
| `debtDueDay` | `number` | 30 | Day debt is due | R: Debt warnings, W: None |
| `debtCrisisTriggered` | `boolean` | false | Whether debt crisis triggered | R: Quest checks, W: Debt crisis |

### System

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `saveVersion` | `number` | 5 | Save schema version | R: Migration, W: Save migration |
| `isFirstRun` | `boolean` | true | Whether this is first game run | R: Onboarding, W: After first run |
| `lastFiredDay` | `Record<string, number>` | {} | Last day each daily effect fired | R: Daily checks, W: Daily effects |
| `rivalOrgActions` | `RivalOrgAction[]` | [] | Rival org action history | R: Rival UI, W: `simulateRivalOrgs` |
| `cityStability` | `number` | 60 | City stability (0-100) | R: Stability checks, W: Faction activity |

### Dialogue

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `activeDialogueId` | `string \| null` | null | Current active dialogue | R: Dialogue UI, W: Dialogue start/end |
| `activeDialogueNodeId` | `string \| null` | null | Current dialogue node | R: Dialogue UI, W: Node navigation |
| `visitedDialogueNodes` | `Record<string, string>` | {} | Visited dialogue nodes | R: Dialogue state, W: Node visits |
| `resolvedDialogueChoices` | `Record<string, string[]>` | {} | Resolved dialogue choices | R: Dialogue conditions, W: Choice resolution |

### Stash & Lore

| Field | Type | Default | Description | Read/Write |
|-------|------|---------|-------------|------------|
| `stash` | `{ weapons: string[], armors: string[] }` | `{ weapons: [], armors: [] }` | Stashed weapon/armor IDs | R: Stash UI, W: Stash operations |
| `householdLore` | `HouseholdLore` | See below | Household lore and history | R: Lore UI, W: Lore updates |
| `bondedPersonsRegistry` | `Record<string, string[]>` | {} | Bonded persons per NPC | R: Bond UI, W: Bond operations |

---

## Nested Structures

### PlayerCharacter

```typescript
{
  name: string
  backgroundId?: string
  attributes: {
    might: number      // 0-100
    agility: number    // 0-100
    endurance: number  // 0-100
    intellect: number  // 0-100
    perception: number // 0-100
    presence: number   // 0-100
    resolve: number    // 0-100
  }
  skills: {
    melee: number
    ranged: number
    medicine: number
    administration: number
    engineering: number
    negotiation: number
    survival: number
    security: number
    crafting: number
    performance: number
    academics: number
    intrigue: number
  }
  traits: {
    discipline: number
    ambition: number
    empathy: number
    ruthlessness: number
    prudence: number
    curiosity: number
    dominance: number
    loyalty: number
    vanity: number
    zeal: number
  }
  combatState?: {
    health: number    // 0-100, default 80
    morale: number    // 0-100, default 70
    injury: number    // 0-100, default 0
  }
  level: number       // default 1
  renown: number      // 0+, default 0
}
```

**Read/Write Commands**:
- Read: All player actions
- Write: `applyTitleEffects` (renown), training commands (skills/attributes)

---

### InventoryState

```typescript
{
  player: {
    equipmentSlots: {
      weapon: string | null
      armor: string | null
      accessory_1: string | null
      accessory_2: string | null
    }
    bagContainers: BagContainer[]
    totalBagSlots: number      // default 40
    usedBagSlots: number
  }
  npcInventories: Record<npcId, BagContainer[]>
  sharedContainers: Container[]
  itemRegistry: Record<instanceId, ItemInstance>
}
```

**Read/Write Commands**:
- Read: All inventory operations
- Write: `equipItem`, `unequipItem`, `transferItem`, `createContainer`, `addPlayerItem`, `removePlayerItem`

---

### HouseState

```typescript
{
  rooms: HouseRoom[]
  vaultUnlocked: boolean
  rosterBonus: number
  exteriorState: 'ruined' | 'patched' | 'maintained' | 'restored' | 'grand'
  fortificationLevel: number  // 0-5
  houseHeirs: Heir[]          // max 2
  npcPairingPolicy: 'open' | 'discouraged' | 'forbidden'
  lastDomesticRelationshipBeat: DomesticRelationshipBeat | null
  relationshipMilestones: RelationshipMilestone[]
}
```

#### HouseRoom

```typescript
{
  roomId: string
  name: string
  state: 'intact' | 'damaged' | 'stripped' | 'destroyed' | 'locked' | 'collapsed'
  repairCost: number
  repairDaysRemaining: number
  searched: boolean
  roomFunction: 'quarters' | 'barracks' | 'kitchen' | 'study' | 'workshop' | 'archive' | 'infirmary' | 'vault' | 'reception' | null
  upgradeTier: 'basic' | 'improved' | 'refined' | 'luxurious'
  decorStyle: string | null
}
```

**Read/Write Commands**:
- Read: House UI, room function checks
- Write: `assignRoomFunction`, `decorateRoom`, `tickHouseRepairs`, `setHousePolicy`

---

### CityResources

```typescript
{
  foodSecurity: number      // 0-100
  foodStock: number
  foodCapacity: number
  waterAccess: number       // 0-100
  materialStock: number
  corridorStatus: 'open' | 'disrupted' | 'blocked'
  corridorClearanceProgressDays: number
  activeGroups: CorridorGroup[]
  groupHistory: CorridorGroup[]
}
```

**Read/Write Commands**:
- Read: Resource UI, food checks
- Write: `applyFoodConsumption`, `applyFoodProduction`, `applyCorridorImport`, `reopenCorridor`

---

### MainQuestState

```typescript
{
  stage: 'searching' | 'lead-found' | 'location-known' | 'rescued' | 'epilogue'
  lastClue: string
}
```

**Read/Write Commands**:
- Read: Main quest UI
- Write: `checkMainQuestProgression`, `discoverQuestClue`

---

### CityDial (politicalDialsSchema)

```typescript
{
  order: number      // 0-100
  freedom: number    // 0-100
  prosperity: number // 0-100
}
```

**Read/Write Commands**:
- Read: City status UI
- Write: `adjustCityDial`

---

### RelationshipAxes

```typescript
{
  affinity: number   // 0-100
  respect: number    // 0-100
  fear: number       // 0-100
  trust: number      // 0-100
  loyalty: number    // 0-100
}
```

**Read/Write Commands**:
- Read: Relationship UI, social checks
- Write: `applyRelationshipDelta`, `courtNpc`, `deepConversation`, `giftItemToNpc`

---

## Anti-Patterns & Best Practices

### DO NOT: Direct Mutation

```typescript
// BAD - Direct mutation
state.money += 100

// GOOD - Return new state
return { ...state, money: state.money + 100 }
```

### DO NOT: Access Without Guards

```typescript
// BAD - May be null
state.activeCombat.combatants

// GOOD - Guard first
if (!state.activeCombat) return state
const combatants = state.activeCombat.combatants
```

### DO NOT: Ignore RNG Seed

```typescript
// BAD - Non-deterministic
const roll = Math.random()

// GOOD - Use seeded RNG
const rng = createRng(state.rngSeed)
const roll = rng()
return { ...state, rngSeed: rng.getSeed() }
```

### DO NOT: Read lastFiredDay Without Initialization

```typescript
// BAD - May not exist
const lastDay = state.lastFiredDay[effectKey]

// GOOD - Initialize if missing
const lastDay = state.lastFiredDay[effectKey] ?? 0
```

### DO: Use Activity Log for Player Feedback

```typescript
// Good - Player sees this
return appendActivityLogEntry(newState, 'combat', 'Enemy defeated.')
```

### DO: Return Unchanged State on Guard Failure

```typescript
// Good - No state change if guards fail
if (!passesGuards(state)) return state
```

---

## Cross-References

- [Command API Reference](./commands.md) - All commands that read/write GameState
- [Architecture](../architecture.md) - Clean architecture overview
- [Engineering Standards](../engineering-standards.md) - Coding standards
