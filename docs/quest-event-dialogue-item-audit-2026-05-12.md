# Quest, Event, Dialogue, Item Audit

Date: 2026-05-12

## Scope

This audit reviews the current implementation and content depth of:

- quest system
- quest narrative quality
- quest consequences and story follow-through
- events and event-to-quest links
- room search and house-discovery payoff
- dialogue system and dialogue-driven progression
- item system, usable items, equipment, and inventory coherence

It combines direct code/content inspection with a lightweight specialist-panel review from:

- `Mendel` — Game Design
- `Goodall` — Narrative
- `Arendt` — UI/UX
- `Ohm` — Systems Architecture
- `Epicurus` / `Singer` — fast secondary passes

## Snapshot

Current content/runtime snapshot at audit time:

- quests: `17`
- story quests: `2`
- combat quests: `6`
- investigation quests: `7`
- delivery quests: `2`
- survival quests: `2`
- timed quests: `13`
- events: `69`
- auto-resolved rumor events: `15`
- dialogue trees: `8`
- item definitions: `34`
- item definitions with authored `effects`: `24`

## Executive Summary

Project Destiny now has a credible **systems scaffold** for an RPG-first quest experience:

- runtime quest leads exist
- discovery is no longer purely omniscient
- quest settlement is centralized
- investigations are cleaner than before
- equipment has a real tactical and economic loop

The main problem is no longer “missing structure.”  
The main problem is **content-island drift**:

- quests have strong prose but shallow internal structure
- events have decent flavor but weak persistent fallout
- room discoveries read like quest seeds but mostly resolve into log text
- dialogue promises consequences the runtime does not fully support
- items describe use cases the player cannot actually perform

The project already knows what kind of RPG it wants to be. The next major gains come from making the existing islands talk to each other.

## Specialist Panel Synthesis

### Strongest agreement

All specialists converged on four points:

1. **The writing is ahead of the mechanics.**
   Briefings, event prose, room descriptions, and Marion’s dialogue are already stronger than the runtime depth that carries them.

2. **The current quest system is still mostly a template catalog.**
   It is a better catalog than before, but most quests are still `hook -> route -> single resolution surface -> settlement`.

3. **The event/dialogue/item/room systems are not yet a shared consequence engine.**
   They coexist, but they rarely pass durable state to one another.

4. **The strongest near-term value is glue, not breadth.**
   Adding more content before cross-system follow-through will multiply shallow patterns.

### Main emphasis differences

- `Mendel` emphasized **player agency**, multi-stage contract arcs, and successor quests.
- `Goodall` emphasized **house-story scaffolding**, NPC voice coverage, and on-stage story discovery.
- `Arendt` emphasized **presentation hierarchy**, diegetic framing, and event/context clarity.
- `Ohm` emphasized **runtime model weakness**, dead abstractions, and state that exists only as prose.

There was no major contradiction between the specialists. The disagreement was mostly about priority framing, not direction.

### Specialist discussion outcome

The most useful internal debate was not "is the content good?" but "where exactly is the break between authored promise and playable reality?"

- `Goodall` argued that the house discoveries, Marion, Orren, Tessaly, and Mira already imply a strong early campaign spine.
- `Mendel` agreed on the promise, but pushed that the current runtime still cashes that promise out mostly as `search -> log -> state label`.
- `Arendt` added that even when the state changes are correct, the UI often does not stage them as scenes, so the player does not always feel the narrative transition.
- `Ohm` then grounded the dispute in architecture: many of the missing beats are not blocked by prose, but by the lack of typed runtime carriers for clues, event provenance, dialogue consequences, and usable artifacts.

The panel therefore converged on a precise diagnosis:

- the project does not primarily need more lore
- it needs more **state-bearing narrative objects**
- and more **authored intermediate beats** between discovery and settlement

## Detailed Analysis

### 1. Quest System

#### What is already working

- The quest data model is materially better than a few iterations ago:
  - lead runtime
  - active runtime
  - discovery source
  - district context
  - stage/progress/journal
- Quest settlement is centralized in [src/application/commands/questSettlement.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/application/commands/questSettlement.ts).
- Discovery is now more diegetic than a static `availableQuests` array.
- The quest copy in [data/definitions/quests.json](/Users/andre.dittrich/privat/projects/project_destiny/data/definitions/quests.json) is tonally strong and setting-consistent.

#### Structural weakness

The quest system still behaves more like a **typed job board** than a canonical RPG state machine.

Evidence:

- only `2` quests are marked `story`
- most quests still rely on generic handlers by `objectiveType`
- `linkedMissionId` is effectively dead content
- only the two story quests have `openingText` and `aftermathText`
- runtime fields like `stageId`, `progress`, and `journalEntries` are only lightly exploited by authored content

