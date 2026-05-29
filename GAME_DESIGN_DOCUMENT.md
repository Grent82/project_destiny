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

The player shapes:

- attraction and courtship
- trust and attachment
- partnership and household stability
- fertility and timing
- children, heirs, and dynastic plans

These systems create both emotional and strategic incentives:

- visually attractive and socially desirable characters become meaningful targets for alliance and partnership
- strong pairings can produce stronger heirs
- households gain long-term value through compatible traits, stable bonds, and good upbringing
- relationship choices can conflict with faction strategy, economics, and combat readiness

#### Sensual presentation as a design pillar

Sensual and physical presentation is an explicit product pillar — not decorative filler. It is mechanically connected to attraction, courtship, and household systems.

**Design rules:**

- **Attractiveness is readable and systemic.** Each NPC has a legible appeal profile (physical appeal, social grace, faction presentation) that the player can inspect and that influences attraction outcomes. It is not a hidden variable.
- **Presentation scales with relationship depth.** Initial portrait framing is characterful and evocative. Deeper relationship stages unlock more intimate presentation tiers. Intimacy content must be earned through gameplay — it is not front-loaded.
- **Character drives presentation, not the reverse.** A court-affiliated negotiator, a mercenary, and a dockworker occupy different social and visual registers. Their wardrobe, posture, and styling reflect who they are in Valdenmoor. Uniform sexualization across all NPCs collapses character distinction and weakens the setting.
- **Wardrobe is gameplay, not decoration.** Clothing choices affect appeal scores, faction perception, and social outcomes. A character styled for court access is a different tool than one styled for street-level work.
- **Attraction should be readable before it is explicit.** Expressiveness, posture, and styling create desire before any explicit content. A strong character read at the portrait level makes later intimacy feel earned.

#### Courtship as a gameplay loop

Courtship is an active system with mechanical steps, not a passive affinity meter that reaches a threshold:

1. **Encounter** — the player meets an NPC through hire, event, or district interaction
2. **Assessment** — the player can view attraction and compatibility indicators
3. **Investment** — assigning NPCs together, managing their conditions well, and responding to personal events builds relationship depth
4. **Courtship actions** — specific interactions available at relationship milestones (shared meals, gifts, assignments that create proximity)
5. **Pair bond** — a formalized bond state with mechanical effects on morale, loyalty, and faction standing
6. **Household formation** — pair bond + shared quarters unlock household-level bonuses and the reproduction path

Each step should have visible mechanical consequence, not just a log entry.

### 3.4 Tactical Combat

Combat should remain readable and browser-friendly.

Recommended approach:

- turn-based
- party-based
- three-range system: `Close`, `Medium`, and `Distant`
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

Attraction is a first-class system with legible, inspectable values — not hidden flavor text.

**Appeal profile (per NPC):**

| Field | Description |
|---|---|
| `physicalAppeal` | 0–100. Base attractiveness. Influenced by health, hygiene, and presentation tier. |
| `socialGrace` | 0–100. Charisma and presence in social contexts. Mapped from `presence` attribute. |
| `wardrobeTier` | `plain` / `functional` / `refined` / `elevated` / `high-court`. Affects appeal scores and faction perception. |
| `presentationTier` | `default` / `courtship` / `intimate`. Unlocked by relationship depth. |
| `orientation` | Who this NPC is attracted to. |
| `romanticPreferenceTags` | Trait-based compatibility descriptors (e.g., `dominant`, `protective`, `intellectual`). |
| `sexualPreferenceTags` | Preference descriptors relevant to courtship and pair bond stage. |
| `attractionBiases` | Weighted modifiers toward specific trait combinations in partners. |
| `fertility` | 0–100. Relevant when reproduction is in scope. |
| `pairBondStrength` | 0–100. Current depth of pair bond with another NPC or the player. |
| `jealousySensitivity` | 0–100. How strongly this NPC reacts to romantic competition. |
| `familyGoal` | `none` / `open` / `seeking` / `urgent`. Influences courtship responsiveness. |

**Compatibility score** is computed from trait overlap, `attractionBiases`, and `romanticPreferenceTags` between two NPCs (or player and NPC). It is visible to the player and affects how quickly a pair bond deepens.

**Appeal and wardrobe mechanics:**

