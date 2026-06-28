# Dashboard Screen Audit Report

**Audit Date:** 2026-06-28
**Bead:** destiny-kueo
**Status:** Draft (vor Playwright-Analyse)

---

## 1. Playwright UI-Analyse

### Zu testende Interaktionen

| Element | Action | Erwartetes Resultat | Priority |
|---------|--------|---------------------|----------|
| "Wait (1 slot)" Button | click | Day/TimeSlot advances, activity log updated | P0 |
| Tab "Overview" | click | Overview content visible | P0 |
| Tab "Operations" | click | Operations content visible | P0 |
| Tab "Intelligence" | click | Intelligence content visible | P0 |
| "Pay Debt" Button | click (when enabled) | Debt amount reduced, marks reduced | P0 |
| "Pay Debt" Button | verify disabled when marks=0 | Button disabled | P1 |
| "Save session" Button | click | Session saved, message shown | P1 |
| "Load session" Button | click (after save) | Session loaded, message shown | P1 |
| "→ Visit the Pale" Link | click | Navigate to /districts/district-the-pale | P1 |
| "→ Check available work" Link | click | Navigate to /contracts | P2 |
| City Dial Tooltips | hover | Tooltip text visible | P2 |

### Zu dokumentierende States

1. **Initial State** - Fresh game, no debt paid
2. **Debt Active State** - Debt claim panel with payment options
3. **Debt Paid State** - Debt settled message
4. **Debt Crisis State** - Debt defaulted message
5. **First Run State** - "Visit the Pale" directive visible
6. **Operations Tab - Empty** - No saved session
7. **Operations Tab - After Save** - Load button enabled
8. **Intelligence Tab - Empty Log** - "Nothing has been logged yet"
9. **Intelligence Tab - With Activity** - Log entries visible

---

## 2. Test-Qualitäts-Bewertung

### Existing Tests Analysis

| Test | Qualität | Issue | Action |
|------|----------|-------|--------|
| "does not emit unstable selector warnings" | ⚠️ Weak | Testet Redux/Selector-Implementation, nicht User-Verhalten | Behalten aber dokumentieren als "infrastructure test" |
| "surfaces a clear recommended next quest action" | ✅ Good | Testet User-facing Content, klare Assertions | Behalten |
| "keeps load disabled until a snapshot exists" | ✅ Good | Testet User-Interaction + State-Change | Behalten |
| "saves and restores the current session" | ✅ Good | Testet Critical Path (Save/Load Flow) | Behalten |
| "does not show non-diegetic management shortcuts" | ⚠️ Weak | Testet was NICHT da ist (negative test) | Prüfen ob noch relevant |
| "surfaces an economy brief with reserves" | ✅ Good | Testet komplexe State-Representation | Behalten |
| "surfaces bonded kitchen service" | ✅ Good | Testet spezifische Business-Logic im UI | ⚠️ Prüfen ob Logic in Selector gehört |
| "Work Board CTA uses router navigation" | ✅ Good | Testet Navigation ohne reload | Behalten |

### Test-Coverage Gaps

#### Fehlende Tests:

1. **Debt Payment Flow**
   - [ ] Paying debt reduces marks and debt amount
   - [ ] Debt paid state shows "Settled ✓"
   - [ ] Debt crisis triggers when due date passed

2. **Wait Action**
   - [ ] Clicking "Wait" advances time
   - [ ] Activity log receives entry
   - [ ] City dials update (if applicable)

3. **Tab Navigation**
   - [ ] Tab state persists during session
   - [ ] Each tab shows correct content

4. **City Dials Display**
   - [ ] All 4 dials render correctly
   - [ ] Bar widths match values
   - [ ] Tooltips show on hover (Playwright)

5. **Main Quest Panel**
   - [ ] Different stages show correct messages
   - [ ] Stage transitions update UI

#### Fehlende Error/Edge Cases:

1. **Zero Marks State** - Debt panel with no ability to pay
2. **Max Activity Log** - 100 entries cap behavior
3. **Concurrent Session Load** - What happens when loading during action?

---

## 3. Architektur-Qualität

### Component Analysis

#### ✅ Gute Praktiken:

1. **Selectors für Daten**
   ```tsx
   const summary = useAppSelector(selectDashboardSummary)
   const debt = useAppSelector(selectDebtStatus)
   ```
   Business Logic bleibt in Selectors - gut!

2. **Commands für Actions**
   ```tsx
   onClick={() => dispatch(gameActions.wait())}
   onClick={() => dispatch(gameActions.payDebt({ amount: ... }))}
   ```
   State-Changes über Actions - gut!

3. **Keine Business Logic in Component**
   - Keine Berechnungen im Component Body
   - Keine State-Transformationen
   - Pure Presentation

#### ⚠️ Potenzielle Issues:

1. **Local State für Session Messages**
   ```tsx
   const [sessionMessage, setSessionMessage] = useState<string | null>(null)
   ```
   - UI-feedback State ist okay
   - Aber: Sollte evtl. über Activity Log laufen statt ephemeral State

