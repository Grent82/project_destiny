# UI Principles

## Purpose

This document is the UI and UX source of truth for Project Destiny.

Its purpose is to guide information architecture, readability, interaction density, and screen composition for a systems-heavy browser RPG.

## Core UI Goal

The UI must make a complex simulation understandable without flattening it into bland admin screens.

The player should be able to:

- scan state quickly
- compare options easily
- understand consequences
- navigate between management and mission contexts without confusion

## Primary Principles

### 1. Readability before spectacle

The game can have strong style, but information must remain legible.

Always prioritize:

- hierarchy
- spacing
- grouping
- contrast
- explicit labels

### 2. Density with structure

This is not a minimalist app. It is an information-dense strategy RPG.

That means:

- use cards, panes, sidebars, and split layouts
- surface multiple related values together
- avoid hiding important state behind too many clicks

### 3. State must be visible

The player should see:

- current assignment
- readiness
- pressure
- faction standing
- risks
- tradeoffs

Important game state should rarely be invisible or implied only by flavor.

### 4. System boundaries should be visible in the UI

Screen structure should reflect product structure:

- roster
- districts
- factions
- shops
- mission prep
- combat
- event log

This helps agents and humans keep navigation aligned with architecture.

## Interaction Rules

- do not bury core mutations in unclear icon-only controls
- make irreversible or high-impact actions explicit
- keep filters and comparison tools lightweight and fast
- use local UI state for presentation, not for business rules

## Visual Direction

- favor grounded, deliberate, tactical presentation
- avoid default SaaS aesthetics
- avoid playful consumer-app patterns
- use atmosphere without sacrificing clarity

## Accessibility Direction

- keyboard access should remain viable
- color should not be the only signal
- headings and lists should stay semantic
- state labels should be readable without hover-only interaction

## Management Screen Standards

The screens below are the core management surfaces and should share a consistent UX language.

### Common rules

- each screen must have one primary decision focus
- summary metrics should appear above or beside detailed lists
- comparison-heavy screens should use split layouts
- action zones should stay visually separate from passive information
- labels should prefer operational wording over lore-heavy wording

## Dashboard Standards

### Purpose

Give the player a fast operational read of the current game state.

### Must show first

- current day and time slot
- money
- squad size or readiness
- pressure signals from politics or roster state

### Layout rule

Use compact metric cards first, then secondary panels for warnings or trends.

### UX rule

The dashboard should answer:

- what needs attention now
- what resource is constrained
- what changed since the last cycle

## Roster Standards

### Purpose

Support inspection, comparison, and assignment decisions for NPCs.

### Must show in list view

- name
- assignment
- status or role
- one readiness indicator
- one loyalty or morale indicator

### Must show in detail view

- short background
- current assignment
- core state values
- role-relevant traits or skills
- title or path potential

### Layout rule

Use list-plus-detail by default.

### UX rule

The player should be able to compare multiple NPCs quickly without losing the currently selected detail context.

## Districts Standards

### Purpose

Help the player compare city regions by risk, economy, and faction pressure.

### Must show

- district identity
- controlling faction
- danger
- market pressure
- relevant shop or function tags

### Layout rule

Use card or table-like overviews that allow quick cross-district comparison.

### UX rule

District screens should help answer:

- where should I go next
- where are prices or risks shifting
- which faction currently owns the local tempo

### Visibility rule

District overview is a pressure and direction layer, not a room-intelligence layer.

District surfaces may show:

- site identity when public or already clued
- broad function
- controller
- danger
- rumor pressure
- access posture

District surfaces must not show:

- full room lists
- exact captive placement
- exhaustive occupant rosters for still-abstract sites

Use the [Site Visibility and Reveal Contract](./site-visibility-and-reveal-contract.md) for certainty wording and information boundaries.

## Factions Standards

### Purpose

Support political understanding and long-term planning.

### Must show

- faction name
- agenda
- power
- security
- player standing
- active pressure

### Layout rule

Lead with identity and agenda, then show operational stats.

### UX rule

Faction screens should show both narrative meaning and mechanical consequence, never one without the other.

## Shops Standards

### Purpose

Support purchase comparison and district-specific economic decisions.

### Must show

- shop identity
- district context
- item category focus
- price or scarcity signals
- player-impacting differences versus other shops

### Layout rule

Keep item browsing and selected-item inspection visually separate.

### UX rule

The player should understand why a shop matters before browsing its full inventory.

## Mission Prep Standards

### Purpose

Support squad assembly and readiness decisions before execution.

### Must show

- selected squad
- available roster
- squad size limit
- readiness indicators
- obvious add/remove actions

### Layout rule

Use a two-column or two-panel composition: selected squad vs available roster.

### UX rule

Mission prep should feel like assembly, not spreadsheet maintenance. Actions should be immediate and reversible.

## Navigation Standards

- left-side or clearly persistent primary navigation is preferred for management routes
- route names should remain short and operational
- players should always know whether they are browsing, comparing, or committing

## Component and State Guidance

- selectors should prepare screen-ready aggregates where useful
- UI components should not join raw content and runtime state ad hoc when an application selector can do it once
- local UI state is appropriate for selection, expansion, sorting, and temporary filters
- mutation rules must remain in application logic

## Review Questions

When reviewing a management screen, ask:

- can the player scan the important state in a few seconds
- can the player compare options without memory strain
- are actions and information clearly separated
- does the screen expose consequence, not just data
- is the architecture boundary still visible in the implementation

## Expected Future Content

- navigation patterns
- component composition rules
- typography and spacing system
- accessibility checklist specific to game screens
