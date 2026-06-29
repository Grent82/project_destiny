# UI/UX Forensic Audit — The Broken Promise

**Date:** 2026-06-29  
**Status:** CRITICAL — Systemic failures found  
**Verdict:** The game ships with 92% of NPCs faceless, 91% of districts without backgrounds, and UI that shows internal game mechanics to players.

---

## Executive Summary: The Lie We're Telling Players

Project Destiny claims to be a **character-driven RPG** where "you manage people, not stat arrays." The reality:

| Metric | Claim | Reality |
|--------|-------|---------|
| **NPC Portraits** | "Every NPC is a person" | 4 of 49 NPCs have portraits (8%) |
| **District Identity** | "Each district has soul" | 1 of 11 districts has matching background (9%) |
| **Dialogue Feedback** | "Meaningful choices" | Shows "push", "ask", "commit" — internal jargon |
| **Event Portraits** | "NPCs are visible" | Loads 404 for every NPC without portrait |

This is not "polish debt." This is **architectural negligence**.

---

## Finding 1: The Portrait Lie — 92% of NPCs Are Faceless

### The Code That Breaks Everything

**File:** `src/ui/components/portraitUtils.ts` lines 57-67

```typescript
export function hasPortraitAvailable(npcId: string): boolean {
  const portraitId = npcId.replace('npc-', '')
  const knownPortraits = [
    'ida-rhys',
    'marion-vale',
    'player',
    'verek-sorn',
  ]
  return knownPortraits.includes(portraitId)  // HARDCODED ALLOWLIST
}
```

**This function is the gatekeeper.** Every time the UI tries to show a portrait, it checks this hardcoded list of 4 names. If your NPC is not on this list, you get a generic SVG silhouette.

### The Numbers

- **49 NPCs defined** in `data/definitions/npcs.json`
- **4 portraits exist** in `public/portraits/`
- **8% coverage** — 45 NPCs are faceless placeholders

### Where This Breaks

**1. DialogueScreen** — Every conversation with any NPC except Marion, Ida, or Verek shows a generic fallback.

**2. NpcDetailPanel** — The entire roster screen shows silhouettes for 92% of your operatives.

**3. MissionPrepScreen** — Enemy NPCs (15+ defined) never show portraits.

**4. EventModal** — **WORST OFFENDER:** The code loads the portrait path unconditionally:

```typescript
// src/application/selectors/events.ts line ~100
actorPortraitSrc: sourceNpcId ? `/portraits/${sourceNpcId.replace('npc-', '')}.jpg` : null
```

```tsx
// src/ui/components/EventModal.tsx lines 75-80
{presentation.actorPortraitSrc && (
  <img src={presentation.actorPortraitSrc} alt="..." />
)}
```

**Result:** Every event involving an NPC without a portrait triggers a **404 error** in the browser console. The game is literally broken.

### The Root Cause

This is not an "asset pipeline" problem. This is a **code architecture** problem. The function `hasPortraitAvailable()` should not exist. The code should:

1. Try to load `/portraits/{npc-id}.jpg`
2. If it fails (onError), show fallback
3. Never hardcode an allowlist

**Instead:** The code maintains a hardcoded list that must be manually updated for every new NPC. This is anti-pattern #1.

### The Marion Exceptionalism Problem

**File:** `src/ui/screens/DialogueScreen.tsx` line 150  
**File:** `src/ui/screens/NpcDetailPanel.tsx` lines 739, 742

```tsx
isPrimary={presentation.npcId === 'npc-marion-vale'}
```

```tsx
{detail.npcId === 'npc-marion-vale' && <span className="muster-portrait-seal" />}
```

**Marion gets special treatment hardcoded into the UI.** No domain flag, no `isPrimary` field in the NPC definition — just string comparison scattered across the codebase.

What happens when you add a second starting NPC? You have to:
1. Find every `npc-marion-vale` check
2. Add `|| npcId === 'npc-new-character'`
3. Hope you didn't miss one

This is **technical debt that compounds**.

---

## Finding 2: The District Background Lie — 91% Missing or Mismatched

### The Reality

**11 districts defined** in `data/definitions/districts.json`:
- district-harbor, district-gilded-heights, district-ironworks, district-the-pale, district-the-warrens, district-the-hollows, district-ash-quay, district-the-mireward, district-cinder-row, district-the-northbank, district-the-below

