# Cross-System Research Index

Deep analysis of the current state of Project Destiny across multiple lenses.
Each file covers one perspective. They build on each other — read in order if possible.

| # | File | Status | What it covers |
|---|------|--------|----------------|
| 01 | [clean-architecture-audit.md](./01-clean-architecture-audit.md) | ✓ Done | Dependency violations, business logic in UI, pure function breaks, file size |
| 02 | [cross-system-npc-consistency.md](./02-cross-system-npc-consistency.md) | ✓ Done | NPC data model across roster, combat, wards, bonds, dialogue, world simulation |
| 03 | [cross-system-economics.md](./03-cross-system-economics.md) | ✓ Done | Money: wages, debt, repairs, shop pricing, bond contracts, quest rewards |
| 04 | [cross-system-traits-and-skills.md](./04-cross-system-traits-and-skills.md) | ✓ Done | How traits and skills feed into every mechanic — consistency and gaps |
| 05 | [cross-system-events-and-quests.md](./05-cross-system-events-and-quests.md) | ✓ Done | Event/quest authoring patterns, trigger coverage, resolution gaps |
| 06 | [cross-system-housing.md](./06-cross-system-housing.md) | ✓ Done | House as game hub: rooms, wards, policy, heirs, economics |
| 07 | [cross-system-fiction-consistency.md](./07-cross-system-fiction-consistency.md) | ✓ Done | Narrative tone, lore coherence, authoring standards |
| 08 | [cross-system-ui-ux.md](./08-cross-system-ui-ux.md) | ✓ Done | Screen patterns, information hierarchy, feedback loops |

## How to use these

Each document follows the same structure:
1. **What this looks at** — the specific lens and scope
2. **Findings** — ranked Critical / Medium / Low
3. **Recommended fix order** — highest payoff first

The findings do not fix code. They inform beads (tasks) that can be created from them.
