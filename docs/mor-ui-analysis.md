# Masters of Raana — UI Analysis and Reference Synthesis

## Purpose

This document extracts concrete UI, navigation, information architecture, and content-surface patterns from the Masters of Raana screenshot set. Its purpose is not aesthetic copying but extracting reusable structural lessons for Project Destiny.

Each section describes what MoR does, evaluates it, and gives a concrete recommendation.

---

## 1. Global Layout and Chrome

### What MoR does

The global layout is a persistent outer shell with a fixed horizontal top navigation bar and a large central content area. The top bar carries:

- the current location or screen name
- core resource counters (money, day, time)
- navigation tabs to all major sections

The content area fills the remaining viewport. No persistent sidebar is used at the global level — navigation is top-only.

### Evaluation

**Good:** The top-only navigation keeps the main content area wide. It works well for portrait-heavy screens where characters need horizontal room.

**Problem:** When content areas become dense (roster lists, stat panels), the top-bar navigation competes visually with in-page headers and tab systems inside screens. The hierarchy can blur.

**Problem:** Without a persistent left rail or breadcrumb, the player can lose spatial orientation inside nested panel states.

### Recommendation for Project Destiny

Use a persistent **left rail** for primary navigation (Roster, Districts, Factions, Shops, Mission Prep, Combat, Event Log). This separates global navigation from in-screen tab logic and gives more vertical room for dense stat panels. Reserve a top bar only for global state: day, money, active alerts.

---

## 2. Navigation Structure and Section Taxonomy

### What MoR does

MoR organizes top-level navigation into roughly:

- **Home / Overview** — daily summary, key metrics
- **Characters / Girls** — roster list and individual NPC management
- **Town / Locations** — district and location access
- **Events** — active events, notifications, log
- **Options / Settings** — meta controls

Sections are labeled clearly, no icon-only navigation at the top level.

### Evaluation

**Good:** The section names are direct and operational. Players understand where things live.

**Problem:** "Girls" as a section label tightly couples the navigation taxonomy to the game's adult content framing. For Project Destiny, which is systems-first and broader in scope, the taxonomy needs to reflect the full roster model.

**Problem:** MoR does not distinguish Mission Prep from general location access. In a project with tactical combat, these deserve separate surfaces.

### Recommendation for Project Destiny

Navigation taxonomy:

| Section | Purpose |
|---------|---------|
| Dashboard | Day summary, alerts, resource overview |
| Roster | NPC list + individual NPC detail |
| Districts | City map, location access |
| Factions | Political overview, standing |
| Shops | Browsing and purchasing (district-contextual) |
| Mission Prep | Squad assembly, loadout, deployment |
| Combat | Active encounter screen |
| Event Log | Past events, notifications, outcomes |

These eight match the architecture boundaries and give each major surface a clear entry point.

---

## 3. Character / NPC Panel Pattern

### What MoR does

The NPC detail screen uses a split layout:

- **Left or center column:** name, status tags, stat rows (attributes, skills, states), trait list, relationship axes
- **Right column:** character portrait (large, occupying 35–50% of panel width), quick-action buttons below

Stats are displayed as labeled rows with a numeric value and sometimes a small bar. Multiple stat categories are accessed through **tabs** above the stat area (e.g., Attributes / Skills / States / Relationships).

The portrait is always visible regardless of which stat tab is active. This is intentional — the character's visual identity stays present during all stat inspection.

### Evaluation

**Good:** Portrait persistence across tabs maintains character identity. Players are managing people, not spreadsheet rows.

**Good:** Tab structure prevents information overload without hiding data behind multiple screens.

**Problem:** The tab labels are short abbreviations in MoR. Combined with the dense stat rows, new players need time to learn what each category contains.

**Problem:** Quick-action buttons (assign, equip, train) are placed below the portrait, which is far from the stat content. This makes the action-to-context distance high.

### Recommendation for Project Destiny

Keep the portrait-persistent split layout. Use full tab labels (Attributes, Skills, States, Relationships) not abbreviations. Move quick-action controls into a clearly separated **action zone** below the stat panel, not below the portrait. This keeps actions visually adjacent to the data that motivates them.

Stat rows should use: `Label — value — bar (where range matters)` format consistently.

---

## 4. Stat Display Language

### What MoR does

Stats are displayed as compact rows:

```
Strength        42  [████░░░░░░]
Agility         67  [██████░░░░]
```

Color coding:
- Normal values: neutral gray or white text
- Low / danger values: red or orange
- High / exceptional: green or gold tint
- Debuffed / injured states: red background on the row

Trait lists are displayed as tags or short labeled chips rather than expanded descriptions.

### Evaluation

**Good:** The bar + number pattern gives both precise value and relative position at a glance. Useful for comparing NPCs.

**Good:** Trait chips give a fast visual scan without committing to reading full descriptions.

**Problem:** Color-only danger signals fail accessibility requirements. MoR uses color as the only indicator for low health or stressed states.

**Problem:** Trait chips in MoR carry no tooltip by default in some views, making new traits opaque to new players.

### Recommendation for Project Destiny