**5 images exist** in `public/districts/`:
- `the-pale.jpg` — matches `district-the-pale` ✅
- `ashfields.jpg` — no district named "ashfields" ❌
- `iron-docks.jpg` — no district named "iron-docks" ❌
- `the-city.jpg` — no matching district ❌
- `the-tangle.jpg` — no matching district ❌

**Coverage:** 1 of 11 districts (9%) has a matching image.

### The Naming Mismatch

| District ID | Expected Image | Actual Image | Match? |
|-------------|----------------|--------------|--------|
| district-ash-quay | `ash-quay.jpg` | `ashfields.jpg` | ❌ |
| district-ironworks | `ironworks.jpg` | `iron-docks.jpg` | ❌ |
| district-harbor | `harbor.jpg` | (none) | ❌ |
| district-gilded-heights | `gilded-heights.jpg` | (none) | ❌ |
| district-the-warrens | `the-warrens.jpg` | (none) | ❌ |
| district-the-hollows | `the-hollows.jpg` | (none) | ❌ |
| district-the-mireward | `the-mireward.jpg` | (none) | ❌ |
| district-cinder-row | `cinder-row.jpg` | (none) | ❌ |
| district-the-northbank | `the-northbank.jpg` | (none) | ❌ |
| district-the-below | `the-below.jpg` | (none) | ❌ |

### The Root Cause

No naming convention exists. No script generates images. No mapping between district ID and image filename is defined. The 5 existing images appear to be **concept art that was never integrated** into the actual district system.

---

## Finding 3: The Dialogue Jargon Leak — "push", "ask", "commit"

### What Players See

On every dialogue choice button, the UI displays:

```
[push] "I'm not doing this today."
[ask]  "What do you know about the ledgers?"
[commit] "I'll take care of it."
```

These badges come from `classifyDialogueChoiceKind()` in `src/application/selectors/dialogue.ts`:

```typescript
function classifyDialogueChoiceKind(choice: DialogueChoice): DialogueChoiceKind {
  const normalized = stripQuotedLabel(choice.label).trim().toLowerCase()
  
  if (normalized.includes('?') || normalized.startsWith('what ') ...) {
    return 'ask'
  }
  if (normalized.startsWith('i ') ...) {
    return 'commit'
  }
  return 'push'  // Everything else is 'push'
}
```

### Why This Is Broken

**"push", "ask", "commit" are internal game mechanics.** They describe how the dialogue system classifies player intent for **system processing**. They are not player-facing language.

A player should never see:
- "This choice is a 'push' type"
- "You selected 'commit'"

They should see:
- The actual consequence: "This will escalate tension"
- The actual outcome: "Marion will remember this"

### The "Conversation Shift" Panel

**File:** `src/ui/screens/DialogueScreen.tsx` lines 20-37

```tsx
function DialogueBeatPanel(props: { beat: DialogueBeat; title: string }) {
  return (
    <aside className="dialogue-shift-panel">
      <p className="dialogue-shift-eyebrow">{title}</p>  // "Conversation shift"
      <p className="dialogue-shift-choice">{beat.choiceLabel}</p>
      <ul className="dialogue-shift-list">
        {beat.effectNotes.map((note) => (
          <li key={note}>{note}</li>  // "The topic shifts under the pressure..."
        ))}
      </ul>
      <span className="dialogue-choice-kind-badge">{beat.kind}</span>  // "push"
    </aside>
  )
}
```

**What the player sees:**
```
┌─────────────────────────────────┐
│ Conversation shift              │
│ "I'm not doing this today."     │
│ • The topic shifts under the    │
│   pressure of your answer.      │
│ [push]                          │
└─────────────────────────────────┘
```

**This is meaningless.** It tells the player nothing. It's game-mechanic feedback dressed up as narrative.

The text "The topic shifts under the pressure of your answer" comes from line 86 and 116 of `dialogue.ts`:

```typescript
return ['The topic shifts under the pressure of your answer.']
```

This is the **default fallback** when no specific outcome is defined. It's the system saying "I don't have anything better to show you."

---

## Finding 4: The RecruitmentScreen — Redundant Explanations + Broken Navigation

### The "Quality Bands" Panel

**File:** `src/ui/screens/RecruitmentScreen.tsx` lines 90-110

