# Quest Authoring Alignment Audit — 2026-06-01

## Scope

This audit classifies every current quest template as:

- `aligned`
- `copy too strong`
- `runtime too shallow`

The goal is not only to find bugs, but to verify that quest text and runtime make the same promise to the player.

This audit builds on:

- [docs/quest-system-duration-audit-2026-06-01.md](/Users/andre.dittrich/privat/projects/project_destiny/docs/quest-system-duration-audit-2026-06-01.md)

## Classification Rules

### Aligned

The runtime currently supports the core player expectation created by the briefing.

### Copy Too Strong

The quest text implies richer, longer, or more specific behavior than the runtime currently performs, but the gap can plausibly be fixed by reauthoring the wording.

### Runtime Too Shallow

The current runtime is missing behavior that is important enough that the stronger fiction should probably stay and the system should deepen instead.

## Audit Table

| Quest | Objective | Classification | Reason | Current / Follow-up Bead |
|---|---|---|---|---|
| `quest-harborwatch` / `The Harborwatch Dispute` | combat | aligned | “Stop it quietly” maps acceptably to travel -> combat -> aftermath. | existing combat loop |
| `quest-ledger-recovery` / `The Missing Ledger` | investigation | aligned | The briefing now promises identifying the current holder from a single active lead, which matches the current investigation loop. | closed `destiny-etlp` |
| `quest-foundry-escort` / `League Escort: The Long Road` | combat | aligned | The briefing now frames the job as breaking the ambush crew before the next move, which matches the combat loop. | closed `destiny-y31l` |
| `quest-ring-debt` / `A Debt Already Paid` | investigation | aligned | The wording now frames one actionable lead instead of a longer tailing sequence. | closed `destiny-etlp` |
| `quest-restored-appeal` / `The Restored Ask a Favor` | investigation | runtime too shallow | archive infiltration and document retrieval are central to the fantasy; simple rewording would cheapen it too much. | `destiny-t2x7` |
| `quest-warrens-extraction` / `Retrieve the Runaway` | combat | aligned | The job now centers on breaking armed resistance around the runaway instead of promising a capture/extraction mechanic. | closed `destiny-y31l` |
| `quest-ring-debt-collection` / `A Word with Brennik` | combat | aligned | The wording already allows a short coercive confrontation. | existing combat loop |
| `quest-nightbloom-extract` / `Nightbloom Required` | delivery | aligned | Contact-driven handoff fiction matches a compact on-site delivery loop. | current delivery loop |
| `quest-pale-wagon-escort` / `Safe Passage Through the Pale` | survival | aligned | now explicitly multi-watch; wording and runtime match. | closed `destiny-5qcj` |
| `quest-foundry-sabotage` / `Industrial Consulting` | combat | aligned | violent disruption is still the main promise. | existing combat loop |
| `quest-hollows-ledger` / `The House on Soot Lane` | investigation | runtime too shallow | abandoned-house recovery plus vanished prior team suggests an explorable/localized operation, not one roll. | `destiny-t2x7` |
| `quest-slaver-house-dispute` / `Two Houses, One Table` | investigation | runtime too shallow | mediation/tact/discretion imply a social branch structure absent from current runtime. | `destiny-t2x7` |
| `quest-compact-watch` / `Three Days on Assessor Vorn` | investigation | aligned | now explicitly three-day surveillance. | closed `destiny-ea80` |
| `quest-gilded-auction-guard` / `Presence Required at the Fold` | survival | aligned | The job now declares an evening-sale framing and a two-watch duration that matches the on-site hold loop. | closed `destiny-tfzm` |
| `quest-ironworks-cleanup` / `The Warehouse on Rendmill Street` | delivery | aligned | The employer now sends you to a warehouse contact with a sealed packet, which fits the on-site delivery loop. | closed `destiny-tfzm` |
| `quest-mira-rescue` / `The Pale Cage` | combat | aligned | combat-rescue framing matches current story-combat loop well enough. | current story combat loop |
| `quest-orren-wex-rescue` / `Old Ledgers` | investigation | runtime too shallow | custody breakout and debt-proof recovery are too important to remain one-roll. | `destiny-t2x7` |
| `quest-harborwatch-followup` / `The Harborwatch Reckoning` | investigation | aligned | The briefing now asks for a usable name from the current lead rather than a staged evidence chain. | closed `destiny-etlp` |
| `quest-ledger-debt-followup` / `The Ledger's Second Page` | delivery | aligned | The wording now centers a specific handoff contact instead of implying a retrieval operation the loop does not stage. | closed `destiny-tfzm` |
| `quest-ledger-burned` / `Ashes Where the Ledger Was` | investigation | runtime too shallow | “find who ordered the burning and make a case” implies accusation/proof structure. | `destiny-t2x7` |
| `quest-rival-iron-covenant-counter` / `Broken Muster` | investigation | aligned | The briefing now promises confirmation of one lead before rotation, which matches the current loop. | closed `destiny-etlp` |
| `quest-rival-pale-sisters-counter` / `Whispers in White Ink` | investigation | aligned | The text now stays at “work the lead” rather than promising network mapping. | closed `destiny-etlp` |
| `quest-rival-gilded-hand-counter` / `Contract Men at the Fold` | investigation | aligned | The wording now asks for a usable read from one lead rather than proof and forward push planning. | closed `destiny-etlp` |
| `quest-rival-ashen-compact-counter` / `Forn's Quiet Hiring` | investigation | aligned | The copy now stays inside one actionable lead instead of implying a tracking chain. | closed `destiny-etlp` |

