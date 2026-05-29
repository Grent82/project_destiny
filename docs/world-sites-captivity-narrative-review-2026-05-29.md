# Project Destiny
## Narrative/Game Design Review: World Sites, Rooms, and General Captivity

**Date:** 2026-05-29  
**Role lens:** Narrative / Game Design primary, with Systems, UI/UX, and Verifier challenge passes  
**Direction reviewed:**  
- all enterable houses and buildings should have rooms  
- any NPC can be captive  
- NPCs can interact with rooms and captives  
- offscreen simulation may be abstract, but must preserve narrative and systemic depth  
- concretized sites may later return to an abstract state

---

## Executive judgment

This direction is **strongly aligned** with the setting and with the game's RPG-first identity.

It would make Valdenmoor feel more like:
- a city of real interiors and institutions
- a place where captivity, debt, service, secrecy, shelter, and leverage happen somewhere
- a living world where NPC agendas continue even when the player is not present

The current project already **implies** this direction in lore and partial data. It does **not** currently support it at the correct simulation depth.

The biggest risk is not moral or tonal. The biggest risk is structural:

- the current project has `POIs`, `world households`, `rooms`, `captivityState`, `bondStatus`, and `soft bonds`
- but these are still **parallel fragments**
- there is no unified concept of:
  - `site`
  - `room occupancy`
  - `custody location`
  - `room-level NPC interaction`
  - `abstract <-> concrete site transition`

If this direction is implemented piecemeal, it will become contradictory very quickly.

---

## Specialist panel summary

### Narrative

This direction is excellent for world believability.

Valdenmoor is already written as:
- vertical
- overcrowded
- property-driven
- contract-driven
- household-driven
- full of hidden custody, safehouses, archives, shrines, cellars, service corridors, and repurposed interiors

In this city, people should not simply be:
- `missing`
- `held by faction X`

They should be:
- hidden in a place
- under someone
- in a room type
- with a condition that changes because of who visits, who feeds them, who ignores them, and who profits from them

The Mira arc becomes stronger if she is not only "in The Pale tannery" as text, but actually held in a structure whose rooms, watchers, and routines tell a story.

### Game Design

This direction creates a strong middle layer between:
- map-level travel
- quest/event outcomes
- NPC relationship simulation

That middle layer is currently underpowered.

With proper room/site logic, many systems gain real play:
- rescue quests
- infiltration
- hiding someone
- sheltering refugees
- house expansion
- surveillance
- escort / transfer
- bargaining over access
- coercion and protection
- staff, servant, guard, prisoner, patient, guest, dependent

This is one of the clearest ways to turn the project from a menu-RPG into a world-RPG without requiring free-roam movement.

### Systems

The direction is viable only if the project chooses a **hybrid world-site model** explicitly:

- concrete when entered or currently relevant
- abstract when offscreen and low-salience
- but with state depth preserved in abstraction

The current schemas are not enough:
- `captivityState` knows `holderId`, but not place
- `worldHouseholdSchema.rooms` defines rooms, but not occupancy, access, or behavior
- `worldNpcRuntimeState.locationOverride` is too weak to support room ecology
- `bondedPersonsRegistry` tracks ownership, not custody site

### UI/UX

This direction is good only if the UI respects information layers.

The player should not see all rooms of all abstract sites all the time.
Instead:
- district level: site role, faction, risk, rumors, notable statuses
- site level: visible wings / room groups / access gates
- room level: occupants, functions, restrictions, current state

If room detail leaks upward too early, the UI will become unreadable.

### Verifier

This direction introduces a new failure class:
- world state may become internally rich but player-invisible

Future quality gates must verify not just that:
- an NPC is in a room

but also that:
- the player can discover that fact through believable means
- the consequences of captivity or site changes are surfaced through quests, rumors, logs, dialogue, or visible access changes

---

## Where the current project already implies this direction

### 1. The lore already assumes meaningful interiors

[docs/narrative.md](/Users/andre.dittrich/privat/projects/project_destiny/docs/narrative.md) repeatedly describes:
- buried markets
- sealed cellars
- stacked lean-to habitation
- archive spaces
- chapel records
- safehouses
- service spaces
- household pressure
- hidden custody

This is not a setting where buildings should stay abstract menu buttons forever.

### 2. Mira is already written as physically held somewhere

[data/definitions/quests.json](/Users/andre.dittrich/privat/projects/project_destiny/data/definitions/quests.json) for `quest-mira-rescue` already specifies:
- the old tannery on the eastern edge of the Pale
- an occupied inner ring
- a holding floor

That is already room-language.
The current simulation just does not cash it out.

### 3. World households already exist and already have rooms

[src/domain/world/contracts.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/domain/world/contracts.ts) and [data/definitions/worldHouseholds.json](/Users/andre.dittrich/privat/projects/project_destiny/data/definitions/worldHouseholds.json) already define:
- households
- establishments
- faction seats
- room lists

Some are already fictionally close to custody:
- House Sorn: locked cellar, disappearances
- House Sable-Cairn: "half-servants, half-prisoners"
- Chapel of Saint Vey: sanctuary + archive + infirmary

