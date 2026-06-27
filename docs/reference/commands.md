# Command API Reference

This document provides comprehensive documentation for all commands in the Project Destiny Application layer. Commands are pure state transformers that take a `GameState` and return a new `GameState`, following the clean architecture pattern.

## Command Pattern Overview

In Project Destiny, commands are the primary mechanism for state transformation. Each command:

- Takes `GameState` as input (immutable)
- Returns a new `GameState` with transformations applied
- Never mutates the input state directly
- May log activity entries for player feedback
- Is deterministic when given the same RNG seed

```typescript
export function commandName(state: GameState, params?: Params): GameState {
  // Validate guards
  if (!passesGuards(state)) return state

  // Compute new state
  const newState = { ...state, /* changes */ }

  // Optionally log activity
  return appendActivityLogEntry(newState, 'category', 'message')
}
```

---

## Combat Commands

Commands for initiating and resolving combat encounters.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `startCombatEncounter` | `startCombatEncounter(state: GameState, linkedQuestId?: string): GameState` | Initiates a combat encounter with the player's squad. Builds combatants from roster, enemies from district encounter tables. | `startCombatEncounter(state, 'quest-mercenary-escort')` |
| `performCombatAction` | `performCombatAction(state: GameState, action: CombatAction): GameState` | Executes a player's combat action (attack, defend, advance, guard). Handles turn resolution, enemy AI response, and durability degradation. | `performCombatAction(state, 'attack')` |
| `concludeCombatEncounter` | `concludeCombatEncounter(state: GameState): GameState` | Resolves combat outcome (victory/defeat). Applies loot, relationship changes, fear, renown, and quest settlement. | `concludeCombatEncounter(state)` |

**Combat Actions**: `'attack' \| 'defend' \| 'advance' \| 'guard'`

---

## Inventory Commands

Commands for managing item inventory, equipment, and containers.

### Equipment

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `equipItem` | `equipItem(state: GameState, params: EquipItemParams): GameState` | Equip an item instance on player or NPC. Handles slot validation and stat bonus application. | `equipItem(state, { ownerId: 'player', itemInstanceId: 'inst-sword-1', slot: 'weapon' })` |
| `unequipItem` | `unequipItem(state: GameState, params: { ownerId: string; slot: EquipmentSlotType }): GameState` | Unequip an item from equipment slot, returning it to inventory. | `unequipItem(state, { ownerId: 'npc-id', slot: 'armor' })` |
| `equipClothing` | `equipClothing(state: GameState, params: EquipClothingParams): GameState` | Equip clothing item to specific layer (head, torso, arms, legs, feet, full, undergarments). | `equipClothing(state, { npcId: 'npc-id', layer: 'torso', itemId: 'item-tunic' })` |
| `unequipClothing` | `unequipClothing(state: GameState, params: UnequipClothingParams): GameState` | Unequip clothing from a layer. | `unequipClothing(state, { npcId: 'npc-id', layer: 'head' })` |
| `equipArmor` | `equipArmor(state: GameState, params: EquipArmorParams): GameState` | Equip armor item to armor layer (lightTorso, lightLegs, heavyTorso, heavyLegs, shield). | `equipArmor(state, { npcId: 'npc-id', layer: 'heavyTorso', itemId: 'item-chainmail' })` |
| `unequipArmor` | `unequipArmor(state: GameState, params: UnequipArmorParams): GameState` | Unequip armor from a layer. | `unequipArmor(state, { npcId: 'npc-id', layer: 'shield' })` |

### Containers & Transfers

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `createContainer` | `createContainer(state: GameState, params: CreateContainerParams): GameState` | Create a new inventory container (backpack, chest, crate, vault, etc.). | `createContainer(state, { ownerId: 'player', containerType: 'backpack', maxSlots: 20 })` |
| `transferItem` | `transferItem(state: GameState, params: TransferItemParams): GameState` | Transfer item between inventories (player, NPC, containers). Validates source/destination. | `transferItem(state, { fromType: 'player_inventory', fromId: 'player', toType: 'npc_inventory', toId: 'npc-id', itemInstanceId: 'inst-item-1', quantity: 1 })` |

---

## Economy Commands

