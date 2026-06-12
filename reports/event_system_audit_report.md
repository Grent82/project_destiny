Event System Audit Report

  TL;DR

  The event system has one architectural flaw that causes most of the visible damage: evaluateEvents scans all 127 event templates in events.json, but ~14 other systems
  (heir, wards, pairing, bond service, captivity, sites, rival orgs…) also push their events into the same queue — and their templates carry no real trigger 
  conditions. The result, confirmed in a live fresh playthrough: on day 2 the player gets a modal about "a bonded worker" resenting their contract (they own no bonded
  workers), an NPC being freed (nobody was freed), and a titled officer resigning in protest (nobody holds a title). On top of that, the per-tick cap silently burns
  eligible events — including the non-repeatable event-heir-announcement, which is consumed on day 2 of every playthrough without ever being shown. The system needs a
  rework, and the quest-system issues you found earlier have a sibling here: same pattern of content-vs-engine contract drift with no validation.

  How I verified

  1. Read the full pipeline: src/domain/events/contracts.ts → evaluateEvents.ts → endDay.ts → worldReducers.ts (resolveEvent) → applyEventOutcome.ts → EventModal.tsx.
  2. Cross-validated all 127 templates in data/definitions/events.json against NPC/quest/faction/district catalogs.
  3. Ran a 40-day headless endDay simulation (two variants: idle player, and player who clears the queue daily).
  4. Played a fresh game in the browser via Playwright through day 2 and clicked through the entire modal queue.

  ---
  Critical findings

  C1 — System-driven events fire spuriously through evaluateEvents (fiction-breaking, every playthrough)

  29 templates have no real trigger gate (only probability: 1, sometimes dayMin: 1). Many of them are meant to be fired by their owning system (recognizeHeir,
  tickWardStages, applyNpcPairing, bondService, captivityPregnancyDiscovery), which pushes pendingEvents directly. But because the templates also sit in
  contentCatalog.events, evaluateEvents (src/application/commands/evaluateEvents.ts:68) treats them as world events and fires them immediately.

  Verified live on day 2 of a fresh game, the player sees back-to-back:
  - "Equal Work, Unequal Terms" (event-bound-npc-notices-difference) — no bonded NPC exists
  - "Contract Burned Through" (event-npc-freed) — nobody was freed
  - "A Refusal in Office" (event-title-npc-bond-objection) — no titled NPC exists

  Their outcomes also apply (faction standing, relationship deltas) for situations that never happened. Some systems defend against this with the probability: 0
  convention (28 templates, e.g. event-site-pressure-warning, rival-org events) — but the bond/ward/pairing/heir/captivity/milestone templates forgot the guard. The
  convention itself is fragile and implicit; there is no schema-level notion of "system-driven, never auto-fire".

  C2 — The per-tick cap permanently burns events that were never shown

  evaluateEvents.ts:61-91: all eligible events are written into lastFiredDay, but only 5 regular ones become pending. The code comment claims this preserves RNG
  determinism, but the side effect is severe: a non-repeatable event that loses the day-2 lottery is gone forever (isOnCooldown returns true permanently). Simulation
  confirmed: event-heir-announcement (repeatable=false) is burned on day 2 in every playthrough. It only ever reaches the player because recognizeHeir bypasses
  evaluateEvents — i.e. the world-event path for it is dead on arrival. Repeatable events lose their slot too and get a phantom cooldown.

  C3 — Outcome summaries are silently swallowed for all but the last queued event

  EventModal.tsx:18-20: the "Event Outcome" summary only renders when pendingEvents.length === 0. Each resolveEvent overwrites lastResolvedEventSummary, so when 8
  events queue up (the normal day-2 case), the player sees consequence feedback for only the last one. Confirmed live: 7 of 8 resolutions jumped straight to the next
  event with no impact feedback. This directly violates the project's "visible consequence" review rule.

  C4 — Content bug: two milestone events use target instead of npcId → trust rewards never apply

  event-marion-milestone-motivation and event-doyle-milestone-holst define adjustNpcRelationship outcomes with "target": "npc-marion-vale" / "npc-garet-doyle".
  applyOutcomes (applyEventOutcome.ts:86) requires outcome.npcId, so these outcomes are silently skipped — no warning, because the existence-check only runs when npcId
  is present. The Zod schema can't catch it since both target and npcId are optional on the shared outcome schema. The Marion/Doyle milestone trust rewards have never
  worked.

  ---
  High findings

  H1 — Unbounded pending queue, no expiry, modal flood

  40 idle days → 36 pending events, including duplicates (event-site-pressure-warning ×3). There is no expiry (firedOnDay is never used to age events out), no
  dismissal, no priority ordering — strict FIFO. A returning player faces a wall of 36 modals, many describing situations weeks stale (a corridor disruption from day 5
  can be "answered" on day 40, and its outcomes still apply unconditionally — no re-validation of conditions at resolve time). applySiteStateHooks has a
  MAX_PENDING_EVENTS guard; evaluateEvents has none for the total queue.

  H2 — Auto-resolution is half-implemented and inconsistent

  36 templates set isAutoResolved: true, but the engine only honors it for rumor-tagged ones (endDay.ts:97-113), and only one random rumor per day — the rest stay
  pending and appear as interactive modals. Worse, the two resolution paths disagree: resolveRumorEvents drops the event's authored outcomes (all 15 rumor events have
  an addActivityLogEntry outcome that never runs; a generic "Rumor: …" line is logged instead), while the same event resolved via modal does apply outcomes. For the 21
  non-rumor isAutoResolved events the flag is dead weight — they're always interactive.

  H3 — lastFiredDay is a shared grab-bag with no contract

  14+ systems write ad-hoc string keys into state.lastFiredDay (site-growth:<id>, rel-milestone-<npc>-<axis>-<n>, friction keys, courtship cooldowns, …) alongside event
  template IDs. checkRelationshipMilestones even defensively double-writes both its own key and the event ID to keep evaluateEvents away
  (applyNpcConsequences.ts:71-77) — a workaround for C1 that other systems didn't copy. Nothing prevents key collisions, and the field name no longer describes what it
  holds. This is the kind of cross-layer concept leak your engineering standards call out.

  H4 — Two parallel event-instance models, only one populated

  pendingEvents (bare {eventId, firedOnDay}) and eventInstances (provenance, presentation text, resolution history) coexist. Only system-pushed events (sites,
  captivity, bond transfer) create instances; evaluateEvents never does. resolveEvent correlates them by "first unresolved instance with this eventId"
  (worldReducers.ts:206) — order-dependent matching that happens to work but breaks the moment ordering diverges (e.g. an instance-backed and a template-fired copy of
  the same event coexisting). Resolved instances also accumulate forever with no cap, unlike the activity log.

  ---
  Medium / low findings

  - M1 — Determinism violations. evaluateEvents(state, rng = Math.random) defaults to Math.random, contradicting the project's RNG rule (only endDay passes a seeded rng
  today, so it's a loaded footgun). And applyEventOutcome.ts:204 (addNpcToRoster) derives a rng from state.rngSeed but never advances the seed in the returned state —
  the next consumer replays the same sequence.
  - M2 — Unvalidated casts in outcomes. adjustCityResource casts target unchecked (an invalid target produces NaN via undefined + delta); setCorridorStatus casts value
  unchecked. adjustCityDial got validation; its siblings didn't. Missing-field combinations (e.g. delta absent) skip silently with no warning.
  - M3 — Dead/wrong metadata in content. sourceDistrictId values district-gilded-quarter and district-pale-warrens (on event-gilded-court-approach,
  event-ring-smuggler-contact) don't exist in districts.json — valid IDs are district-gilded-heights / district-the-warrens. Nothing validates this at catalog load (the
  boot-time validator in contentCatalog.ts:172 only checks outcome npcId/questId).
  - M4 — One-shot rumor flavor crowds out real content. The 15 rumor events have no gates, probability 1, and compete for the same 5-per-day regular budget as
  meaningful events during the first weeks.
  - M5 — EventLogScreen doesn't show events. It renders the activity log; resolved event history (eventInstances) is invisible to the player. Naming and player mental
  model diverge.
  - L1 — probability: 0 isn't actually zero. The check rng() > 0 fires when the rng returns exactly 0 (possible with a 32-bit seeded rng). Cosmic-ray odds, but it shows
  the convention is a hack, not a contract.
  - L2 — Test coverage is green but aims at the wrong invariants. evaluateEvents.test.ts asserts the burn-on-truncation behavior as correct ("populates lastFiredDay
  after evaluateEvents runs") and nothing tests: system-event exclusion, summary visibility, rumor outcome application, or instance/pending correlation.

  ---
  Rework direction (recommendation)

  The fixes cluster into one architectural decision plus targeted repairs:

  1. Make event provenance explicit. Add a firingMode: 'world' | 'system' (or systemDriven: true) field to eventTemplateSchema; evaluateEvents only considers world
  templates. Delete the probability: 0 convention. This single change kills C1 and the H3 workaround.
  2. Stop burning truncated events. Only record lastFiredDay for events that actually became pending; preserve determinism by consuming RNG uniformly (it already does —
  the comment's justification doesn't require the burn).
  3. Unify on eventInstances. Make evaluateEvents create instances too, make resolveEvent resolve by instanceId, keep pendingEvents as a derived view or drop it. Add
  aging/expiry (expiresOnDay) and a re-validation or expiry pass at resolve time.
  4. Fix the feedback loop. Show the outcome summary after every resolution (summary → next event), not only when the queue empties.
  5. Honor or remove isAutoResolved. Auto-resolved events should resolve through applyOutcomes (keeping their authored log lines) and never reach the modal.
  6. Harden content validation. Extend the boot-time catalog validator to cover outcome target/axis/value enums, required-field combinations per outcome type,
  sourceDistrictId, and the npcId-vs-target confusion (C4). That's the same class of gap that bit the quest system.
  7. Split lastFiredDay into eventCooldowns (event IDs only) and a separate systemCooldowns namespace, or at least document and prefix-namespace the keys.

  The quick wins independent of the rework: C4 (two-line JSON fix), M3 (two-line JSON fix), and adding the missing probability: 0/conditions to the
  bond/ward/pairing/heir/captivity/milestone templates as a stopgap for C1.

  I haven't filed beads for these yet since slicing the rework is a scope decision — say the word and I'll create a structured set (epic + dependent issues per the
  bead-creation workflow, labeled ui-ux where applicable).