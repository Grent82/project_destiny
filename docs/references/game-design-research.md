# Game Design Research Notes

This document records papers and research references that are actually useful to Project Destiny.

The goal is not to collect theory for its own sake. The goal is to turn research into better design decisions.

## Core frameworks

### MDA: A Formal Approach to Game Design and Game Research

Source:
- [PDF](https://www.cs.northwestern.edu/~hunicke/pubs/MDA.pdf)

Why it matters:
- forces the team to think from desired player experience backward to system design
- helps separate:
  - mechanics
  - dynamics
  - aesthetics

Takeaway for Project Destiny:
- stop adding mechanics because they sound rich
- define the target experience first:
  - pressure
  - decay
  - social leverage
  - dangerous restoration
- then ask what systems actually create that

### Connecting player and character agency in videogames

Source:
- [Link](https://research.usc.edu.au/esploro/outputs/journalArticle/Connecting-player-and-character-agency-in/99450786702621)

Why it matters:
- player agency is not only button choice
- NPC and character agency matter to narrative force

Takeaway for Project Destiny:
- NPCs must read like agents with motives
- world characters should not be static labels or vendors
- quest and dialogue design should show what NPCs want, not only what they tell

### Playing stories?

Source:
- [Link](https://eprints.leedsbeckett.ac.uk/id/eprint/9310/)

Why it matters:
- distinguishes multiple kinds of player agency:
  - spatial-explorative
  - temporal-ergodic
  - configurative-constructive
  - narrative-dramatic

Takeaway for Project Destiny:
- when a surface feels weak, ask which kind of agency it is supposed to support
- district map and house exploration are not the same agency problem as quest consequences

## Quest design

### A Transfiguration Paradigm for Quest Design

Source:
- [PDF](https://oars.uos.ac.uk/3111/1/A%20Transfiguration%20Paradigm%20for%20Quest%20Design.pdf)

Why it matters:
- critiques task-oriented quest design
- argues that quests matter more when they transform the character’s state or understanding

Takeaway for Project Destiny:
- quests should not just be contracts composed of tasks
- each quest should change one or more of:
  - who trusts the player
  - what the player knows
  - what the city thinks
  - what route is open
  - how the player reads the house or a district

### Situating Quests: Design Patterns for Quest and Level Design in Role-Playing Games

Source:
- [Link](https://www.researchgate.net/publication/220920059_Situating_Quests_Design_Patterns_for_Quest_and_Level_Design_in_Role-Playing_Games)

Why it matters:
- links quest design to level and spatial structure

Takeaway for Project Destiny:
- a quest step should be anchored to place, resistance, and route
- avoid abstract quest progression that could happen anywhere

### Exploring Narrative Structure with MMORPG Quest Stories

Source:
- [Link](https://ojs.aaai.org/index.php/AIIDE/article/view/12759)

Why it matters:
- useful for understanding recurring quest structures and how formal actions support narrative patterns

Takeaway for Project Destiny:
- keep quest templates structured
- but ensure authored beats and NPC motivations prevent them from reading as generic mission cards

## UI / UX / cognitive load

### Do Players Prefer Integrated User Interfaces?

Source:
- [Link](https://dl.digra.org/index.php/dl/article/view/514)

Why it matters:
- integrated or diegetic UI is not automatically better
- players often prefer clarity over immersion theater

Takeaway for Project Destiny:
- do not hide important information just to seem diegetic
- but also do not use overlays to patch bad structure
- the right question is: what is the clearest form at this layer?

### A model of cognitive loads in massively multiplayer online role playing games

Source:
- [Link](https://www.sciencedirect.com/science/article/pii/S0953543806001135)

Why it matters:
- useful for thinking about interface overload and parallel information demand

Takeaway for Project Destiny:
- dense management RPG UIs need aggressive hierarchy
- every page cannot ask the player to parse lore, stakes, route, risk, and mechanics equally

## Environmental storytelling / dark fantasy

### Archaeological Gameworld Affordances

Source:
- [Link](https://dl.acm.org/doi/10.1145/3706598.3714036)

Why it matters:
- studies how players interpret environmental storytelling

Takeaway for Project Destiny:
- environments should contain interpretable evidence
- clues should support plausible mental reconstruction
- but interpretation must be scaffolded enough that players do not lose the thread

### Empathy in the Abyss: Emotional Design in the World of Dark Souls

Source:
- [Link](https://ssrn.com/abstract=4999857)

Why it matters:
- dark fantasy works through emotional world design, contrast, and scarcity of comfort

Takeaway for Project Destiny:
- dark fantasy is not just grim language or black armor
- it is rhythm:
  - dread
  - relief
  - decay
  - persistence
- use environmental storytelling, selective safety, and costly knowledge

## Dialogue / interactive narrative

### Talking with NPCs: Towards Dynamic Generation of Discourse Structures

Source:
- [PDF](https://eis.ucsc.edu/papers/Strong_Mateas_-_AIIDE08.pdf)

Why it matters:
- frames dialogue around discourse goals and character/social state

Takeaway for Project Destiny:
- dialogue should be modeled as stateful revelation and negotiation, not only branching flavor

### Dialog as a Game

Source:
- [Link](https://dl.digra.org/index.php/dl/article/view/227)

Why it matters:
- treats dialogue as a social play system

Takeaway for Project Destiny:
- conversations can be tactical and expressive
- choices should differ by social intent, not only exposition order

### Narrative Control and Player Experience in Role Playing Games

Source:
- [Link](https://www.researchgate.net/publication/300588610_Narrative_Control_and_Player_Experience_in_Role_Playing_Games_Decision_Points_and_Branching_Narrative_Feedback)

Why it matters:
- branching plus meaningful feedback improves player experience

Takeaway for Project Destiny:
- if a dialogue branch changes something, the player should feel that change
- invisible deltas are not enough

### Improving optionality in video game dialogue with Trope-Informed Design

Source:
- [Link](https://orca.cardiff.ac.uk/178841)

Why it matters:
- useful against repetitive branch stereotypes

Takeaway for Project Destiny:
- avoid default “nice / rude / leave” trees when the scene could express leverage, fear, debt, or strategic intent instead

## How to use this in practice

Before building a new player-facing feature, ask:

1. Which experience are we trying to create?
2. Which kind of agency should this support?
3. Is the player learning, choosing, or merely reading?
4. What changes visibly afterward?
5. Is the surface carrying the right amount of information for its layer?

If those questions are weak, do not build more content yet.
