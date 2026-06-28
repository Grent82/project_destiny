# Game Analysis Prompt — Comprehensive UI + Test Audit

Komplette Analyse aller Screens inkl. Playwright-Tests, Test-Qualitäts-Bewertung und Architektur-Review.

---

## Kernphilosophie

Tests sind nicht nur dann "falsch", wenn sie nicht laufen. Sie sind auch falsch wenn:

1. **Sie die falschen Dinge testen** - Implementation Details statt Verhalten
2. **Sie zu stark gekoppelt sind** - Jede UI-Änderung bricht Tests
3. **Sie Business-Logik in UI testen** - Sollte in Commands/Selectoren sein
4. **Sie nicht aussagekräftig sind** - Passen aber decken keine Edge Cases
5. **Sie unmotivierbar sind** - Testen was nicht getestet werden sollte

---

## Setup

1. Dev-Server starten: `pnpm dev` (Port 5173)
2. Playwright MCP verwenden für Navigation, Interaktionen und Screenshots
3. Screenshots speichern in: `docs/analysis/screenshots/`
4. Audit-Reports speichern in: `docs/analysis/audit-reports/`

---

## Analyse-Bereiche (parallel ausführbar)

Jeder Bereich umfasst **4 Dimensionen**:

1. **Playwright UI-Analyse** - E2E-Verhalten verifizieren
2. **Test-Qualitäts-Bewertung** - Bestehende Tests prüfen
3. **Architektur-Review** - Business Logic in UI?
4. **Remediation** - Tests anpassen/erweitern

---

### Bereich 1: Dashboard Screen

**Route:** `/dashboard`
**Test File:** `src/ui/screens/DashboardScreen.test.tsx`

#### Playwright UI-Analyse

**Zu testende Interaktionen:**
- "Wait (1 slot)" Button - time advances
- Tab navigation (Overview/Operations/Intelligence)
- "Pay Debt" Button - debt reduction
- "Save session" / "Load session" Buttons
- Navigation Links (→ Visit the Pale, etc.)
- City Dial Tooltips

**Zu dokumentierende States:**
- Initial State (fresh game, debt active)
- Debt Paid State
- Debt Crisis State
- First Run State
- Operations Tab (empty/saved)
- Intelligence Tab (empty/with activity)

#### Test-Qualitäts-Bewertung

**Prüffragen:**
- [ ] Testen die Tests User-Verhalten oder Implementation Details?
- [ ] Sind kritische Pfade abgedeckt (Debt Payment, Save/Load)?
- [ ] Sind Error/Empty/Loading States getestet?
- [ ] Gibt es "renders without crashing" Tests? (❌ löschen)
- [ ] Gibt es Action-Tests statt Behavior-Tests? (❌ umschreiben)

**Typische Issues:**
- Debt Payment Flow oft nicht getestet
- Session State Sync (after save, load stays disabled)
- Tab State nicht persistent getestet

#### Architektur-Review

**Prüffragen:**
- [ ] Ist Business Logic in Selectors (nicht Component)?
- [ ] Sind State-Changes über Commands (nicht direkt)?
- [ ] Ist Component rein presentational?
- [ ] Gibt es Local State der mit Store synchronisiert werden muss?

#### Remediation

**Aktionen:**
- [ ] Fehlende Debt Payment Tests hinzufügen
- [ ] Session State Sync Issue fixen (useEffect nach Save)
- [ ] Tab Navigation Tests hinzufügen
- [ ] Playwright E2E Tests für Critical Paths

**Deliverables:**
- [ ] Updated `DashboardScreen.test.tsx`
- [ ] Audit Report: `docs/analysis/audit-reports/dashboard-audit-report.md`
- [ ] Screenshots: `docs/analysis/screenshots/dashboard/`

---

### Bereich 2: Roster Screen

**Route:** `/roster`
**Test Files:** `src/ui/screens/RosterScreen.test.tsx`, `src/ui/screens/NpcDetailPanel.test.tsx`

