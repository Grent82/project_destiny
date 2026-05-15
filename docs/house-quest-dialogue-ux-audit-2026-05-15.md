# House, Quest, and Dialogue UX Audit

Date: 2026-05-15
Scope: house search and repair flow, Marion clue/dialogue funnel, quest visibility and IA, related dashboard/work-board guidance, quality-gate coverage

## Executive Summary

The current problems are real. They are not primarily "missing content" bugs; they are mostly `experience-structure` and `quality-gate` failures.

The codebase already validates many state transitions correctly:
- searching rooms grants the right artifacts
- clues can unlock the vault
- dialogue conditions can become available
- quests can be accepted, advanced, and completed

What is failing is the player-facing chain:

`room action -> visible result -> why it matters -> who to talk to -> where to continue -> what changed after doing it`

This is why the game can feel broken even while tests are green.

## Core Diagnosis

The project currently has a strong `system correctness` gate and a weak `player comprehension` gate.

The tests heavily validate:
- reducers and application commands
- dialogue condition availability
- item/clue state changes
- quest runtime progression

They barely validate:
- whether the player understands what to do next
- whether a clue is surfaced in the right place at the right time
- whether a room action leaves an understandable post-action state
- whether page naming and layout make "my quests" obvious
- whether diegetic framing is preserved across navigation

The result is a recurring pattern: the state machine works, but the player story does not read cleanly.

## Findings

### F1. Search results persist as permanent room text instead of resolving into a stable post-search state

Evidence:
- [src/ui/screens/HouseScreen.tsx](/Users/andre.dittrich/privat/projects/project_destiny/src/ui/screens/HouseScreen.tsx)
- `room.searched` permanently renders:
  - `✓ Searched`
  - discovery message
  - actionable discoveries
  - flavor finds
  - follow-up text

Problem:
- the screen treats the full discovery payload as eternal room UI
- there is no distinction between:
  - `freshly discovered result`
  - `room has been searched already`
  - `persistent actionable clue still unresolved`

Player effect:
- the player cannot tell what was just found versus what is historical residue
- the room card becomes a permanent dump of text rather than a room with a changed state

Why it was not caught:
- tests verify item grants and clue availability, not post-search readability
- [src/application/commands/houseSearch.test.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/application/commands/houseSearch.test.ts) confirms state changes, but no UI-state lifecycle

### F2. Repair is mechanically valid but poorly framed and unevenly justified

Evidence:
- [src/application/store/gameSlice.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/application/store/gameSlice.ts:1018)
- [src/ui/screens/HouseScreen.tsx](/Users/andre.dittrich/privat/projects/project_destiny/src/ui/screens/HouseScreen.tsx)

Problem:
- `repairRoom` mostly sets a room to `intact`, removes cost, maybe adds roster bonus, and writes a log line
- many room benefits are only described in static copy, not turned into visible actionable follow-up
- the UI says `Repair — X Mk`, but does not answer:
  - why now
  - what the room will unlock in play
  - what new actions or loops become available after repair

Player effect:
- repair feels like paying to clear a status badge
- several rooms do not obviously become more usable after being repaired
- the player reasonably asks "repaired and then what?"

Why it was not caught:
- the gate checks mechanical state change, not payoff visibility
- there is no test or review pass for `before repair -> after repair -> player sees new purpose`

### F3. The Marion clue funnel works in state terms but not in player-discoverability terms

Evidence:
- [data/definitions/dialogues.json](/Users/andre.dittrich/privat/projects/project_destiny/data/definitions/dialogues.json)
- [src/application/commands/dialogue.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/application/commands/dialogue.ts)
- [src/application/commands/houseSearch.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/application/commands/houseSearch.ts)
- [src/application/commands/houseSearch.test.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/application/commands/houseSearch.test.ts)

Problem:
- the bureau chit and arrangement note do unlock Marion dialogue choices through `hasItem`
- however, the game does not strongly surface:
  - that Marion is now the relevant next contact
  - that the found evidence changed the talk tree
  - which specific topic is now worth raising
- part of the reasoning is still effectively done in hidden system space:
  - vault unlock log text attributes reasoning to Marion
  - the player does not necessarily experience that as a conversation

Player effect:
- "I found the chit" does not reliably become "now talk to Marion about the chit"
- the dialogue tree feels like a generic menu instead of a clue-reactive conversation
- the player can miss that the system is actually waiting for a specific follow-up

Why it was not caught:
- tests only prove that the Marion choice becomes available:
  - `isDialogueChoiceAvailable(...) === true`
- there is no end-to-end check for:
  - find clue
  - return to Marion
  - spot the new branch
  - understand what it means

### F4. House fiction and room-state explanation still contain mixed signals

Evidence:
- [src/domain/game/contracts.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/domain/game/contracts.ts)
- [src/ui/screens/HouseScreen.tsx](/Users/andre.dittrich/privat/projects/project_destiny/src/ui/screens/HouseScreen.tsx)
- [src/application/content/houseDiscoveries.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/application/content/houseDiscoveries.ts)

Problem:
- some copy has already moved away from "Marion's preserved private shrine" toward "a workable room she kept usable"
- but room naming, summary copy, and clue language still mix:
  - house ruin
  - Marion as caretaker
  - hidden family evidence
  - immediate vault logic
- the overall flow is still more dossier-like than scene-like

