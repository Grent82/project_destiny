# NPC Economy (epic destiny-bkln) — design history and findings

## Summary

Epic `destiny-bkln` ("NPC Economy — Von Geld-Sink zu aktiver Wirtschaft") asked for 8 tickets
giving NPCs a real economy: item inventories, combat loot, crafting, equipment repair,
gift-giving, NPC-to-NPC trade, and consumable use. All 8 were authored 2026-06-29. A separate
epic, `destiny-su15` ("Canonical Inventory, Ownership, and Persistent Shop Stock"), was authored
and closed 2026-07-02 → 07-04 — after these tickets were written. Before implementing anything, a
deep read of the actual codebase found that su15 already delivered part of what bkln asked for,
and surfaced a duplicate-ticket pair plus two real bugs.

## Ticket resolution

- **destiny-eqyn** ("NPC-Item-Inventare hinzufügen") — **closed as superseded by destiny-su15**.
  Its premise ("NPCs haben nur personalFunds, kein Item-Inventar") was already false:
  `GameState.inventoryState.npcInventories: Record<npcId, InventoryContainer[]>` (defined in
  `src/domain/inventory/contracts.ts`) already existed, fully wired through the canonical
  `transferItem` core, and already read/written by `npcSurvivalActions.ts`,
  `economy/npcEquipItem.ts`, `giftItem.ts`. Implementing it as written would have built a second,
  competing inventory system.
- **destiny-owyh** ("NPC Repair-System implementieren") — **superseded by destiny-6m5j**.
  owyh and 6m5j described the same feature with conflicting acceptance criteria (owyh: funds-only,
  skill-based success chance; 6m5j: durability threshold, materials-or-funds). owyh predates 6m5j
  by minutes on the same day and lacks the "NPC Economy:" title prefix all its true siblings share
  — almost certainly an earlier draft superseded when the epic was built out systematically. The
  merged implementation under 6m5j satisfies both sets of acceptance criteria.
- **destiny-6m5j, 7law, 9iox, cq28, cyrd, g1un** — implemented as new commands under
  `src/application/commands/economy/`, each wired as a new roster-only intention type through the
  existing 4-gate pipeline (`npcIntentionTypeSchema` enum → `WIRED_INTENTION_TYPES` →
  `intentionTypesForNpc` → `intentionHandlers` registry, plus 4 auxiliary per-type Records:
  `baseUrgency` and `traitScores` in `intentions.ts`/`intentions/pipeline.ts`, `mlWeights.ts`,
  `intentionTimeSlots.ts` — all four are `Record<NpcIntentionType, ...>`, so the compiler forces
  every new enum value to have an entry in each).

## Bugs found and fixed along the way

1. **`giftItem.ts:177-184`** mutated `next.activityLog` directly (`.unshift`/`.pop()`) instead of
   using `appendActivityLogEntry`, violating the project's immutable-command rule. Fixed while
   building the NPC-to-NPC gift command (destiny-g1un) that reuses this file's patterns, so the
   bug wasn't propagated into new code. One existing test asserted the old bug's custom activity
   log id format (`gift::npcId::itemId::...`) — updated to assert the real, meaningful content
   (message + category) instead.
2. **`npcSurvivalActions.ts`'s old local `statModValue`** only recognized the `'stat_mod'`
   `ItemEffect` variant. Real catalog items use `'reduceStat'` (e.g. `item-ration-compact-brick`)
   or `'heal'` (e.g. `item-medkit-field`) — types it never matched, so NPCs "eating" real items
   always fell back to a hardcoded default magnitude instead of the item's actual defined value.
   In every currently-shipped item this coincidentally matched the fallback exactly (e.g. the
   ration's real `-30` equals the old fallback's `30`), so the bug was latent, not visibly wrong —
   but it was a real correctness gap that would silently misbehave for any future item with a
   different real value. Fixed as `resolveItemStatEffect` in the new shared
   `npcInventoryHelpers.ts` module.

## New shared infrastructure

`src/application/commands/npcInventoryHelpers.ts` — extracted from `npcSurvivalActions.ts` and
extended, used by 5 of the 6 new commands:
- `findNpcInventoryItemByTag` / `findNpcInventoryItemByCategory` / `countNpcInventoryItem`
- `consumeNpcInventoryItem` / `consumeNpcInventoryItemById`
- `resolveItemStatEffect` / `resolveItemHealEffect` (the fixed effect resolution)
- `grantNewItemToNpc` — creates a fresh `ItemInstance` + `itemRegistry` entry and adds it to an
  NPC's own inventory (used by combat loot and crafting output — the two mechanics that create
  items from nothing rather than moving existing ones). Mirrors the private
  `addToNpcInventory`/`updateItemRegistryLocation` logic already inside `transferItem.ts` (not
  exported from there, so this is a sibling, not a duplicate).

## Design decisions worth remembering

- **Repair targets `npc.loadout` + `equippedItemDurabilities[npcId]`**, not the newer
  instance-based `npc.equipment` field. `NpcRuntimeState` currently carries both models
  side-by-side (`loadout`: item-definition-id based, used by the existing player-paid repair in
  `houseReducers.ts`/`durability.ts`; `equipment`: item-instance-id based, used by the canonical
  su15 equip/transfer flow). Repair intentionally matches the existing repair mechanic's model to
  avoid a third parallel NPC-equipment system. The `loadout`/`equipment` split itself is
  pre-existing, out-of-scope technical debt — worth a dedicated follow-up bead if it ever needs
  unifying.
- **All 5 new intention types are roster-only** (`playerRosterMember` checked in each handler's
  `canExecute`, and the types are absent from `WORLD_ELIGIBLE_INTENTION_TYPES` in
  `intentions/eligibility.ts`) — matching the existing precedent set by `seek-employment`/
  `seek-tips`/etc.: this is a roster-`personalFunds` economy, not a world-NPC one.
- **Crafting recipes are deliberately minimal** (`data/definitions/recipes.json`, 2 recipes) —
  proves the mechanic using existing material-category items and existing tool-item outputs,
  rather than building a recipe content library. Expanding recipe variety is a natural, separate
  follow-up if desired.
- **NPC combat loot is a passive, unconditional combat-resolution side effect** (not
  intention-gated), matching the shape of the existing money-loot branch in `combat.ts` — an NPC
  doesn't "decide" to loot mid-fight.
