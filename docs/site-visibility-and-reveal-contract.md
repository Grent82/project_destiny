# Site Visibility and Reveal Contract

## Purpose

This document defines what the player may know about a place at district, site, and room level in Project Destiny's hybrid location model.

It exists to stop three failure modes:

- abstract sites leaking concrete room truth too early
- important hidden custody feeling arbitrary or unfair
- UI surfaces inventing incompatible reveal rules on their own

This contract is the player-facing companion to [ADR 0002: Hybrid Abstract-to-Concrete Location Simulation Contract](/Users/andre.dittrich/privat/projects/project_destiny/docs/decisions/0002-hybrid-location-simulation-contract.md).

## Core Rule

The player should always be able to answer three questions:

- what do I know for sure
- what do I only suspect
- what can I do next to verify or exploit it

If a surface cannot support those three questions, it is revealing the wrong information or missing a necessary affordance.

## Knowledge States

All site, occupancy, and custody information must resolve to one of five knowledge states.

### 1. Unknown

The player has no actionable awareness.

- The site may not be visible at all.
- The player may know a district, but not the place.
- No room or captive truth appears.

### 2. Rumored

The player has social noise, hearsay, or ambient suspicion.

- A district may imply that a site or problem exists.
- The information may be wrong, incomplete, or stale.
- The player should see uncertainty in wording.

Use language like:

- `rumors point to`
- `some say`
- `whispers suggest`
- `possible holding site`

### 3. Clued

The player has evidence, a named hint, or a directional lead.

- A site can be identified or narrowed.
- A room class may be inferred.
- A captive may be linked to a site, but not necessarily to an exact room.
- Access constraints may become partially known.

Use language like:

- `records indicate`
- `a witness named`
- `the note points to`
- `held somewhere in the tannery's lower ring`

### 4. Witnessed

The player or a trusted agent has directly observed a meaningful fact.

- Site identity is confirmed.
- Specific room groups or access gates may be known.
- Named occupants, guards, or captives may be known.
- The player can act on this knowledge with confidence, though it may still age.

Use language like:

- `confirmed by Marion`
- `seen on-site`
- `your crew verified`
- `the captive was seen in the holding floor`

### 5. Confirmed Runtime Truth

The player is currently in or has fully concretized the site.

- Concrete room instances may be shown.
- Current occupancy, restrictions, damage, and custody may be shown according to line of access.
- This is the highest-detail state.

This does not mean the player sees every hidden room automatically. Concrete sites still obey access and discovery.

## Information Boundaries by Layer

### District Layer

The district layer answers:

- why should I care about this district
- what type of place or pressure exists here
- what might be happening here

District level may show:

- site name if the place is public or already clued
- site role or type
- controlling faction or apparent operator
- access posture
- district-level risk
- rumor pressure
- broad statuses:
  - `guarded`
  - `sealed`
  - `busy`
  - `under strain`
  - `whispers of custody`

District level must not show:

- full room lists
- exact captive room placement
- full occupant rosters
- exact guard counts
- hidden service passages

District level can imply custody only in broad terms:

- `suspected holding site`
- `missing persons linked here`
- `quiet deliveries at odd hours`

### Site Layer

The site layer answers:

- what is this place
- what parts of it are legible from outside or from current knowledge
- what can I do here next

Site level may show:

- site identity
- public-facing description
- visible wings or room groups
- public or discovered access points
- known controller
- known current pressure
- whether the site is:
  - public
  - restricted
  - shuttered
  - compromised
  - under watch
- known or suspected functions:
  - archive
  - chapel
  - cellar
  - dormitory
  - holding floor
  - service wing

Site level may also show knowledge quality:

- `rumored`
- `partial`
- `verified`
- `stale`

Site level must not show:

- exact room occupancy for undiscovered rooms
- exact captive placement before that placement is witnessed or concretely found
- hidden entrances not yet learned
- hidden site functions the player has not earned

### Room Layer

The room layer answers:

- who or what is here
- what restricts me here
- what state changed here

Room level may show:

- room name
- function
- visible occupants
- discovered evidence
- damage, repair, or contamination
- access condition
- discovered custody state

Room level must distinguish between:

- currently visible occupants
- last known occupants
- inferred occupants

Do not flatten these into one status.

## Occupancy and Custody Visibility

### Occupancy Classes

Occupancy should surface through classes before it surfaces through full identity.

Reveal order should generally be:

1. `activity`
2. `role class`
3. `count or pressure`
4. `named identity`
5. `exact room placement`