The practical result is:

- strong premise at intake
- weak internal escalation
- thin mid-quest authored beats
- consequences mostly happen at settlement time

#### Narrative quality

The authored quest hooks are good. Titles and briefings like:

- `The Missing Ledger`
- `The House on Soot Lane`
- `Old Ledgers`
- `The Pale Cage`

already carry the right dark-fantasy urban tone.

The problem is not prose quality.  
The problem is **mechanical earning**.

Most quests promise:

- intrigue
- social leverage
- dangerous travel
- hidden actors
- compromised institutions

but the runtime often delivers:

- travel
- one execution screen
- resolution roll or combat
- ledger settlement

#### Depth by objective type

`combat`
- Best-supported objective type mechanically.
- Still often lacks a quest-specific pre-encounter dramatic scene.

`investigation`
- Improved structurally with approach selection.
- Still fundamentally `choose approach -> choose staff -> single seeded result`.
- Does not yet feel like assembling truth.

`delivery`
- Better than instant completion after the on-site execution work.
- Still too close to “be present and spend the watch.”

`survival`
- Similar weakness to delivery.
- Does not yet generate strong holdout, attrition, or situational pressure.

#### Consequences

Quest consequences are mostly:

- Marks
- faction standing
- city dials
- renown
- debt reduction
- NPC unlocks
- log entries

These are useful, but they are too abstract to carry the RPG fantasy by themselves.

What is mostly missing:

- changed POI descriptions
- changed NPC lines
- changed access
- changed district scene logic
- follow-up grudges
- successor leads caused by success or failure

### 2. Quest Narratives and Player Guidance

The player is not yet strongly led through an authored campaign after the opening.

Current pattern:

- dashboard pressure
- house / district access
- Work Board
- generic contract flow

This is understandable, but not dramatic enough.

The main spine around:

- Marion
- the debt claim
- Orren
- Tessaly
- Mira

is still too thin relative to the game’s fantasy.

The project needs a **House Valdris story ladder** that remains visible in the first several hours instead of quickly being drowned out by generic contract work.

### 3. Events

#### What is already working

- There is a broad event catalog.
- Trigger conditions cover a useful set of macro and state variables.
- Event prose is generally strong.
- Pending events and event choices exist as real systems.

#### Core problems

`evaluateEvents.ts` in [src/application/commands/evaluateEvents.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/application/commands/evaluateEvents.ts) is still a broad condition-checking pass over templates with direct probability use.

Weaknesses:

- event instances store only `eventId` and `firedOnDay`
- event outcomes cannot meaningfully create quest leads, artifacts, room state, or durable world actors
- event UI is thin and context-poor
- many events resolve as short-lived interruptions rather than lasting developments

#### Event-to-quest coupling

This is one of the biggest systemic gaps.

Right now:

- quests mostly live in the board/incident funnel
- events mostly live in modal interruptions and macro consequences

There are only weak bridges between them.

That means:

- quest fallout rarely becomes an authored event chain
- events rarely mutate quest state
- world pressure exists, but does not often crystallize into story-bearing obligations

Concrete examples:

- major story pressure around the house is still more strongly advanced by bespoke logic in `applyPolitics.ts` than by reusable event chains
- `pendingEvent` runtime only preserves `eventId` and `firedOnDay`, so even a good event description does not remember enough context to become a lasting quest-bearing incident
- event outcomes can alter standing or dials, but cannot yet reliably spawn a named clue, artifact, lead, or witness that the player can later interrogate

#### Presentation weakness

[src/ui/components/EventModal.tsx](/Users/andre.dittrich/privat/projects/project_destiny/src/ui/components/EventModal.tsx) currently presents:

- title
- description
- buttons

What is missing:

- speaker or source
- district context
- “why now”
- consequence preview
- memory of what caused this

So even well-written events can feel administratively generated instead of world-generated.

### 4. Room Search and House Discoveries

#### Current strength

[src/application/content/houseDiscoveries.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/application/content/houseDiscoveries.ts) is one of the strongest authored content files in the project.

It already contains compelling objects and hooks:

- sealed envelope for Mira
- unfamiliar crest ring
- removed-ledger chit
- “arrangement below”
- district watch sketch
- vault letter

#### Current weakness

[searchRoom](/Users/andre.dittrich/privat/projects/project_destiny/src/application/store/gameSlice.ts:1032) mostly does three things:

- mark room searched
- add Marks
- append a log message

Only the vault materially updates the main quest.

That means many discoveries that read like:

- evidence
- suspect trail
- secret correspondence
- world hook

are not persisted as:

- items
- documents
- clues
- dialogue topics
- follow-up leads

This is a major lost opportunity. The house is already the best natural onboarding space for the story.

The strongest examples of "good authored find, weak systemic follow-through" are:

- the unfamiliar crest ring
  It reads like evidence or a faction clue, but does not currently become a tracked artifact, dialogue topic, or suspect pointer.
- the removed-ledger chit
  It strongly implies tampering and motive, but currently behaves more like flavor than a live investigative object.
- the sealed envelope for Mira
  It has emotional and story weight, but mostly resolves into activity-log context instead of an actionable conversational or quest object.
- the vault letter
  It is one of the most important story objects in the opening house arc, but the broader house search loop around it is still thinner than the writing suggests.

This is the direct answer to the user's question about "an item found there, but what are we doing with it?"  
In the current implementation, the answer is too often: **we read it, log it, and move on**, instead of carrying it forward as evidence, leverage, memory, or a playable lead.

#### Vault progression

The vault remains partially undercut by automation:

- [applyPolitics.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/application/commands/applyPolitics.ts) auto-surfaces the key after day 5
- [HouseScreen.tsx](/Users/andre.dittrich/privat/projects/project_destiny/src/ui/screens/HouseScreen.tsx) still says `Requires a key or a quest`

This makes the arc work as scaffolding, but it weakens the feeling of earned discovery.

### 5. Dialogue System

#### Current strength

Marion’s dialogue is the strongest current conversation content:

- emotional subtext
- conditionally unlocked depth
- early debt pressure
- small but meaningful relationship movement

This proves the project can support good relationship-driven writing.

#### Runtime mismatch

This is the most severe dialogue finding.

[src/domain/dialogue/contracts.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/domain/dialogue/contracts.ts) supports outcomes including:

- `standing`
- `questUnlock`
- `item`

But [src/ui/screens/DialogueScreen.tsx](/Users/andre.dittrich/privat/projects/project_destiny/src/ui/screens/DialogueScreen.tsx) only handles:

- relationship shifts
- `mainQuestHint`
- `factionStanding`
- `activityLog`

So the schema currently promises more than the runtime executes.

That is a content-authoring hazard.

It also creates a practical design trap:

- a writer can author a node that appears to unlock a quest or hand over an item
- the schema allows that expression
- but the live game may silently collapse it to relationship deltas plus log text

That means dialogue is currently over-signaling consequence richness relative to actual execution.

#### Architecture weakness

Dialogue consequence resolution currently lives in the UI.

That breaks clean architecture and makes dialogue:

- harder to test
- harder to deepen
- harder to make reusable

#### Depth weakness

There are only `8` dialogue trees total.

This is not enough for a game framed around:

- named contacts
- factions
- house relationships
- personal secrets
- political leverage

The city still feels too silent.

#### Reactivity weakness

Dialogue conditions are currently shallow:

- day
- debt paid
- renown
- trust
- loyalty

What is missing:

- quest stages
- room discoveries
- artifacts/evidence
- district state
- event memory
- NPC memory

### 6. Item System

#### Current strength

The item content layer is richer than the rest of the runtime:

- consumables with effects
- documents
- tools
- gifts
- modules
- materials
- weapons and armor with real tactical identity

Equipment is currently the strongest implemented item family.

#### Core weakness

Most item families are **content-rich but interaction-poor**.

Evidence:

- purchases usually just add inventory entries
- there is no general `use item` action loop for most items
- consumable `effects` are data-rich but mostly inert at runtime
- documents and evidence rarely connect to dialogue or quest logic

This is especially visible when comparing item families:

- `weapons` and `armor`
  These already have meaningful ownership, equip, durability, repair, and combat identity.
- `consumables`
  These often have authored effect metadata, but most do not yet support a satisfying player action loop.
- `documents`, `evidence`, `gifts`, and `tools`
  These are the weakest family in playable terms. They imply uses in dialogue, social leverage, proof, bribery, or access, but the system does not yet honor those implications consistently.

So the item system is not uniformly weak. It is **lopsided**:

- mechanically strong where it feeds combat/economy
- mechanically weak where it should feed story/social play

#### Ownership-model weakness

The player’s possessions are split across:

- `inventory`
- `stash`
- loadout
- freeform room-search text

This makes the item model harder to reason about and weakens story-object continuity.

#### Quest/item mismatch

Items like:

- ledgers
- documents
- medical supplies
- contraband
- gifts

should naturally matter to:

- quests
- dialogue
- house progression
- relationships

but those bridges are still weak.