- The player can commission or purchase wardrobe upgrades from tailors and market NPCs
- `wardrobeTier` provides a modifier to `physicalAppeal` checks and to faction-specific social outcomes
- A character entering a court-adjacent district in `plain` wardrobe suffers social penalties; the same character in `refined` or `elevated` wardrobe gains access to interactions not otherwise available
- Wardrobe upgrades cost Marks and may require specific faction standing or district access

**Presentation tiers:**

- `default`: Standard portrait framing — fully clothed, characterful, faction-appropriate
- `courtship`: Unlocked at pair bond stage 2 — more intimate framing, expressive, not explicit
- `intimate`: Unlocked at pair bond stage 4 (player choice required) — fully intimate presentation

Presentation tier changes are stored per relationship, not per NPC globally. An NPC in a deep bond with the player may have `intimate` tier unlocked while their world-facing presentation remains `default`.

#### Reproduction and Lineage

NPCs become part of family trees over time. Children are a long-term roster and strategic resource — not a background event.

**Lineage data per NPC:**

| Field | Description |
|---|---|
| `lineageId` | Unique identifier for a family line. Shared by all members of the same descent. |
| `parents` | NPC IDs of biological parents (0, 1, or 2). |
| `children` | NPC IDs of registered children. |
| `householdId` | Which household this NPC belongs to. Households pool bonuses. |
| `pregnancyState` | `none` / `early` / `mid` / `late` — tracked in days. |
| `upbringingFocus` | Trait or skill category prioritized during childhood. Affects inherited potential. |
| `inheritedPotential` | Numeric cap on how high this NPC's skills can train. Higher-potential children have higher rarity-equivalent caps. |

**Trait inheritance model:**

When two NPCs produce a child, the child's starting trait and attribute values are derived as follows:

1. **Base value**: average of both parents' values for each trait and attribute
2. **Variance**: ±15 points of random noise applied per field (Gaussian-distributed, clamped to 0–100)
3. **Dominant trait pull**: each parent has a 30% chance to "dominant-express" a specific trait, pushing the child's value toward their own (±10 additional points toward parent's value)
4. **Inheritance cap**: the child's `inheritedPotential` is `(parentA.rarity + parentB.rarity) / 2` rounded up to the nearest rarity tier — meaning two `uncommon` parents produce an `uncommon` child; an `uncommon` + `rare` pairing can produce a `rare` child

**Upbringing modifiers:**

The `upbringingFocus` set on a child NPC during their development period (tracked in game days) applies a +10 bonus to the focused skill or trait category at maturity. Upbringing focus is set by the player or the assigned household head. Better household conditions (repaired rooms, stable economy, high-morale adults) reduce variance and increase the chance of favorable dominant expression.

**Breeding Register (Valdenmoor law):**

- First child: free registration, no permit required
- Second child: costs a Reproduction Permit (approximately 80–120 Marks at current market rates, sourced from the Compact or the Tallow Ring gray market)
- Third child and beyond: heavy Compact fine or the child is subject to Compact placement assessment
- Children born to Bound parents have no citizen status by default; a Bond-Holder may elevate them, but the decision is legally and socially loaded
- House Valdris as a recognized (if contested) house may petition for one-child exemption on dynastic grounds — this is a narrative mechanic, not a free pass

**Strategic lineage value:**

- A well-bred heir with high `inheritedPotential` and a favorable `upbringingFocus` enters the roster at young adult age with better skill caps than a recruited stranger of the same rarity
- Lineage creates long-term investment — the player must manage the conditions that produce good outcomes for years of game time
- This is the mechanical spine of the "household" ambition: you are not just recovering a house, you are building one that outlasts the current political crisis

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
- `rangeModifierMedium`
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
- `Close`, `Medium`, and `Distant` range states
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

### Hybrid site simulation rule

Project Destiny should use a hybrid world-site model:

- important or entered places become `concrete`
- distant or low-salience places may remain `abstract`
- abstract places must still preserve deep consequences

In practice this means:

- districts remain the coarse navigation layer
- POIs and households become the site layer
- rooms appear when a site becomes concrete
- captivity, visits, witnesses, hidden assets, and household pressure must still exist meaningfully even when a site is abstract

Concrete sites may later return to abstract simulation, but they must retain:

- controller / owner
- known occupants
- captivity assignments
- discovered evidence
- meaningful room or access changes
- recent consequential developments

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
- hybrid site play for room-capable locations when relevant
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

