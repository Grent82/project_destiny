# Quest System Duration Audit — 2026-06-01

## Scope

Triggered by a Day 1 player report:

- Two accepted leads appeared to complete on the same evening.
- `Three Days on Assessor Vorn` promised three days of surveillance but resolved the same afternoon/evening.

This audit focuses on:

- quest runtime pacing
- authored fiction vs runtime truth
- investigation duration
- delivery/survival duration
- activity-log readability

## Core Finding

The primary issue is not currently "one action closes all active quests".

The stronger and broader problem is:

- multiple quest types can resolve far too quickly
- authored quest copy implies multi-step or multi-day work
- runtime often treats `timeLimitDays` only as expiry, not execution duration

This creates a player-visible trust break:

- the Work Board promises one thing
- the runtime delivers another

## Reconstructed Day 1 Failure

The reported sequence is consistent with this flow:

1. `Safe Passage Through the Pale` is accepted.
2. `Three Days on Assessor Vorn` is accepted.
3. The survival contract advances on-site and resolves after one watch.
4. The investigation resolves immediately after approach selection / operative assignment.
5. Both completions land in the same evening log slice.

Chronologically this can happen without a blanket "complete all quests" bug.

That does **not** make it acceptable. It still violates player expectation and authored fiction.

## Evidence

### 1. Investigation runtime is too short

`quest-compact-watch`:

- title: `Three Days on Assessor Vorn`
- objective type: `investigation`
- briefing: `Follow a Compact assessor named Vorn for three days...`
- `timeLimitDays: 3`

Current runtime behavior:

- investigation starts
- approach is selected
- operatives are assigned
- `resolveInvestigation(...)` can settle the quest immediately

Relevant files:

- `/Users/andre.dittrich/privat/projects/project_destiny/data/definitions/quests.json`
- `/Users/andre.dittrich/privat/projects/project_destiny/src/application/store/slices/questReducers.ts`
- `/Users/andre.dittrich/privat/projects/project_destiny/src/ui/screens/InvestigationScreen.tsx`

### 2. Survival / escort runtime is too short

`quest-pale-wagon-escort`:

- title: `Safe Passage Through the Pale`
- objective type: `survival`
- briefing: escort a wagon across the Pale
- `timeLimitDays: 2`

Current runtime behavior:

- travel to site
- advance to on-site
- spend one watch
- settle immediately

Relevant files:

- `/Users/andre.dittrich/privat/projects/project_destiny/src/application/commands/questLifecycle.ts`
- `/Users/andre.dittrich/privat/projects/project_destiny/src/ui/screens/ContractExecutionScreen.tsx`

### 3. `timeLimitDays` is overloaded in player expectation

Current code uses `timeLimitDays` mainly as:

- lead expiry
- accepted-quest expiry
- urgency sorting

But authored copy can make players read it as:

- how long the job takes
- how many days of tracking / escort / holding are required

Relevant files:

- `/Users/andre.dittrich/privat/projects/project_destiny/src/domain/quests/contracts.ts`
- `/Users/andre.dittrich/privat/projects/project_destiny/src/application/commands/questUtils.ts`
- `/Users/andre.dittrich/privat/projects/project_destiny/src/ui/screens/ContractBoardScreen.tsx`

### 4. Runtime "step depth" exists in schema, but handlers bypass most of it

Quest runtime has:

- `requiredSteps`
- `completedSteps`

But current objective handlers often collapse this depth:

- delivery/survival jump into a near-finished state
- investigation uses a short approach-selection -> resolve path

Relevant files:

- `/Users/andre.dittrich/privat/projects/project_destiny/src/domain/quests/contracts.ts`
- `/Users/andre.dittrich/privat/projects/project_destiny/src/application/commands/questLifecycle.ts`
- `/Users/andre.dittrich/privat/projects/project_destiny/src/application/store/slices/questReducers.ts`

### 5. Existing funnel tests are too permissive for the wrong product contract

Current funnel tests verify:

- identity preservation
- on-site gating
- successful settlement

But they currently normalize too-short loops instead of challenging them.

Relevant file:

- `/Users/andre.dittrich/privat/projects/project_destiny/src/application/commands/questFunnelPlaythrough.test.ts`

## Severity

### P0

- authored multi-day investigation resolving same day
- same-day completion of fictionally longer escort/survival work

### P1

- misleading use of deadlines as if they were duration
- tests reinforcing shallow loops

### P2

- broader audit of all quest copy vs actual runtime pacing

## What Does Not Look Like the Main Bug

From current code inspection, settlement appears quest-targeted:

- `settleQuestSuccess(state, questId, ...)`
- `findQuestSettlementTarget(...)`

There is no obvious code path that simply completes all active quests at once.

That means the reported "I worked one and two were completed" is most likely:

- two separate quests
- both shallow enough to settle in one evening
- one log stream making this feel like a coupled failure

This should still be treated as a serious product bug.

## Existing Ticket Coverage

### Partially relevant, but not sufficient

- `destiny-2c2q`
  Events and Quests: Reference Integrity, Expiry Cleanup, and Procedural Generation
  Covers integrity / expiry / generation concerns, but not duration semantics or fiction/runtime pacing.

- `destiny-viak`
  Investigation result breakdown
  Improves readability of investigation outcomes, but not duration or multi-day structure.

### New tickets created from this audit

- `destiny-4vdq`
  Quest duration contract: separate authored duration from expiry windows

- `destiny-ea80`
  Make investigation quests consume time and honor authored surveillance duration

- `destiny-5qcj`
  Make delivery and survival contracts declare and honor execution duration

- `destiny-f6kk`
  Audit quest authoring for fiction/runtime mismatch and misleading duration copy

## Finding to Bead Mapping

- F1: `Three Days on Assessor Vorn` resolves same day despite three-day briefing
  - `destiny-ea80`

- F2: `Safe Passage Through the Pale` resolves in one watch despite escort fiction
  - `destiny-5qcj`

- F3: deadlines and execution duration are conflated in player-facing behavior
  - `destiny-4vdq`

- F4: broader quest-system trust audit is required
  - `destiny-f6kk`

- F5: existing quest/event integrity epic does not cover this pacing contract
  - tracked explicitly in this audit; no silent mapping to `destiny-2c2q`

## Recommended Implementation Order

1. `destiny-4vdq`
2. `destiny-ea80`
3. `destiny-5qcj`
4. `destiny-f6kk`

## Required Quality-Gate Improvement

Quest verification should add:

1. authored duration vs runtime duration assertions
2. same-day settlement prevention tests for multi-day contracts
3. Day 1 fresh-save quest trust scenarios
4. activity-log readability checks when multiple quests resolve in the same period
