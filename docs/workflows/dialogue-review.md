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

## Current state (audit 2026-07-03)

This section is a living record of where the dialogue set stands against the criteria above. Update it whenever dialogue coverage or quality changes materially — don't let it silently go stale.

### Coverage

17 of 49 NPCs in `data/definitions/npcs.json` have a tree in `data/definitions/dialogues.json`. 32 have none. Priority for filling gaps:

**Highest priority — plot-relevant, currently silent:**
- `npc-cessa-rill` — named in `npc-mira`'s `motivation.privateNeed` as the final link proving the Valdris maternal line was erased; referenced in `data/lore/valdris-succession-question.md` and `src/application/selectors/dialogue.ts`, but has zero dialogue. The single most urgent gap.
- `npc-lady-sorn` (rare, noble, Gilded Court antagonist tier)
- `npc-lirien-ashcroft` (rare, noble — Lira Ashcroft's daughter per Lira's own background)
- `npc-veyran-malk` (uncommon, noble, House Merrow — Merrow is the central debt counterparty referenced by Marion and Orven, but no one from the house itself has a voice)

**Medium priority — rare, faction-bound or antagonist-tier:**
`npc-oswin-farr`, `npc-tav`, `npc-maret-sunne`, `npc-rutha-kael`, `npc-petra-sunn`, `npc-tessaly-wode`, `npc-enemy-tomas-rell`, `npc-enemy-catrin-hale`, `npc-enemy-harlen-voss`, `npc-enemy-the-dockmaster`, `npc-sable-cairn-head`

**Lower priority — rare/uncommon, no faction binding, roster fill:**
`npc-cress-aldmoor`, `npc-dael-morw`, `npc-irenne-brek`, `npc-elyn`, `npc-bren-aldoth`, `npc-nessa-vain`, `npc-aldric-vane`, `npc-dara-slink`, `npc-osanna-cray`, `npc-sanna-veld`, `npc-brand`, `npc-alis-vey`, `npc-lissel-crane`, `npc-halvard-senn`, `npc-evar-koss`

**Lowest priority — common rarity, flavor:**
`npc-fenwick-pale`, `npc-cutter`

### Known writing issues in existing trees

Reference-quality examples (use these as the bar): `npc-marion-vale` (34 nodes, trust-gated courtship arc), `npc-ida-rhys` (12 nodes, same pattern), `npc-old-maret` (the crest-ring scene actively uses her background).

Trees that fail the voice-specificity check (§7) — generic register, defined quirks/motivation unused:

| NPC | Issue | Fix using the character's own sheet |
|---|---|---|
| `npc-mira` | Quirk contradiction, not just genericness: written to "never answer a direct question directly," but her dialogue answers directly | Make the answer evasive/coded, or explicitly flag the directness as a broken pattern the player notices |
| `npc-sister-vael` | Pure info-dump, quirks unused | Use "lights a second candle when she lies" or "leaves exactly when she has what she came for" as a beat |
| `npc-orven-pell` | Generic cautious-informant voice | Use "answers questions about records with the filing date first" as an actual speech pattern |
| `npc-torvald-messe` | Mentions the copy but not his defining habit | Use "quotes the relevant statute before any decision" as literal phrasing |
| `npc-brannic-thule` | Never uses his defining quirk | "Addresses the player by the correct honorific from the first meeting" is absent from the text |
| `npc-dalen-morke` | Generic smooth-broker tone | `motivation`: "apologises before delivering bad news," "has not slept well in years" — neither shows up |
| `npc-sable-wrent` | Generic mercenary | "Keeps a tally of every favour," "will not say the League's name aloud" — unused |
| `npc-bog` | Generic "man of few words" | "Knows every dock worker by name and rotation" — unused |
| `npc-garet-doyle` | Generic bartender, wasted hook | The locked box of Valdris relics (`privateNeed`) is never mentioned, despite being quest bait |
| `npc-verek-holst` | Generic info-broker | "Recites statutes under his breath when nervous" fits his ex-Compact background well but is unused |
| `npc-lira-ashcroft` | Partially generic | "Never raises her voice" is passively respected but never used as a deliberate contrast beat |

### Known structural issues

- **State reactivity**: 12 of the 15 non-flagship trees have zero `condition` on any node — always available, no "why now."
- **Consequence legibility**: most flat trees resolve to a numeric `outcome` (`trust+X`/`loyalty+X`) with no visible NPC reaction.
- **Quote-style inconsistency**: `'single quotes'` (Verek, Garet, Bog, Lira, Torvald, Orven, Brannic, Dalen, Sable) vs. `"double quotes"` (Marion, Ida, Mira, Tessaly, Vael, Maret) — signals separate, unreconciled authoring passes.
- **Naming collision**: `npc-the-wren` (a standalone, nameless info-broker) coexists with `npc-tessaly-ash`, whose background states she lives under the alias "Wren." Unclear if intentional; currently unresolved in the text either way.
- **No repeat/callback layer** in flat trees: unlike Marion/Ida, there's no second state-gated node once the single exchange is spent.

## Helpful papers and references

- **Talking with NPCs: Towards Dynamic Generation of Discourse Structures** (Strong & Mateas, AIIDE08) — strong for thinking in terms of dialogue goals and stateful discourse rather than static line trees. [Strong_Mateas_-_AIIDE08.pdf](https://eis.ucsc.edu/papers/Strong_Mateas_-_AIIDE08.pdf)

- **Dialog as a Game** (DiGRA) — useful when thinking about dialogue as interaction and social play, not only exposition delivery. [dl.digra.org article 227](https://dl.digra.org/index.php/dl/article/view/227)

- **Narrative Control and Player Experience in Role Playing Games: Decision Points and Branching Narrative Feedback** — supports the idea that branching plus meaningful feedback improves player experience more than flat linear response. [ResearchGate publication 300588610](https://www.researchgate.net/publication/300588610_Narrative_Control_and_Player_Experience_in_Role_Playing_Games_Decision_Points_and_Branching_Narrative_Feedback)

- **Improving optionality in video game dialogue with Trope-Informed Design** — useful for avoiding stale, expected branch structures and making choices feel less canned. [orca.cardiff.ac.uk/178841](https://orca.cardiff.ac.uk/178841)

- **SimDialog: A visual game dialog editor** — useful not as a tool requirement, but for thinking in terms of dialogue state, cause/effect, and authoring complexity. [arxiv.org/abs/0804.4885](https://arxiv.org/abs/0804.4885)