- keep the three-range combat model first

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

## 12. Art Direction

### 12.1 Visual Style

Project Destiny uses a dark fantasy, post-cataclysm aesthetic set in a decaying medieval city. The visual language should communicate weight, scarcity, and political tension without resorting to grimdark for its own sake.

Core palette:
- Background: deep charcoal and near-black (`#0d0a07`, `#1e160d`)
- Accent: warm amber and gold (`#c9a84c`) used sparingly to signal importance, heat, and warmth
- Negative space should dominate; accent colors earn attention by contrast

The reference for atmosphere is the Master of Raana visual language: strong character portraits, clear status bars, and layered information panels. The UI should feel like a well-kept ledger in a dangerous city — functional, legible, and quietly threatening.

### 12.2 Typography

- **Display / headings**: IM Fell English — gothic gravitas appropriate to house names, district headers, and modal titles
- **Body / interface**: Crimson Pro — readable and elegant; suits long NPC descriptions, event text, and dialogue panels
- **UI chrome / data labels**: system sans-serif fallbacks acceptable for numeric values and small labels where legibility under dense layout takes priority

Do not mix display and body typefaces within the same paragraph. Display text is for named elements and moments of weight.

### 12.3 District Visual Identity

Each district carries a thematic accent color and a watermark glyph used in headers, district panels, and map overlays.

| District | Accent Color | Glyph | Design Intent |
|---|---|---|---|
| The Pale | Silver | ❄ | Cold, old nobility, frost-quiet decay |
| Iron Docks | Rust | ⚓ | Industry, labor, iron and salt |
| The City | Gold | ⚖ | Commerce, law, Compact authority |
| The Tangle | Moss | ⚘ | Organic, crowded, underground networks |
| Ashfields | Charcoal | ✦ | Ruin, post-cataclysm wasteland, ash memory |

District identity should be visible in:
- district panel headers and borders
- event card backgrounds when an event originates in that district
- shop and location UI frames when the player is present in a district

### 12.4 NPC Portraits

NPC portraits are hooded silhouette SVGs with faction-colored border accents in the current milestone. This approach:

- scales to a large roster without requiring per-character illustration
- maintains visual consistency across rarity tiers
- allows faction identity to register at a glance via border color

Design rules:
- portrait shape is consistent (100×130 viewBox, centered silhouette)
- border or glow accent reflects faction affinity
- primary NPCs (Marion Vale, starting roster) may receive a slightly more detailed silhouette treatment to signal narrative weight
- placeholder portraits must be replaced by milestone 2 with illustrated or semi-illustrated alternatives

### 12.5 Reference

The visual reference is Master of Raana:
- strong character portrait panels as the primary NPC presentation surface
- clear stat bars and numeric values in fixed-position panels
- layered information (status, relationship, assignment, equipment) without spatial clutter
- event and dialogue panels as overlays, not separate screens where avoidable

Project Destiny should feel related to this reference in information density and character-forward presentation, not in illustration style.

---

## 13. Player Character

### 13.1 Who the Player Is

The player controls a male protagonist, unnamed at game start until character creation is implemented. He is the head of House Valdris — a minor noble house in the city of Valdenmoor.

