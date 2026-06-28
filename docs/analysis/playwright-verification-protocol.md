# Playwright Verification Protocol — Verbindlich

Dieses Protocol **muss** für jeden Audit-Bead vollständig durchlaufen werden. Keine Ausnahmen.

---

## Kernregel

**Ein Bead ist NICHT abgeschlossen ohne:**
1. Playwright-Screenshot von JEDER Interaktion
2. Konkrete Nachweise dass Tests funktionieren
3. Explizite Bestätigung aller kritischen Pfade

**Wenn ein Agent das nicht liefert, ist das Bead INVALID und muss neu gemacht werden.**

---

## Protocol für Dialogue System

### Schritt 1: Initial State Verifikation

```
playwright_navigate: "http://localhost:5173/dialogue"
playwright_snapshot: { depth: 10, boxes: true }
playwright_take_screenshot: { filename: "dialogue-no-active-conversation.png" }
```

**Verifizierungspunkte:**
- [ ] Screenshot zeigt "No active conversation"
- [ ] "Leave" Button ist sichtbar
- [ ] Keine Console Errors im snapshot

**Beweis:** Screenshot muss im Bead-Notes verlinkt sein

---

### Schritt 2: Dialogue Tree Navigation

**Voraussetzung:** Aktive Conversation muss ausgelöst werden (z.B. über CorridorScreen oder HouseScreen)

```
# Navigiere zu einem Ort wo Dialogue möglich ist
playwright_navigate: "http://localhost:5173/house"
playwright_snapshot: { depth: 10 }

# Finde und klicke Dialogue-Trigger
playwright_click: { target: "button:has-text('Talk')", element: "NPC Talk Button" }
```

**Verifizierungspunkte:**
- [ ] DialogueScreen lädt
- [ ] NPC-Porträt ist sichtbar
- [ ] Dialogue-Line ist lesbar
- [ ] Choices sind angezeigt

**Beweis:**
- [ ] Screenshot: `dialogue-active-conversation-start.png`
- [ ] Snapshot zeigt alle Choice-Buttons

---

### Schritt 3: Jede Choice Ausführen

**Für JEDEN Choice-Button:**

```
# Choice 1
playwright_click: { target: "[data-choice-kind='greeting']", element: "Greeting choice" }
playwright_wait_for: { time: 1 }
playwright_take_screenshot: { filename: "dialogue-choice-greeting-result.png" }

# Choice 2 (wenn vorhanden)
playwright_click: { target: "[data-choice-kind='question']", element: "Question choice" }
playwright_take_screenshot: { filename: "dialogue-choice-question-result.png" }
```

**Verifizierungspunkte:**
- [ ] Nach jeder Choice: Neue Line erscheint
- [ ] "Conversation shift" Panel zeigt Effekt
- [ ] State-Changes sind sichtbar (falls applicable)

**Beweis:**
- [ ] Screenshot von JEDER Choice
- [ ] Liste aller Choices die getestet wurden

---

### Schritt 4: Relationship Changes Verifizieren

```
# Vor Dialogue: Relationship State notieren
playwright_evaluate: { function: "() => window.__REDUX_DEVTOOLS_EXTENSION__.getState()?.dialogue?.relationshipState" }

# Dialogue durchführen
playwright_click: { target: "[data-choice-kind='flirt']", element: "Flirt choice" }

# Nach Dialogue: Relationship State prüfen
playwright_evaluate: { function: "() => window.__REDUX_DEVTOOLS_EXTENSION__.getState()?.dialogue?.relationshipState" }
```

**Verifizierungspunkte:**
- [ ] Relationship State hat sich geändert
- [ ] Change ist im State sichtbar

**Beweis:**
- [ ] Before/After State im Bead-Notes
- [ ] Screenshot: `dialogue-relationship-change.png`

---

### Schritt 5: Quest Triggers Verifizieren

