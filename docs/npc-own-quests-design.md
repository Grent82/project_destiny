# NPC Own-Quests Design Document

**Status:** Design proposal (destiny-pb74)
**Date:** 2026-06-09

---

## Problem Statement

NPCs in the game have arcs and agency actions, but no formal "quests" the player can observe. A world where Marion is visibly working on something, where Verek has a contract he's pursuing, is fundamentally more engaging. Currently NPCs are reactive tools — they wait for player assignment. This design makes them proactive agents.

---

## Goals

1. **Visible NPC agency** - Player can see what each roster NPC is working on when not assigned
2. **World simulation depth** - NPCs pursue goals independently, creating emergent story
3. **Player engagement hooks** - NPC quests can create opportunities or conflicts for the player
4. **Minimal implementation overhead** - Reuse existing quest infrastructure where possible

---

## Design Principles

### 1. NPC Quests are Simpler than Player Quests

NPCs do not need the full complexity of player quest systems (clues, branches, mid-quest beats). Their quests are:
- Single-objective tasks (go somewhere, fight someone, deliver something, wait)
- Time-bounded (complete in X days or fail)
- Resource-light (no journal entries, no clue system)

### 2. Visibility is Optional, Not Mandatory

Player can choose to track NPC quests via:
- **Passive observation** - Activity log entries ("Marion met with a contact in the Warrens")
- **Active tracking** - NPC detail panel shows current assignment
- **Consequence visibility** - NPC returns with rewards/failures that affect the house

### 3. Conflict Resolution Favors Player

When NPC quests overlap with player quests:
- Player always gets priority access to targets/resources
- NPC quests can fail or be delayed by player actions
- NPC can "report" failed quest as story opportunity

---

## NPC Quest Format

### Data Structure

```json
{
  "id": "npc-quest-<npc-id>-<sequence>",
  "npcId": "npc-marion-vale",
  "questType": "scout" | "contact" | "retrieve" | "protect" | "investigate",
  "targetDistrictId": "district-the-warrens",
  "targetNpcId": null,
  "targetItemId": null,
  "durationDays": 2,
  "difficulty": "low" | "medium" | "high",
  "successChance": 0.6,
  "rewardMarks": 0,
  "rewardStandingFactionId": "faction-civic-compact",
  "rewardStandingDelta": 5,
  "onSuccessText": "Marion returned with information on the Ring's movements.",
  "onFailText": "Marion's meeting in the Warrens went badly. She lost the contact.",
  "status": "active" | "completed" | "failed" | "interrupted",
  "startedOnDay": 12,
  "resolvesOnDay": 14
}
```

### Quest Types

| Type | Description | Player Value |
|------|-------------|--------------|
| **scout** | NPC reconnoiters a district, reports tension level | Unlocks district intel |
| **contact** | NPC meets a faction contact, gains standing | Passive standing gains |
| **retrieve** | NPC acquires an item (low value, flavor) | Small economy injection |
| **protect** | NPC guards a house interest for X days | Prevents random losses |
| **investigate** | NPC follows a lead, may produce quest trigger | Generates player quest leads |

---

## Player Visibility Options

### 1. Activity Log Entries (Default)

Every NPC quest generates log entries:
- **Start:** `Marion left for the Warrens on a contact run.`
- **Resolution:** `Marion returned from the Warrens. She brought news of a Ring shipment arriving at the harbor.`

### 2. NPC Detail Panel (Optional Tracking)

When viewing an NPC's profile:
- Shows current quest (if any)
- Shows progress bar for duration
- Shows "Recall" button to abort quest early

### 3. House Ledger Impact (Economic)

Successful NPC quests can:
- Add small marks to house income
- Reduce random expense events
- Unlock one-time purchase opportunities

---

## Conflict Resolution

### Player Quest Priority

If player accepts a quest that conflicts with an NPC's active quest:
- NPC quest is **interrupted** (not failed)
- NPC can be reassigned to player quest
- On completion, NPC quest can resume (with penalty to success chance)

