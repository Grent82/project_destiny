# Product

## Purpose

This document is the product source of truth for Project Destiny. It defines what the game is, what the MVP must achieve, and what outcomes each milestone must prove before implementation expands.

This document is intentionally implementation-facing. It should help architecture and delivery decisions, not act as marketing copy.

## Product Summary

Project Destiny is a browser-based systems RPG about running a small organization inside a reactive city. The player manages a roster of NPCs who simultaneously function as combatants, workers, social actors, and strategic assets.

The design is built around system interaction:

- NPC traits shape long-term personality and specialization
- temporary states create short-term pressure
- relationships affect obedience, cohesion, and organizational output
- items, jobs, and titles convert preparation into strategic advantage
- faction politics and district conditions reshape available opportunities
- tactical combat resolves the consequences of planning

## Player Promise

The player should feel that:

- roster decisions matter more than raw leveling
- the city reacts to political and economic pressure
- every NPC can become valuable for different reasons
- preparation changes tactical outcomes
- management, relationships, and combat are part of one connected simulation

If the game becomes only a combat game or only a menu-based economy game, it has failed the product intent.

## Design Spine

The minimum identity of Project Destiny is the combination of:

- multi-system NPCs
- district-based economy
- faction and political pressure
- title and assignment management
- compact but meaningful tactical combat

All early scope decisions must reinforce that spine.

## Target Experience

### Core fantasy

Build and run a capable household, syndicate, agency, or mercenary organization inside a contested city.

### Session feel

A typical session should let the player:

- inspect their roster
- decide who works, trains, heals, shops, or deploys
- visit districts with different risks and opportunities
- handle events or missions
- return to see the organizational consequences

### Tone

The tone should be systemic, strategic, and character-driven. The game can contain tension, rivalry, ambition, and political friction, but the MVP should optimize for readable game systems rather than narrative maximalism.

## Core Product Pillars

### 1. NPCs are the center of the game

NPCs are not inventory wrappers. Each one must participate in:

- tactical performance
- non-combat work
- relationship dynamics
- state changes
- assignment and title optimization

### 2. The world must feel responsive

Districts, factions, and political dials must influence:

- what the player can buy
- what events appear
- what missions are available
- how dangerous or profitable decisions become

### 3. Preparation must matter

Combat outcomes should reflect:

- roster composition
- equipment choices
- NPC states
- relationships
- tactical range decisions

### 4. Complexity must remain legible

The game should be deep, but not opaque. The MVP should prefer explicit menus, tooltips, panels, and deterministic rules over hidden simulation.

## MVP Definition

The MVP is the smallest version of the game that proves the product identity.

### MVP content targets

- `1 city`
- `6 districts`
- `12-20 recruitable or persistent NPCs`
- `5 factions`
- `8 shop types`
- `40-60 equipment pieces`
- `80-120 total items`
- `10-15 jobs or titles`
- `20-30 event templates`
- `10-15 quests`
- `1 tactical combat mode` based on `Close`, `Medium`, and `Distant` range

### MVP systems

The MVP must include:

- roster management
- NPC attributes, skills, traits, states, and relationships
- equipment and durability
- district travel
- hybrid site play where room-capable locations can become concrete when relevant
- shops with inventory differences
- title or assignment management
- passive daily resolution
- faction standing
- city political dials
- mission preparation
- combat encounter resolution
- save and load

### MVP exclusions

The MVP must not expand into:

- multiplayer
- full base building
- free-roaming map exploration
- large-scale war simulation
- advanced procedural generation
- cinematic storytelling systems
- broad crafting trees unless they directly support the first loop

## Major Systems and Product Requirements

### NPC system

Must support:

- stable identity
- trainable skills
- persistent traits
- short-term states
- assignment to work, recovery, training, or missions
- relationships with player, factions, and other NPCs

Acceptance signal:

- the player can explain why two NPCs with similar combat values still play differently

### Relationship system

