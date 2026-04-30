# Workflow: Session-Start RPG Audit

Run this audit at the **start of every session**, before launching any implementation waves or claiming beads. It takes less than five minutes and prevents entire sessions from drifting away from the core RPG identity.

## When to run

- First thing after `bd prime` and `bd ready`
- Before reviewing or claiming any implementation bead
- Before any specialist panel that will produce new beads
- After a long break between sessions (context drift is real)

## What to check

### 1. GDD alignment

Pull up `GAME_DESIGN_DOCUMENT.md` and confirm the planned work this session touches at least one of the game's core pillars. If none of the ready beads connect to a GDD pillar, that is a signal — not a blocker, but worth flagging.

### 2. RPG North Star (from `bd remember`)

Project Destiny is an **RPG first**, management game second.

Every wave must advance at least one of:

| Pillar | Signal |
|---|---|
| **Player character agency** | The player makes a choice that has consequences |
| **Story progression** | The Mira arc moves forward, or a faction event fires |
| **World NPC interactions** | NPCs act as world agents, not just stat containers |
| **Meaningful choice + consequence** | A decision the player makes today changes what is possible later |

The **living world** principle: the world moves without the player. NPCs pursue their own agendas. The city breathes. If the planned beads only add UI polish or data plumbing, check whether there is a higher-priority RPG gap being deferred.

### 3. Bead queue review

Skim the top of `bd ready`. Ask:

- Are these beads advancing core RPG mechanics, or are they entirely infrastructure?
- Is there a deferred RPG bead that should jump the queue?
- Is anything in the queue blocked on a narrative or character decision that hasn't been made?

## The four audit questions

Answer each question with **Yes / Partial / No** before starting implementation.

1. **Does this session's work advance player character agency?**
   — Will the player have a new meaningful decision to make, or will an existing one become more consequential?

2. **Does it advance story (Mira arc)?**
   — Will Mira's situation change, or will her arc move in any direction, even a small step?

3. **Does it make the world feel more alive?**
   — Will NPCs, factions, or districts feel more real, reactive, or independent by the end of this session?

4. **Are there higher-priority RPG gaps than the planned beads?**
   — Scan `bd ready` and `bd remember` for RPG gaps explicitly flagged. If yes, surface them before proceeding.

If the answer to all four is **No**, flag it explicitly. Either reorder the queue or add a note in the active bead explaining why pure infrastructure work is the right call this session.

## Running the audit with a specialist agent

When you want a more thorough game-design check — especially at the start of a new development cycle or after a major milestone — launch a Game Designer specialist agent with the following prompt pattern:

```
You are a Senior Game Designer with deep expertise in single-player RPGs, player agency, 
and emergent world systems. You are reviewing the planned work for a session of Project Destiny.

Project Destiny is an RPG first, management game second. The player controls a single 
character navigating a living city where factions compete, NPCs pursue their own goals, 
and every meaningful choice has lasting consequences. The central story follows Mira.

RPG North Star:
- Every wave must advance at least one of: player character agency, story progression 
  (Mira arc), world NPC interactions, meaningful choice + consequence
- Living world principle: the world moves without the player; NPCs are world agents 
  not just stat containers

Planned beads for this session:
[Paste bd ready output here]

Your tasks:
1. For each bead, assess which RPG pillar it advances (or confirm it advances none).
2. Identify the highest-priority RPG gap not represented in this session's queue.
3. Flag any bead that risks making the game feel more like a management dashboard 
   and less like an RPG.
4. Answer the four audit questions (Yes / Partial / No) for the session as a whole.
5. Recommend one concrete change to the bead queue that would strengthen RPG identity 
   this session.

Be direct. If the queue is solid, say so. If it is drifting, say so and say why.
```

## Output standard

The audit produces one of three outcomes:

- **Green** — Queue looks good. Proceed with `bd update <id> --claim`.
- **Yellow** — Queue has RPG gaps. Note them in the relevant beads before starting. Proceed.
- **Red** — Queue is missing critical RPG work. File a new bead for the gap, reorder if needed, then proceed.

Record any significant finding in `bd remember` so it survives into future sessions.

## Storing reusable patterns

```bash
bd remember "rpg-audit: [session date] — [key finding or reordering decision]"
```

Workflow files in `docs/workflows/` are for **process patterns**.  
`bd remember` is for **project-specific decisions and reusable knowledge**.  
Beads are for **actionable work**.