2. **Local State für Tab Selection**
   ```tsx
   const [activeTab, setActiveTab] = useState<DashboardTab>('Overview')
   ```
   - Tab State könnte persistent sein (URL query param?)
   - Aktuell rein ephemeral - okay für MVP

3. **Local State für canLoadSavedSession**
   ```tsx
   const [canLoadSavedSession, setCanLoadSavedSession] = useState(() =>
     hasSavedSession(saveStore),
   )
   ```
   - **Problem:** State wird nicht aktualisiert nach Save!
   - **Issue:** After saving, component doesn't re-check
   - **Fix:** Either use effect or derive from store

#### Architektur-Score: **8/10**

- Business Logic korrekt in Selectors/Commands
- UI ist presentational
- Minor issue mit local State Synchronization

---

## 4. Recommendations

### High Priority (P0)

1. **Add Debt Payment Tests**
   ```typescript
   it('reduces debt and marks when paying debt', async () => {
     const user = userEvent.setup()
     const store = createGameStore({
       ...initialGameStateSnapshot,
       money: 500,
       debtState: { /* ... with debtAmount: 300 */ }
     })
     
     render(<DashboardScreen />)
     
     await user.click(screen.getByRole('button', { name: /pay/i }))
     
     expect(screen.getByText(/Debt: \d+ Mk/)).toHaveTextContent(/Debt: \d{1,3} Mk/)
   })
   ```

2. **Fix canLoadSavedSession Sync**
   - Add useEffect that re-checks after save
   - Or derive from store state

### Medium Priority (P1)

3. **Add Wait Action Test**
   ```typescript
   it('advances time when waiting', async () => {
     // Test time slot advancement
   })
   ```

4. **Add Tab Navigation Test**
   ```typescript
   it('switches between tab contents', async () => {
     // Test each tab shows correct content
   })
   ```

### Low Priority (P2)

5. **Add Playwright E2E Tests**
   - Full save/load flow
   - Full debt payment flow
   - Tab navigation persistence

6. **Consider URL-based Tab State**
   - `?tab=operations` for shareable links

---

## 5. Playwright Test Plan

### E2E Critical Paths

```typescript
// dashboard.e2e.test.ts
describe('Dashboard E2E', () => {
  it('completes save/load cycle', async () => {
    await page.goto('/dashboard')
    
    // Navigate to Operations
    await page.click('role=tab[name="Operations"]')
    
    // Save session
    await page.click('role=button[name="Save session"]')
    await expect(page.getByText('Session saved')).toBeVisible()
    
    // Verify load is now enabled
    await expect(page.getByRole('button', { name: 'Load session' })).toBeEnabled()
  })
  
  it('processes debt payment', async () => {
    await page.goto('/dashboard')
    
    // Verify initial debt state
    await expect(page.getByText(/Debt: \d+ Mk/)).toBeVisible()
    
    // Pay debt
    await page.click('role=button[name*="Pay"]')
    
    // Verify debt reduced
    await expect(page.getByText(/Debt: \d+ Mk/)).toBeVisible()
  })
  
  it('advances time with wait action', async () => {
    await page.goto('/dashboard')
    
    // Capture initial time
    const timeBefore = await page.getByText('Day').textContent()
    
    // Wait
    await page.click('role=button[name*="Wait"]')
    
    // Verify time advanced
    const timeAfter = await page.getByText('Day').textContent()
    expect(timeAfter).not.toBe(timeBefore)
  })
})
```

---

## 6. Screenshots Checklist

Nach Playwright-Analyse sollten existieren:

- [ ] `dashboard-initial.png` - First load, Overview tab
- [ ] `dashboard-debt-panel.png` - Debt claim detail view
- [ ] `dashboard-operations-empty.png` - Operations tab, no save
- [ ] `dashboard-operations-saved.png` - Operations tab, after save
- [ ] `dashboard-intelligence-empty.png` - Intelligence tab, no activity
- [ ] `dashboard-intelligence-activity.png` - Intelligence tab, with log entries
- [ ] `dashboard-first-run.png` - First run directive visible
- [ ] `dashboard-debt-paid.png` - Debt settled state
- [ ] `dashboard-debt-crisis.png` - Debt defaulted state

---

## 7. Audit Summary

| Dimension | Score | Notes |
|-----------|-------|-------|
| Playwright Coverage | TBD | Noch nicht durchgeführt |
| Test Quality | 7/10 | Gute Basis, fehlende Debt-Tests |
| Architecture | 8/10 | Clean, minor sync issues |
| Documentation | 8/10 | Tests gut benannt und strukturiert |

### Overall: **Good Foundation, Needs Debt Flow Coverage**

**Next Steps:**
1. Playwright Analysis durchführen
2. Debt Payment Tests hinzufügen
3. canLoadSavedSession Sync Issue fixen
4. Screenshots dokumentieren
