# UI + Test Audit Framework

Komplette Analyse von UI-Screens inkl. Architektur-Qualität und Test-Strategie.

## Kernphilosophie

Tests sind nicht nur dann "falsch", wenn sie nicht laufen. Sie sind auch falsch wenn:

1. **Sie die falschen Dinge testen** - Implementation Details statt Verhalten
2. **Sie zu stark gekoppelt sind** - Jede UI-Änderung bricht Tests
3. **Sie Business-Logik in UI testen** - Sollte in Commands/Selectoren sein
4. **Sie nicht aussagekräftig sind** - Passen aber decken keine Edge Cases
5. **Sie unmotivierbar sind** - Testen was nicht getestet werden sollte

## Audit-Dimensionen

### 1. Playwright UI-Analyse (E2E-Verhalten)

**Ziel:** Alle Benutzer-Interaktionen verifizieren

**Checklist:**
- [ ] Navigation zur Route funktioniert
- [ ] Alle interaktiven Elemente sind klickbar
- [ ] Alle Form-Felder sind befüllbar
- [ ] Modals öffnen/schließen korrekt
- [ ] State-Changes sind sichtbar
- [ ] Error/Empty States werden angezeigt
- [ ] Loading States werden angezeigt
- [ ] Navigation zwischen Screens funktioniert

**Playwright Commands:**
```bash
# Navigation
playwright_navigate: "http://localhost:5173/dashboard"

# Snapshot (für Accessibility Tree)
playwright_snapshot: { depth: 5, boxes: true }

# Screenshot (für visuelle Verifikation)
playwright_take_screenshot: { filename: "dashboard-initial.png" }

# Interaktionen
playwright_click: { target: "[data-testid='end-day-button']" }
playwright_hover: { target: ".npc-card" }
playwright_select_option: { target: "select.filter", values: ["active"] }
```

---

### 2. Bestehende Tests prüfen (Test-Qualität)

**Ziel:** Verstehen ob Tests sinnvoll sind oder nur "vorhanden"

**Prüffragen:**

#### A. Test-Struktur
- [ ] Testet der Screen **Verhalten** oder **Implementation Details**?
- [ ] Sind Tests **unabhängig** voneinander?
- [ ] Können Tests **parallel** laufen?
- [ ] Sind Tests **schnell** (< 1s pro Test)?
- [ ] Sind Tests **aussagekräftig** bei Failure?

#### B. Test-Coverage
- [ ] Sind **kritische Pfade** getestet?
- [ ] Sind **Edge Cases** getestet?
- [ ] Sind **Error States** getestet?
- [ ] Sind **Empty States** getestet?
- [ ] Sind **Loading States** getestet?

#### C. Architektur-Fit
- [ ] Wird **Business-Logik** im UI-Test getestet? (❌ sollte in Command/Selector-Test)
- [ ] Werden **Redux Actions** direkt getestet? (⚠️ sollte über Behavior getestet werden)
- [ ] Werden **Implementation Details** getestet? (❌ z.B. interne Component-State)
- [ ] Sind **Selector-Tests** separat? (✅ gut - Trennung von Concerns)

#### D. Test-Maintenance
- [ ] Brechen Tests bei **visuellen Änderungen**? (❌ sollten nur bei Behavior-Änderungen brechen)
- [ ] Brechen Tests bei **Refactoring**? (❌ sollten stabil bleiben)
- [ ] Sind **Test-Fixtures** wiederverwendbar? (✅ gut)
- [ ] Sind **Test-Helper** dokumentiert? (✅ gut)

**Beispiel: Falscher vs. Richtig Test**

```typescript
// ❌ FALSCH: Testet Implementation Details
test('dispatches action when button clicked', () => {
  render(<Dashboard />)
  fireEvent.click(screen.getByText('End Day'))
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'END_DAY' })
})

// ✅ RICHTIG: Testet User Behavior
test('ending day advances game date and shows confirmation', () => {
  render(<Dashboard />)
  const dateBefore = screen.getByText(/Day \d+/)
  fireEvent.click(screen.getByRole('button', { name: /end day/i }))
  expect(screen.getByText(/Day \d+/)).not.toBe(dateBefore.textContent)
  expect(screen.getByText(/Day \d+ completed/i)).toBeInTheDocument()
})
```

---

### 3. Architektur-Qualität (UI-Purity)

**Ziel:** Sicherstellen dass Business-Logik NICHT in UI-Komponenten steckt

**Prüffragen:**

#### A. Component Responsibilities
- [ ] Enthält die Component **Business-Logik**? (❌ sollte in Command/Selector)
- [ ] Enthält die Component **State-Transformationen**? (❌ sollte in Selector)
- [ ] Enthält die Component **Validierungs-Logik**? (❌ sollte in Domain)
- [ ] Ist die Component **nur Präsentation**? (✅ gut)

