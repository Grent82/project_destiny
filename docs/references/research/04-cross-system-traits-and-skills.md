# Cross-System Traits and Skills Audit
**Date:** 2026-05-16  
**Status:** First pass — findings only, no fixes applied  
**Scope:** How traits and skills are defined, read, mutated, and displayed across all systems

---

## What this looks at

NPCs have two stat categories: `traits` (personality axes, 0–100) and `skills` (competency values, 0–100). This audit finds every place each is read or written, checks whether the same keys and thresholds are used consistently, and identifies gaps in coverage or encoding.

---

## Schema and canonical lists

**Traits — 10 keys** (defined in `src/domain/npc/contracts.ts:64–77`):
`discipline`, `ambition`, `empathy`, `ruthlessness`, `prudence`, `curiosity`, `dominance`, `loyalty`, `vanity`, `zeal`

**Skills — 12 keys** (defined in `src/domain/npc/contracts.ts:47–62`):
`melee`, `ranged`, `medicine`, `administration`, `engineering`, `negotiation`, `survival`, `security`, `crafting`, `performance`, `academics`, `intrigue`

Both use `percentageSchema` (integer, 0–100). All authored NPC definitions in `data/definitions/npcs.json` use only these keys. The `TRAIT_KEYS` constant in `traitInheritance.ts` matches the schema exactly.

**Key finding:** all trait and skill key names are consistent across the codebase. No orphan keys, no typos, no divergent naming.

---

## Critical findings

### C1 — Income calculation duplicated in three places

The "working income from skills" formula appears independently in three locations:

**`src/application/selectors/roster.ts:9–12`** (selector):
```ts
const WORKING_INCOME_SKILLS = ['administration', 'medicine', 'engineering',
  'negotiation', 'security', 'crafting', 'academics']
income = Math.max(3, Math.min(15, Math.floor(bestSkill / 7)))
```

**`src/ui/screens/NpcDetailPanel.tsx:239–243`** (UI component — known audit finding C1):
```ts
const income = Math.max(3, Math.min(15, Math.floor(
  Math.max(...['administration', 'medicine', 'engineering', ...]
    .map((s) => detail.skills[s] ?? 0)) / 7
)))
```

**`src/application/commands/applyTitleEffects.ts:349–350`** (end-of-day command):
```ts
const bestSkill = Math.max(...nonCombatSkills.map((s) => skills[s] ?? 0))
const baseIncome = Math.max(3, Math.min(15, Math.floor(bestSkill / 7)))
```

All three are currently identical in formula and skill list. But they share no code — a future change to one will not propagate to the others. The UI version is a known clean-architecture violation (business logic in a component).

**Fix:** Export `WORKING_INCOME_SKILLS` and a `calculateWorkingIncome(skills)` function from the selector. Import them in NpcDetailPanel and applyTitleEffects.

---

## Medium findings

### M1 — Empathy threshold is inconsistent (55 vs. 60)

Empathy triggers different mechanics at two different thresholds with no documented rationale:

| Threshold | Mechanic | File |
|-----------|----------|------|
| > 60 | Player's empathy reduces unpaid wage loyalty decay (−15 → −13) | `applyWages.ts:68` |
| > 60 | NPC is "diplomatic" — agency triggers contacts/bonding actions | `applyNpcAgency.ts:32` |
| > 60 | Bonding in captivity discovery | `captivityPregnancyDiscovery.ts:19, 42` |
| > 60 | Gift empathy bonus (+2 affinity, +3 trust, +1 loyalty) | `giftItem.ts:94` |
| > 60 | Compatibility: high empathy resonance (+12 score) | `compatibility.ts:21` |
| > 55 | Qualifies for bond service | `bondService.ts:46, 122, 136` |
| > 55 | Compatibility: empathy mismatch friction (−3 score) | `compatibility.ts:23` |

The split implies a two-tier model (55 = "empathetic", 60 = "highly empathetic") but this is never stated. If a designer moves bond service to 60, some mechanics stay at 55.

**Fix:** Document the tier system explicitly. Create named constants: `EMPATHY_THRESHOLD_HIGH = 60`, `EMPATHY_THRESHOLD_MODERATE = 55`.

---

### M2 — Trait drift covers only 5 of 10 traits

`applyNpcTraitDrift.ts:5–11` drifts these traits toward nearby NPCs over time:
`empathy`, `discipline`, `ruthlessness`, `curiosity`, `loyalty`

The other 5 traits are **never modified during play:**
`ambition`, `dominance`, `prudence`, `vanity`, `zeal`

These are fixed at creation and never change. This may be intentional (personality core vs. relational surface), but it is not documented anywhere. A designer extending the drift system to include `vanity` would have no signal about which traits are meant to drift.

