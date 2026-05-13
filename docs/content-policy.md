# Project Destiny — Content Policy

**Status:** Authoritative  
**Scope:** All quest content, NPC dialogue, captivity events, and narrative writing  
**Last updated:** 2026-05-13

---

## The Principle

**Model aftermath, not exploitation.**

Dark content earns its place through consequence and player choice — not through what it depicts, but through what it forces the player to confront. If a state does not create a new decision for the player, it probably should not exist.

---

## Content Tiers

### IN — Fully modeled and player-facing

These themes are permitted, supported by schema, and may appear as active mechanics or authored narrative:

- Imprisonment and captivity states (`captivityState` schema — see `destiny-4n2j`)
- Psychological damage and trauma debuffs
- Ideological and political corruption
- Trauma bonding (damaged attachment / survival behavior — **not** romance framing)
- Consensual relationships formed **after** captivity has ended
- Captivity degradation over time (condition worsening by `timeHeldDays`)
- NPC coercion-risk model: player protects vulnerable NPCs, not the reverse (see `destiny-w4nr`)
- Death, grief, bereavement
- Raid, extortion, blackmail, debt enforcement
- Moral compromise with visible costs
- Pregnancy from free consensual relationship (rare; sustained narrative weight required)
- Pregnancy as rare world-generated captivity aftermath (`context: 'unknown'`, never player-triggered or optimizable; discovered through authored event only; player choices: protect / investigate / conceal / confront)

---

### IMPLIED ONLY — State exists, consequence acknowledged, no active mechanics

These themes may be present in the world but must not be dramatized, simulated, or used as active player-facing mechanics:

- Past sexual violence as NPC backstory (brief, indirect, consequence-focused — never a twist or collectible)
- Coercive intimacy (state and dialogue only, not dramatized as romance or mechanic)
- Captivity aftereffects that imply sustained abuse without simulating it
- The coercive context behind a `pregnancyState.context = 'unknown'` (the label is never surfaced to the player)

---

### OUT — Never permitted in any bead, content file, or mechanic

No implementation, no bead, no content file may include:

- Sexual violence as an active, repeatable gameplay system
- Pregnancy as a player-triggered or player-optimizable outcome
- Probability of captivity pregnancy exposed in any UI, tooltip, or stat
- Any feedback loop where sending an NPC into captivity produces an expected pregnancy outcome
- Coerced-consent as a player-facing label or mechanic category
- Trauma bonding presented as romance or as a desirable outcome
- Any mechanic that rewards captivity, coercion, or abuse
- Graphic depiction of assault
- Women as pure motivation objects for the protagonist (see Failure Mode 1 below)
- Stockholm syndrome as a narrative explanation (see Failure Mode 3 below)

---

## The Four Failure Modes

Every writer and content agent working on this project must know these by name. They are recurring patterns of bad dark-fantasy writing.

### 1. Women in Refrigerators
Violating or killing a woman to motivate the (male) protagonist. The world stops being about her. Her pain exists to produce his emotion.  
**Red flag:** An NPC's suffering is described primarily in terms of how it affects the player character, not what it means for her.

### 2. Torture as Aesthetic
Suffering lingers. The prose is elegant. Misery is eroticized or made admirable. The player is asked to admire or be titillated by abuse.  
**Red flag:** Captivity scenes described with physical sensory detail that is not in service of consequence.

### 3. Stockholm Syndrome Shortcut
She stayed, so she must love him. Power imbalance collapses into melodrama. The captor's cruelty is reframed as intimacy.  
**Red flag:** Any captivity arc that resolves in an NPC expressing romantic feeling for her captor without years of authorial care.

### 4. Pregnancy as Moral Cudgel
Used only to force pity, shame, or plot convenience. The character becomes a container for stakes rather than a person.  
**Red flag:** A pregnancy state that exists only to justify player action, not to develop the NPC's arc.

---

## The Mandatory Discovery Moment (Captivity Pregnancy Aftermath)

If a `pregnancyState` with `context: 'unknown'` is generated as captivity aftermath, the discovery scene must follow this pattern:

- **Tone:** Quiet. Somber. Consequence-first.
- **Source:** Through a healer, a guard report, or the NPC herself — not discovered by the player casually.
- **Immediate player choices:** protect / investigate / conceal / confront captor.
- **No reward framing.** No optimization signal. No "you handled this correctly" feedback.
- **One-time event.** Not repeatable. Not a quest type that generates from templates.

---

## Content Warnings (Mandatory)

Content warnings must appear:
1. Upfront, before the player begins (game-level warning screen)
2. As an optional detailed list in Settings

Warn explicitly for:
- Captivity and imprisonment
- Coercion and psychological manipulation
- Psychological trauma
- Implied sexual violence
- Corruption / body horror
- Forced dependency
- Pregnancy themes

---

## Cross-References

| Topic | Bead |
|---|---|
| Mira captivity arc: corruption + coercive bond + maternity ledger | `destiny-qx1v` |
| `captivityState` + `pregnancyState` schema | `destiny-4n2j` |
| NPC vulnerability / coercion-risk protection | `destiny-w4nr` |

---

## Revision History

- **2026-05-13:** Initial authoring. Three specialist panel rounds (NPC captivity ND+GD+TC round 1; coerced-consent ND+GD+SA+TC; captivity pregnancy world-state ND+GD+SA+TC round 2). Round 2 revised the pregnancy verdict: world-generated aftermath **IN** as implied state; player-driven mechanic remains **OUT**.
