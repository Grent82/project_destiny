# Workflow: Dialogue Review

Use this workflow when designing, reviewing, or implementing dialogue trees.

Project Destiny should not use dialogue as decorative branching text alone. Dialogue must:

- reveal motive
- react to state
- surface consequences
- point toward action when appropriate
- preserve ambiguity only when ambiguity is intentional

## Why this exists

A dialogue tree can be mechanically valid and still fail because:

- the player cannot tell why a choice appeared
- the dialogue does not acknowledge relevant evidence strongly enough
- the result changes hidden state but not the felt conversation
- multiple branches are technically different but emotionally identical
- the text is generic enough that it could belong to any NPC of the same role, even though the NPC has a distinct `background`/`motivation`/`quirks` sheet in `data/definitions/npcs.json`

## Core design rule

Every dialogue node should do at least one of these jobs:

- reveal character
- reveal world
- reveal leverage
- reveal next action
- reveal consequence
- reframe what the player thought they knew

If a node does none of these, cut or compress it.

## Dialogue tree quality criteria

### 1. Entry clarity

Why is this conversation happening now?

Check:
- what triggered this talk?
- what changed in the world or inventory?
- does the player know why this topic is available?

Bad:
- hidden item gate with no surfaced follow-up
- a node with no `condition` at all that stays identical regardless of world state, when the NPC's role implies it should react to something

Good:
- clue found
- NPC visibly becomes the next useful contact
- topic is named in a readable way

### 2. Branch meaning

Do the choices represent distinct player intentions?

Good choice sets differ by:
- tone
- risk
- honesty
- leverage
- relationship cost
- strategic goal

Bad choice sets differ only by wording (e.g. "ask" vs. "leave" with no third option that changes stakes).

### 3. State reactivity

Does the tree use the schema's `condition`/`conditionAll` (`dayMin`/`dayMax`, `hasItem`, `minNpcTrust`, `minNpcLoyalty`, `minRenown`, `debtPaid`, `mainQuestStage`, `choiceTaken`/`choiceNotTaken`) to react to:
- items
- prior choices
- quest stage
- trust / loyalty / fear
- faction position

And more importantly:
- can the player notice that reactivity?

A tree with zero conditions on any node is a static bark, not a reactive scene — that's acceptable for pure flavor NPCs, but should be a deliberate choice, not a default.

### 4. Consequence legibility

After a choice, can the player tell what happened? The schema's `outcome` types (`loyalty`, `trust`, `respect`, `affinity`, `mainQuestHint`, `questUnlock`, `item`, `factionStanding`, `activityLog`) should be backed by something felt in the text, not only the number.

Good:
- new topic opens
- NPC tone changes
- quest lead appears
- item is granted
- relationship meaningfully shifts

Weak:
- only a hidden numeric delta (`loyalty`/`trust` outcome) changes with no visible reaction in the closing line

### 5. Scene reality

Does the conversation feel like a scene, not a menu?

Check:
- is there emotional progression?
- does the NPC sound like a person with a want, not a database row?
- does the branch acknowledge what was shown or discovered?

### 6. Exit quality

When the conversation ends:
- what does the player now understand?
- what can they now do?
- what will they remember?

If the answer is "nothing much," the branch is probably filler.

### 7. Voice specificity (quirk grounding)

Every NPC with a `background`, `motivation`, or `quirks` entry in `data/definitions/npcs.json` carries that data for a reason: the dialogue is supposed to sound like *this* person, not like an archetype slot ("gruff barkeep," "guarded informant," "smooth broker").

Check, for every node:
- Does at least one line use a concrete, NPC-specific detail — a named quirk, a phrase from `motivation.privateNeed`/`publicGoal`, or a background fact — that could not be copy-pasted onto a different NPC of the same role?
- **Swap test**: replace the NPC's name and role tag with another NPC of the same archetype (bartender, fence, informant, quartermaster). If the line still reads naturally for the swapped-in NPC, it is generic and needs rework.
- Does the line contradict a defined quirk (e.g. a character written to "never answer a direct question directly" who then answers directly)? That is worse than being generic — it is inconsistent.

This is the single most common way dialogue quietly degrades into filler: it is mechanically fine (has a condition, has an outcome) and grammatically fine, but it is interchangeable. Interchangeable dialogue fails "reveal character" even when it technically fills a node.

## Special rules for clue dialogue

For any clue or evidence item:

1. The clue must point toward at least one likely interpreter.
2. The NPC's response must do more than confirm possession.
3. The response should change the meaning of the clue, not merely restate it.
4. The next step should be clearer after the talk than before it.

This is especially important for:
- house clues
- rings and seals
- ledgers and notes
- prisoner testimony
- political documents

## Dialogue patterns to prefer

### Reveal + redirect

The NPC explains why the clue matters and points to the next actor/place.

### Emotional fracture

The player learns something, but the tone of the relationship also changes.

### Conditional candor

Higher trust reveals a more dangerous truth, not just extra exposition.

### Strategic framing