**Fix:** Add a comment in `applyNpcTraitDrift.ts` listing why these 5 were chosen and whether the others are intentionally stable.

---

### M3 — Trait thresholds are hardcoded across 10+ files

No central constants file exists for trait thresholds. The same values appear repeatedly:

| Value | Mechanic contexts |
|-------|-------------------|
| 65 | Dominance rivalry, discipline respect, ambition rivalry, trait display (> 65 = high) |
| 60 | Empathy bonding, agency diplomatism, gift interactions, compatibility resonance |
| 55 | Empathy bond service, curiosity late-conversation, dominance initiative |
| 50 | Ambition grant condition, greed condition |
| 40 | Prudence recklessness, scholar NPC skill minimum |
| 35 | Trait display (< 35 = notably low), working NPC minimum |

When a designer wants to tune "what counts as high empathy," they must find and update every reference manually.

**Fix:** Create `src/domain/npc/traitThresholds.ts` exporting named constants. Import in all command and selector files.

---

### M4 — Skill growth outside training titles is absent

Skills only increase via:
1. Title assignment with a training tag — `applyTitleEffects.ts:285–333`
2. Initial value at NPC creation (trait inheritance or authored definition)

There is no skill growth from:
- Combat experience (melee/ranged not boosted by deployments)
- Repeated use of any skill (intrigue from investigations, negotiation from contracts)
- Time in role (a retainer with no training title never improves)

This may be intentional — training is a deliberate resource cost. But it means NPCs hired at low skill are permanently weak without player investment, which limits long-term attachment to early hires.

**Note:** Document this as a design decision rather than a bug, and ensure the UI communicates that a title is required for growth.

---

## Low findings

### L1 — Rarity skill cap is the effective ceiling, not 100

`applyTitleEffects.ts:287` caps skill growth at `RARITY_SKILL_CAPS[rarity]`:
- Common: 70, Uncommon: 80, Rare: 90, Elite: 95, Legendary: 100 (please remove this)

The Zod schema allows 0–100, but a common NPC can never exceed 70 through training. If any other command sets a common NPC's skill to 85 (e.g., via an event outcome), the schema accepts it — but training will never raise it further, creating a silent oddity.

**Fix:** Remove the rarity cap system..

---

### L2 — Working income skill list excludes performance and intrigue

The income formula uses 7 skills (`administration`, `medicine`, `engineering`, `negotiation`, `security`, `crafting`, `academics`). `performance` and `intrigue` are excluded. An NPC with intrigue 90 and all others at 10 earns minimum income (3 Marks/day), despite high skill.

If performance or intrigue become income-generating titles (fence title already uses intrigue for a separate income), the formula is inconsistent.

**Fix:** Either include them in the income formula, or document explicitly that performance/intrigue generate income through title effects only, not passive working income.

---

### L3 — Gift item skill detection uses low thresholds that may over-trigger

`giftItem.ts:18–26` classifies an NPC as "scholar" if any of `academics`, `administration`, `intrigue` is ≥ 40. Threshold 40 is very low — a common NPC with base stats will often qualify. The multiplier bonus (1.15–1.2×) applies broadly, weakening the targetting intent.

**Fix:** Raise scholar/working thresholds to 55 or 60 to reflect actual specialization.

---

## Trait and skill coverage summary

| Area | Status |
|------|--------|
| Canonical key names | ✓ All 10 traits, 12 skills consistent across codebase |
| No orphan/typo keys | ✓ Clean |
| Bounds enforcement at write | ⚠ Mostly — drift and wages use clamp, training uses rarity cap, schema doesn't validate max |
| Income formula unified | ✗ Three independent implementations |
| Trait thresholds centralized | ✗ Hardcoded in 10+ files |
| Empathy tier system | ⚠ Two thresholds (55/60) undocumented |
| Trait drift coverage | ⚠ Only 5 of 10 traits drift — rationale not documented |
| Skill growth paths | ⚠ Training title only — intentional but undocumented |
| UI vs. selector alignment | ✗ NpcDetailPanel computes income inline (clean-arch violation) |

---

## Recommended fix order

1. **High — Extract `calculateWorkingIncome` and `WORKING_INCOME_SKILLS`** to a shared module. Eliminates the three-implementation split and the UI business-logic violation.
2. **Medium — Create `traitThresholds.ts`** with named constants. Designers tune thresholds in one place.
3. **Medium — Document empathy tier system** (55 vs. 60) in a comment or the thresholds file.
4. **Medium — Document trait drift scope** — which 5 traits drift and why; what the other 5's stability means.
5. **Low — Revisit gift skill thresholds** (40 is too low for "specialist" classification).
6. **Low — Remove rarity cap** interaction with schema max.