So the design direction is not alien to the current content. It is the natural next layer.

### 4. Bond/captivity already imply custody and transfer

[src/domain/npc/contracts.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/domain/npc/contracts.ts) has:
- `captivityState`
- `bondStatus`
- `pregnancyState`

[destiny-og7t] and [destiny-766c] already assume:
- player-held and NPC-held bound persons
- transfer
- rescue
- condition decay

That already implies a spatial world eventually. The current data stops at legal ownership and broad holder identity.

### 5. Autonomous NPC social simulation already points this way

[destiny-c3sh] introduced local social simulation with district and routine overlap.
That becomes much more believable if the world can say:
- these two NPCs share a building
- this steward sees that captive daily
- this chapel sister keeps someone hidden in the archive wing

---

## Where the current project conflicts with this direction

### C1. `captivityState` is holder-based, not place-based

[src/domain/npc/contracts.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/domain/npc/contracts.ts) stores:
- holderId
- condition
- compliance
- bondType
- timeHeldDays

It does **not** store:
- site
- room
- guard structure
- access level
- transfer history
- who interacts with the captive

This is the single biggest direct conflict.

### C2. `worldHouseholdSchema.rooms` are authored fiction, not runtime space

[data/definitions/worldHouseholds.json](/Users/andre.dittrich/privat/projects/project_destiny/data/definitions/worldHouseholds.json) defines room names/functions/capacities.
But the system does not yet model:
- occupancy
- room assignment
- room state
- room access
- custody in room
- NPC interaction per room

So the project already names the rooms, but does not yet let the world live inside them.

### C3. POIs and world households are still parallel layers

[data/definitions/pois.json](/Users/andre.dittrich/privat/projects/project_destiny/data/definitions/pois.json) and `worldHouseholds` overlap conceptually but are not unified:
- some places are POIs
- some are world households
- some story-critical locations are POIs without a household/runtime footprint

This will become unstable if every enterable building must have rooms.

### C4. Bond/captivity content policy references a world that the runtime cannot yet represent

[docs/content-policy.md](/Users/andre.dittrich/privat/projects/project_destiny/docs/content-policy.md) is already written for a world where captivity has:
- duration
- aftermath
- who protects
- who reports
- who discovers

But the runtime still lacks the place-based social layer needed to support that credibly across many NPCs.

### C5. Player house logic is still too bespoke

Current house-room systems and audits are focused on:
- the player's house
- room repair
- room functions
- search aftermath

That work is good, but it is still **player-house-first**, not `all sites use one vocabulary`.

The new direction requires the player house to be one implementation of a wider site model.

---

## Narrative and game-design implications

### 1. Captivity becomes a relationship engine, not just a status

If any NPC can be captive and NPCs can interact with captives, then captivity is not only:
- a quest flag
- a debuff source

It becomes a social state that can change:
- fear
- dependence
- gratitude
- resentment
- silence
- witness knowledge
- rumor spread
- recovery difficulty

That is good, but it means captivity content must be treated as:
- institution-level world logic
- not just edge-case story drama

### 2. Rescue stories become better and harder

Good:
- rescue has a place
- rescue has defenders
- rescue has routines
- rescue can fail partially
- rescue can have aftermath beyond success/fail

Harder:
- the game must answer "why is this person here, in this room, under this security?"
- not just "because the quest says so"

### 3. Houses become true story generators

If all enterable houses have rooms, then:
- a noble house is not just a contact list
- an inn is not just a shop
- a safehouse is not just a quest icon

Each site can generate:
- clues
- meetings
- overheard conflicts
- hidden occupants
- custody changes
- room repurposing
- evidence trails

This is one of the best ways to deepen quest structure without open-world walking.

### 4. NPC agency improves sharply if rooms matter

NPCs should be able to:
- choose where they sleep
- move who they guard
- hide who they shelter
- convert a study into a holding room
- expand a building when prosperous
- assign attendants, watchers, healers, and intermediaries

Without this, "NPCs can expand houses and interact with rooms" remains decorative.

### 5. Abstract simulation must preserve human detail

The chosen hybrid model only works if abstraction still stores:
- who controls the place
- what kind of place it is
- who is held there
- who lives/works there
- who regularly interacts with whom
- how food, care, secrecy, and security are trending
- what incidents can emerge

If abstraction stores only:
- headcount
- security
- owner

then the narrative depth will collapse.

### 6. Deconcretization is good, but only with memory

If a site returns from concrete to abstract, it must not forget what happened.

At minimum, abstracted sites must retain:
- notable room purposes
- occupancy classes
- captivity assignments
- important evidence / secrets
- social tensions
- damage / repair state
- route-level tags such as "archive compromised" or "cellar now watched"

Otherwise the world will feel like it unloads and rewrites itself.

---

## Existing beads that should be adapted or treated as direct predecessors

### `destiny-5dpf` — CLOSED, but now a direct predecessor that needs a successor

