# Workflow: Event Review

Use this workflow when designing, reviewing, or implementing:

- authored events
- character scenes delivered through the event modal
- tutorial events
- world or faction reaction events
- event-to-quest or event-to-dialogue follow-up beats

Project Destiny should not use events as generic popups or hidden-state wrappers. Events must:

- establish why the scene is happening now
- communicate what the player's choice means
- surface immediate consequence in the same flow when it matters
- preserve diegetic truth about who is acting and why
- avoid promising social or world continuity the runtime does not support

## Why this exists

An event can be mechanically valid and still fail because:

- the player cannot tell who initiated the scene
- the trigger context is only implied by the activity log
- the choice labels hide player intent behind vague verbs like `Listen` or `Accept`
- the outcome is only readable after opening the activity log
- tutorial guidance is wrapped as fiction even when it is not a scene
- named stakeholders sound like real world actors when they are only loose flavor text

## Core rule

Every player-facing event must answer the obvious player questions before the player resolves it:

1. what is this?
2. why is it happening now?
3. who is acting on me or asking something of me?
4. what does each response mean?
5. what visibly changed after I chose?

If the event cannot answer those questions, fix the scene, move it to a better surface, or cut it.

## Event contract

### 1. Trigger context

The event body must establish enough context for a fresh player to place the scene.

Check:

- who is present?
- what changed to cause this scene?
- why now rather than earlier or later?
- if the text implies other people or prior activity, are those people/activity readable?

Bad:
- `Marion catches you before you leave. She does not ask. She tells.`
- `after the others have gone` when no readable `others` exist on the surface

Good:
- scene names the actor, recent cause, and situational frame
- if the event is a follow-up to a quest, success, debt spike, or unrest threshold, the text makes that relationship legible

### 2. Choice intent

Choice labels must communicate player intention, not only button completion.

Good choices differ by:

- tone
- compliance vs resistance
- curiosity vs deflection
- public vs private handling
- risk or relationship cost

Bad choice sets differ only by wording or hide intent behind generic labels.

Bad:
- `Listen`
- `Accept`
- `Continue`

Good:
- `Hear Marion out about the patrol`
- `Keep the exchange strictly professional`
- `Treat it as a warning, not a request`

### 3. Consequence readability

The player should not need the activity log for basic comprehension of the outcome.

For meaningful events, the event flow itself or its immediate aftermath surface should communicate:

- what changed for the player
- what changed for the speaking NPC
- what changed for faction, district, or city state when relevant
- what the likely next step is

The activity log may preserve history. It must not carry the only readable explanation of the scene's meaning.

### 4. Surface fit

Not every piece of guidance belongs in an event.

Before authoring or keeping a tutorial-style event, ask whether the content belongs in:

- event modal
- dashboard instruction
- helper panel
- overlay or onboarding card
- quest journal or task summary

Use an event only when there is a genuine scene, messenger, interruption, or world reaction. Do not wrap generic system teaching in thin narrative prose just because the event system already exists.

### 5. Stakeholder truth

If an event names a patron, victim, witness, rival, or contact, the surface must not imply more runtime truth than actually exists.

Check:

- is this a real authored NPC?
- is this an off-screen but stable actor?
- is this only a flavor abstraction?

If the data does not support persistent personhood, keep the framing honest. Do not accidentally promise a follow-up social actor the game cannot deliver.

When a presentation model carries typed actor references, use them deliberately:

- `npc` means a real authored character entry exists
- `faction` means the actor is a faction-level institution, not a single face
- `district` means the consequence is spatial or local rather than personal
- `offscreen` means the text is intentionally referring to a non-catalogued person or group

## Event types and what they owe the player

### Character event

Must make relationship context legible:

- why this person is approaching now
- what emotional or strategic shift is occurring
- what the player's response means relationally

### World or faction event

Must make pressure legible:

- what changed in the city or district
- who benefits or suffers
- what the player should watch next

### Tutorial event

Must justify why this is an event rather than guidance.

If it cannot, move it to a better surface.

Tutorial delivery defaults:

- use a real event only when there is a messenger, interruption, warning, or authored scene
- use a local UI surface when the lesson is about a button, screen, rhythm, or routine the player is already looking at
- the end-of-day rhythm is a status-bar or dashboard instruction, not a dramatic scene

### Follow-up or aftermath event

Must connect visibly to the action that caused it:

- completed job
- failed contract
- debt threshold
- unrest spike
- faction standing change

## Review checklist

For each event, ask:

1. Why is this event available now?
2. Can a fresh player identify the actor and situation?
3. Do the choice labels express distinct player intentions?
4. Can the player tell what changed without opening the activity log?
5. Is this really an event, or should it be another surface?
6. Does the event imply a person, faction, or consequence the runtime does not actually support?

## Required acceptance for event-facing beads

Every event bead should include:

- player-visible acceptance
- route or surface-fit acceptance when tutorial or navigation guidance is involved
- post-action readability acceptance

Examples:

- `The player can tell why Marion is stopping them and what each response means.`
- `The player can tell the event is a contract follow-up rather than a generic ambient interruption.`
- `The player can identify the immediate consequence without checking the activity log.`

## Verification modes

Use at least one:

- screen test for event modal or result surface
- selector or view-model test for event presentation data
- route-level first-hour playthrough for tutorial delivery
- manual fresh-eyes walkthrough for authored text and context

## Fresh-eyes checklist

Run this as if you know nothing:

1. Why am I seeing this now?
2. Who is talking or acting?
3. What do these buttons actually mean?
4. What changed after I clicked?
5. What should I care about next?

If any answer requires `check the log` or `well, technically`, the event is not ready.