#### Playwright UI-Analyse

**Zu testende Interaktionen:**
- NPC List rendering
- NPC Detail Panel open/close
- NPC Status indicators (health, fatigue, mood)
- Filter/Sort functions
- NPC Actions (Assign, Dismiss, etc.)
- Roster capacity display

**Zu dokumentierende States:**
- Empty Roster
- Full Roster
- NPC with injuries
- NPC on assignment
- Detail Panel open

#### Test-Qualitäts-Bewertung

**Prüffragen:**
- [ ] Sind alle NPC-Assignment-States getestet?
- [ ] Wird Detail Panel Interaction getestet?
- [ ] Sind Filter-Logik Tests vorhanden?
- [ ] Sind Warnings/Errors im UI getestet?

**Typische Issues:**
- Detail Panel Animation/Transition nicht getestet
- Filter-Logik oft in Component (sollte in Selector)
- Assignment State Changes nicht vollständig abgedeckt

#### Architektur-Review

**Prüffragen:**
- [ ] Ist NPC-Filtering in Selector?
- [ ] Sind Assignment-Actions in Commands?
- [ ] Ist Detail Panel State lokal oder global?

#### Remediation

**Aktionen:**
- [ ] Detail Panel Interaction Tests hinzufügen
- [ ] Filter-Logik prüfen (Component vs Selector)
- [ ] Assignment State Change Tests hinzufügen
- [ ] Playwright E2E für Assignment Flow

**Deliverables:**
- [ ] Updated test files
- [ ] Audit Report: `docs/analysis/audit-reports/roster-audit-report.md`
- [ ] Screenshots: `docs/analysis/screenshots/roster/`

---

### Bereich 3: Work Board (Contract Board) Screen

**Route:** `/contracts`
**Test File:** `src/ui/screens/ContractBoardScreen.test.tsx`

#### Playwright UI-Analyse

**Zu testende Interaktionen:**
- Contract list rendering
- Contract filtering (type, difficulty, reward)
- Contract detail view expansion
- Accept/Decline actions
- Active contracts tab
- Contract progress indicators

**Zu dokumentierende States:**
- Empty contract board
- Contracts with filters
- Contract detail expanded
- Accept/Decline confirmation
- Active contracts list

#### Test-Qualitäts-Bewertung

**Prüffragen:**
- [ ] Sind alle Filter-Kombinationen getestet?
- [ ] Wird Accept/Decline State-Change getestet?
- [ ] Sind Contract-Progress-Updates getestet?
- [ ] Sind Error States (no permissions, etc.) getestet?

**Typische Issues:**
- Filter State nicht persistent
- Accept/Decline oft nur happy-path getestet
- Contract Progress nicht reaktiv getestet

#### Architektur-Review

**Prüffragen:**
- [ ] Ist Contract-Filtering in Selector?
- [ ] Sind Accept/Decline in Commands?
- [ ] Wird Contract State korrekt getrackt?

#### Remediation

**Aktionen:**
- [ ] Filter-Tests erweitern
- [ ] Accept/Decline Error Cases hinzufügen
- [ ] Contract Progress reaktiv testen
- [ ] Playwright E2E für Contract Flow

**Deliverables:**
- [ ] Updated `ContractBoardScreen.test.tsx`
- [ ] Audit Report: `docs/analysis/audit-reports/contract-board-audit-report.md`
- [ ] Screenshots: `docs/analysis/screenshots/contracts/`

---

### Bereich 4: Districts (Map + Interior + POI)

**Routes:** `/district-map`, `/district/:districtId`, `/district/:districtId/poi/:poiId`
**Test Files:** `DistrictMapScreen.test.tsx`, `DistrictInteriorScreen.test.tsx`, `DistrictPoiScreen.test.tsx`

#### Playwright UI-Analyse

**Zu testende Interaktionen:**
- District Map rendering (all 6 districts)
- District selection
- Navigation Map → Interior → POI
- POI interaction
- District-specific content display

