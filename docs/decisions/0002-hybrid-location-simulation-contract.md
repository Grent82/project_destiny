# ADR 0002: Hybrid Abstract-to-Concrete Location Simulation Contract

## Status

Accepted

## Context

Project Destiny now has a clarified product direction:

- all enterable houses and establishments should have rooms
- captivity must be a general system for any NPC, not a Mira-only exception
- NPCs must be able to inhabit rooms, work in rooms, guard rooms, visit rooms, and interact with captives
- offscreen sites may be simulated abstractly, but must retain deep social and psychological consequences
- concretized sites may later collapse back to an abstract state without losing important truth

The current codebase already contains several partial location models:

- player-house rooms in `state.house.rooms`
- authored `worldHouseholds` with simple room lists
- POIs as world-facing action hubs
- world NPC schedules and `locationOverride`
- `captivityState` on NPCs

These models are useful, but they are not yet one architecture. If new work continues without an explicit contract, the project will drift into incompatible special cases:

- player-house-only room logic
- POIs that remain flat labels
- captivity that knows a holder but not a place
- world households that look spatial in content but remain non-spatial at runtime

## Decision

Project Destiny adopts a **hybrid world-site model**.

### 1. Canonical concepts

The location architecture will be built from these concepts:

- `site definition`
  Authored world truth about a place.
  Example: old tannery, chapel, manor, safe house, market hall.

- `site runtime`
  Mutable runtime state for that place.
  A site runtime may be abstract or concrete.

- `room blueprint`
  Authored room structure for a site.
  Example: holding floor, archive wing, staff quarters, nave, cellar.

- `room instance`
  Runtime room state for a concrete site.

- `presence`
  Where an NPC is in world terms.
  Presence may resolve to district, site, room, convoy, or abstract offscreen placement.

- `custody`
  Place-aware captivity or detention state.
  Custody is not only “held by X”; it is held at a site, optionally in a room, under a regime, with consequences.

### 2. Abstract vs concrete site runtime

Every runtime site is in one of two simulation modes:

- `abstract`
  Offscreen, lower-detail simulation.
  The site still has real state, but not all room-level activity is expanded at once.

- `concrete`
  Detailed site simulation with rooms, occupancy, access, and room-level interaction.

Abstract does **not** mean shallow. It means less spatially expanded.

### 3. What abstract sites must preserve

Abstract site runtime must preserve durable truth, including at minimum:

- controller / owning household / controlling faction
- site purpose and pressure
- security posture
- supply / care quality
- known or suspected occupants
- custody assignments
- last verified knowledge
- recent consequential developments
- damage / repair / expansion summary
- relevant evidence, rumors, and quest hooks

This is the minimum needed so abstraction still produces meaningful world consequences.

### 4. What concrete sites add

Concrete site runtime adds:

- room instances
- room occupancy
- room access and restriction
- room-specific custody
- room-level evidence and site changes
- concrete room interactions
- site-local transient state that does not need to persist forever at full detail

### 5. Concretization triggers

A site should become concrete when at least one of these is true:

- the player enters it
- an active quest or incident requires interior play
- a known captive, witness, or target there becomes operationally relevant
- a transfer, raid, rescue, search, or collapse event materially changes the site
- the site belongs to the player or is directly controlled by the player's organization

### 6. Collapse-back rules

A concrete site may later return to abstract simulation.

When that happens, the game must preserve durable consequences and discard only transient detail.

#### Must survive collapse-back

- controller changes
- room-function changes that matter to future play
- occupancy outcomes that are still true
- custody assignments and transfers
- evidence already discovered
- meaningful damage / repair / expansion outcomes
- quest and event consequences
- last known location facts
- discovered access constraints

#### May be discarded on collapse-back

- exact temporary movement traces
- per-turn room-level tactical detail
- transient local-only UI state
- momentary staging details that have no future consequence

### 7. Relationship between POIs, world households, and the player house

These are no longer separate architectural species.

- POIs remain the **world navigation and authored discovery layer**
- world households remain the **authored household / establishment layer**
- the player house remains a **special site under direct player control**

But all three must map into one common site model at runtime.

The player house is a special case of a site, not a separate location architecture.

### 8. Captivity contract

General captivity must become place-aware.

At minimum, custody must reference:

- custodian / holder
- site
- concrete room when known and relevant
- custody regime or handling posture
- condition / compliance / coercion-like consequences
- transfer history or last-known movement

When a site is abstract, room knowledge may be absent or uncertain.
When a site is concrete, custody should resolve to actual rooms where appropriate.

### 9. NPC presence contract

NPC presence must be general enough to support:

- residence
- work placement
- guard placement
- visitor presence
- hidden / sheltered presence
- captive presence

Presence should not be hard-coded as schedule-only district movement forever.

### 10. Scope discipline

This decision does **not** commit the game to:

- free-roaming exploration
- always-on full room simulation for every site
- rendering every abstract site as a map
- building every content-heavy captivity interaction immediately

The hybrid model exists specifically to preserve depth without requiring maximum detail everywhere at once.

## Rationale

This decision gives the project one coherent substrate for:

- Mira and other story captives
- player-house occupancy
- NPC households
- bond service and rescue flows
- room-driven quests and rumors
- location-driven social simulation

Without this ADR, each of those would continue to grow as semi-separate systems.

## Consequences

### Positive

- locations stop being disconnected labels
- captivity becomes a real world state
- NPC households can expand naturally into the world model
- POIs, rooms, and quests can share one causal substrate
- abstraction remains performant without flattening narrative consequence

### Costs

- requires schema and migration work
- requires careful UI information hierarchy
- requires new quality gates around concretization and collapse-back
- delays direct content implementation until the substrate is defined

## Follow-on Work

This ADR directly unblocks:

- `destiny-ziyp`
- `destiny-d7lm`
- `destiny-a23y.1`
- `destiny-a23y.2`

It should also guide future remapping of:

- `destiny-ccvc`
- `destiny-hx4e`
- `destiny-mjk9`
- `destiny-0zn5`

