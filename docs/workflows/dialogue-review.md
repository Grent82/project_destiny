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

Bad choice sets differ only by wording.

### 3. State reactivity

Does the tree react to:
- items
- prior choices
- quest stage
- trust / loyalty / fear
- faction position

And more importantly:
- can the player notice that reactivity?

### 4. Consequence legibility

After a choice, can the player tell what happened?

Good:
- new topic opens
- NPC tone changes
- quest lead appears
- item is granted
- relationship meaningfully shifts

Weak:
- only a hidden numeric delta changes

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

If the answer is “nothing much,” the branch is probably filler.

## Special rules for clue dialogue

For any clue or evidence item:

1. The clue must point toward at least one likely interpreter.
2. The NPC’s response must do more than confirm possession.
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

- generic “tell me more” ladders with no changed stakes
- hidden unlocks with no surfaced acknowledgment
- flavor-only branches in high-pressure story funnels
- choices that differ in phrasing but not effect
- exposition that should have been environmental or item-based instead

## Review checklist

For each dialogue tree, ask:

1. Why is this dialogue available now?
2. What new understanding does each branch create?
3. Which branch changes actionability?
4. Which branch changes relationship meaning?
5. Does the NPC have a visible agenda in the scene?
6. Would a fresh player understand why this branch matters?

## Helpful papers and references

- **Talking with NPCs: Towards Dynamic Generation of Discourse Structures**  
  Strong for thinking in terms of dialogue goals and stateful discourse rather than static line trees.  
  [PDF](https://eis.ucsc.edu/papers/Strong_Mateas_-_AIIDE08.pdf)

- **Dialog as a Game**  
  Useful when thinking about dialogue as interaction and social play, not only exposition delivery.  
  [Link](https://dl.digra.org/index.php/dl/article/view/227)

- **Narrative Control and Player Experience in Role Playing Games**  
  Supports the idea that branching plus meaningful feedback improves player experience more than flat linear response.  
  [Link](https://www.researchgate.net/publication/300588610_Narrative_Control_and_Player_Experience_in_Role_Playing_Games_Decision_Points_and_Branching_Narrative_Feedback)

- **Improving optionality in video game dialogue with Trope-Informed Design**  
  Useful for avoiding stale, expected branch structures and making choices feel less canned.  
  [Link](https://orca.cardiff.ac.uk/178841)

- **SimDialog: A visual game dialog editor**  
  Useful not as a tool requirement, but for thinking in terms of dialogue state, cause/effect, and authoring complexity.  
  [Link](https://arxiv.org/abs/0804.4885)