This bead explicitly excluded:
- full room-level simulation
- entering/exploring world households
- dynamic stability changes tied to runtime presence

That is now insufficient.

Action:
- do **not** undo it
- create successor beads that promote `world households` from authored definitions into a hybrid runtime site model

### `destiny-4n2j` — CLOSED, but incomplete for the new direction

It introduced `captivityState`, but only at holder/status depth.

Action:
- add a successor bead that extends captivity from `holder-only` to `site/room custody`

### `destiny-og7t` and `destiny-766c` — CLOSED, but spatially incomplete

These define:
- ownership
- transfer
- registry
- rescue paths

But do not answer:
- where a bonded or captive NPC is physically kept
- who visits
- how site conditions affect them

Action:
- add a successor bead for `spatialized bond/captive custody`

### `destiny-c3sh` — CLOSED, but should be extended by successor work

World NPC social simulation currently uses district/routine/event overlap.

Action:
- add a successor bead for room/site co-presence and captive-interaction consequences

### `destiny-ccvc` — OPEN, needs scope note

This epic is about housing/heirs in the player house.
It should not remain player-house-isolated if the project moves to a general site model.

Action:
- note that player-house room functionality should become one branch of a shared room/site vocabulary

### `destiny-hx4e` and `destiny-doqn` — OPEN, adjacent but not primary

These are about wards/heirs lifecycle consistency.
They matter because children, wards, and dependents will eventually need physical placement and custody rules.

Action:
- no immediate rewrite
- but future ward work must assume households/sites, not abstract child containers only

### `destiny-2c2q` — OPEN, should gain a stronger site-aware quest note

Quest generation should eventually be able to emerge from:
- a household hiding someone
- a detainee transfer
- a chapel shelter conflict
- a room becoming compromised

Action:
- procedural and event integrity work should acknowledge site-state sources

### `destiny-rhx6` — OPEN, light adaptation only

This is mostly fiction consistency.
It should eventually standardize terms around:
- prisoner
- captive
- bound
- ward
- guest
- servant
- protected person

because these become much more mechanically meaningful under the new model.

---

## Missing beads

The current queue does **not** fully represent the clarified direction.
The following work is missing and should be tracked explicitly.

### M1. Hybrid site runtime model

Need a decision/architecture bead that defines:
- what a `site` is
- how `POI` and `worldHousehold` relate
- when a site concretizes
- when it re-abstracts
- what state must survive abstraction

This is the foundation bead.

### M2. Room occupancy and access model

Need a domain bead for:
- room slots
- occupancy
- visitors
- guards
- locked/restricted rooms
- role-based access

This is required before captive placement is credible.

### M3. Spatial captivity / detention model

Need a bead extending captivity to:
- siteId
- roomId
- custodyRole / captor cell
- transfer between rooms/sites
- daily care / neglect / concealment / relocation

### M4. Abstract offscreen site simulation with preserved depth

Need a bead that defines how abstract sites still simulate:
- care
- secrecy
- tension
- visitations
- rumor potential
- captive deterioration / stabilization
- NPC interaction frequency

### M5. Site-driven quest and event hooks

Need a bead that turns room/site state into content sources:
- rescue hooks
- overheard conflicts
- smuggling routes
- hidden witness arcs
- transfer ambushes
- “someone is being kept here” suspicion chains

### M6. NPC site expansion and renovation logic

Need a bead for:
- NPC/household-funded room expansion
- repurposing rooms
- upgrading security or amenities
- changing site role over time

### M7. Site-aware UI language and visibility rules

Need a bead that protects UX:
- abstract site summary vs concrete room detail
- what is player-known vs hidden
- what appears as rumor, clue, evidence, confirmed knowledge

---

## Recommended finding → bead mapping

### F1. Enterable houses need a general room model, not player-house exceptions
- Covered by new `M1`, `M2`
- Existing predecessor: `destiny-5dpf`

### F2. Any NPC can be captive, and captivity must be spatial
- Covered by new `M3`
- Existing predecessor: `destiny-4n2j`, `destiny-og7t`, `destiny-766c`

### F3. NPCs must interact with captives and rooms
- Covered by new `M2`, `M4`, `M5`
- Existing predecessor: `destiny-c3sh`

### F4. Abstract offscreen simulation must preserve depth
- Covered by new `M1`, `M4`

### F5. Concrete sites may re-abstract later
- Covered by new `M1`

### F6. Existing quests and lore already imply place-based custody
- Covered by new `M5`
- Existing story anchor: `quest-mira-rescue`, `destiny-qx1v`

---

## Recommendation

Proceed with this direction.

But do not start with Mira-specific content or player-house room polish.
Start with the general world-site contract first.

Recommended order:
1. `M1` hybrid site runtime decision
2. `M2` room occupancy/access model
3. `M3` spatial captivity / detention model
4. `M4` abstract offscreen site simulation
5. `M5` site-driven quests/events
6. `M6` NPC site expansion
7. `M7` site-aware UI/visibility rules

This is the cleanest way to keep the setting believable without building an unmaintainable full-city room sim.