Player effect:
- the house reads as a list of labeled cards, not a place the player is gradually understanding
- the internal logic of "why was this room usable / discoverable / reparable now?" is not strong enough

### F5. Quest visibility is fragmented by naming and information architecture

Evidence:
- [src/ui/screens/ContractBoardScreen.tsx](/Users/andre.dittrich/privat/projects/project_destiny/src/ui/screens/ContractBoardScreen.tsx)
- [src/application/selectors/quests.ts](/Users/andre.dittrich/privat/projects/project_destiny/src/application/selectors/quests.ts)

Problem:
- the game clearly has quests, but the player-facing language splits them into:
  - `Work Board`
  - `Available Leads`
  - `Active Contracts`
  - `Recommended Next Step`
- that may be systemically accurate, but it is not cognitively simple
- the screen is dense and asks the player to parse:
  - issuer
  - origin
  - why now
  - what they want
  - district
  - urgency
  - readiness
  - route
  - stage
  - consequence metadata

Player effect:
- a player can reasonably ask "where are my quests?"
- the answer is currently "on the Work Board, partly as leads and partly as active contracts," which is correct but bad UX

Why it was not caught:
- the system was improved toward diegetic quest discovery, but the IA complexity was not reduced afterward
- tests validate quest availability and readiness, not page comprehension

### F6. Meta-guidance links are still carrying too much navigational meaning

Evidence:
- [src/ui/screens/DashboardScreen.tsx](/Users/andre.dittrich/privat/projects/project_destiny/src/ui/screens/DashboardScreen.tsx)
- [src/ui/screens/HouseScreen.tsx](/Users/andre.dittrich/privat/projects/project_destiny/src/ui/screens/HouseScreen.tsx)

Problem:
- the removed Quick Routes block was the most blatant version of this
- but remaining elements still show the same design tendency:
  - `What next`
  - first-run `→ Check the Work Board`
  - `View House Accounts →`
- these are not all wrong, but they are compensating for unclear world routing instead of emerging naturally from it

Player effect:
- navigation can feel like dashboard instruction-following rather than inhabiting places
- diegetic inconsistencies get patched by directive links

### F7. The current test suite is broad, but the quality gate is still incomplete

Evidence:
- house, dialogue, and quest tests pass
- the reported experience issues still appeared immediately during manual play

Problem:
- the project currently treats `green tests` too close to `experience is okay`
- but the existing tests mostly protect:
  - command correctness
  - schema validity
  - selector behavior
  - deterministic progression

Missing gates:
- fresh-player route walkthroughs
- story clue funnel playthroughs
- IA clarity reviews
- "what changed after I clicked this?" verification
- diegetic consistency review for shortcut and guidance patterns

Conclusion:
- yes, there is a quality-gate issue
- but it is specifically a `playthrough + UX + fiction coherence` gate issue, not just a lack of unit tests

## Why This Was Not Found Earlier

1. The system rewarded the team for making state transitions correct.
2. The quest and house features were improved incrementally, which increased data richness faster than clarity.
3. The tests operate mostly at command/reducer level, not at player-journey level.
4. The UI accumulated compensating guidance (`Recommended Next Step`, directive links) instead of simplifying the underlying structure.
5. Marion/clue logic was validated as `available`, not validated as `noticeable and meaningful`.

## Current Coverage vs. Gaps

Not currently covered by open beads:
- search-result lifecycle and persistent room text cleanup
- repair affordance and post-repair usefulness surfacing
- Marion clue-to-dialogue discoverability pass
- quest IA simplification / "where are my quests?" clarity
- explicit UX/playthrough quality-gate expansion for these flows

Weak partial overlap:
- `destiny-5dpf` may eventually help world legibility, but it does not solve house or quest IA
- `destiny-8a8l` and `destiny-fzzo` deepen social content, but do not fix this first-hour comprehension problem

## Recommendations

### Immediate product/UX changes

1. Split room state into:
   - newly found result
   - archived searched state
   - unresolved actionable lead

2. Reframe repair around outcomes:
   - what this room enables
   - what changed because it is repaired
   - what new action is now possible

3. Make clue follow-up explicit:
   - "Marion has a new topic to discuss"
   - or equivalent in-world prompt

4. Simplify quest IA:
   - one obvious place for `my current work`
   - leads and active contracts can still exist, but their distinction must be visually and linguistically clearer

5. Reduce compensating meta-navigation:
   - fewer directive links
   - stronger place-based continuation

### Quality-gate changes

1. Add route-level playthrough coverage for:
   - house search -> clue -> Marion -> vault
   - open dashboard -> find active quest -> continue it
   - repair a room -> understand and use new benefit

2. Add UX acceptance to future related beads:
   - not only "state changes"
   - but "player can understand the outcome and next step"

3. Add a manual `fresh eyes` checklist for first-hour flows:
   - where are my quests?
   - what changed after search?
   - why repair this room?
   - who reacts to this clue?

## Finding to Bead Mapping

F1 -> new bead required
F2 -> new bead required
F3 -> new bead required
F4 -> can be grouped with F1/F3 remediation, but currently no bead exists
F5 -> new bead required
F6 -> can be grouped with F5 remediation, but currently no bead exists
F7 -> new bead required

Result: this audit reveals a real gap in the backlog. New remediation beads are required before these findings can be considered covered.
