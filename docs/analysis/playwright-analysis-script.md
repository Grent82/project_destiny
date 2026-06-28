# Playwright UI Analysis Script

Für die systematische UI-Analyse mit Playwright MCP und Screenshots.

## Executive Summary

Dieses Dokument enthält einen Plan für die parallele Analyse aller Screens mit Playwright MCP.

## Analyse-Plan

### Parallel ausführbare Tasks

Die folgenden Bereiche können **parallel** analysiert werden, da sie unabhängige Routes sind:

| Priority | Area | Route | Label |
|----------|------|-------|-------|
| P0 | Dashboard | `/dashboard` | ui-ux |
| P0 | Roster | `/roster` | ui-ux |
| P0 | Work Board | `/contracts` | ui-ux |
| P0 | Districts | `/district-map` | ui-ux |
| P0 | Factions | `/factions` | ui-ux |
| P1 | Journal | `/event-log` | ui-ux |
| P1 | Ledger | `/ledger` | ui-ux |
| P1 | The House | `/house` | ui-ux |
| P1 | Dialogue | `/dialogue` | ui-ux |
| P2 | Combat | `/combat` | ui-ux |
| P2 | Shops | `/shops` | ui-ux |
| P2 | Expedition | `/expedition` | ui-ux |
| P2 | Brokerage | `/brokerage` | ui-ux |
| P2 | Investigation | `/investigation` | ui-ux |

## Bead-Erstellung für parallele Analyse

```bash
# P0 - Core Screens (parallel)
bd create -- "Dashboard Screen: Verify all functionality and interactions" --label ui-ux
bd create -- "Roster Screen: Verify NPC listing and detail panel" --label ui-ux
bd create -- "Work Board: Verify contract browsing and acceptance flow" --label ui-ux
bd create -- "Districts: Verify map, interior, and POI navigation" --label ui-ux
bd create -- "Factions: Verify relationship display and agenda UI" --label ui-ux

# P1 - Secondary Screens
bd create -- "Journal (Event Log): Verify log entries and filtering" --label ui-ux
bd create -- "Ledger: Verify financial data display" --label ui-ux
bd create -- "The House: Verify house state display" --label ui-ux
bd create -- "Dialogue System: Verify dialogue tree navigation" --label ui-ux

# P2 - Specialized Screens
bd create -- "Combat Screen: Verify combat mechanics UI" --label ui-ux
bd create -- "Shops Screen: Verify buy/sell flow" --label ui-ux
bd create -- "Expedition: Verify prep, travel, return flow" --label ui-ux
bd create -- "Brokerage: Verify brokerage mechanics" --label ui-ux
bd create -- "Investigation: Verify investigation mechanics" --label ui-ux
```

## Analysis Template für jeden Bead

```markdown
## Analysis Checklist

### Navigation
- [ ] Route loads successfully
- [ ] Screen renders without errors
- [ ] All navigation links work

### UI Elements
- [ ] All expected components visible
- [ ] Text content readable and correct
- [ ] Icons/images load properly
- [ ] Layout is responsive

### Interactions
- [ ] All buttons clickable
- [ ] Forms fillable (if applicable)
- [ ] Modals open/close correctly
- [ ] State changes reflect in UI

### Data Binding
- [ ] Dynamic data displays correctly
- [ ] Updates reflect in real-time
- [ ] Empty states handled

### Screenshots
- [ ] Initial state captured
- [ ] All interactive states captured
- [ ] Error/empty states captured

### Findings
- [ ] Issues documented
- [ ] Recommendations made
```

## Playwright MCP Commands Reference

### Navigation
```
playwright_navigate: "http://localhost:5173/dashboard"
```

### Screenshots
```
playwright_take_screenshot: { target: "document", filename: "dashboard-initial.png" }
```

### Interactions
```
playwright_click: { target: "[data-testid='end-day-button']" }
playwright_hover: { target: ".npc-card" }
playwright_select_option: { target: "select.filter", values: ["active"] }
```

### Snapshots (for accessibility tree)
```
playwright_snapshot: { depth: 5, boxes: true }
```

## Output Format

Für jeden analysierten Screen:

```markdown
## [Screen Name] Analysis

**Route:** `/route-path`
**Status:** ✅ Pass / ⚠️ Issues Found / ❌ Critical Issues

### Screenshots Captured
- `dashboard-initial.png` - Initial load state
- `dashboard-event-modal.png` - Event modal open
- `dashboard-end-day.png` - End day action

### Functionality Verified
| Feature | Status | Notes |
|---------|--------|-------|
| Roster display | ✅ | Shows 5 NPCs correctly |
| Marks display | ✅ | Shows 150 marks |
| End day action | ⚠️ | Modal appears but no confirmation |

### Issues Found
1. **[Medium]** Empty state missing for new game
2. **[Low]** Tooltip text truncated on mobile

### Recommendations
1. Add empty state component for new games
2. Increase tooltip max-width on small viewports
```

## Execution Workflow

### Phase 1: Setup (5 min)
```bash
# 1. Dev server starten
pnpm dev

# 2. Screenshot directories erstellen
mkdir -p docs/analysis/screenshots/{dashboard,roster,contracts,districts,factions,journal,ledger,house,dialogue,quests,combat,shops,expedition,brokerage,investigation}

# 3. Beads erstellen (siehe oben)
```

### Phase 2: Parallel Analysis (30-60 min)
- 5 P0-Screens parallel analysieren
- Pro Screen: Navigation → Screenshot → Interaktionen → Issues dokumentieren
- Playwright MCP für alle Interaktionen verwenden

### Phase 3: Consolidation (15 min)
- Alle findings zusammenfassen
- Priorisierte Issue-Liste erstellen
- Follow-up Beads für Fixes erstellen

## Quality Gates

Vor Abschluss jedes Analysis-Beads:

- [ ]至少 3 Screenshots captured
- [ ] Alle interaktiven Elemente getestet
- [ ]至少 1 Screenshot von jedem State
- [ ] Issues mit Priority dokumentiert
- [ ] Recommendations gegeben

---

## Alternative: Single Comprehensive Analysis

Wenn du eine **einzelne umfassende Analyse** statt paralleler Beads bevorzugst:

```bash
# Ein Bead für alles
bd create -- "Comprehensive UI Analysis: All screens, all features, systematic audit" --label ui-ux
```

Dann im Bead:
1. P0-Screens zuerst analysieren
2. P1-Screens danach
3. P2-Screens zum Schluss
4. Alle findings in einem Report zusammenfassen
