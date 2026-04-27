# Project Destiny

## Browser Game Design Document

### Purpose

This document translates the high-level structure of *Masters of Raana* into an original browser-game design reference. The goal is not to clone that game, but to capture the parts that make it compelling as a systems-heavy simulation RPG:

- interconnected NPC simulation
- evolving traits and short-term states
- jobs, titles, economy, and equipment
- faction politics and city-level world changes
- lightweight tactical combat
- relationship, household, and generational systems

The intended result is a browser game with strong systemic depth, data-driven content, and a practical implementation scope for an MVP.

## 1. Design Goals

### Primary goals

- Build a character-driven simulation RPG for the browser.
- Build a dark medieval fantasy roleplaying game with strong systemic depth.
- Make NPCs matter across multiple systems at once.
- Let combat, economy, politics, and relationships affect each other.
- Make attraction, partnership, and lineage strategically meaningful without displacing the broader roleplaying focus.
- Prefer menu- and panel-driven gameplay over expensive real-time simulation.
- Keep the game highly data-driven so content can scale without rewriting systems.

### Non-goals

- Do not build a direct clone of any existing game.
- Do not start with multiplayer.
- Do not start with open-world movement or animation-heavy presentation.
- Do not model every subsystem from the inspiration source in version one.

## 2. High-Level Concept

The player runs a small organization inside a living city. That organization may be a mercenary house, trading household, academy, investigation bureau, smuggling ring, noble estate, or hybrid faction depending on narrative framing.

The overall fantasy should read as dark medieval roleplaying first: dangerous districts, political tension, material scarcity, status struggle, and expedition or household management inside a harsh world.

The player manages:

- a roster of NPCs
- equipment and inventory
- jobs and assignments
- relationships, households, and heirs
- city navigation and district access
- faction reputation and political pressure
- tactical missions and conflicts

Each NPC is not just a combatant. They are also:

- a worker
- a social actor
- a faction asset
- a relationship target
- a source of passive bonuses when assigned correctly

This cross-system identity is the core of the game.

## 3. Core Gameplay Pillars

### 3.1 NPC Simulation

NPCs are persistent entities with:

- identity
- background
- status or rank
- attributes
- skills
- traits
- short-term states
- relationships
- equipment
- assignment or title

The player’s most important strategic asset is not money or gear alone, but a roster of characters with different strengths, weaknesses, loyalties, and roles.

### 3.2 Economy and Management

The player must manage:

- wages and upkeep
- gear purchases and repairs
- consumables
- district-specific shopping
- production or work output
- household or organization bonuses from assigned titles
- family growth, upbringing, and inheritance tradeoffs

The management game should create tradeoffs:

- Do you spend on better armor or on better staff?
- Do you assign the best medic to the infirmary for passive healing or take them into combat?
- Do you invest in faction standing or immediate profits?

### 3.3 Politics and World Simulation

The city is shaped by:

- faction conflict
- district conditions
- legal pressure
- prosperity
- corruption or moral decline
- security and control

World values affect:

- shop inventory
- event frequency
- crime and danger
- taxes and costs
- recruitment pools
- quest availability

### 3.5 Relationships, Households, and Lineage

Relationships are not flavor-only. They are one major progression system inside a broader roleplaying simulation.

The player should be able to shape:

- attraction and courtship
- trust and attachment
- partnership and household stability
- fertility and timing
- children, heirs, and dynastic plans

These systems should create both emotional and strategic incentives:

- visually attractive and socially desirable characters become meaningful targets for alliance and partnership
- strong pairings can produce stronger heirs
- households gain long-term value through compatible traits, stable bonds, and good upbringing
- relationship choices can conflict with faction strategy, economics, and combat readiness

### 3.4 Tactical Combat

Combat should remain readable and browser-friendly.

Recommended approach:

- turn-based
- party-based
- two-range system: `Close` and `Distant`
- strong weapon identity
- armor tradeoffs
- morale or pressure effects

This gives meaningful tactics without needing a grid or heavy pathfinding.

## 4. Core Gameplay Loops

### 4.1 Daily loop

1. Review roster, resources, and world state.
2. Assign jobs, training, and titles.
3. Travel to districts.
4. Shop, recruit, investigate, negotiate, or take contracts.
5. Resolve events and state changes.
6. End day and process passive outcomes.

### 4.2 Tactical loop

1. Prepare squad and equipment.
2. Enter mission or combat encounter.
3. Use range, action economy, and statuses to win.
4. Return with injuries, loot, reputation changes, and narrative consequences.