```tsx
<article className="detail-panel">
  <h2>Quality Bands</h2>
  <p className="summary">
    Rare, uncommon, and similar labels are not flavour only. They tell you how high 
    an operative can be trained before their growth hardens into diminishing returns.
  </p>
  <div className="mission-list">
    {qualityBands.map((rarity) => (
      <div key={rarity}>
        <strong>{rarity}</strong>
        <span>Cap {RARITY_SKILL_CAPS[rarity]}</span>
        <p>{RARITY_DESCRIPTIONS[rarity]}</p>
      </div>
    ))}
  </div>
</article>
```

**This panel takes up ~30% of the screen** explaining what "common", "uncommon", "rare" mean. Players understand rarity labels. They've seen them in every RPG ever made. This is **patronizing** and wastes space that could show actual recruits.

### The Broken "Back" Button

**File:** `src/ui/screens/RecruitmentScreen.tsx` lines 66-77

```tsx
<button onClick={() =>
  venueContext 
    ? navigate(`/district/${venueContext.districtId}/poi/${venueContext.poiId}`)
    : navigate('/roster')
}>
  ← {venueContext ? `Back to ${venueContext.poiName}` : 'Back to Roster'}
</button>
```

**The button does two different things:**
- If you came from a district POI → goes to that POI
- If you came from anywhere else → goes to Roster

**The player cannot know which behavior will trigger.** This is inconsistent navigation that breaks mental models.

---

## Finding 5: The District Map — "Walk" vs "Travel" Confusion

**File:** `src/ui/screens/DistrictMapScreen.tsx`

The map has:
1. **CityMap** — clicking a district just SELECTS it, shows info in ledger panel
2. **"Walk the district" button** — goes to POI view of CURRENT district, NOT travel
3. **Travel mechanism** — hidden or unclear

**Player question:** "How do I go to Harbor Ward?"  
**Answer:** Click Harbor Ward on map... nothing happens. Click "Walk the district"... goes to POI view, not travel. Where's the travel button?

The navigation flow is **not discoverable**.

---

## The Architectural Pattern: Why This Happened

All these failures share the same root cause:

### Anti-Pattern #1: Hardcoded Allowlists

```typescript
// WRONG — must be updated for every new entity
const knownPortraits = ['ida-rhys', 'marion-vale', 'player', 'verek-sorn']
return knownPortraits.includes(portraitId)

// RIGHT — dynamic detection
return fileExists(`/portraits/${portraitId}.jpg`)
```

**Used in:** `hasPortraitAvailable()`, district image loading

### Anti-Pattern #2: UI Knows Domain Details

```typescript
// WRONG — UI hardcodes NPC IDs
isPrimary={npcId === 'npc-marion-vale'}

// RIGHT — UI reads domain flags
isPrimary={npcDef.isPrimary}
```

**Used in:** DialogueScreen, NpcDetailPanel

### Anti-Pattern #3: Internal Mechanics Leaked to Players

```typescript
// WRONG — show system classification to players
<span>{choice.kind}</span>  // "push", "ask", "commit"

// RIGHT — show player-facing consequences
<span>{choice.effectNotes[0]}</span>  // "Marion trusts you more"
```

**Used in:** DialogueScreen badges, Conversation shift panels

### Anti-Pattern #4: Broken Image Loading

```typescript
// WRONG — load image without checking existence
<img src={`/portraits/${npcId}.jpg`} />

// RIGHT — try load, fallback on error
<img 
  src={`/portraits/${npcId}.jpg`} 
  onError={(e) => { e.target.style.display = 'none'; showFallback() }}
/>
```

**Used in:** EventModal, DialogueScreen (partially)

---

## The Human Cost

### For Players

1. **92% of NPCs feel like placeholders** — no portrait, no identity
2. **91% of districts feel generic** — no background, no atmosphere
3. **Dialogue feedback is meaningless** — "topic shifts" tells you nothing
4. **404 errors in console** — the game is literally broken for events
5. **Navigation is unpredictable** — can't trust where "Back" goes

### For Developers

1. **Every new NPC requires code changes** — not just adding a file
2. **Every new district requires code changes** — not just adding an image
3. **Marion-specific logic is scattered** — hard to find, hard to extend
4. **Tests pass, browser breaks** — 404s don't show in unit tests

---

## The Fix (Not Optional)

### Immediate (P0)