Example:

- `late-night traffic`
- `laborers and one armed watch`
- `three regular occupants`
- `Marion recognizes one of the Court factors`
- `the factor sleeps above the counting room`

### Custody Classes

Custody should reveal in the same staged way.

Reveal order should generally be:

1. `something is wrong`
2. `someone is being held`
3. `a type of captive is held`
4. `a named captive is held at this site`
5. `the named captive is in this room or room group`

Example:

- `strange food deliveries and muffled shouting`
- `whispers of a holding site`
- `someone highborn is kept here`
- `Mira is being held in the tannery`
- `Mira was seen past the inner ring on the holding floor`

## Certainty, Freshness, and Staleness

Knowledge is not timeless.

Every important site truth should support:

- certainty
- source
- freshness

### Certainty

How trustworthy is the information?

- `rumored`
- `suggested`
- `verified`

### Source

Where did the player learn it?

- rumor
- witness
- roster operative
- document
- observation
- interrogation
- prior visit

### Freshness

How old is the knowledge?

- `current`
- `recent`
- `stale`

Stale knowledge is still valuable, but the UI must stop wording it like present truth.

Use language like:

- `last verified two days ago`
- `reported this morning`
- `old Court record`

## Abstract Sites

Abstract sites must still feel deep, but they cannot behave like fully visible floorplans.

Abstract sites may surface:

- controller
- broad security posture
- broad supply/care posture
- known or suspected occupants
- known or suspected custody
- recent consequential developments
- last verified access facts

Abstract sites must not expose:

- full room rosters
- exact real-time room movement
- exact room-by-room captive state
- every hidden chamber simply because the player knows the site exists

### Required Abstract-Site Outputs

An abstract site should still be able to generate:

- rumors
- quest leads
- rescue hooks
- access friction
- transfers
- welfare changes
- coercion or dependency changes
- evidence trails

The site may be abstract in layout, but not flat in consequence.

## Concrete Sites

Concrete sites may expose room structure, but only through access and discovery.

Concrete does not mean omniscient.

Even in a concrete site:

- locked rooms remain hidden or opaque
- hidden custody remains hidden until discovered
- indirect clues should still precede some full truths

The player earns detail by:

- entering
- searching
- questioning
- bribing
- infiltrating
- observing
- using trusted NPCs

## Concretization and Collapse-Back Visibility

### When a site concretizes

The UI may move from district/site summary to room structure when:

- the player enters
- an active incident forces interior play
- a captive or target becomes operationally actionable
- a raid, rescue, search, or transfer event materially changes the site

### When a site collapses back to abstract

The player must retain meaningful knowledge already earned.

What remains visible after collapse-back:

- discovered room groups
- known access gates
- last known captive placement
- known controller
- known evidence discoveries
- meaningful damage or repair
- discovered secret passages or constraints

What should collapse:

- temporary exact movement
- room-by-room tactical posture
- local temporary clutter with no future consequence

Collapse-back should feel like:

- `you no longer have live detail`

not like:

- `the game forgot what you learned`

## UI Language Contract

The wording must always reflect knowledge quality.

### Use certainty-matched phrasing

For rumors:

- `reported`
- `whispered`
- `suspected`

For clues:

- `points to`
- `suggests`
- `narrows to`

For witnessed facts:

- `verified`
- `seen`
- `confirmed`

### Avoid false certainty

Do not say:

- `Mira is in Cell 3`

unless the player has earned exactly that level of truth.

Instead say:

- `Mira is believed to be held somewhere on the tannery's holding floor`

until stronger knowledge exists.

## Player-Comprehension Rules

Every surface that shows site or custody information must help the player answer:

- what do I know
- what is only suspected
- what can I do to learn more or act

If a site or captive is relevant but still hidden, the surface should point to one next-step verb:

- `ask`
- `search`
- `observe`
- `bribe`
- `travel`
- `speak to`
- `review records`

Hidden truth without an implied next step feels arbitrary.

## Implementation Notes

This contract should guide:

- district selectors
- POI presentation
- rumor generation
- quest lead creation
- room screens
- custody UI
- event phrasing
- dialogue clue phrasing

It does not itself choose component layouts. It defines what each layer may truthfully expose.

## Follow-on Work

This contract directly informs:

- `destiny-ziyp`
- `destiny-d7lm`
- `destiny-ko11`
- `destiny-a23y.2`

It should also constrain future updates to:

- district overview IA
- POI screens
- quest log language
- event copy
- rescue and captivity flows