### 4.3 Long-term progression loop

1. Improve organization capacity.
2. Build faction ties or opposition.
3. Grow NPC specialization and loyalty.
4. Form pairings, households, and bloodlines.
5. Raise, train, or politically place children and heirs.
6. Unlock districts, shops, events, and rare recruits.
7. Shape city politics toward preferred outcomes.

## 5. System Breakdown

### 5.1 NPC Model

Each NPC should include the following data groups.

#### Identity

- `id`
- `name`
- `age`
- `sex`
- `origin`
- `portrait`
- `background`
- `factionAffinity`
- `rarity`

#### Status

Status is a social or legal layer that affects available actions and expectations.

Example statuses:

- `Citizen`
- `Mercenary`
- `Servant`
- `Apprentice`
- `Retainer`
- `Noble`
- `Criminal`
- `Prisoner`
- `Family`

Status affects:

- recruitment conditions
- wage expectations
- title eligibility
- legal risk
- obedience expectations
- faction reactions

#### Attributes

Recommended base attributes:

- `might`
- `agility`
- `endurance`
- `intellect`
- `perception`
- `presence`
- `resolve`

Attributes drive broad performance and can act as prerequisites for skills, equipment, and events.

#### Skills

Skills represent trainable competence.

Recommended initial skill list:

- `melee`
- `ranged`
- `medicine`
- `administration`
- `engineering`
- `negotiation`
- `survival`
- `security`
- `crafting`
- `performance`
- `academics`
- `intrigue`

Skills should matter in:

- combat
- jobs
- passive income
- quest success rolls
- district events
- crafting and repair

#### Traits

Traits should be modeled as tracks or persistent personality modifiers, not simple booleans.

Recommended structure:

- numeric tracks from `0-100`
- threshold-driven effects
- some paired axes
- some single-axis specialties

Example trait tracks:

- `discipline`
- `ambition`
- `empathy`
- `ruthlessness`
- `prudence`
- `curiosity`
- `dominance`
- `loyalty`
- `vanity`
- `zeal`

Example paired axes:

- `idealism <-> cynicism`
- `mercy <-> cruelty`
- `order <-> impulsiveness`

Traits should affect:

- training speed
- work quality
- stress gain
- relationship growth
- event outcomes
- combat behavior for AI-controlled allies

#### States

States represent short-term mutable conditions.

Recommended state examples:

- `health`
- `fatigue`
- `stress`
- `morale`
- `fear`
- `anger`
- `hunger`
- `injury`
- `intoxication`
- `hygiene`

States should:

- change often
- decay or recover over time
- create immediate penalties or event hooks
- interact with traits and relationships

#### Relationships

Relationships should be multi-axis, not a single value.

Recommended axes:

- `affinity`
- `respect`
- `fear`
- `loyalty`
- `trust`

Relationships exist between:

- player and NPC
- NPC and NPC
- NPC and faction

Relationship values influence:

- obedience
- title effectiveness
- betrayal risk
- dialogue outcomes
- attraction, romance, jealousy, and rivalry arcs
- squad cohesion in combat

#### Attraction and Compatibility

Attraction should be a first-class system, not hidden flavor text.

Recommended data:

- `orientation`
- `romanticPreferenceTags`
- `sexualPreferenceTags`
- `attractionBiases`
- `fertility`
- `pairBondStrength`
- `jealousySensitivity`
- `familyGoal`

These values influence:

- who is considered desirable
- how quickly attraction grows
- which partnerships are stable
- how rivalry and possessiveness emerge
- which pairings are practical for lineage planning

#### Reproduction and Lineage

NPCs should be able to become part of family trees over time.

Recommended lineage data:

- `lineageId`
- `parents`
- `children`
- `householdId`
- `pregnancyState`
- `upbringingFocus`
- `inheritedPotential`

Lineage design rules:

- children should inherit part of their baseline potential from their parents
- inherited outcomes should be probabilistic rather than fully deterministic
- upbringing, health, and household quality should modify inherited potential
- lineage systems should produce both narrative attachment and long-term roster strategy

#### Equipment and loadout

Each NPC may have:

- primary weapon
- secondary weapon
- armor
- accessory slots
- consumable slots

Loadout affects both combat and non-combat identity.

#### Assignment

An NPC may be:

- idle
- training
- working a job
- assigned a title
- deployed on a mission
- recovering

This assignment layer is critical because it connects roster management to production and strategy.

### 5.2 Items

Items should be categorized for systemic clarity.

Recommended item categories:

- `weapons`
- `armor`
- `accessories`
- `consumables`
- `tradeGoods`
- `tools`
- `documents`
- `householdModules`
- `materials`

Each item should define:

- `id`
- `name`
- `category`
- `tier`
- `value`
- `weight`
- `rarity`
- `tags`
- `effects`
- `requirements`

Additional item families that become important once relationships and lineage matter:

- `gifts`
- `luxuryGoods`
- `fertilityAids`
- `upbringingSupplies`
- `householdFurnishings`

### 5.3 Weapons

Weapons should feel distinct through data, not animation complexity.

Recommended weapon fields:

- `damageMin`
- `damageMax`
- `accuracy`
- `armorPiercing`
- `speed`
- `rangeType`
- `rangeModifierClose`
- `rangeModifierDistant`
- `critChance`
- `staggerChance`
- `ammoType`
- `durability`
- `tags`

Recommended weapon classes:

- `dagger`
- `sword`
- `spear`
- `hammer`
- `pistol`
- `rifle`
- `shotgun`
- `crossbow`
- `staff`
- `special`

Example combat identity:

- daggers: fast, low damage, high crit
- hammers: slow, high stagger, strong vs armor
- spears: better at range transitions
- pistols: flexible backup weapons
- rifles: strong at `Distant`, weak at `Close`
- shotguns: devastating at `Close`, poor at `Distant`

### 5.4 Armor

Armor should create real tradeoffs.

Recommended armor fields:

- `soak`
- `evasionPenalty`
- `speedPenalty`
- `durability`
- `repairCost`
- `slotCoverage`
- `resistances`
- `tags`

Recommended armor classes:

- `light`
- `medium`
- `heavy`
- `specialized`

Armor design rule:

- heavier armor improves survival
- lighter armor improves initiative, evasion, and skill consistency

### 5.5 Shops

Shops should be specialized by district and faction influence.

Recommended shop types:

- `weaponDealer`
- `armorer`
- `generalStore`
- `apothecary`
- `bookshop`
- `tailor`
- `blackMarket`
- `workshop`

Shop inventory should vary by:

- district
- faction control
- prosperity
- security level
- player reputation
- story progression

This lets politics and economy feed each other naturally.

### 5.6 Jobs and Titles

This is one of the strongest management systems for a browser adaptation.

Jobs produce direct outputs:

- money
- materials
- information
- faction standing
- reduced upkeep

Titles produce passive organizational modifiers.

Recommended title examples:

- `quartermaster`
- `medic`
- `steward`
- `trainer`
- `spymaster`
- `chiefEngineer`
- `bodyguardCaptain`
- `librarian`

Example effects:

- `quartermaster`: lower repair costs, better inventory quality
- `medic`: faster injury recovery
- `trainer`: passive skill gain for idle NPCs
- `spymaster`: reveals hidden faction or district events

Additional relationship-facing title examples:

- `house steward`: improves household stability and child wellbeing
- `tutor`: improves child skill growth and trait development
- `companion`: improves social recovery and relationship momentum

Titles should depend on skills, traits, and relationships, not only raw level.

### 5.7 Factions and Politics

The city should have a manageable number of factions with clear agendas.

Recommended faction count:

- `5-8 factions`

Each faction should track:

- `power`
- `wealth`
- `security`
- `territory`
- `agenda`
- `standingWithPlayer`
- `activePressure`

Recommended citywide political dials:

- `control`
- `prosperity`
- `unrest`
- `corruption`

These values affect:

- encounter rates
- legal restrictions
- item access
- bribe costs
- faction event frequency
- recruitment pool quality

Faction ideologies should also affect relationship and lineage play:

- elite factions may reward marriage alliances and heirs
- industrial factions may value productivity over family stability
- religious or moralist factions may pressure acceptable pairings and child-rearing norms

### 5.8 Quests and Events

Quests should be event-driven and lightweight to author.

Recommended event types:

- district incidents
- faction missions
- recruitment opportunities
- market changes
- internal disputes
- injuries or illnesses
- theft or sabotage
- political shifts
- courtship, jealousy, family pressure, and inheritance disputes

Each event can key off:

- NPC states
- faction standing
- district variables
- political dials
- item ownership
- current assignments

This keeps the world reactive without requiring handcrafted story for everything.

### 5.9 Combat

Combat should use a compact tactical model.

Recommended structure:

- party vs party
- turn-based initiative
- `Close` and `Distant` range states
- actions limited to `4-6` core choices

Recommended actions:

- `Attack`
- `Aim`
- `Guard`
- `Advance`
- `Retreat`
- `Special`

Optional advanced actions later:

- `Overwatch`
- `Charge`
- `PowerStrike`
- `Disarm`
- `UseItem`

Combat should use:

- weapon profile
- armor soak
- state modifiers
- morale or fear pressure
- injury accumulation
- squad relationship bonuses or penalties

## 6. Data Model Recommendations

The game should be data-driven from the start.

Recommended content files:

- `characters.json`
- `items.json`
- `weapons.json`
- `armor.json`
- `shops.json`
- `districts.json`
- `factions.json`
- `titles.json`
- `events.json`
- `quests.json`

Recommended runtime state:

- current day and time
- player money and resources
- city political dials
- NPC roster and statuses
- relationship matrix
- family trees and household memberships
- district conditions
- faction standings
- inventory and equipment durability

Recommended technical rule:

- keep base content definitions separate from mutable save-state instances

## 7. MVP Scope

The first playable version should be intentionally narrow.

### MVP target

- `1 city`
- `6 districts`
- `12-20 NPCs`
- `5 factions`
- `8 shop types`
- `40-60 weapons and armor pieces`
- `80-120 total items`
- `10-15 titles/jobs`
- `20-30 event templates`
- `10-15 quests`
- `2-range combat`
- `1 lineage and inheritance loop`

### MVP must-have systems

- roster management
- NPC stats, traits, skills, and states
- equipment and durability
- district travel
- shopping
- title assignment
- passive daily resolution
- faction standing
- political dials
- basic combat missions
- relationship progression
- lineage and inheritance hooks
- save/load

### MVP cut list

Do not include these in the first version unless they are trivial:

- multiplayer
- base building with custom map placement
- procedural map exploration
- advanced crafting trees
- full voice or animation systems
- large-scale warfare simulation

## 8. Recommended Implementation Strategy

### Frontend

- `React`
- `TypeScript`
- `Vite`

### State approach

Start local-first:

- game state in structured JSON or local persistence
- later migrate to a backend only if needed

### UI structure

Recommended screens:

- `Dashboard`
- `Roster`
- `NPC Detail`
- `District Map`
- `Household and Family`
- `Shops`
- `Factions`
- `Mission Prep`
- `Combat`
- `Event Log`

### Content authoring

Prefer declarative definitions over hardcoded logic.

For example:

- event triggers in JSON
- item effects by tag and effect type
- titles with passive modifiers
- district shops assembled from rules

## 9. Design Risks

### Risk 1: Feature sprawl

The biggest danger is trying to replicate every subsystem at once.

Mitigation:

- build the smallest loop where NPC management, shops, titles, and combat already interact

### Risk 2: Shallow NPCs

If NPCs are only combat units, the design loses its identity.

Mitigation:

- ensure every NPC also has jobs, states, relationships, and assignments from the first milestone

### Risk 3: Flat economy

If shops are only item lists, districts and politics stop mattering.

Mitigation:

- make inventory and pricing respond to district and faction conditions

### Risk 4: Overcomplicated combat

A full tactical grid may slow development without improving the core fantasy.

Mitigation:

- keep the two-range combat model first

### Risk 5: Sexualization without system depth

If sensual presentation is only decorative, it weakens the product instead of strengthening it.

Mitigation:

- connect attractiveness, courtship, household play, and inheritance to real mechanics
- make character styling, wardrobe, and intimacy choices feed actual relationship outcomes
- keep presentation character-driven rather than generic pin-up filler

## 10. First Milestone Proposal

The first milestone should prove the game’s identity with the least amount of code.

### Milestone 1 deliverable

A playable prototype where the player can:

- manage `6-8 NPCs`
- equip weapons and armor
- inspect attraction and compatibility indicators
- assign one passive title
- visit `3 districts`
- shop in `3 specialized stores`
- form at least `1` meaningful pairing
- accept one mission
- fight one turn-based combat encounter
- resolve end-of-day state changes
- see faction and relationship changes
- see the first lineage or household hooks

If this milestone is fun, the project is viable.

## 11. Summary

The defining feature of this design is not any single mechanic. It is the fact that:

- NPCs exist across multiple systems
- traits create personality over time
- states create immediate pressure
- jobs and titles turn roster choices into strategy
- shops and politics make the city feel alive
- combat turns preparation into consequence
- relationships and heirs turn attachment into long-term strategy

The visual layer should support that spine by making characters feel desirable, distinct, and worth investing in across generations.

That is the design spine for Project Destiny.