**Zu dokumentierende States:**
- District Map overview
- District Interior view
- POI detail view
- Navigation between levels

#### Test-Qualitäts-Bewertung

**Prüffragen:**
- [ ] Sind alle Distrikte getestet?
- [ ] Wird Navigation Flow getestet?
- [ ] Sind POI-specific States getestet?
- [ ] Sind District constraints enforced?

**Typische Issues:**
- Navigation State nicht in URL (hard refresh = reset)
- POI State nicht persistent
- District-specific permissions nicht getestet

#### Architektur-Review

**Prüffragen:**
- [ ] Ist District-State in Store oder Local?
- [ ] Wird Navigation über React Router oder manual?
- [ ] Sind POI-Data korrekt aus Content Catalog?

#### Remediation

**Aktionen:**
- [ ] Navigation Flow Tests hinzufügen
- [ ] District State persistence prüfen
- [ ] POI Interaction Tests erweitern
- [ ] Playwright E2E für District Navigation

**Deliverables:**
- [ ] Updated test files
- [ ] Audit Report: `docs/analysis/audit-reports/districts-audit-report.md`
- [ ] Screenshots: `docs/analysis/screenshots/districts/`

---

### Bereich 5: Factions Screen

**Route:** `/factions`
**Test File:** `src/ui/screens/FactionsScreen.test.tsx`

#### Playwright UI-Analyse

**Zu testende Interaktionen:**
- Faction relationship display
- Reputation indicators
- Faction-specific actions
- Intrigue mechanics
- Agenda/Proposal UI
- Faction leader interactions

**Zu dokumentierende States:**
- All factions overview
- Faction detail view
- Agenda proposal state
- Intrigue event state
- Relationship changes

#### Test-Qualitäts-Bewertung

**Prüffragen:**
- [ ] Sind alle Faktionen getestet?
- [ ] Wird Reputation-Change getestet?
- [ ] Sind Agenda-Proposal-Tests vorhanden?
- [ ] Sind Intrigue-Events getestet?

**Typische Issues:**
- Agenda UI oft neu, Tests veraltet
- Intrigue Mechanics nicht vollständig abgedeckt
- Faction Leader thresholds nicht getestet

#### Architektur-Review

**Prüffragen:**
- [ ] Ist Faction-Logic in Commands/Selectors?
- [ ] Sind Intrigue-Events deterministisch?
- [ ] Wird Agenda State korrekt getrackt?

#### Remediation

**Aktionen:**
- [ ] Agenda-Tests aktualisieren
- [ ] Intrigue-Event Tests hinzufügen
- [ ] Faction Leader threshold Tests
- [ ] Playwright E2E for Faction Flow

**Deliverables:**
- [ ] Updated `FactionsScreen.test.tsx`
- [ ] Audit Report: `docs/analysis/audit-reports/factions-audit-report.md`
- [ ] Screenshots: `docs/analysis/screenshots/factions/`

---

### Bereich 6: Journal (Event Log) Screen

**Route:** `/event-log`
**Test File:** `src/ui/screens/EventLogScreen.test.tsx`

#### Playwright UI-Analyse

**Zu testende Interaktionen:**
- Event log entries rendering
- Category filtering (economy, combat, system)
- Scroll/pagination
- Log entry detail view

**Zu dokumentierende States:**
- Empty log
- Log with entries
- Filtered view
- Max capacity (100 entries)

#### Test-Qualitäts-Bewertung

**Prüffragen:**
- [ ] Sind alle Kategorien getestet?
- [ ] Wird Filter-Logik getestet?
- [ ] Ist Log-Capping (100 entries) getestet?
- [ ] Sind chronologische Updates getestet?

**Typische Issues:**
- Filter State nicht persistent
- Old entries nicht korrekt entfernt
- Category badges nicht getestet

#### Architektur-Review

**Prüffragen:**
- [ ] Ist Log-Entry-Format korrekt?
- [ ] Wird Log-Update über Command?
- [ ] Ist Capping-Logic in Command oder Selector?

