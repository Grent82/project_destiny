# Loop-Level Verification

Use this workflow for any bead that changes a player-facing game loop or a screen that routes the player into or out of a loop.

## Purpose

Normal correctness tests are necessary but not sufficient. A change can keep state valid while still breaking:

- route continuity
- opening-fiction truth
- event pacing
- aftermath readability

This workflow adds product-level gates on top of state-level gates.

## Required verification layers

Every affected loop should be checked at these layers:

1. **State invariant**
   - The raw command/reducer result is valid.
   - No impossible runtime state is introduced.

2. **Selector / view-model invariant**
   - The screen reads one stable contract rather than inferring behavior ad hoc.
   - Player-facing summaries come from explicit selector data when possible.

3. **Screen / route behavior**
   - Buttons, tabs, and directive CTAs navigate through the router without reload-like behavior.
   - The player lands in the destination the screen promises.

4. **Player-comprehension check**
   - The screen answers the obvious player question for that moment.
   - Example questions:
     - What happened?
     - What changed?
     - What do I do next?
     - Where did this send me?

5. **Playthrough coverage**
   - At least one scenario-level test or scripted funnel covers the loop family.

## Core loop gates

### 1. Route continuity

Required when a CTA sends the player to another screen.

- Test that the route changes inside the app.
- Test that the CTA does not behave like a restart or hard reload.
- Prefer `MemoryRouter`/`Routes` assertions in screen tests.

### 2. Day-one fiction truth

Required for any opening screen or first-day political/social claim.

- Test what a fresh save says on day 1.
- If the opening fiction says the player has no seat, influence, heir, or room access, the UI must not imply otherwise.

### 3. Pacing and budget

Required for `endDay`, event spawning, and similar bulk-resolution loops.

- Test not only the underlying event generator but the full loop entry point.
- Bound the total visible output that a fresh player receives in a single step.

### 4. Aftermath readability

Required for combat, investigation, room search, repair, and event resolution.

- The player must be able to identify:
  - outcome
  - rewards or losses
  - condition changes
  - follow-up consequence
  - return destination or next step

## Minimum commands

For code changes:

```bash
./scripts/codex-test.sh
./scripts/codex-typecheck.sh
./scripts/codex-build.sh
```

For first-hour house/quest/dialogue changes, also use:

- [docs/workflows/first-hour-ux-checklist.md](docs/workflows/first-hour-ux-checklist.md)

## Review prompts

Before closing a loop-affecting bead, answer:

- Does this test state validity only, or also player truth?
- Can a fresh-save player misunderstand this screen even if all tests are green?
- Does the UI say something stronger than the underlying fiction or state?
- Does the player see the result of their action in the same place they took it?

## Finding coverage

This workflow closes the process gap behind:

- dashboard route resets
- false day-one political claims
- first-day event floods
- unclear combat aftermath and return flow