Commands for economic transactions and wage management.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `purchaseItemFromShop` | `purchaseItemFromShop(state: GameState, shopId: string, itemId: string): GameState` | Purchase item from district shop. Applies market pressure pricing. | `purchaseItemFromShop(state, 'shop-pale-general', 'item-medkit')` |
| `sellItem` | `sellItem(state: GameState, instanceId: string): GameState` | Sell item to current district. Price based on trade value and market pressure. | `sellItem(state, 'inst-item-1')` |
| `computeSellPrice` | `computeSellPrice(state: GameState, instanceId: string): number` | Calculate the sell price for an item (helper, not a state transformer). | `const price = computeSellPrice(state, 'inst-item-1')` |
| `applyWages` | `applyWages(state: GameState): GameState` | Process daily wage payments. Handles loyalty decay for unpaid wages, NPC departures after 14 days arrears. | `applyWages(state)` |

**Wage Policy**: Retainers (4 Mk), Mercenaries (8 Mk base), Citizens (5 Mk), Servants (2 Mk), Apprentices (3 Mk), Nobles (14 Mk). Kitchen intact reduces costs by 1 Mk per NPC.

---

## NPC Agency & Recruitment Commands

Commands for managing NPCs, hiring, and roster operations.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `recruitNpc` | `recruitNpc(state: GameState, npcId: string): GameState` | Hire an available NPC from the hire offers. Pays signing bonus, initializes relationships. | `recruitNpc(state, 'npc-id')` |
| `acquireBoundHireOffer` | `acquireBoundHireOffer(state: GameState, npcId: string): GameState` | Acquire a bound NPC through debt settlement. Creates bond contract with intake fee. | `acquireBoundHireOffer(state, 'npc-id')` |
| `dismissNpc` | `dismissNpc(state: GameState, npcId: string): GameState` | Release an NPC from the roster. Writes loss memories for related NPCs. | `dismissNpc(state, 'npc-id')` |
| `expireHireOffers` | `expireHireOffers(state: GameState): GameState` | Decrement turn counters on hire offers, remove expired ones. | `expireHireOffers(state)` |
| `generateDistrictHireOffers` | `generateDistrictHireOffers(state: GameState, districtId: string): GameState` | Generate new hire offers when traveling to a district. | `generateDistrictHireOffers(state, 'district-pale')` |

---

## Relationship & Social Commands

Commands for building relationships and social interactions.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `courtNpc` | `courtNpc(state: GameState, npcId: string): GameState` | Court an NPC to build relationship. Gains affinity, trust, respect. Context-aware (deployment, captivity, ward status). | `courtNpc(state, 'npc-id')` |
| `deepConversation` | `deepConversation(state: GameState, npcId: string): GameState` | Have a deep conversation about values, fears, dreams, or past. Topic selected based on NPC traits. | `deepConversation(state, 'npc-id')` |
| `engagePhysicalIntimacy` | `engagePhysicalIntimacy(state: GameState, npcId: string, options: EngagePhysicalIntimacyOptions): GameState` | Engage in physical intimacy. Requires appropriate intimacy stage, handles contraception, pregnancy risk. | `engagePhysicalIntimacy(state, 'npc-id', { contraceptionItemId: 'inst-contraceptive', intent: 'avoid-pregnancy' })` |
| `giftItemToNpc` | `giftItemToNpc(state: GameState, payload: { instanceId: string; npcId: string }): GameState` | Give a gift to an NPC. Effectiveness based on gift type and NPC traits (scholar, noble, working-district). | `giftItemToNpc(state, { instanceId: 'inst-gift-1', npcId: 'npc-id' })` |
| `applyRelationshipDelta` | `applyRelationshipDelta(state: GameState, fromId: string, toId: string, axis: Axis, delta: number): { key: string; oldValue: number; newValue: number; significant: boolean }` | Apply a delta to a relationship axis (affinity, respect, fear, trust, loyalty). | `applyRelationshipDelta(state, 'player', 'npc-id', 'trust', 5)` |
| `applyProximityGains` | `applyProximityGains(state: GameState, npcIds: string[]): GameState` | Apply passive relationship gains for NPCs spending time together. | `applyProximityGains(state, ['npc-1', 'npc-2'])` |
| `applyPassiveDrift` | `applyPassiveDrift(state: GameState): GameState` | Apply passive trust decay over time. Modulated by loyalty and compatibility. | `applyPassiveDrift(state)` |

**Relationship Axes**: `affinity` \| `respect` \| `fear` \| `trust` \| `loyalty`

**Intimacy Stages**: `none` → `affinity` → `attachment` → `committed`

---

## Romance & Intimacy Commands