The same underlying fact can be presented as:
- threat
- opportunity
- shame
- debt

That gives real roleplay shape to choices.

## Dialogue patterns to avoid

- generic "tell me more" ladders with no changed stakes
- hidden unlocks with no surfaced acknowledgment
- flavor-only branches in high-pressure story funnels
- choices that differ in phrasing but not effect
- exposition that should have been environmental or item-based instead
- archetype voice that ignores the NPC's own `quirks`/`motivation` — a terse-broker or gruff-contact cadence reused across unrelated characters until they read as interchangeable

## Review checklist

For each dialogue tree, ask:

1. Why is this dialogue available now?
2. What new understanding does each branch create?
3. Which branch changes actionability?
4. Which branch changes relationship meaning?
5. Does the NPC have a visible agenda in the scene?
6. Would a fresh player understand why this branch matters?
7. Swap test: does at least one line survive being swapped onto another NPC of the same archetype, or would it read wrong for them? If it would read fine for anyone, ground it in this NPC's quirks/motivation instead.

## Current state (audit 2026-07-03, resolved 2026-07-06)

This section is a living record of where the dialogue set stands against the criteria above. Update it whenever dialogue coverage or quality changes materially — don't let it silently go stale.

### Coverage

All 49 NPCs in `data/definitions/npcs.json` now have a tree in `data/definitions/dialogues.json` (49 trees total, up from 17). The 32-NPC coverage gap identified in the 2026-07-03 audit (destiny-zldh epic, F1) is closed.

### Known writing issues (resolved)

The 11 trees flagged for generic/contradictory voice against the criteria in §7 (`npc-mira`, `npc-sister-vael`, `npc-orven-pell`, `npc-torvald-messe`, `npc-brannic-thule`, `npc-dalen-morke`, `npc-sable-wrent`, `npc-bog`, `npc-garet-doyle`, `npc-verek-holst`, `npc-lira-ashcroft`) were rewritten to use each NPC's own quirks/motivation as a concrete speech pattern or beat (destiny-zldh F2, tickets zldh.3–zldh.13). Reference-quality examples (still the bar): `npc-marion-vale` (34 nodes, trust-gated courtship arc), `npc-ida-rhys` (12 nodes, same pattern), `npc-old-maret` (the crest-ring scene).

### Known structural issues (resolved)

- **Quote-style inconsistency**: fixed — `dialogue-orren-wex` and `dialogue-the-wren` converted to double quotes, matching the rest of the file (destiny-zldh F3 / zldh.2).
- **Naming collision**: resolved — Tessaly Ash's alias was renamed from "Wren" to "Magpie" across `npc-tessaly-ash.background`, the `poi-pale-wren-safe-house` POI (name + description), `poi-pale-the-ash`'s description, the `quest-mira-act1-wren-favor` quest title, and 2 narrative hint strings (`applyPolitics.ts`, `questSettlement.ts`). `npc-the-wren` is confirmed unrelated (separate POI, separate district) and untouched (destiny-zldh F4 / zldh.1).
- **State reactivity**: most new/rewritten trees now carry at least one `condition` (item, trust, renown, day, quest stage, or choice-taken gates); several use cross-NPC `minNpcTrust` conditions to make family/mentor relationships (Lirien↔Lira, Maret Sunne↔Old Maret, Elyn↔Petra Sunn) mechanically felt.
- **No repeat/callback layer**: still true for the new single-scene trees (by design — most non-flagship NPCs get one grounded scene, not a Marion/Ida-scale arc). Revisit only if a specific NPC's story role grows.

## Helpful papers and references

- **Talking with NPCs: Towards Dynamic Generation of Discourse Structures** (Strong & Mateas, AIIDE08) — strong for thinking in terms of dialogue goals and stateful discourse rather than static line trees. [Strong_Mateas_-_AIIDE08.pdf](https://eis.ucsc.edu/papers/Strong_Mateas_-_AIIDE08.pdf)

- **Dialog as a Game** (DiGRA) — useful when thinking about dialogue as interaction and social play, not only exposition delivery. [dl.digra.org article 227](https://dl.digra.org/index.php/dl/article/view/227)

- **Narrative Control and Player Experience in Role Playing Games: Decision Points and Branching Narrative Feedback** — supports the idea that branching plus meaningful feedback improves player experience more than flat linear response. [ResearchGate publication 300588610](https://www.researchgate.net/publication/300588610_Narrative_Control_and_Player_Experience_in_Role_Playing_Games_Decision_Points_and_Branching_Narrative_Feedback)

- **Improving optionality in video game dialogue with Trope-Informed Design** — useful for avoiding stale, expected branch structures and making choices feel less canned. [orca.cardiff.ac.uk/178841](https://orca.cardiff.ac.uk/178841)

- **SimDialog: A visual game dialog editor** — useful not as a tool requirement, but for thinking in terms of dialogue state, cause/effect, and authoring complexity. [arxiv.org/abs/0804.4885](https://arxiv.org/abs/0804.4885)