1. **Remove `hasPortraitAvailable()`** — check file existence dynamically
2. **Fix EventModal 404s** — add `onError` fallback
3. **Remove "push/ask/commit" badges** — never show internal mechanics
4. **Remove "Conversation shift" panels** — or redesign with real feedback

### Short-term (P1)

1. **Add `isPrimary` and `hasHouseSeal` to NPC schema** — replace hardcoded checks
2. **Generate portraits for all NPCs** — use Pollinations.ai script
3. **Fix district image naming** — rename files OR add `imageUrl` field
4. **Generate missing district images** — all 11 districts need backgrounds

### Long-term (P2)

1. **Audit all hardcoded entity checks** — find every `npcId === 'npc-xxx'`
2. **Establish asset loading pattern** — no more allowlists
3. **Player-facing language policy** — no internal jargon in UI

---

## Conclusion: This Is Not "Polish"

This is not about "adding more portraits" or "making it prettier." This is about **basic architectural hygiene**.

The codebase has:
- **Hardcoded allowlists** where dynamic detection should be
- **UI logic** that should be in domain
- **Internal mechanics** exposed to players
- **Broken image loading** that triggers 404s

These are not "nice-to-haves." These are **foundational failures** that make the game feel incomplete, broken, and unpolished — regardless of how good the writing or systems are.

**Fix the architecture. The art will follow.**

---

## Related Beads — STEP-by-STEP Implementation Plan

### Active Implementation Chain

| ID | Priority | Fix | MCP Servers Required |
|----|----------|-----|---------------------|
| **destiny-4akk** | P0 | STEP 1: Remove hardcoded portrait allowlist | FileSystem, Git |
| **destiny-auq5** | P0 | STEP 2: Add onError fallback to portrait images | FileSystem, Puppeteer, Playwright, Git |
| **destiny-kp8n** | P1 | STEP 5: Remove push/ask/commit badges | FileSystem, Playwright, Git |
| **destiny-mba6** | P1 | STEP 6: Remove Conversation shift panels | FileSystem, Playwright, Git |
| **destiny-6c3c** | P2 | STEP 7: Remove Quality Bands explanation | FileSystem, Playwright, Git |

### Design/Decision Beads

| ID | Priority | Fix |
|----|----------|-----|
| destiny-a2dm | P1 | STEP 3: Fix district image naming convention |
| destiny-cvo7 | P1 | STEP 4: Generate portraits for all NPCs |

### Quality Gate

| ID | Priority | Role |
|----|----------|------|
| **destiny-ynxu** | P0 | Quality Gate — Verifies all STEP tickets before closure |

---

## MCP Server Usage

All STEP tickets specify which MCP servers to use. See `docs/mcp-usage-guidelines.md` for detailed protocols.

**Available MCP Servers:**
- **Playwright** — UI screenshots, visual regression testing
- **FileSystem** — Code search, batch file operations
- **Puppeteer** — Network error detection (404 portraits)
- **Git** — Diff review, pre-commit verification

**Workflow:**
1. FileSystem: Find all code locations
2. Make changes
3. Playwright: Screenshot before/after
4. Puppeteer: Check for network errors
5. Git: Review diff before commit
6. Quality Gate: Verify everything

---

## Related Documentation

### UI/UX Design Principles (NEU!)

- [`ui-ux-design-principles.md`](../ui-ux-design-principles.md) — **WICHTIGSTE:** Ausführliche Anleitung mit Kind-erklärungen, ASCII-Mockups, Code-Vorlagen
- [`workflows/ui-ux-with-mcp.md`](../workflows/ui-ux-with-mcp.md) — Schritt-für-Schritt MCP Workflow für UI-Arbeit

### UI Richtlinien

- `docs/ui-principles.md` — Kurze Zusammenfassung der UI-Prinzipien
- `docs/art-direction.md` — Visuelle Richtung und Asset-Regeln
- `docs/workflows/game-ui.md` — Workflow für UI-Arbeit

### Rollen und Verantwortung

- `docs/roles/ui-ux.md` — UI/UX Designer Rolle (mit MCP Workflow)
- `docs/roles/ui.md` — UI Developer Rolle (mit MCP Workflow)

### MCP Usage

- `docs/mcp-usage-guidelines.md` — MCP server usage protocols
- `docs/analysis/ui-art-audit-2026-06-29.md` — Consolidated art asset audit
- `CLAUDE.md` — Project workflow and engineering standards
