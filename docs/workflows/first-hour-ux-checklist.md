# First-Hour UX and Diegetic Coherence Checklist

Use this checklist when implementing or reviewing any feature that touches the first-hour player experience.

## When to run

- Before closing any bead that modifies the house, Marion dialogue, or quest board
- After any audit that surfaces comprehension or navigation gaps
- As a manual review pass before shipping first-hour content

## What this checklist does

Tests and typechecks prove correctness. This checklist proves comprehension.

A feature can pass all tests and still confuse a new player. This checklist catches the gap between "state changed correctly" and "player understood what happened and what to do next."

---

## Section 1: House search result lifecycle

After a room search:

- [ ] The player sees a distinct "just found" state (full discovery payload)
- [ ] On subsequent visits, the room shows compact state (not the full discovery payload again)
- [ ] Unresolved actionable leads remain visible in compact state
- [ ] The room does not look the same before and after search

After a room repair:

- [ ] The player sees a clear statement of what the repaired room enables
- [ ] If the repaired room unlocks a new loop, a follow-up link or action is visible
- [ ] The repair button explains what the player is paying for, not just the cost

---

## Section 2: Clue-to-dialogue funnel (Marion)

After finding a clue item (ledger chit, arrangement note):

- [ ] The player is given a signal that someone on the roster can act on it
- [ ] The signal is atmospheric, not clinical ("Something on your mind worth raising" — not "New topic unlocked")
- [ ] Visiting Marion's panel confirms the signal (the hint is visible there)
- [ ] The relevant dialogue choice is present in the conversation menu when the item is held
- [ ] After the conversation, the signal disappears (choice resolved, not surfaced again)

---

## Section 3: Quest visibility and information architecture

When the player has active contracts:

- [ ] Active contracts appear before available leads
- [ ] Each active contract shows what the next concrete step is (travel, investigate, execute)
- [ ] "Blocked" status is visible when an action cannot be taken yet
- [ ] The player can answer "where are my quests?" without reading secondary copy

When new leads appear:

- [ ] The lead's issuer and origin are visible without expanding
- [ ] The urgency is clear (badge, days remaining) without requiring the player to calculate
- [ ] Accepting a lead moves it immediately into Active Contracts

---

## Section 4: Diegetic consistency

For any new piece of copy, ask:

- [ ] Does this sound like it comes from the world, or from the UI?
- [ ] Would this sentence appear in a letter or spoken aloud by a character?
- [ ] Does the tone match the rest of the house/quest/dialogue copy already in the game?
- [ ] If removed, would the player be confused — or would the surrounding design carry it?

For directive links and meta-guidance:

- [ ] Is this link compensating for unclear navigation (bad), or confirming a natural next step (okay)?
- [ ] Could a player find this destination without the link?
- [ ] If yes, remove the link. If no, improve the navigation instead of adding another link.

---

## Section 5: Fresh-eyes test

Before shipping any first-hour work, ask a simulated cold-start question for each affected area:

- [ ] "What do I do first?" — is the answer visible without reading instructions?
- [ ] "What changed after I clicked that?" — is the result state clearly different from before?
- [ ] "Why should I repair this room?" — is the payoff described before the cost is asked?
- [ ] "Who should I talk to about this clue?" — does the NPC roster signal it?
- [ ] "Where are my current quests?" — is the answer one tap, not a search?

---

## Verification recipe

For the house-search → clue → Marion funnel specifically:

1. Run `pnpm exec vitest run src/application/playthrough/scenarios/firstHourFunnel.test.ts`
   - All 5 tests must pass
2. Run `pnpm exec vitest run src/ui/screens/NpcDetailPanel.test.tsx`
   - The hint tests must pass (hint visible with item, absent without)
3. Run `pnpm exec vitest run src/ui/screens/HouseScreen.test.tsx`
   - Fresh vs archived state tests must pass
4. Manual: open the house screen, search the bureau, then visit Marion on the roster
   - The "Something on your mind worth raising" text should appear next to the Talk button

---

## Finding coverage

This checklist closes findings F1–F7 from `docs/house-quest-dialogue-ux-audit-2026-05-15.md`.

New beads that touch house, quest, or dialogue work should reference this checklist in their acceptance criteria.
