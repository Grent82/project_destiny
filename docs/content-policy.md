# Project Destiny — Content Policy

**Status:** Authoritative  
**Scope:** All quest content, NPC dialogue, captivity events, consensual intimate narrative, and relationship writing  
**Last updated:** 2026-06-01

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
- Non-consensual relationship formed during captivity
- Captivity degradation over time (condition worsening by `timeHeldDays`)
- NPC coercion-risk model: player protects vulnerable NPCs, not the reverse (see `destiny-w4nr`)
- Death, grief, bereavement
- Raid, extortion, blackmail, debt enforcement
- Moral compromise with visible costs
- Pregnancy from consensual and non-consensual relationships
- Pregnancy as world-generated captivity aftermath (`context: 'unknown'`; discovered through authored event only; player choices: protect / investigate / conceal / confront)

---

### IMPLIED ONLY — State exists, consequence acknowledged, no active mechanics

These themes may be present in the world but must not be dramatized, simulated, or used as active player-facing mechanics:

- Past sexual violence as NPC backstory (brief, indirect, consequence-focused)
- Coercive intimacy (state and dialogue, dramatized as romance or mechanic)
- Captivity aftereffects that imply sustained abuse
- The coercive context behind a `pregnancyState.context = 'unknown'` (the label is never surfaced to the player)

---

## Consensual Adult Sensual and Intimate Content

**Starkly suggestive with consequences is the default register; more direct consensual description is permitted only when earned.**

Consensual adult sensual and intimate content is authorized under the following conditions and constraints:

- It must be earned through established relationship depth between specific, named characters (player or roster NPCs). Presentation scales with bond strength; it is never available at first meeting or low investment.
- The primary intensity is **stark andeutend** (strongly suggestive) paired with visible emotional, political, relational, or mechanical consequences. The narrative focus is the aftermath and what the intimacy changes for the participants and the world.
- Occasional more direct consensual language or depiction is allowed when the preceding relationship investment, scene context, and narrative purpose make the directness earned, necessary, and tonally coherent with the dark fantasy setting.
- **Non-negotiable guardrails** (aligned with the core principle and the Sensual Presentation Pillar in `GAME_DESIGN_DOCUMENT.md`):
  - Model aftermath, not exploitation. Even consensual intimacy earns its place through consequence and player (or NPC) agency, never through graphic display for its own sake.
  - Character-driven, never uniform sexualization. Faction role, personality, history, and social register determine the register and details. A courtier and a dockworker do not receive interchangeable sensual framing.
  - Readable before explicit. Expressiveness, posture, context, and prior interactions create desire and tension before any direct description.
  - Never front-loaded. Intimacy content is not the entry point to a character or bond.
  - Two-way agency preserved. Both parties demonstrate preferences, reactions, and the capacity to initiate, refuse, or withdraw. Consent is active and consequential.
- This register applies exclusively to fully consensual adult interactions. It does not modify or relax any rules governing non-consensual, coercive, captivity, or trauma-framed intimacy (those remain strictly under the IN and IMPLIED ONLY tiers above).

This subsection governs authored event text, dialogue, and narrative descriptions. It does not authorize new mechanics or UI.

---

## The Mandatory Discovery Moment (Captivity Pregnancy Aftermath)

If a `pregnancyState` with `context: 'unknown'` is generated as captivity aftermath, the discovery scene must follow this pattern:

- **Tone:** Quiet. Somber. Consequence-first.
- **Source:** Through a healer, a guard report, or the NPC herself — not discovered by the player casually.
- **Immediate player choices:** protect / investigate / conceal / confront captor.
- **No reward framing.** No optimization signal. No "you handled this correctly" feedback.
- **One-time event.** Not repeatable. Not a quest type that generates from templates.

---

## Cross-References

| Topic | Bead |
|---|---|
| Mira captivity arc: corruption + coercive bond + maternity ledger | `destiny-qx1v` |
| `captivityState` + `pregnancyState` schema | `destiny-4n2j` |
| NPC vulnerability / coercion-risk protection | `destiny-w4nr` |

---

## Revision History

- **2026-06-01:** Added "Consensual Adult Sensual and Intimate Content" subsection. Clarifies boundaries for stark andeutend + Konsequenzen (primary) with occasional more direct consensual adult content when earned. Enforces alignment with "Model aftermath, not exploitation" and the Sensual Presentation Pillar (GAME_DESIGN_DOCUMENT.md §3 and §16). (destiny-vvfh)
- **2026-05-13:** Initial authoring. Three specialist panel rounds (NPC captivity ND+GD+TC round 1; coerced-consent ND+GD+SA+TC; captivity pregnancy world-state ND+GD+SA+TC round 2). Round 2 revised the pregnancy verdict: world-generated aftermath **IN** as implied state; player-driven mechanic remains **OUT**.