Commands for romance arc progression.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `advanceRomanceArc` | `advanceRomanceArc(state: GameState, npcId: string): GameState` | Check and advance intimacy stage based on relationship metrics. | `advanceRomanceArc(state, 'npc-id')` |
| `proposeDate` | `proposeDate(state: GameState, params: DateProposalParams): GameState` | Propose a date to an NPC. Validates intimacy stage, availability, cooldowns. | `proposeDate(state, { proposerNpcId: 'player', targetNpcId: 'npc-id', dateTemplateId: 'date-quiet-walk', proposedDay: state.day + 1, proposedTimeSlot: 'evening', proposedLocation: null })` |
| `proposeDateWithPlayer` | `proposeDateWithPlayer(state: GameState, params: Omit<DateProposalParams, 'proposerNpcId'>): GameState` | Convenience wrapper for player-initiated date proposals. | `proposeDateWithPlayer(state, { targetNpcId: 'npc-id', dateTemplateId: 'date-shared-meal', ... })` |

**Date Templates**: `date-quiet-walk` (affinity), `date-shared-meal` (affinity), `date-music-night` (attachment), `date-workshop-project` (affinity), `date-private-ritual` (committed), `date-district-exploration` (attachment), `date-quiet-morning` (attachment)

---

## Quest Commands

Commands for quest lifecycle management.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `addQuestLeadIfNew` | `addQuestLeadIfNew(state: GameState, questId: string, overrides?: QuestLeadOverrides): boolean` | Add a quest lead if not already available/active/completed. Checks faction standing requirements. | `addQuestLeadIfNew(state, 'quest-mercenary-escort')` |
| `acceptQuestFromLead` | `acceptQuestFromLead(state: GameState, questId: string): boolean` | Accept a quest lead, creating active quest runtime. | `acceptQuestFromLead(state, 'quest-mercenary-escort')` |
| `expireTimedQuestsOnState` | `expireTimedQuestsOnState(state: GameState): void` | Check and fail expired timed quests. | `expireTimedQuestsOnState(state)` |
| `resolveSimpleContractObjective` | `resolveSimpleContractObjective(state: GameState, questId: string): boolean` | Resolve delivery/survival quests that have completed on-site steps. | `resolveSimpleContractObjective(state, 'quest-delivery-1')` |
| `advanceToOnSiteStep` | `advanceToOnSiteStep(state: GameState, questId: string): boolean` | Advance delivery/survival quest from initial to on-site step. | `advanceToOnSiteStep(state, 'quest-delivery-1')` |
| `resolveWithComplicationCheck` | `resolveWithComplicationCheck(state: GameState, questId: string, complicationRiskOverride?: number): 'success' \| 'failed' \| 'in_progress' \| 'not_ready' \| 'not_applicable'` | Resolve quest with complication risk check. Handles watch-based progress for survival quests. | `resolveWithComplicationCheck(state, 'quest-survival-1')` |

---

## Expedition Commands

Commands for expedition management and encounters.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `generateExpeditionEncounter` | `generateExpeditionEncounter(day: number, dangerLevel: number, random: number): { type: 'combat' \| 'event' \| 'discovery' \| 'none'; label: string }` | Generate random encounter for expedition day. | `generateExpeditionEncounter(3, 2, Math.random())` |
| `rollDiscovery` | `rollDiscovery(discoveryTable: Array<...>, random: number): ExpeditionDiscovery \| null` | Weighted random selection from discovery table. | `rollDiscovery(discoveryTable, Math.random())` |
| `applyExpeditionDiscoveries` | `applyExpeditionDiscoveries(state: GameState, discoveries: ExpeditionDiscovery[]): GameState` | Apply expedition discoveries (items, marks, lore) to state. | `applyExpeditionDiscoveries(state, discoveries)` |

---

## Time & Daily Cycle Commands

Commands for time advancement and daily simulation.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `endDay` | `endDay(state: GameState): GameState` | End-of-day orchestration. Runs 15 phases: wages, decay, corridor, resources, consequences, time, politics, events, social simulation, personality, pairing, bonding, captivity, quests, faction directives. | `endDay(state)` |
| `advanceTimeSlotInState` | `advanceTimeSlotInState(state: GameState): GameState` | Advance current time slot (morning → afternoon → evening → night → next day morning). | `advanceTimeSlotInState(state)` |

