# Workflow: Design Review

Use this workflow before and after work that changes player-facing game design:

- quests
- NPCs
- items
- lore
- UI
- UX
- flow
- onboarding
- information architecture

For authored event scenes or tutorial-event delivery, also use [docs/workflows/event-review.md](event-review.md).

This workflow exists because `green tests` do not prove `good player experience`.

## When to run

- before implementing a new player-facing feature
- after any audit that reports confusion or low trust
- before closing a quest/UI/dialogue/item bead
- during specialist-panel review synthesis

## Core rule

Every visible design element must answer a good player question at the correct abstraction level.

If it does not:
- remove it
- move it
- merge it
- or reframe it

Do not keep text or UI just because it is flavorful or technically correct.

## Review lenses

Run every surface through these six lenses.

### 1. Fantasy

What player fantasy is this serving?

Examples:
- rebuild a fallen house
- read a dangerous city
- command loyal but complicated people
- chase clues through a decaying political order

If the answer is weak, the feature is probably decorative.

### 2. Agency

What meaningful decision does the player make here?

Check:
- what is the choice?
- what is the tradeoff?
- what becomes possible or impossible after it?

If there is no meaningful choice, ask whether this should be:
- pure flavor
- automatic background simulation
- or cut entirely

### 3. Legibility

Can a fresh player answer:
- what is this?
- why does it matter?
- what can I do here?
- what changed after I acted?

If not, the design is not ready.

### 4. Spatial / Layer Fit

Is this information shown on the correct layer?

Use this hierarchy:
- world map: where, why, danger, opportunity
- district: district purpose, pressure, access, POI categories
- POI: what action or contact exists here
- NPC: what this person wants, knows, or offers
- room/item/clue: what changed here, what remains unresolved

If a district card reads like an NPC dossier, or a room card reads like a quest journal, the hierarchy is wrong.

### 5. Consequence

After the player clicks, what visibly changes?

Good changes:
- new route opens
- new topic appears
- room function changes
- quest stage changes and is readable
- another NPC reacts
- cost or risk becomes visible

Bad changes:
- only a hidden state flag changes
- only a log line changes
- only a test can prove it worked

### 6. Diegesis

Is the world logic preserved?

Check:
- does the player move through places naturally?
- is the UI compensating for confusing routing with meta shortcuts?
- does the system silently solve reasoning that should happen in dialogue or scene?

Diegetic does not mean “no overlay UI.”
It means the world model and the player’s route through it still make sense.

## Surface checklists

### Quest review

- What is the hook?
- What is at stake?
- Why now?
- What is the friction?
- What new information is learned?
- What changes afterward?
- Who remembers or reacts?
- Can the player always locate current work?

### NPC review

- What does this NPC want?
- What do they fear?
- What do they know?
- What do they hide?
- Why would the player care about them?
- How do they change after interaction?

### Item review

- Is this item a verb or only a noun?
- Can the player use, show, equip, consume, archive, gift, or interpret it?
- If it is evidence, who reacts to it?
- If it is equipment, what decision does it sharpen?

### Lore review

- Does this lore change a decision?
- Does it explain a route, faction, object, or tension?
- Does it alter how a place is read?
- If removed, would gameplay understanding suffer?

### UI / UX review

- What player question does each section answer?
- Is the page trying to answer too many questions at once?
- Is the next meaningful action clear?
- Is the distinction between new information and ongoing information clear?
- Is any text only compensating for weak structure?

## Red flags

Stop and critique harder if you see:

- a page with multiple overlapping names for the same concept
- a state change with no visible payoff
- a clue that does not clearly point to its next conversation or place
- a room, NPC, or item that reads like a static dossier
- guidance links that exist only because the flow is otherwise confusing
- a test that proves availability but not discoverability

## Required acceptance for player-facing beads

Every player-facing bead should include:

- player-visible acceptance
- route clarity acceptance
- post-action readability acceptance

Examples:
- “The player can tell that the room has already been searched and still see unresolved clues.”
- “The player can identify where current quests live without guessing.”
- “Finding the chit clearly points toward Marion as the next contact.”

## Verification modes

Use at least one:

- screen test
- selector/view-model test
- route-level playthrough
- manual fresh-eyes walkthrough

For first-hour flows, prefer both:
- automated route coverage
- manual review checklist

## Fresh-eyes checklist

Run this as if you know nothing:

1. Where are my quests?
2. What changed after I searched this room?
3. Why should I repair this room?
4. Who should I talk to after finding this clue?
5. What is this page for?
6. What should I do next?

If any answer requires “well, technically...”, the design is not done.