Use the `bar + number` pattern for all range-bounded stats. Add a compact label prefix for each bar (e.g., ▼ for negative trend, ! for danger threshold) so color is reinforced by symbol. Trait chips should have accessible tooltip content on hover/focus. Danger states should use both color and an explicit label or icon.

---

## 5. Roster List Pattern

### What MoR does

The roster list shows NPCs as rows or compact cards with:

- small portrait thumbnail (left)
- name
- primary role or status tag
- one or two key stats (e.g., health, morale or obedience)
- assignment indicator

Selecting a row opens the full NPC detail panel in-place or as a side panel. MoR does not navigate to a separate route.

Sorting and filtering exist but are minimal — primarily by assignment or status.

### Evaluation

**Good:** The list-plus-inline-detail pattern means the player keeps list context while inspecting a character. This is better than full-page navigation for comparison tasks.

**Good:** Small portrait thumbnails preserve visual identity in the list without making the list visually heavy.

**Problem:** With many NPCs, the single-panel detail becomes a context-switching bottleneck. No side-by-side comparison is supported.

**Problem:** MoR's filtering is basic. For Project Destiny with 12–20 NPCs and multiple attribute categories, a richer filter/sort bar will be needed.

### Recommendation for Project Destiny

Use a **list + slide-in detail panel** layout. The detail panel opens beside the list (not replacing it) on wider screens. On narrow screens, it layers on top with a clear back action. Add a filter/sort bar above the list: by assignment, by role, by readiness status, by faction affinity.

---

## 6. Shop / Inventory Pattern

### What MoR does

Shop screens display items as rows in a scrollable list with:

- item name
- category tag
- price
- brief stat modifier summary

Item selection opens a side panel with full item description, effects, and a purchase button. Category filters at the top allow narrowing the list by item type.

The player's current money is visible in the global top bar, not repeated on the shop screen.

### Evaluation

**Good:** The list + side panel pattern mirrors the roster pattern — consistent mental model across surfaces.

**Good:** Category filters are prominent and reduce scanning time.

**Problem:** MoR does not show district context or faction-affected pricing directly on the shop screen. Players cannot easily understand why item X is available here but not elsewhere.

**Problem:** The purchase confirmation is a simple button without consequence preview (what stats will change, what this costs as a percentage of current funds).

### Recommendation for Project Destiny

Add **district context header** to the shop screen: which district, which faction controls it, any current price modifier. This makes the political economy visible at the point of purchase. Add a brief consequence preview to the purchase panel: item effect summary + "you will have X gold remaining."

---

## 7. Event and Notification Surfaces

### What MoR does

Events appear as modal or half-screen overlays with:

- character portrait (relevant NPC)
- narrative text (2–5 sentences)
- one to three choice buttons

An event log exists as a separate section showing past events in chronological reverse order as short text rows.

### Evaluation

**Good:** The modal event pattern creates clear narrative focus moments without leaving the management layer entirely.

**Good:** A separate persistent log allows the player to review missed or skimmed events.

**Problem:** MoR events have minimal visual hierarchy — the choice buttons are the same weight as the body text in some screens, making the decision point visually unclear.

**Problem:** The log in MoR is very terse — one line per event with no expandable detail.

### Recommendation for Project Destiny

Keep the modal event surface. Visually separate the event body from the choice zone: body text in a scrollable region, choice buttons in a fixed-height action zone at the bottom. In the Event Log screen, each entry should be expandable to see the full event text and outcome, not just a title.

---

## 8. Mission Prep Pattern

### What MoR does

MoR does not have a dedicated mission prep surface. Squad selection happens inline on the mission trigger screen — a short NPC checklist before confirming the mission. There is no loadout review or readiness summary.

### Evaluation

**Problem:** The absence of a dedicated prep surface makes it impossible to compare NPC readiness, review equipment, or understand risk before committing. This is a significant UX gap for a tactics-adjacent game.

### Recommendation for Project Destiny

This is a surface Project Destiny should design fresh, not adapt from MoR. Use a **two-panel layout**: selected squad (left) vs available roster (right). Show readiness indicators, equipment summary, and relevant NPC states before the player commits. Make add/remove immediate and reversible. This screen is also the natural place to surface mission objective and risk tier.

---

## 9. Combat Screen Pattern

### What MoR does

Combat in MoR is primarily stat-resolution based — the player selects an action from a list and the outcome is calculated against NPC stats. The visual display shows:

- participating characters with small portraits and health bars
- action buttons (Attack, Defend, Special, Use Item)
- combat log text as a scrolling feed
- round counter

There is no spatial grid. Range is either implicit or indicated by a simple close/distant toggle.

### Evaluation

**Good:** No grid keeps the browser implementation lightweight and readable.

**Good:** The combat log as a running feed lets the player understand what happened each turn without interrupting flow.

**Problem:** Without spatial representation, range transitions feel arbitrary. The player struggles to understand why a rifle is penalized this turn but not last turn.

**Problem:** Portrait sizes in MoR combat are small and the health bars can be hard to read during fast resolution.

### Recommendation for Project Destiny