**EndDay Phases**:
1. **WAGES** - Economic obligations
2. **DECAY** - State decay and thresholds
3. **CORRIDOR** - Food supply chain
4. **RESOURCES** - City resource consequences
5. **CONSEQUENCES** - Relationship drift, NPC departure
6. **TIME_ADVANCE** - Day increment, house repairs
7. **POLITICS** - Faction dynamics
8. **EVENTS** - Event lifecycle
9. **SOCIAL_SIMULATION** - World NPC simulation
10. **PERSONALITY** - Opponent pressure, trait drift
11. **PAIRING** - NPC-to-NPC intimacy
12. **BONDING** - Legacy, pregnancy, bonds
13. **CAPTIVITY** - Captivity degradation
14. **QUESTS** - Quest expiry
15. **FACTION_DIRECTIVES** - Generate directives

---

## Food & Resources Commands

Commands for food production and consumption.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `applyFoodConsumption` | `applyFoodConsumption(state: GameState): GameState` | Calculate daily food consumption. Roster NPCs consume 1 unit/day each. | `applyFoodConsumption(state)` |
| `applyFoodProduction` | `applyFoodProduction(state: GameState): GameState` | Generate food from district farms/gardens. | `applyFoodProduction(state)` |
| `cookMeal` | `cookMeal(state: GameState, npcId: string, mealType: MealType): GameState` | Cook a meal with an NPC. Simple (5 Mk), Hearty (15 Mk), Feast (30 Mk). Builds relationship. | `cookMeal(state, 'npc-id', 'hearty')` |

**Meal Types**: `simple` (trust+2, affinity+2, loyalty+1) \| `hearty` (trust+4, affinity+4, loyalty+2) \| `feast` (trust+6, affinity+6, loyalty+4)

---

## Travel Commands

Commands for district travel and movement.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `travelToDistrict` | `travelToDistrict(state: GameState, districtId: string): GameState` | Travel to a district. Checks faction standing requirements, generates hire offers, advances time slot. | `travelToDistrict(state, 'district-undercity')` |

---

## Housing Commands

Commands for house management and room functions.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `setHousePolicy` | `setHousePolicy(state: GameState, params: SetHousePolicyParams): GameState` | Set house-wide policies (e.g., NPC pairing policy). | `setHousePolicy(state, { policyType: 'npcPairing', value: 'discouraged' })` |
| `assignRoomFunction` | `assignRoomFunction(state: GameState, params: AssignRoomFunctionParams): GameState` | Assign a function to a room (kitchen, barracks, workshop, etc.). | `assignRoomFunction(state, { roomId: 'room-1', function: 'kitchen' })` |
| `decorateRoom` | `decorateRoom(state: GameState, params: DecorateRoomParams): GameState` | Decorate a room with items, improving function effectiveness. | `decorateRoom(state, { roomId: 'room-1', decorationType: 'luxury' })` |

---

## Captivity Commands

Commands for managing captivity mechanics.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `applyCaptivityRestitution` | `applyCaptivityRestitution(state: GameState, params: ApplyCaptivityRestitutionParams): GameState` | Process restitution for captives (ransom, release, etc.). | `applyCaptivityRestitution(state, { captiveNpcId: 'npc-id', restitutionType: 'ransom', amount: 50 })` |
| `confiscateCaptivityItems` | `confiscateCaptivityItems(state: GameState, params: ConfiscateCaptivityItemsParams): GameState` | Confiscate items from a captive upon intake. | `confiscateCaptivityItems(state, { captiveNpcId: 'npc-id' })` |
| `applyCaptivityDegradation` | `applyCaptivityDegradation(state: GameState): GameState` | Apply daily degradation to captives (health, morale, hope). | `applyCaptivityDegradation(state)` |
| `checkMainQuestProgression` | `checkMainQuestProgression(state: GameState): GameState` | Check if main quest (Mira rescue) should progress based on captivity state. | `checkMainQuestProgression(state)` |

---

## Event Commands

Commands for event handling and resolution.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `applyEventOutcome` | `applyEventOutcome(state: GameState, params: ApplyEventOutcomeParams): GameState` | Apply outcome of an event choice. Updates state based on event effects. | `applyEventOutcome(state, { eventId: 'event-1', choiceId: 'choice-a' })` |
| `publishEvent` | `publishEvent(state: GameState, eventType: string, payload: object, visibility: string, options?: object): GameState` | Publish a world event (NPC hired, departed, combat victory/defeat, etc.). | `publishEvent(state, 'npc-hired', { npcId: 'npc-id' }, 'player')` |
| `spawnEventRumor` | `spawnEventRumor(state: GameState, params: SpawnEventRumorParams): GameState` | Spawn a rumor about an event that spreads through the city. | `spawnEventRumor(state, { eventType: 'combat-victory', districtId: 'district-pale' })` |

---

## Faction Commands

