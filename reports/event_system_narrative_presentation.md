Event System — Narrative & Presentation Review

  TL;DR

  The prose is the strongest part of the system — terse, atmospheric, consistent in voice. The problem is everything around the prose. Measured against your own six
  lenses (Fantasy, Agency, Legibility, Layer Fit, Consequence, Diegesis): 44% of events offer no decision, 56% change nothing but a log line, and the events that do 
  promise personal consequence cannot deliver it because the outcome vocabulary has no way to touch an actual roster NPC. Events talk about a living city and living
  people, but mechanically they are mostly one-shot text cards that nudge an invisible city dial. And the presentation layer renders a betrayal, a tutorial, and a
  street rumor in the exact same anonymous gray box — while the authored presentationFlavour field (filled in on 23 events) is rendered nowhere.

  ---
  1. Wie werden Events präsentiert? (Presentation layer)

  What the player sees is one undifferentiated surface: a 520px dark panel (App.css:2082) with a title, one paragraph, choice buttons, and a "+7 more events pending"
  counter. That's it — for every event type.

  What's missing on the surface:

  - No actor identity. 28 events have sourceNpcId, 103 of 127 name an authored NPC in the text — but the modal shows no name chip, no portrait, no relationship context.
  The only place the anchor NPC appears is the post-resolution summary line "Scene anchored by X" — after the decision, when it can no longer inform it. Your
  event-review.md asks "who is acting on me?" — the UI never answers it structurally, only through prose.
  - No type signal. A character scene (Marion stopping you at the door), a world bulletin (corridor blocked), a household beat, and a tutorial card all look identical.
  The player can't calibrate attention. The resolved-summary modal has a kicker ("Event Outcome"); the live event has none.
  - No spatial anchor. 11 events carry sourceDistrictId (2 of them invalid IDs); none of it is displayed. Scenes float in non-space.
  - presentationFlavour is dead content. Defined in the schema (contracts.ts:92), authored on 23 events, never read by any selector or component. Someone wrote flavour
  text that no player has ever seen.
  - Delivery rhythm is a morning mail dump. Everything fires inside endDay and lands as a modal stack at dawn. Night scenes ("Marion catches you at the door before a
  night run") are delivered at morning; urgent street scenes queue behind tutorials; and the queue counter ("+7 more pending") creates obligation, not anticipation.
  There is no defer, no "read later," no prioritization. Combined with the swallowed-summaries bug from my first report, a queued day plays as: click, click, click,
  click — what did any of that do?

  Notably, your quest lead cards just got a narrative-first redesign (commit d8839b9). The event modal is now visibly a generation behind the bar that redesign set.

  2. Informativ oder narrativer Mehrwert? (Agency & consequence)

  The honest answer: mostly informative, with a small genuinely good core.

  The numbers across all 127 events:

  ┌────────────────────────────────────────────────────────────┬───────────────────┬────────────────────────────────────────────────────────────────────────────┐
  │                           Metric                           │       Count       │                             Your standard says                             │
  ├────────────────────────────────────────────────────────────┼───────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Single-choice events (no decision)                         │ 56 (44%)          │ "If there is no meaningful choice → flavor, background simulation, or cut" │
  ├────────────────────────────────────────────────────────────┼───────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Outcomes that are only a log line                          │ 72 events (56%)   │ "only a log line changes" is listed as a bad change                        │
  ├────────────────────────────────────────────────────────────┼───────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Generic choice labels (Listen / Noted / Acknowledge…)      │ 68 labels         │ event-review.md explicitly lists these as bad                              │
  ├────────────────────────────────────────────────────────────┼───────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Multi-choice events with identical outcomes (fake choices) │ 0                 │ — genuinely good                                                           │
  ├────────────────────────────────────────────────────────────┼───────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Events opening a route (createQuestLead)                   │ 5 of 344 outcomes │ "good changes: new route opens, new topic appears"                         │
  └────────────────────────────────────────────────────────────┴───────────────────┴────────────────────────────────────────────────────────────────────────────┘

  Of 344 authored outcomes, 208 are activity-log lines. The event system's dominant mechanical verb is "write a sentence into a log the player rarely opens."

  The good core deserves naming: the economic/world cluster — event-market-price-spike, event-harbor-windfall, event-stressed-npc-warning, event-loyal-npc-milestone,
  event-corridor-disruption — has real tradeoff structure: priced options, time pressure ("the price will not last the morning"), risk-vs-credit decisions. And the
  choice-label lint test exists (eventChoiceLabels.test.ts), it's just toothless — it only bans labels starting with "Accept", so 68 generic labels sail through.

  But the good core is mechanically dishonest, which is the most important narrative finding:

  - event-loyal-npc-milestone: "Pay a loyalty bonus (30 Marks)" → addCredits(-30), adjustCityDial(unrest, -3). You pay a loyalty bonus to one of your people and the
  result is… the city's unrest dial moves. The NPC's loyalty — a real axis in your relationship system — is untouched, because the event never knows which NPC it's
  about.
  - event-stressed-npc-warning: "Someone is close to breaking" — the runtime knows exactly who (every roster NPC has states.stress), but the event doesn't pick them,
  doesn't name them, and its remedies adjust city unrest instead of anyone's stress.
  - event-market-price-spike: "Buy supplies before prices peak (60 Marks)" → you lose 60 Marks and receive no supplies (no item, no materialStock).

  This is the failure your event-review.md calls "promising social or world continuity the runtime does not support" — except here it's the outcome vocabulary that
  can't support it: there is no adjustNpcState, no NPC-targeting mechanism, no item grant, no "start dialogue" outcome. Events about people physically cannot affect
  people.

  3. Passen die Events in eine lebende Stadt? (Living-world fit)

  Partially in intent, weakly in execution:

  - The city barely speaks through triggers. Only 5 events react to unrest, 2 to corridor status, 2 to food security, 4 to faction standing, 2 to relationships, 1 to
  renown. The workhorse conditions are dayMin (83) and requiredRosterNpcId (41) — i.e., "enough days have passed" and "this person exists," not "the world is in this
  state." Your simulation layer (dials, resources, faction agendas, NPC agency, rumor spread) is rich; the event layer samples almost none of it.
  - Living NPCs are reduced to presence checks. requiredRosterNpcId checks that Ida is on the roster — not that she's stressed, injured, loyal, resentful, or recently
  in combat. The NPC mini-scenes (event-npc-ida-blade: "Ida sharpens her blade loudly in the common room." → [Acknowledge her] → log line) are nice texture but are
  state-blind, consequence-free, and delivered as a blocking modal. By your own Agency lens these belong on an ambient surface (house screen, activity feed), not in an
  interrupt.
  - The world speaks once, then goes silent. 115 of 127 events are non-repeatable; the 12 repeatables each have exactly one static description (the second freed
  bond-servant gets the identical "Contract Burned Through" text). Combined with the burn-on-truncation bug from my first report, a mid-game city has structurally fewer
  things to say each week. A living city needs the opposite curve.
  - Three parallel rumor tracks. Real rumors (state.rumors + applyRumorSpread), world-reaction rumors (event-rumor-templates.json → real rumor instances via
  spawnEventRumor), and 15 one-shot event-rumor-* events that are just log lines and compete with real events for the 5-per-day budget. The third track duplicates the
  first two with less fidelity — your design-review red flag "multiple overlapping names for the same concept," in data form.
  - No sense of place or hour. Events fire regardless of where the player is (only 15 use currentDistrict), there is no time-slot condition in the schema at all, and
  people.

  3. Passen die Events in eine lebende Stadt? (Living-world fit)

  Partially in intent, weakly in execution:

  - The city barely speaks through triggers. Only 5 events react to unrest, 2 to corridor status, 2 to food security, 4 to faction standing, 2 to relationships, 1 to
  renown. The workhorse conditions are dayMin (83) and requiredRosterNpcId (41) — i.e., "enough days have passed" and "this person exists," not "the world is in this
  state." Your simulation layer (dials, resources, faction agendas, NPC agency, rumor spread) is rich; the event layer samples almost none of it.
  - Living NPCs are reduced to presence checks. requiredRosterNpcId checks that Ida is on the roster — not that she's stressed, injured, loyal, resentful, or recently
  in combat. The NPC mini-scenes (event-npc-ida-blade: "Ida sharpens her blade loudly in the common room." → [Acknowledge her] → log line) are nice texture but are
  state-blind, consequence-free, and delivered as a blocking modal. By your own Agency lens these belong on an ambient surface (house screen, activity feed), not in an
  interrupt.
  - The world speaks once, then goes silent. 115 of 127 events are non-repeatable; the 12 repeatables each have exactly one static description (the second freed
  bond-servant gets the identical "Contract Burned Through" text). Combined with the burn-on-truncation bug from my first report, a mid-game city has structurally fewer
  things to say each week. A living city needs the opposite curve.
  - Three parallel rumor tracks. Real rumors (state.rumors + applyRumorSpread), world-reaction rumors (event-rumor-templates.json → real rumor instances via
  spawnEventRumor), and 15 one-shot event-rumor-* events that are just log lines and compete with real events for the 5-per-day budget. The third track duplicates the
  first two with less fidelity — your design-review red flag "multiple overlapping names for the same concept," in data form.
  - No sense of place or hour. Events fire regardless of where the player is (only 15 use currentDistrict), there is no time-slot condition in the schema at all, and
  the modal never says where a scene happens. For a game whose fantasy is "read a dangerous city," the city's events are placeless.

  4. What this means for the rework (recommendations)

  The engine rework from my first report and this narrative rework reinforce each other; I'd shape the narrative side as:

  1. Introduce a visible event typology — character scene / world report / household beat / tutorial — each with its own presentation: kicker label, actor chip
  (portrait + name + relationship hint) for scenes, district tag for world reports. The schema fields already exist (sourceNpcId, sourceDistrictId, tags); they just
  need to reach the screen. Render presentationFlavour or delete it.
  2. Demote the 56 single-choice informational events off the modal. World bulletins and rumor cards belong on an ambient surface (dashboard feed, journal, the actual
  rumor system). Reserve the modal for scenes with decisions — that alone fixes most of the "popup spam" feel and honors your surface-fit rule (which the tutorials
  currently violate too).
  3. Extend the outcome vocabulary so events can keep their promises: adjustNpcState (stress/morale/loyalty of a targeted roster NPC), item/resource grants, and a
  startDialogue/unlockTopic outcome so character scenes can open conversations instead of dead-ending. Then retrofit the dishonest events (loyalty bonus → loyalty;
  supplies → supplies).
  4. Let events select their subject. "One of your people is close to breaking" should resolve to the actual highest-stress NPC, inject the name into the text, and
  apply outcomes to them. That single pattern converts the anonymous events into living-NPC moments.
  5. Make the city speak through state, not the calendar. Shift trigger authoring from dayMin toward dial/resource/faction/relationship thresholds, and add timeSlot and
  richer NPC-state conditions to the trigger schema.
  6. Add text variation for repeatables (variant descriptions, or template slots for name/district), and consolidate the three rumor tracks into the real rumor system.
  7. Sharpen the lint. Extend eventChoiceLabels.test.ts to ban the full generic-verb list your event-review.md already names (Listen, Noted, Acknowledge, Continue…),
  and add a content check that any event whose text says "one of your people" carries an NPC-targeting outcome.