#### Remediation

**Aktionen:**
- [ ] Filter-Tests hinzufügen
- [ ] Log-Capping Tests
- [ ] Category filter E2E
- [ ] Playwright E2E for Log Flow

**Deliverables:**
- [ ] Updated `EventLogScreen.test.tsx`
- [ ] Audit Report: `docs/analysis/audit-reports/journal-audit-report.md`
- [ ] Screenshots: `docs/analysis/screenshots/journal/`

---

### Bereich 7: Ledger Screen

**Route:** `/ledger`
**Test File:** `src/ui/screens/LedgerScreen.test.tsx`

#### Playwright UI-Analyse

**Zu testende Interaktionen:**
- Debt display
- Wage overview
- Contract registry
- Financial summary
- Economic indicators

**Zu dokumentierende States:**
- Debt active
- Debt paid
- Wage changes
- Contract obligations

#### Test-Qualitäts-Bewertung

**Prüffragen:**
- [ ] Sind Debt-Calculations getestet?
- [ ] Wird Wage-Display getestet?
- [ ] Sind Contract-Obligations getestet?
- [ ] Sind Financial Updates reaktiv?

**Typische Issues:**
- Debt Calculation oft nicht getestet
- Wage Updates nicht reaktiv
- Contract Registry State nicht getrackt

#### Architektur-Review

**Prüffragen:**
- [ ] Sind Financial-Calculations in Selectors?
- [ ] Wird Debt-Update über Command?
- [ ] Sind Wage-Changes korrekt propagiert?

#### Remediation

**Aktionen:**
- [ ] Debt Calculation Tests
- [ ] Wage Update reaktiv testen
- [ ] Contract Registry Tests
- [ ] Playwright E2E for Ledger

**Deliverables:**
- [ ] Updated `LedgerScreen.test.tsx`
- [ ] Audit Report: `docs/analysis/audit-reports/ledger-audit-report.md`
- [ ] Screenshots: `docs/analysis/screenshots/ledger/`

---

### Bereich 8: The House Screen

**Route:** `/house`
**Test File:** `src/ui/screens/HouseScreen.test.tsx`

#### Playwright UI-Analyse

**Zu testende Interaktionen:**
- House state display (damage, condition)
- Room status overview
- House-specific actions
- Repair mechanics

**Zu dokumentierende States:**
- House damaged
- Room under repair
- Room intact
- Full house restored

#### Test-Qualitäts-Bewertung

**Prüffragen:**
- [ ] Sind Room-States getestet?
- [ ] Wird Repair-Flow getestet?
- [ ] Sind Damage-States korrekt?
- [ ] Sind House-actions getestet?

**Typische Issues:**
- Room State transitions nicht getestet
- Repair mechanics oft incomplete
- Damage thresholds nicht dokumentiert

#### Architektur-Review

**Prüffragen:**
- [ ] Ist House-State in Store?
- [ ] Sind Repair-Actions in Commands?
- [ ] Wird Room-State korrekt propagiert?

#### Remediation

**Aktionen:**
- [ ] Room State Transition Tests
- [ ] Repair Flow Tests
- [ ] Damage threshold Tests
- [ ] Playwright E2E for House

**Deliverables:**
- [ ] Updated `HouseScreen.test.tsx`
- [ ] Audit Report: `docs/analysis/audit-reports/house-audit-report.md`
- [ ] Screenshots: `docs/analysis/screenshots/house/`

---

### Bereich 9: Dialogue System

**Route:** `/dialogue`
**Test File:** `src/ui/screens/DialogueScreen.test.tsx`

#### Playwright UI-Analyse

**Zu testende Interaktionen:**
- Dialogue tree navigation
- Player choices/responses
- NPC responses
- Dialogue outcomes
- Relationship impacts
- Quest triggers

**Zu dokumentierende States:**
- Dialogue start
- Choice presented
- Branch selected
- Outcome displayed
- Relationship changed

#### Test-Qualitäts-Bewertung