Commands for faction relations and activities.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `applyFactionActivity` | `applyFactionActivity(state: GameState): GameState` | Process faction activities (directives, operations, territorial shifts). | `applyFactionActivity(state)` |
| `applyPolitics` | `applyPolitics(state: GameState): GameState` | Process political dynamics (alliances, rivalries, power shifts). | `applyPolitics(state)` |
| `applyTitleEffects` | `applyTitleEffects(state: GameState): GameState` | Apply daily effects of held titles (income, standing, special abilities). | `applyTitleEffects(state)` |

---

## Simulation Commands

Commands for world simulation and NPC agency.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `applyNpcPairing` | `applyNpcPairing(state: GameState): GameState` | Process NPC-to-NPC pairing and intimacy based on house policy. | `applyNpcPairing(state)` |
| `applyHouseholdIntimacy` | `applyHouseholdIntimacy(state: GameState): GameState` | Process intimacy events within the household. | `applyHouseholdIntimacy(state)` |
| `applyWorldNpcSocialSimulation` | `applyWorldNpcSocialSimulation(state: GameState): GameState` | Run world NPC social simulation (agency, relationships, events). | `applyWorldNpcSocialSimulation(state)` |
| `applyRumorSpread` | `applyRumorSpread(state: GameState): GameState` | Spread rumors through the city network. | `applyRumorSpread(state)` |
| `applyNpcTraitDrift` | `applyNpcTraitDrift(state: GameState): GameState` | Apply passive trait drift to NPCs over time. | `applyNpcTraitDrift(state)` |

---

## Utility Commands

Helper commands used across the application.

| Command | Signature | Description | Example |
|---------|-----------|-------------|---------|
| `appendActivityLogEntry` | `appendActivityLogEntry(state: GameState, category: ActivityCategory, message: string): GameState` | Add entry to activity log (max 100 entries, LRU eviction). | `appendActivityLogEntry(state, 'combat', 'Enemy defeated.')` |
| `createRng` | `createRng(seed: number): { rng: () => number; getSeed: () => number }` | Create seeded RNG for deterministic randomness. | `const { rng } = createRng(state.rngSeed)` |

**Activity Categories**: `'economy'` \| `'combat'` \| `'system'`

---

## Source Files

All commands are located in `src/application/commands/`:

```
src/application/commands/
├── activityLog.ts
├── adjustRelationship.ts
├── advanceRomanceArc.ts
├── applyWages.ts
├── combat.ts
├── combatAI.ts
├── combatAftermath.ts
├── combatResolution.ts
├── combatants.ts
├── cookMeal.ts
├── courtNpc.ts
├── deepConversation.ts
├── districtTravel.ts
├── endDay.ts
│   └── handlers/
│       ├── handleWagesPhase.ts
│       ├── handleDecayPhase.ts
│       ├── handleCorridorPhase.ts
│       ├── handleResourcesPhase.ts
│       ├── handleConsequencesPhase.ts
│       ├── handleTimeAdvancePhase.ts
│       ├── handlePoliticsPhase.ts
│       ├── handleEventsPhase.ts
│       ├── handleSocialSimulationPhase.ts
│       ├── handlePersonalityPhase.ts
│       ├── handlePairingPhase.ts
│       ├── handleBondingPhase.ts
│       ├── handleCaptivityPhase.ts
│       ├── handleQuestsPhase.ts
│       └── handleFactionDirectivesPhase.ts
├── expedition.ts
├── giftItem.ts
├── inventory/
│   ├── createContainer.ts
│   ├── equipItem.ts
│   ├── inventoryHelpers.ts
│   └── transferItem.ts
├── intentions/
│   ├── moneyEarning/
│   │   ├── begForCoin.ts
│   │   ├── blackMarketTrade.ts
│   │   ├── scavengeForSell.ts
│   │   └── seekTips.ts
│   └── ...
├── npcAgency/
│   ├── bondAgency.ts
│   ├── contactAgency.ts
│   ├── factionAgency.ts
│   ├── movementAgency.ts
│   └── ...
├── purchase.ts
├── questLifecycle.ts
├── recruitment.ts
├── sellItem.ts
├── useItem.ts
└── ...
```

---

## Notes

- All commands are **pure functions** - no side effects, no mutations
- Commands return **unchanged state** if guards fail (early return)
- Activity log entries provide **player feedback** for significant actions
- RNG seeds ensure **deterministic simulation** for replayability
- Commands are **layer-agnostic** - they don't know about UI or Infrastructure
