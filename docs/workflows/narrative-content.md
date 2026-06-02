# Workflow: Narrative Content

Use this workflow when creating or reviewing:

- factions
- districts
- NPC bios
- quest framing
- contract and lead framing
- event text
- naming sets

For authored event scenes, trigger legibility, and consequence readability, also use [docs/workflows/event-review.md](event-review.md).

## Inputs

- `docs/product.md`
- `docs/narrative.md`
- relevant system and data contracts

## Process

1. Identify the gameplay function of the content.
2. Define the shortest useful story framing.
3. Make sure names, motives, and tone are distinct.
4. Check compatibility with system behavior and data structure.
5. Keep reusable text modular for future scaling.
6. Do not promise more time, travel, proof-building, retrieval, mediation, surveillance, or branching than the runtime actually supports.

## Runtime Truth Rule

- If a quest runs as one investigation operation, the copy must read like one investigation operation.
- If a quest consumes multiple watches or days, the copy may say so explicitly.
- If the runtime does not support retrieval, infiltration, mediation, custody breakout, or proof-building, do not imply those steps in the briefing just because they sound better.
- If the stronger fiction is important enough to keep, file or link a bead for the missing runtime instead of hiding the gap in prose.

## Contract Readability Rule

For contract-board and lead surfaces, keep four questions separate in authored framing and UI copy:

- `Issuer`: who handed the lead to the player right now
- `Payer`: who is actually financing or underwriting the work
- `Stakeholder`: who in the world is most exposed to the outcome
- `Likely fallout`: what kind of social, political, economic, or personal consequence is likely if the job lands

If two of those collapse to the same actor, that is fine, but the distinction must still be checked deliberately instead of assumed.

If a presentation model uses typed actor references, classify them explicitly as `npc`, `faction`, `district`, or `offscreen` rather than leaving personhood implied by prose alone.

## Output Standard

- concise
- mechanically compatible
- consistent with existing faction and district identity
- easy to store in content files later