**Prüffragen:**
- [ ] Sind alle Dialogue-Trees getestet?
- [ ] Wird Choice-Flow getestet?
- [ ] Sind Relationship-Changes getestet?
- [ ] Sind Quest-Triggers getestet?

**Typische Issues:**
- Dialogue Trees oft nicht vollständig
- Choice outcomes nicht getestet
- Relationship changes nicht reaktiv

#### Architektur-Review

**Prüffragen:**
- [ ] Ist Dialogue-Logic in Commands?
- [ ] Sind Trees aus Content Catalog?
- [ ] Wird Relationship-Update über Command?

#### Remediation

**Aktionen:**
- [ ] Dialogue Tree Tests
- [ ] Choice Flow Tests
- [ ] Relationship Change Tests
- [ ] Playwright E2E for Dialogue

**Deliverables:**
- [ ] Updated `DialogueScreen.test.tsx`
- [ ] Audit Report: `docs/analysis/audit-reports/dialogue-audit-report.md`
- [ ] Screenshots: `docs/analysis/screenshots/dialogue/`

---

### Bereich 10: Quest System

**Routes:** `/contracts/:questId/execute`, `/missions/:questId`, `/investigation`
**Test Files:** `MissionPrepScreen.test.tsx`, `ContractExecutionScreen.test.tsx`

#### Playwright UI-Analyse

**Zu testende Interaktionen:**
- Quest acceptance flow
- Quest progression tracking
- Quest objectives display
- Quest completion
- Quest rewards
- Quest failure conditions

**Zu dokumentierende States:**
- Quest available
- Quest accepted
- Quest in progress
- Quest completed
- Quest failed

#### Test-Qualitäts-Bewertung

**Prüffragen:**
- [ ] Sind Quest-Progression-Updates getestet?
- [ ] Wird Completion-Flow getestet?
- [ ] Sind Rewards korrekt getestet?
- [ ] Sind Failure-Conditions getestet?

**Typische Issues:**
- Progression State nicht reaktiv
- Reward calculations nicht getestet
- Failure conditions oft missing

#### Architektur-Review

**Prüffragen:**
- [ ] Ist Quest-Logic in Commands?
- [ ] Sind Progression-Updates korrekt?
- [ ] Wird Reward-Logic in Selector?

#### Remediation

**Aktionen:**
- [ ] Progression Tests
- [ ] Completion Flow Tests
- [ ] Reward Tests
- [ ] Playwright E2E for Quests

**Deliverables:**
- [ ] Updated test files
- [ ] Audit Report: `docs/analysis/audit-reports/quest-system-audit-report.md`
- [ ] Screenshots: `docs/analysis/screenshots/quests/`

---

### Bereich 11: Weitere Screens

#### Combat Screen (`/combat`)
- Test File: `CombatScreen.test.tsx`
- Fokus: Turn-based mechanics, Unit actions, Combat outcomes

#### Shops Screen (`/shops`)
- Test File: `ShopsScreen.test.tsx`
- Fokus: Buy/sell flow, Pricing, Inventory updates

#### Expedition (`/expedition`, `/expedition-travel`, `/expedition-return`)
- Test Files: `ExpeditionPrepScreen.test.tsx`, `ExpeditionTravelScreen.test.tsx`, `ExpeditionReturnScreen.test.tsx`
- Fokus: Prep, Travel, Return/Reward flow

#### Brokerage (`/brokerage`)
- Test File: `BrokerageScreen.test.tsx`
- Fokus: Brokerage mechanics, Contract types

#### Investigation (`/investigation`)
- Test File: `InvestigationScreen.test.tsx`
- Fokus: Clue tracking, Resolution flow

---

## Output Format

Für jeden Bereich:

### Audit Report Struktur