```
# Vor Dialogue: Quest State notieren
playwright_evaluate: { function: "() => window.__REDUX_DEVTOOLS_EXTENSION__.getState()?.quests?.activeQuests" }

# Dialogue mit Quest-Trigger durchführen
playwright_click: { target: "[data-choice-kind='reveal']", element: "Reveal choice" }

# Nach Dialogue: Quest State prüfen
playwright_evaluate: { function: "() => window.__REDUX_DEVTOOLS_EXTENSION__.getState()?.quests?.activeQuests" }
```

**Verifizierungspunkte:**
- [ ] Quest Stage hat sich geändert
- [ ] Neue Quest ist aktiviert (falls applicable)

**Beweis:**
- [ ] Before/After Quest State im Bead-Notes
- [ ] Screenshot: `dialogue-quest-trigger.png`

---

### Schritt 6: Dialogue Ende

```
playwright_click: { target: "button:has-text('Leave')", element: "Leave button" }
playwright_take_screenshot: { filename: "dialogue-after-leave.png" }
```

**Verifizierungspunkte:**
- [ ] Zurück zum vorherigen Screen
- [ ] "Conversation shift" Panel ist sichtbar (falls closingBeat)

**Beweis:**
- [ ] Screenshot nach Leave

---

## Protocol für Quest System

### Schritt 1: Mission Prep Screen - Initial State

```
playwright_navigate: "http://localhost:5173/contracts"
playwright_snapshot: { depth: 10 }
```

**Verifizierungspunkte:**
- [ ] Contract List ist sichtbar
- [ ] Mindestens ein Contract ist vorhanden

**Beweis:**
- [ ] Screenshot: `quest-contract-board-initial.png`

---

### Schritt 2: Contract Accept

```
playwright_click: { target: "[data-testid='accept-contract']", element: "Accept contract button" }
playwright_wait_for: { time: 1 }
playwright_take_screenshot: { filename: "quest-contract-accepted.png" }
```

**Verifizierungspunkte:**
- [ ] Contract ist jetzt in "Active Contracts"
- [ ] Mission Prep Screen ist erreichbar

**Beweis:**
- [ ] Screenshot: Contract in Active List
- [ ] Screenshot: `quest-mission-prep-accessible.png`

---

### Schritt 3: Mission Prep - Squad Selection

```
# Navigiere zu Mission Prep
playwright_navigate: "http://localhost:5173/missions/quest-harborwatch"
playwright_snapshot: { depth: 10 }

# Füge Squad Member hinzu
playwright_click: { target: "button:has-text('Add to squad')", element: "Add NPC to squad" }
playwright_take_screenshot: { filename: "quest-squad-added.png" }
```

**Verifizierungspunkte:**
- [ ] Squad size hat sich erhöht
- [ ] NPC ist in "The Deployed" Liste
- [ ] Cohesion hat sich aktualisiert

**Beweis:**
- [ ] Screenshot: Squad mit Member
- [ ] Screenshot: `quest-squad-selection-complete.png`

---

### Schritt 4: Mission Prep - Location Check

```
# Prüfe "isOnSite" State
playwright_snapshot: { depth: 10 }

# Wenn nicht on-site: Travel Button prüfen
playwright_click: { target: "button:has-text('Travel to')", element: "Travel button" }
playwright_take_screenshot: { filename: "quest-travel-initiated.png" }
```

**Verifizierungspunkte:**
- [ ] Travel führt zum District
- [ ] Quest State hat sich auf "traveling" aktualisiert

**Beweis:**
- [ ] Screenshot: District nach Travel
- [ ] Screenshot: `quest-travel-complete.png`

---

### Schritt 5: Mission Prep - Commit Squad

```
# Commit Button sollte enabled sein wenn on-site und squad ready
playwright_click: { target: "button:has-text('Commit squad')", element: "Commit squad button" }
playwright_wait_for: { time: 1 }
playwright_take_screenshot: { filename: "quest-combat-initiated.png" }
```

