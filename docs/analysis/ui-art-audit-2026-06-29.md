# UI and Art Asset Audit — 2026-06-29

## Executive Summary

Two systematic gaps found in visual asset implementation:

1. **Portraits**: Only 4 of all NPCs have portraits. Hardcoded list blocks dynamic portrait display.
2. **District Backgrounds**: Only 5 of 11 districts have images. Image names do not match district IDs.

Both problems share the same root cause: **hardcoded allowlists instead of dynamic asset loading**.

---

## Portrait System

### Current State

**File**: `src/ui/components/portraitUtils.ts` lines 57-67

```typescript
export function hasPortraitAvailable(npcId: string): boolean {
  const portraitId = npcId.replace('npc-', '')
  const knownPortraits = [
    'ida-rhys',
    'marion-vale',
    'player',
    'verek-sorn',
  ]
  return knownPortraits.includes(portraitId)
}
```

**Files exist**: `public/portraits/` contains only 4 files:
- `ida-rhys.jpg`
- `marion-vale.jpg`
- `player.jpg`
- `verek-sorn.jpg`

### Problem

1. **Hardcoded allowlist** — Only these 4 NPCs show portraits. All others fall back to generic SVG silhouette.
2. **No generation pipeline** — No script exists to generate portraits for new NPCs.
3. **No dynamic detection** — Adding a new portrait file does nothing unless the code is changed.
4. **UI has hardcoded NPC checks** — `npcId === 'npc-marion-vale'` scattered in DialogueScreen, NpcDetailPanel.

### Impact

- 90%+ of NPCs appear as generic placeholders
- New NPCs require code changes to show portraits
- Player experience is inconsistent (some NPCs feel "special", others feel like placeholders)

### Fix Required

**Beads**: `destiny-6ehk`, `destiny-qtnt`, `destiny-zxzz`

1. Remove hardcoded `knownPortraits` list
2. Check for file existence dynamically (manifest or runtime check)
3. Create portrait generation script using Pollinations.ai API
4. Replace hardcoded `npc-marion-vale` checks with domain flags (`isPrimary`, `hasHouseSeal`)

---

## District Background Images

### Current State

**Districts defined** (11 in `data/definitions/districts.json`):
- `district-harbor`
- `district-gilded-heights`
- `district-ironworks`
- `district-the-pale`
- `district-the-warrens`
- `district-the-hollows`
- `district-ash-quay`
- `district-the-mireward`
- `district-cinder-row`
- `district-the-northbank`
- `district-the-below`

**Images exist** (`public/districts/` — only 5 files):
- `the-pale.jpg` ✓ matches `district-the-pale`
- `ashfields.jpg` ✗ no `district-ashfields` (only `district-ash-quay`)
- `iron-docks.jpg` ✗ no `district-iron-docks` (only `district-ironworks`)
- `the-city.jpg` ✗ no matching district
- `the-tangle.jpg` ✗ no matching district

### Problem

1. **Only 5 of 11 districts have images** — 6 districts missing backgrounds.
2. **Naming mismatch** — Image names do not correspond to district IDs.
3. **No mapping defined** — No explicit mapping between district ID and image filename.
4. **No generation pipeline** — No script to create missing district images.

### Impact

- District Map shows inconsistent visuals
- Some districts have backgrounds, others do not
- Player cannot distinguish districts visually

### Fix Required

**Bead**: `destiny-k9xa`

1. Decide naming convention (rename images OR add `imageUrl` field to district definitions)
2. Generate missing district images via Pollinations.ai
3. Use dynamic path loading: `/districts/{district-id}.jpg`
4. Add fallback for districts without specific image

---

## Other UI Issues Found

These are UX problems, not art asset problems. They are listed here for completeness.

### DialogueScreen — Confusing "Conversation shift" Panels

**Bead**: `destiny-ajbx`

- Shows "Conversation shift" with jargon like "push", "topic shifts"
- Player-facing feedback should not expose internal dialogue mechanics
- Effect notes contain game-mechanic text, not player-friendly language

**Fix**: Remove or redesign beat panels. Show consequences only at end, not during conversation.

### RecruitmentScreen — Redundant "Quality Bands" Explanation

**Bead**: `destiny-1l46`

- Full explanation panel for rarity labels (common/uncommon/rare/elite/legendary)
- Redundant — labels are self-explanatory
- Skill caps already shown inline on recruit cards
- Wastes screen real estate

**Fix**: Remove entire "Quality Bands" article panel. Keep rarity badges on individual cards.

### RecruitmentScreen — Inconsistent "Back" Navigation

**Bead**: `destiny-yxfo`

- Button goes to POI if accessed from district, else goes to Roster
- Player does not know where they will end up
- Inconsistent flow

**Fix**: Always go to Roster, or use two separate buttons.

### District Map — "Travel" vs "View POIs" Confusion

**Bead**: `destiny-7ckp`

- Clicking district on CityMap just selects it (shows info)
- "Walk the district" button goes to POI view, NOT travel
- Actual travel mechanism is unclear

**Fix**: Clarify labels or make clicking trigger travel directly.

---

## Root Cause Analysis

Both portrait and district image problems share the same architectural flaw:

**Hardcoded allowlists instead of dynamic asset loading.**

```typescript
// WRONG — hardcoded list
const knownPortraits = ['ida-rhys', 'marion-vale', 'player', 'verek-sorn']
return knownPortraits.includes(portraitId)

// RIGHT — dynamic check
return portraitExists(portraitId) // checks file system or manifest
```

This pattern should not exist in the codebase. Assets should be:
1. Discovered dynamically (file system, manifest, or API)
2. Loaded with consistent naming ({entity-id}.jpg)
3. Fallback gracefully when missing

---

## Implementation Priority

1. **destiny-6ehk** — Fix portrait availability check (remove hardcoded list)
2. **destiny-k9xa** — Fix district image mapping (rename or map images)
3. **destiny-qtnt** — Generate portraits for all NPCs
4. **destiny-zxzz** — Replace hardcoded NPC checks with domain flags
5. **destiny-ajbx** — Simplify DialogueScreen beat panels
6. **destiny-1l46** — Remove Quality Bands explanation

---

## Related Documentation

- `docs/art-direction.md` — Visual style and asset direction
- `docs/roles/ui-ux.md` — UI/UX role responsibilities
- `docs/workflows/game-ui.md` — UI workflow guidance