```markdown
# [Screen Name] Audit Report

**Audit Date:** YYYY-MM-DD
**Bead:** destiny-XXXX
**Status:** Complete

## 1. Playwright UI-Analyse
- [ ] All interactions tested
- [ ] All states documented
- [ ] Screenshots captured

## 2. Test-Qualitäts-Bewertung
| Test | Quality | Issue | Action |
|------|---------|-------|--------|
| ... | ... | ... | ... |

## 3. Architektur-Review
- Score: X/10
- Issues: ...
- Recommendations: ...

## 4. Remediation Complete
- [ ] Tests updated
- [ ] New tests added
- [ ] Architecture issues fixed
- [ ] All tests passing

## 5. Screenshots
- List of captured screenshots
```

---

## Quality Gates

Ein Audit ist erfolgreich wenn:

### Playwright
- [ ] Alle Interaktionen funktionieren
- [ ] Keine Console Errors (außer bekannte Warnings)
- [ ] Alle States mit Screenshots dokumentiert

### Tests
- [ ] Keine "renders without crashing" Tests
- [ ] Keine Action-Tests (nur Behavior-Tests)
- [ ] Alle kritischen Pfade abgedeckt
- [ ] Alle Error/Empty/Loading States getestet
- [ ] Tests laufen grün (`pnpm test <Screen>`)

### Architektur
- [ ] Keine Business Logic in UI Components
- [ ] Alle Daten über Selectors
- [ ] Alle Actions über Commands
- [ ] Components sind rein presentational

---

## Priority Matrix

| Issue Type | Priority | Action |
|------------|----------|--------|
| Tests brechen | P0 | Sofort fixen |
| Business Logic in UI | P0 | In Commands/Selctoren verschieben |
| Falsche Tests (Action-Tests) | P1 | Umschreiben zu Behavior-Tests |
| Fehlende Coverage (Critical Paths) | P1 | Neue Tests hinzufügen |
| Fehlende Coverage (Edge Cases) | P2 | Neue Tests hinzufügen |
| Useless Tests | P2 | Löschen |
| Console Warnings | P2 | Bei Gelegenheit fixen |
| Visuelle Issues | P2 | Art-Director Bead erstellen |

---

## Execution Workflow

### Phase 1: Playwright Analysis (15-30 min pro Screen)
1. Dev server starten
2. Route navigieren
3. Snapshot nehmen (Accessibility Tree)
4. Alle Interaktionen testen
5. Screenshots von allen States
6. Console Errors protokollieren

### Phase 2: Test Quality Review (20-40 min pro Screen)
1. Test-File lesen
2. Jeder Test bewerten (Useless/Weak/Good)
3. Architektur-Check (Business Logic in UI?)
4. Coverage Gaps identifizieren
5. Remediation Plan erstellen

### Phase 3: Remediation (30-60 min pro Screen)
1. Useless Tests löschen
2. Falsche Tests umschreiben
3. Neue Tests hinzufügen
4. Architektur-Issues fixen (falls in Scope)
5. Tests ausführen und grün machen

### Phase 4: Documentation (10 min pro Screen)
1. Playwright Report schreiben
2. Test Quality Report schreiben
3. Screenshots organisieren
4. Bead mit allen findings schließen

---

## Screenshot Organization

```
docs/analysis/screenshots/
├── dashboard/
│   ├── initial-state.png
│   ├── debt-active.png
│   ├── debt-paid.png
│   ├── operations-tab.png
│   └── intelligence-tab.png
├── roster/
│   ├── list-view.png
│   ├── npc-detail.png
│   └── npc-actions.png
├── contracts/
│   ├── contract-list.png
│   ├── contract-detail.png
│   └── accept-contract.png
├── districts/
│   ├── district-map.png
│   ├── district-interior.png
│   └── poi-detail.png
├── factions/
│   ├── faction-list.png
│   ├── faction-detail.png
│   └── agenda-ui.png
├── dialogue/
│   ├── dialogue-tree.png
│   └── player-choice.png
└── ...
```

---

## Beispiel-Audit Reports

Siehe `docs/analysis/audit-reports/` für vollständige Beispiel-Audits:
- `dashboard-audit-report.md` - Vollständiges Dashboard Audit