### 7. Cross-System Conclusion

The project’s biggest missing layer is not “more content.”

It is:

- room discoveries becoming evidence
- evidence becoming dialogue topics
- dialogue becoming leads or branch decisions
- events mutating quest state
- items mattering socially and narratively
- quest aftermath visibly changing what the world offers next

That is the real multiplier.

## Numbered Findings

1. Quest catalog has strong prose but too few authored story beats and too few story quests.
2. Quest runtime is still too weak for structured clue, branch, participant, and aftermath state.
3. Investigations still feel like flavored staffing checks instead of real clue chains.
4. Quest consequences are mostly numeric/logged, not visibly world-changing.
5. Event runtime and event outcomes are too shallow to carry durable narrative fallout.
6. Event presentation is too context-thin for a dark fantasy RPG.
7. Dialogue schema/runtime are out of sync, and dialogue resolution lives in the UI.
8. Dialogue coverage and reactivity are too sparse for a people-driven RPG.
9. Room discoveries are some of the best-authored content in the repo, but they mostly collapse into text plus Marks.
10. Vault/house progression is partially auto-solved and weakens earned discovery.
11. Item definitions promise far more usability than the current runtime delivers.
12. Inventory/stash/artifact ownership is fragmented, which weakens quest/dialogue/item coherence.
13. POI discovery and onboarding are more diegetic than before, but still too mechanical and too compressed for first-session story leadership.
14. There is visible naming/house-fiction continuity drift (`Valdris` vs `Valdris`, “Breach” framing vs recent seizure/stripping framing).

## Finding → Bead Mapping

This mapping satisfies the audit traceability rule.

| Finding | Covered by |
|---|---|
| 1 | `destiny-a7oj`, `destiny-t1b2` |
| 2 | `destiny-a9xk` |
| 3 | `destiny-lki4` |
| 4 | `destiny-ue4j` |
| 5 | `destiny-tw9g`, `destiny-zplo` |
| 6 | `destiny-tw9g` |
| 7 | `destiny-hv5w` |
| 8 | `destiny-hv5w`, `destiny-2qz4` |
| 9 | `destiny-a5px` |
| 10 | `destiny-a5px`, `destiny-a7oj` |
| 11 | `destiny-5zru` |
| 12 | `destiny-5zru` |
| 13 | `destiny-sbgx`, `destiny-sbgx.1`, `destiny-cnfs` |
| 14 | `destiny-a7oj` |

No audit finding is currently unmapped.

## Immediate Design Implications

If the project wants stronger dark-fantasy RPG feel without blowing up scope, the best next moves are:

1. Turn room finds into typed artifacts.
   Not every note needs a whole quest, but important finds need to become something more durable than log prose.
2. Make dialogue the main conversion layer from artifact to action.
   A ring, ledger scrap, key, or letter should often matter because it changes what Marion, Tessaly, Orren, or a district contact will say next.
3. Let events escalate existing threads instead of only interrupting the day.
   Events are most valuable when they intensify a named problem, faction pressure, or clue trail.
4. Stop adding quest breadth faster than quest middle structure.
   The current catalog is already large enough to justify deeper internal beats.
5. Keep using equipment as the benchmark.
   Weapons and armor show what "fully realized" looks like in this project: authored data, strong runtime semantics, visible player choices, and meaningful consequences.

## Recommended Order

1. `destiny-hv5w`
   Fix the dialogue architecture gap before more authored dialogue is added.
2. `destiny-a5px`
   Turn the house into a real clue engine.
3. `destiny-a7oj`
   Build the early House Valdris story ladder on top of the house clue work.
4. `destiny-a9xk`
   Strengthen quest runtime so deeper authored flows have somewhere to live.
5. `destiny-lki4`
   Make investigation worthy of its narrative framing.
6. `destiny-tw9g`
   Upgrade events from ambient interrupts to stateful story drivers.
7. `destiny-5zru`
   Make items/documents/evidence materially usable across the RPG loop.
8. `destiny-ue4j`
   Make consequences visible in the world, not just the ledger.

## Bottom Line

Project Destiny does **not** currently have a weak narrative foundation.

It has:

- strong quest premises
- strong room prose
- a promising main-house setup
- competent faction/event tone
- one genuinely good relationship voice in Marion
- a far stronger equipment model than most early RPG prototypes

What it lacks is **follow-through**.

The next phase should optimize for:

- fewer isolated systems
- more durable state handoff
- more authored mid-quest beats
- more visible aftermath
- more object- and clue-driven interactions

That is the point where the project stops feeling like a strong management prototype with lore and starts feeling like a dark fantasy RPG with management systems.