He has lost:
- his house title (stripped during the Compact's purge)
- his retinue (dead, scattered, or turned)
- his family (Edric dead, Cael dead, Mira's fate unconfirmed)
- his liquid assets (debt-claim seizure)

He retains:
- the House Valdris name (legally contested but not yet voided)
- a ruined manor in The Pale district
- one loyal retainer: Marion Vale

This setup defines the starting condition of the game. It is not backstory-only flavor — it is the mechanical state that the player must recover from.

### 13.2 The Ruined Manor

The player's base of operations is a partly-seized manor in The Pale. In the opening milestone this represents:

- two usable rooms
- a locked basement (future expansion)
- access to The Pale district and its faction tensions

The manor serves as the organizational headquarters. Its condition affects available title slots and passive household bonuses. Manor restoration is a long-term progression objective, not an MVP feature.

### 13.3 Playability Scope

The player character is present in all decisions and events. He participates in tactical combat through the `buildPlayerCombatant` system — his attributes (might, resolve, presence, perception) and skills (melee, ranged) map directly to combatant stats.

Character creation is implemented: name, background archetype, and two personality traits are selected at the opening screen. The background archetype (The Blade, The Schemer, The Voice) pre-fills the player's attribute and skill profile. The two personality traits start at 70 (others at 35) and drive live mechanical effects — ambition adds renown on quest completion; empathy reduces NPC loyalty decay when wages lapse.

### 13.4 Player Identity Rules

- The player is male. This is fixed in the current design scope.
- He is an adult with prior authority — not a youth coming-of-age protagonist.
- His voice in events should reflect loss, calculation, and slow recovery — not naivety or comic incompetence.
- Events should respect that he was once capable and is now rebuilding, not that he is learning from scratch.

---

## 14. Marion Vale — Companion Arc

### 14.1 Role

Marion Vale is the player's last loyal retainer and the only NPC present from the opening screen. She is not a generic starting companion. She is the narrative anchor of the early game.

Her presence answers a question the player has not yet asked: someone chose to stay. The game does not explain her reasoning immediately. Her motivation — *to rebuild something worth serving* — is internal and unexpressed.

### 14.2 Competence and Agency

Marion's primary identity is her competence, not her relationship to the player.

Her starting profile:
- High intellect (63), presence (66), and resolve (61)
- Top skills: negotiation (68), administration (61), intrigue (41)
- High prudence (67) and ambition (71)
- Moderate loyalty (52) — earned, not automatic
- Allowed titles: quartermaster, steward

Marion should be used as a capable organizational officer. The player gains real mechanical value from assigning her correctly. Her arc does not override this — it runs alongside it.

Design rule: Marion must never be portrayed as a simple love interest or as a character whose primary purpose is emotional support. Her competence and independent agency come first in all event and dialogue authoring.

### 14.3 Romantic Arc Structure

Marion's arc is expressed through restraint. It progresses through four stages, with only the first two currently implemented:

| Stage | Name | Trigger Condition | Expression |
|---|---|---|---|
| 1 | Trust | Loyalty ≥ 60, morale stable | She speaks plainly. Offers assessment without being asked. |
| 2 | Dependence | Loyalty ≥ 75, no morale crisis in 14 days | Personal events begin. Small gestures. She notices things. |
| 3 | Unspoken feeling | Loyalty ≥ 85, player has not dismissed or replaced her | Dialogue shifts. She does not name what it is. Neither does the player. |
| 4 | Player choice | Loyalty ≥ 90, stage 3 complete | A decision point. Not a confession scene — a moment where the player's action speaks. |

Stages 3 and 4 are future milestones.

### 14.4 Personal Events

In the current implementation, Marion's personal events fire based on loyalty and morale conditions. Event design rules:

- Events should be quiet — a conversation at the end of a day, a note left, a task completed without being asked
- Events should not lock the player into a romance path; they should open space for one
- Events should reference real game state (a mission just completed, a district recently visited, a named NPC Marion has interacted with)
- Events should respect Marion's ambition and prudence scores — she does not act impulsively

### 14.5 Authoring Constraints

- Marion's dialogue should never be soft or deferent by default. She is direct and precise.
- She will disagree with the player when her prudence or ambition scores warrant it.
- She does not express feeling through declaration. She expresses it through action, silence, and specificity.
- Her arc is not the main plot. It is a parallel track that the player may pursue or not. Either choice should produce a coherent experience.

---

## 15. Relationship and Lineage UI

### 15.1 Attraction and Compatibility Panel

Accessible from the NPC detail panel (Relations tab), the attraction view shows:

- **Appeal profile**: `physicalAppeal`, `socialGrace`, `wardrobeTier` as labeled bars
- **Compatibility score** with the player (or between two selected NPCs): a single 0–100 value with a brief text read ("Strong match", "Misaligned goals", etc.)
- **Pair bond depth**: 0–100 bar, current stage label, and next milestone condition
- **Presentation tier indicator**: current tier (default / courtship / intimate) and what is required to advance
- **Jealousy and family goal**: visible flags when they are likely to affect behavior

The player should never need to guess whether two characters are compatible. The UI surfaces this explicitly.

### 15.2 Wardrobe Management

Wardrobe is accessed from the NPC detail panel equipment section or from the House screen's wardrobe storage room (when unlocked).

Interface shows:
- Current `wardrobeTier` and its active effects (appeal modifier, faction perception modifier)
- Available wardrobe items from inventory or stash
- Upgrade paths and costs (Marks, faction requirements)

Wardrobe items are a distinct item category. They are purchased from tailors, court-affiliated shops, or the gray market (Tallow Ring). High-tier wardrobe items require specific faction standing to source.

### 15.3 Courtship Actions

Courtship-specific actions appear contextually in the NPC detail panel when relationship conditions are met. They do not appear as a separate menu — they are integrated into the existing action zone.

| Action | Trigger condition | Mechanical effect |
|---|---|---|
| Shared meal | Pair bond > 25, NPC morale > 40 | +5 pair bond, +3 morale |
| Gift (marked item) | Any pair bond depth | +3–10 pair bond based on compatibility match |
| Assigned quarters | House room available | Unlocks proximity bonus (+1 pair bond/day passively) |
| Personal invitation (event) | Pair bond > 50 | Fires a personal event specific to this NPC |
| Formal declaration | Pair bond > 75, compatibility > 60 | Advances to pair bond stage 3 |
| Bond commitment | Pair bond stage 4 conditions met | Player-triggered story moment, unlocks intimate presentation tier and household formation |

Courtship actions consume time slots and may have faction visibility consequences. A public display toward a Compact-affiliated NPC may affect standing with the Court.

### 15.4 Lineage Tree

The Lineage screen (accessible from the House screen) displays:

- All NPCs the player has direct household relationships with
- Parent-child links as a simple tree graph
- Child NPCs with development stage indicators (not yet adult / young adult / adult)
- `inheritedPotential` shown as a rarity tier badge
- `upbringingFocus` selector for non-adult children (player or household head sets this)
- Pregnancy state for any NPC currently carrying

The lineage tree is not initially visible — it is unlocked by forming the first pair bond in the household.

### 15.5 Presentation Tier Display

When a player views an NPC at `courtship` or `intimate` presentation tier, the portrait display reflects this. The tier is visible as a small indicator in the portrait frame (a discrete icon — not a bold label). The player advances tiers through the relationship system, never through a separate "unlock" purchase or menu.

This keeps intimate presentation integrated with the relationship system rather than purchasable content, which aligns with the design rule: intimacy content must be earned through gameplay.

---

## 16. Sensual Presentation — Design Rules

This section is the canonical reference for sensual and intimate presentation decisions across all roles (art, writing, UI).

### 16.1 What sensual presentation is

Sensual presentation is how physical appeal, attraction, and intimacy are communicated to the player through portrait art, event text, and UI framing. It is a design pillar — not a feature added to an otherwise complete game.

Its purpose is to make specific characters feel desirable and worth investing in, which in turn makes the attraction, courtship, and household systems feel consequential. Without it, the relationship mechanics become abstract stat management. With it, they become the emotional core of the game.

### 16.2 Authoring rules (writing)

- **Name the character, not the body type.** Event text describing a character's appearance should be specific to who they are — their habits, their faction context, their relationship to the player. Generic descriptions of attractiveness are weaker than specific ones.
- **Restraint earns intensity.** A single precise sentence about how a character moves, dresses, or holds eye contact is more effective than extended physical description. Save explicit language for moments that have been earned through relationship depth.
- **Never describe a character's appearance without grounding it in action or context.** Marion does not simply look a certain way — she looks that way because she dressed for a specific meeting, or she did not bother to dress for this one.
- **Attraction is two-directional.** Characters have preferences, reactions, and agency. An NPC who finds the player appealing should show it through behavior, not through passive availability.

### 16.3 Authoring rules (art)

See `docs/art-direction.md` — Character and Portrait Direction section for the full ruleset.

Summary:
- Presentation scales with relationship depth, never front-loaded
- Wardrobe tier and faction identity drive styling, not generic appeal
- Consistency across the roster is a hard requirement — one outlier in style or explicit level breaks the system
- Placeholder silhouettes must be replaced at milestone 2 — the silhouette system is a scaffolding tool, not a presentation goal

### 16.4 What sensual presentation is not

- It is not a skin system or unlock store
- It is not applied uniformly to all characters regardless of who they are in the world
- It is not present in the UI outside of character-specific relationship contexts
- It does not override character competence, political identity, or narrative function — a character's primary identity remains who they are, not what they look like



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