Keep the no-grid approach. Make the **Close / Distant range state explicit and prominent** — a large persistent zone indicator that shows which characters are in which range band. Scale portraits up slightly from MoR's combat view. Keep the combat log feed but add turn-separator markers so the player can parse turn boundaries.

---

## 10. Information Density and Visual Hierarchy

### What MoR does

MoR defaults to high density. Most screens carry 20–40 visible data points simultaneously. Typography is small and uniform weight. Section headers exist but are subtle — often just a slightly larger or bolder label.

Color is the primary differentiation tool (stat value color, background tint on active elements).

### Evaluation

**Problem:** Uniform type weight makes it hard to know what matters most on a screen. Everything competes equally.

**Problem:** Color-as-only-hierarchy fails both accessibility and low-contrast display conditions.

**Good:** High density is appropriate for this game genre. The right response is better hierarchy, not lower density.

### Recommendation for Project Destiny

Establish a clear **three-level text hierarchy** and apply it consistently:

| Level | Use | Style |
|-------|-----|-------|
| Primary | Screen title, NPC name, key metric value | Large, high contrast |
| Secondary | Section headers, stat labels, item names | Medium, medium contrast |
| Tertiary | Descriptive text, tags, log entries | Small, reduced contrast |

Use **weight, size, and spacing** as the primary hierarchy tools. Color is a secondary signal layer, not the primary differentiator.

---

## 11. Character Portrait Presentation

### What MoR does

Portraits are large, character-specific illustrations. In the NPC detail view, the portrait fills the right side of the panel at roughly 40–50% of panel width. Portraits are semi-realistic or stylized renders, often depicting the character's typical dress and body type.

In MoR, portraits carry significant visual weight and are the primary emotional anchor for character attachment.

For characters with relationship progression or attraction mechanics, portrait style and presentation quality directly affect player investment — this is deliberate product design, not decoration.

### Evaluation

**Good:** Portrait-first character design creates attachment. Players remember characters visually before they remember stat arrays.

**Good:** Consistent portrait placement across all NPC views creates a reliable visual anchor.

**Problem:** MoR's portrait quality is uneven across characters. Some feel polished; others feel placeholder. Inconsistency breaks the sense of a coherent roster.

### Recommendation for Project Destiny

Establish a **portrait style guide** before generating NPC art. All portraits should share the same:

- framing (bust or three-quarter)
- background treatment (neutral or setting-contextual, not random)
- lighting language (consistent with the art direction's dark-material palette)
- resolution and aspect ratio

For characters involved in relationship or attraction progression, portrait expressiveness matters. Characters should feel readable as personalities from the portrait alone — posture, expression, clothing detail. This is what makes the relationship system feel earned rather than transactional.

Sensual or revealing presentation should be character-consistent, not uniform. A court-affiliated character reads differently from a mercenary. Forced uniform sexualization weakens both the individual characters and the world's social texture.

---

## 12. Key Anti-Patterns to Avoid

Observed in MoR and worth explicitly avoiding in Project Destiny:

| Anti-pattern | Where it appears | Impact |
|---|---|---|
| Color-only danger signals | Stat rows, health bars | Accessibility failure |
| Icon-only action buttons with no label | Some action zones | Forces memorization, slows new players |
| Stat abbreviations without tooltip | Stat rows | Creates opaque knowledge barrier |
| Flat type hierarchy | All screens | Information all competes equally |
| No district context in shops | Shop screen | Disconnects economy from politics |
| Missing consequence preview before purchase | Shop screen | Removes strategic friction |
| No dedicated mission prep surface | Pre-mission | Forces blind commitment |
| Event choice buttons equal visual weight to body text | Event modals | Decision point visually unclear |
| Inconsistent portrait quality across characters | Roster | Breaks coherent world feeling |

---

## 13. Patterns Worth Adopting

| Pattern | Source screen | Why it works |
|---|---|---|
| Portrait-persistent NPC tabs | NPC detail | Maintains character identity during stat review |
| List + inline detail panel | Roster | Comparison context stays visible |
| Category filter tabs on lists | Shops, roster | Fast narrowing without full search |
| Combat log as running feed | Combat | Turn-by-turn readability without interrupting flow |
| Trait chips | NPC detail | Fast visual scan of personality without reading blocks |
| Modal event overlay with choice zone | Event screens | Focus moment without full navigation away |
| Compact metric row format: label + value + bar | Stat panels | Both precise value and relative position readable at a glance |

---

## 14. Summary: What Project Destiny Should Be Better At

MoR is a functional reference for screen taxonomy, information density, and character attachment patterns. Project Destiny's opportunity is to improve on it in five specific areas:

1. **Navigation hierarchy** — left rail instead of top-only tabs, clearer screen-level vs section-level tab distinction
2. **Text hierarchy** — three explicit type levels applied consistently, not color-only differentiation
3. **District and political context** — surface faction and district effects at the point of decision (shops, recruitment, events), not just in the faction screen
4. **Mission prep** — a dedicated, rich surface that MoR lacks entirely
5. **Portrait consistency** — a style guide enforced before generating NPC art, with character-consistent rather than uniform-sexualized presentation

These are not polish improvements. They are structural differences that affect whether the systems feel connected or isolated.