## Summary

### Aligned

19 quests:

- `quest-harborwatch`
- `quest-ledger-recovery`
- `quest-ring-debt`
- `quest-ring-debt-collection`
- `quest-nightbloom-extract`
- `quest-pale-wagon-escort`
- `quest-foundry-sabotage`
- `quest-mira-rescue`
- `quest-compact-watch`
- `quest-gilded-auction-guard`
- `quest-ironworks-cleanup`
- `quest-harborwatch-followup`
- `quest-ledger-debt-followup`
- `quest-rival-iron-covenant-counter`
- `quest-rival-pale-sisters-counter`
- `quest-rival-gilded-hand-counter`
- `quest-rival-ashen-compact-counter`

### Copy Too Strong

0 quests.

### Runtime Too Shallow

5 quests:

- `quest-restored-appeal`
- `quest-hollows-ledger`
- `quest-slaver-house-dispute`
- `quest-orren-wex-rescue`
- `quest-ledger-burned`

## Findings

- F1: The loudest Day 1 duration mismatch is fixed for `quest-compact-watch`.
  - covered by closed `destiny-ea80`
- F2: The loudest escort mismatch is fixed for `quest-pale-wagon-escort`.
  - covered by closed `destiny-5qcj`
- F3: The general duration contract is now explicit in data/runtime.
  - covered by closed `destiny-4vdq`
- F4: Most remaining misalignment now sits in `investigation` authoring versus handler depth.
  - copy retunes: closed `destiny-etlp`
  - deeper handler cases: `destiny-t2x7`
- F4a: Remaining combat-side fiction drift sits in escort/extraction briefings that outrun the current combat loop.
  - covered by closed `destiny-y31l`
- F5: Several delivery/survival quests still need authoring retuning after the duration rollout.
  - covered by closed `destiny-tfzm`

## Recommended Backlog Shape

1. `destiny-t2x7`
2. only after that, broader quest-generation / quest-expansion work

## Authoring Rule Update Required

Quest writers should not use:

- explicit day counts
- retrieval / infiltration / mediation verbs
- proof-building or network-mapping promises

unless the runtime actually supports those steps.

If the current runtime is only:

- combat
- on-site delivery
- on-site hold
- one investigation operation per watch/day beat

then the copy must reflect that exact scope.