#### B. Data Flow
- [ ] Kommen **alle Daten** über Props/Selectors? (✅ gut)
- [ ] Werden **Actions** über Props dispatched? (✅ gut)
- [ ] Gibt es **direkte Store-Zugriffe** in der Component? (❌ sollte useAppSelector verwenden)
- [ ] Gibt es **Side-Effects** in der Component? (❌ sollte in useEffect mit proper cleanup)

#### C. Testability
- [ ] Kann die Component **ohne Redux** getestet werden? (✅ gut - Props sind klar)
- [ ] Können **Callbacks** gemockt werden? (✅ gut)
- [ ] Sind **Props** gut typed? (✅ gut)

**Beispiel: Architektur-Check**

```typescript
// ❌ FALSCH: Business Logic in UI Component
export function Dashboard() {
  const [wage, setWage] = useState(0)
  
  // Business logic in UI!
  const calculateTotalWages = () => {
    return roster.reduce((sum, npc) => sum + npc.dailyWage, 0)
  }
  
  const handleEndDay = () => {
    // Side effect in UI!
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    dispatch({ type: 'SET_DATE', payload: newDate })
    dispatch({ type: 'DEDUCT_WAGES', payload: calculateTotalWages() })
  }
  
  return <button onClick={handleEndDay}>End Day</button>
}

// ✅ RICHTIG: Pure Component with Selectors/Commands
export function Dashboard() {
  const totalWages = useAppSelector(selectTotalDailyWages)
  const dispatch = useAppDispatch()
  
  const handleEndDay = () => {
    dispatch(endDay()) // Command handles all logic
  }
  
  return <button onClick={handleEndDay}>End Day</button>
}
```

---

### 4. Tests anpassen/erweitern (Remediation)

**Ziel:** Tests in einen sinnvollen Zustand bringen

**Aktionen:**

#### A. Veraltete Tests anpassen
- Schema-Drift korrigieren (Feldnamen, Types)
- Mock-Daten an aktuelle Definitions anpassen
- Selector-Pfad-Änderungen aktualisieren

#### B. Falsche Tests umschreiben
- Implementation-Details → User Behavior
- Action-Testing → State-Change-Testing
- UI-Testing → Selector-Testing (für Business Logic)

#### C. Fehlende Tests hinzufügen
- Critical Paths (Happy Path + Edge Cases)
- Error States (Network errors, Validation errors)
- Empty States (No data, No permissions)
- Loading States (Async operations)

#### D. Architektur-Verbesserungen
- Business Logic aus UI → Commands/Selectors verschieben
- Test-Helper/Fixtures erstellen
- Selector-Tests separat hinzufügen

---

### 5. Deliverables

Für jeden Screen:

#### A. Playwright Analysis Report
```markdown
## [Screen Name] Playwright Analysis

### Navigation
- [ ] Route loads: ✅
- [ ] No console errors: ⚠️ (see below)

### Interactions
| Element | Action | Result | Status |
|---------|--------|--------|--------|
| End Day | click | Date advances | ✅ |
| NPC Card | hover | Tooltip shows | ✅ |
| Filter | select | List updates | ❌ |

### Screenshots Captured
- `dashboard-initial.png`
- `dashboard-event-modal.png`
- `dashboard-end-day.png`

### Console Errors
- `Warning: Each child in list should have unique key`
```

#### B. Test Quality Report
```markdown
## [Screen Name] Test Quality Assessment

### Existing Tests
| Test | Quality | Issue | Action |
|------|---------|-------|--------|
| "renders without crashing" | ❌ | Useless | Delete |
| "dispatches END_DAY" | ❌ | Tests action not behavior | Rewrite |
| "shows correct wages" | ✅ | Good | Keep |

### Coverage Gaps
- [ ] Error state: Network failure
- [ ] Empty state: No NPCs on roster
- [ ] Edge case: Max roster size

### Architecture Issues
- [ ] Business logic in Dashboard component (line 45-67)
- [ ] Direct store access in NpcCard (line 89)

### Recommendations
1. Delete 3 useless tests
2. Rewrite 2 action-tests to behavior-tests
3. Move wage calculation to selector
4. Add 4 new tests for error states
```

#### C. Updated Test Files
- Original Test-File mit allen Fixes
- Neue Test-Dateien für fehlende Coverage
- Selector-Tests für Business Logic (falls nötig)

#### D. Screenshots
- Alle States in `docs/analysis/screenshots/<area>/`

---

## Audit-Workflow

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
- [ ] Tests laufen grün

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