**Verifizierungspunkte:**
- [ ] Navigiert zu /combat
- [ ] Quest State hat sich auf "engaged" aktualisiert

**Beweis:**
- [ ] Screenshot: Combat Screen nach Commit

---

### Schritt 6: Quest Completion (falls im Flow)

```
# Nach Combat: Quest Return Screen
playwright_navigate: "http://localhost:5173/expedition-return"
playwright_snapshot: { depth: 10 }
playwright_take_screenshot: { filename: "quest-completion.png" }
```

**Verifizierungspunkte:**
- [ ] Quest ist abgeschlossen
- [ ] Rewards sind angezeigt
- [ ] Journal Entry ist aktualisiert

**Beweis:**
- [ ] Screenshot: Quest Completion
- [ ] Screenshot: Journal Entry

---

## Mandatory Evidence Checklist

Für jeden Bead **müssen** diese Punkte im Notes sein:

### Dialogue Bead
```markdown
## Playwright Evidence

### Screenshots Captured
- [ ] dialogue-no-active-conversation.png
- [ ] dialogue-active-conversation-start.png
- [ ] dialogue-choice-1-result.png
- [ ] dialogue-choice-2-result.png (wenn applicable)
- [ ] dialogue-relationship-change.png
- [ ] dialogue-quest-trigger.png
- [ ] dialogue-after-leave.png

### State Verifications
- [ ] Relationship State Before: {copy state}
- [ ] Relationship State After: {copy state}
- [ ] Quest State Before: {copy state}
- [ ] Quest State After: {copy state}

### Console Errors
- {list errors or "none"}
```

### Quest Bead
```markdown
## Playwright Evidence

### Screenshots Captured
- [ ] quest-contract-board-initial.png
- [ ] quest-contract-accepted.png
- [ ] quest-mission-prep-accessible.png
- [ ] quest-squad-selection-complete.png
- [ ] quest-travel-complete.png
- [ ] quest-combat-initiated.png
- [ ] quest-completion.png

### State Verifications
- [ ] Quest State nach Accept: {copy state}
- [ ] Quest State nach Travel: {copy state}
- [ ] Quest State nach Commit: {copy state}
- [ ] Quest State nach Completion: {copy state}

### Console Errors
- {list errors or "none"}
```

---

## Invalid Bead Criteria

Ein Bead ist **INVALID** wenn:

1. **Keine Screenshots** - Mindestens 3 Screenshots pro Screen fehlen
2. **Keine State Verifikation** - Before/After State nicht dokumentiert
3. **Keine Console Check** - Console Errors nicht geprüft
4. **Vage Beschreibungen** - "Tests funktionieren" ohne Beweise
5. **Missing Critical Paths** - Haupt-Flow nicht vollständig getestet

**Folge:** Bead muss neu gemacht werden mit komplettem Protocol

---

## Execution Order

1. **Dev Server starten:** `pnpm dev`
2. **Playwright MCP verbinden:** Navigiere zu `http://localhost:5173`
3. **Protocol Schritt-für-Schritt durchgehen**
4. **Jeden Screenshot speichern** in `docs/analysis/screenshots/<area>/`
5. **State Verifikationen** in Bead-Notes kopieren
6. **Bead schließen** NACH komplettem Protocol

---

## Quality Gate

**BEVOR Bead geschlossen wird:**

```bash
# 1. Screenshots zählen
ls docs/analysis/screenshots/dialogue/ | wc -l  # Sollte >= 7 sein
ls docs/analysis/screenshots/quests/ | wc -l    # Sollte >= 7 sein

# 2. Bead-Notes prüfen
bd show <bead-id>  # Muss alle Evidence Punkte haben

# 3. Tests laufen (wenn möglich)
pnpm test DialogueScreen  # Sollte grün sein
pnpm test MissionPrepScreen  # Sollte grün sein
```

Wenn einer dieser Checks fehlschlägt: **Bead NICHT schließen**