### Resource Contention

If NPC and player quest target the same district/faction:
- Player resolves first
- NPC success chance reduced by 20%
- NPC can "report" player's success as intel gain

### NPC vs NPC Conflicts

Two NPCs on conflicting quests:
- First-come-first-served for district access
- Second NPC's quest fails automatically
- Player can be notified of the conflict as story beat

---

## Authored Example NPC Quests

### Example 1: Marion's Contact Network

```json
{
  "id": "npc-quest-marion-contact-1",
  "npcId": "npc-marion-vale",
  "questType": "contact",
  "targetDistrictId": "district-the-pale",
  "durationDays": 1,
  "difficulty": "low",
  "successChance": 0.8,
  "rewardStandingFactionId": "faction-gilded-court",
  "rewardStandingDelta": 3,
  "onSuccessText": "Marion's contact in the Pale confirmed the Court is watching the house. No immediate threat, but eyes are on us.",
  "onFailText": "Marion's meeting in the Pale went cold. Her contact has gone quiet — someone spooked them."
}
```

**Player Impact:** Passive standing gain with Gilded Court. Early warning system for Court hostility.

---

### Example 2: Verek's Scout Run

```json
{
  "id": "npc-quest-verek-scout-1",
  "npcId": "npc-verek-sorn",
  "questType": "scout",
  "targetDistrictId": "district-the-warrens",
  "durationDays": 2,
  "difficulty": "medium",
  "successChance": 0.6,
  "rewardMarks": 0,
  "onSuccessText": "Verek returned from the Warrens with intel: a Tallow Ring operation is moving through the district. They're setting up a new collection point.",
  "onFailText": "Verek's scout run in the Warrens went south. He had to slip out before being spotted — couldn't get the intel."
}
```

**Player Impact:** Unlocks a new quest lead (Ring collection point). May trigger a combat quest for the player.

---

### Example 3: New Recruit Protection Duty

```json
{
  "id": "npc-quest-newrecruit-protect-1",
  "npcId": "npc-newly-recruited",
  "questType": "protect",
  "targetDistrictId": "district-the-pale",
  "durationDays": 3,
  "difficulty": "low",
  "successChance": 0.7,
  "rewardMarks": 50,
  "onSuccessText": "The recruit completed their protection detail. The house avoided a small extortion attempt — 50 Marks saved.",
  "onFailText": "The recruit's protection detail failed. A local gang collected their 'tax' from the house anyway."
}
```

**Player Impact:** Small economy effect. Shows new recruit proving their worth (or failing to).

---

## Implementation Phases

### Phase 1: Core System (This Bead)

- NPC quest data structure in `GameState`
- Simple resolution command (`resolveNpcQuests`) called from `endDay`
- Activity log integration for visibility
- 2-3 authored quest templates per roster NPC

### Phase 2: Player Interaction

- NPC detail panel shows current quest
- "Recall" button to abort quest
- Manual assignment UI (choose from 3 quest types)

### Phase 3: Advanced Features

- NPC quest conflicts generate story events
- NPC can recruit other NPCs for joint quests
- NPC quest success unlocks house upgrades

---

## Open Questions

1. **Should NPC quests cost marks to start?** (supplies, bribes, transportation)
2. **Should failed NPC quests have negative consequences?** (injury, debt, faction hostility)
3. **Can player interrupt NPC quests mid-duration?** (emergency recall)

**Recommendation:** Start with Phase 1 only. Add complexity only if player engagement data supports it.

---

## Acceptance Criteria

- [ ] Design document exists with quest format, visibility, and conflict rules
- [ ] 2-3 authored example NPC quests documented
- [ ] Implementation plan (Phase 1/2/3) is clear
- [ ] Open questions recorded for future decisions

---

## Related Work

- `destiny-ioyb` — Living World epic (parent)
- `destiny-hx4e` — NPC ward lifecycle (dependency for NPC state)
- `destiny-2c2q` — Quest reference integrity (shared quest infrastructure)