Must support multiple axes, not a single opinion number.

Minimum axes:

- affinity
- respect
- fear
- loyalty
- trust

Acceptance signal:

- relationship changes affect more than dialogue flavor

### Economy and district system

Must support:

- specialized shops
- district-level differences
- at least one way politics or faction pressure affects supply, price, or access

Acceptance signal:

- buying decisions differ by district instead of using one global vendor list

### Titles and assignments

Must support:

- passive organizational bonuses
- opportunity cost between deployment and support roles
- skill- or trait-sensitive assignment outcomes

Acceptance signal:

- the player has to decide whether a strong NPC is more useful in the field or in an organizational role

### Combat system

Must support:

- squad-based, turn-based combat
- `Close`, `Medium`, and `Distant` range states
- range-sensitive weapon identity
- armor tradeoffs
- effects from current NPC state

Acceptance signal:

- preparation and loadout choices materially change combat outcomes

### Politics and faction system

Must support:

- faction standing
- citywide political dials
- at least one visible systemic consequence of a political shift

Acceptance signal:

- the world changes even when the player is not directly in combat

### Location and custody system

Must support:

- districts as the coarse world layer
- sites as the actionable world-place layer
- rooms when a site becomes concrete and relevant
- abstract offscreen site simulation that still preserves meaningful social, political, and captivity consequences
- location-bound occupancy and location-bound captivity

Acceptance signal:

- the player can know that a person or opportunity is tied to a place before entering it, and entering that place reveals a deeper but consistent layer of world truth

## Milestones

### Milestone 0: Agentic foundation and technical baseline

Goal:

- establish source-of-truth docs, architecture boundaries, technical decisions, and initial scaffolding so implementation agents can work safely

Must deliver:

- product document
- architecture document
- engineering standards
- initial stack and quality-gate decision
- first runnable project scaffold
- first core contracts backlog

Acceptance criteria:

- an implementation agent can start work without inventing architecture or workflow
- TDD expectations are explicit
- role boundaries and dependency direction are documented

### Milestone 1: Playable systemic slice

Goal:

- prove the game’s identity with the smallest integrated loop

Must deliver:

- `6-8` NPCs
- `3` districts
- `3` specialized stores
- one mission prep flow
- one tactical combat encounter
- one title assignment
- end-of-day resolution
- visible faction and relationship changes

Acceptance criteria:

- the player can recruit or manage NPCs, equip them, travel, shop, fight, and see downstream consequences
- at least one non-combat roster choice changes later tactical or economic outcomes
- the slice is fun enough to justify expanding content

### Milestone 2: Full MVP breadth

Goal:

- scale the vertical slice to the full MVP content and systems target

Must deliver:

- full city and district count
- stable roster loop
- shop and faction breadth
- event and quest breadth
- save/load maturity
- core balance pass

Acceptance criteria:

- the full MVP loop is playable without placeholder architecture debt
- systems remain legible and testable as content volume increases

## Scope Prioritization Rules

When scope pressure exists, prioritize in this order:

1. system interaction
2. clarity of player decisions
3. testable domain behavior
4. content breadth
5. presentation polish

If a feature adds content without strengthening system interaction, it is not early priority.

## Product Risks

### Risk: combat dominates the project

Failure mode:

- the game becomes a tactics game with shallow management

Response:

- preserve jobs, titles, states, and relationships in the first playable slice

### Risk: management becomes passive spreadsheeting

Failure mode:

- choices stop affecting missions and tactics

Response:

- ensure assignment and equipment decisions change tactical and event outcomes

### Risk: complexity outruns clarity

Failure mode:

- systems exist but players cannot reason about them

Response:

- prefer explicit rules, constrained stats, and observable cause-and-effect

## Open Questions

These are intentionally deferred and should be resolved by later Beads:

- final narrative framing for the player organization
- exact visual style and UI identity
- final technical stack selection
- exact persistence format and migration path
