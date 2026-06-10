# Workflow: Working Effectively with Lower-Tier Models

Use this playbook when delegating Project Destiny work to smaller/cheaper models
(Haiku-class, small local models) or when an agent notices it is producing
shallow output. Strong models can skip steps; weak models must not.

The principle: **lower models execute contracts, they do not write them.**
Every failure mode we have seen (meta copy in the UI, metadata-dump cards,
false directives, layout slivers) is what happens when a model is asked to
*decide* instead of *execute*.

## Task selection — what lower models may do

Good fits (give freely):

- copy edits with an explicit before/after list (e.g. destiny-1qow string audit)
- one command + its co-located test, following an existing command as template
- one selector + test, following an existing selector
- adding a field through the existing chain: `contracts.ts` schema → command →
  selector → screen, when the bead names every file
- JSON content additions in `data/definitions/` that copy an existing entry's shape
- screen tests for behavior that already exists

Bad fits (do not delegate; escalate to a stronger model or a human):

- writing or refining beads, design decisions, fiction contracts
- anything touching `gameSlice.ts` wiring beyond one thin reducer
- save migration in `localSaveSnapshot.ts`
- player-facing copywriting without a voice sample to imitate
- cross-layer refactors, dependency-direction changes
- "make it feel better" / "polish" without acceptance criteria

## Briefing template

A lower-model prompt must contain ALL of the following. If you cannot fill a
line, the task is not ready for delegation.

```
Bead: <id> — paste the full description, do not summarize
Files you may touch: <explicit list — nothing else>
Template to imitate: <existing file that does the same kind of thing>
Forbidden: Math.random, imports from ui/infrastructure into domain,
  new dependencies, edits outside the file list, TodoWrite
Definition of done:
  1. <observable behavior>
  2. pnpm exec vitest run <specific test file> passes
  3. pnpm typecheck passes
Voice sample (if copy is involved): <2-3 sentences of existing in-world text>
```

## Hard rails (repeat these verbatim in every delegation)

1. **Never invent fields.** Every `GameState` change starts in a
   `contracts.ts` Zod schema. If the schema does not have it, stop and report.
2. **Never mutate.** Commands return new state. Copy the pattern from an
   existing command in `src/application/commands/`.
3. **All randomness through `state.rngSeed`.** `Math.random()` is an
   automatic reject.
4. **Use the fixtures.** Start tests from `testFixtures.ts`
   (`initialStateWithIda`), never hand-build `GameState`.
5. **Type-only imports use `import type`.** `verbatimModuleSyntax` will fail
   the build otherwise.
6. **Player-visible strings are in-world.** No "menu", "screen", "step",
   "system", "logged", no explanations of UI structure. If unsure how a line
   should sound, copy the register of the voice sample, or leave a `TODO-VOICE`
   marker and report it — do not improvise lore.
7. **One bead, one change.** No drive-by refactors, no renames, no
   reformatting untouched code.

## Verification ladder (cheap → expensive)

Make the model run these itself and paste the output; do not trust "it works":

1. `pnpm exec vitest run <the one test file>` — must name the file
2. `pnpm typecheck`
3. `pnpm test:run` only when the change spans files
4. UI changes: dev server + Playwright screenshot of the exact screen,
   attached to the bead. A UI change without a screenshot is not done.
5. `pnpm test:playthrough:golden` before closing anything that touches
   commands used by scenarios.

## Review checklist for the supervisor

When a lower model reports done, check in this order — these are the
historically common escapes:

- [ ] grep the diff for `Math.random`, `console.log`, `any`
- [ ] diff touches only the allowed file list
- [ ] new strings read in-world (rail 6) — read them aloud
- [ ] test asserts behavior, not implementation detail (no snapshot-only tests
      for logic)
- [ ] no duplicated briefing/state text across surfaces (the "say it once"
      rule from the design review workflow)
- [ ] `bd close <id>` only after the verification ladder output is in the bead

## Escalation triggers

The lower model must stop and hand back (report, not improvise) when:

- a needed schema field, selector, or definition does not exist
- two docs/rules appear to conflict
- the task requires choosing between player-facing wordings with no voice sample
- a test unrelated to the change fails
- the change wants to touch a file outside the allowed list

A clean hand-back is a success, not a failure. Reward it.
