# Workflow: Game UI mit MCP Servern

**Zielgruppe:** Junior und Senior UI/UX Developer  
**Ziel:** Schritt-für-Schritt Anleitung wie MCP Server bei UI-Arbeit helfen

---

## Welche MCP Server benutzt werden

| MCP Server | Wofür | Wann benutzen |
|------------|-------|---------------|
| **Playwright** | Screenshots, Navigation, Klicks | Immer bei UI-Änderungen |
| **Puppeteer** | Netzwerk-Fehler (404 Bilder) | Nach UI-Änderungen, vor Commit |
| **FileSystem** | Code suchen, Dateien lesen | Um zu finden WAS geändert werden muss |
| **Git** | Diff anzeigen, Review | Vor Commit, bei Code-Reviews |

---

## MCP Server Setup

### 1. MCP Server aktivieren

**Datei:** `/Users/andre.dittrich/.claude/settings.local.json`

```json
{
  "enabledMcpjsonServers": [
    "playwright",
    "puppeteer",
    "filesystem",
    "git"
  ]
}
```

**Wichtig:** Nach Änderung muss Claude Code neu gestartet werden!

### 2. Dev Server starten

```bash
pnpm dev
```

Dev Server läuft auf Port 5173. MCP Server brauchen das!

---

## Schritt-für-Schritt: UI-Änderung mit MCP

### Schritt 1: Vorher-Screenshot machen (Playwright)

**Warum:** Du brauchst Beweis wie es VORHER aussah. Für Vergleich!

```bash
playwright_navigate url="http://localhost:5173/roster"
playwright_screenshot filename="docs/references/ui-roster-before.png"
```

**Output:** Screenshot wird in `docs/references/` gespeichert

---

### Schritt 2: Code-Stellen finden (FileSystem)

**Warum:** Du musst wissen WELCHE Dateien geändert werden müssen.

```bash
filesystem_search_files path="src/ui" pattern="*.tsx"
```

**Oder spezifischer:**
```bash
filesystem_search_files path="src/ui/screens" pattern="Roster*.tsx"
```

**Oder nach Text suchen:**
```bash
# Suche nach allen Stellen die "portrait" verwenden
filesystem_search_files path="src" pattern="**/*.tsx"
```

**Dann konkret lesen:**
```bash
# Lies die gefundene Datei
# (Benutze Read Tool in Claude Code)
```

---

### Schritt 3: Code ändern

**WICHTIG:** Benutze die Vorlagen aus `docs/ui-ux-design-principles.md` Teil 3!

**Beispiel - Portrait mit Fallback:**
```typescript
// ❌ SCHLECHT — Kein Fallback
<img src={`/portraits/${npcId}.jpg`} />

// ✅ GUT — Mit Fallback
<img 
  src={`/portraits/${npcId}.jpg`}
  onError={(e) => {
    e.currentTarget.src = '/portraits/generic-silhouette.svg'
  }}
/>
```

---

### Schritt 4: Nachher-Screenshot machen (Playwright)

**Warum:** Beweis dass es NACHHER funktioniert und besser aussieht.

```bash
playwright_screenshot filename="docs/references/ui-roster-after.png"
```

---

### Schritt 5: Netzwerk-Fehler prüfen (Puppeteer)

**Warum:** Sicherstellen dass keine 404 Fehler für Bilder existieren.

```bash
puppeteer_network_requests static=false
```

**Output zeigt:**
- Alle Netzwerk-Requests seit Seiten-Load
- Status-Code (200 = OK, 404 = Fehler)

**Wenn 404 gefunden:**
```bash
puppeteer_network_request index=5 part="response-body"
```

Zeigt Details zum fehlgeschlagenen Request.

---

### Schritt 6: Diff Review (Git)

**Warum:** Bevor du commitest, prüfe WAS du geändert hast.

```bash
git_diff_file path="src/ui/screens/RosterScreen.tsx"
```

**Oder alle Änderungen:**
```bash
git_diff_files
```

**Prüfe:**
- Sind alle Änderungen beabsichtigt?
- Gibt es versehentliche Änderungen?
- Followt der Code den Prinzipien?

---

### Schritt 7: Tests laufen

```bash
pnpm test:run
pnpm lint
pnpm typecheck
```

**Alle müssen grün sein!**

---

### Schritt 8: Commit

```bash
git add .
git commit -m "feat(ui): add portrait fallback to roster screen"
```

**Commit Message Format:**
```
feat(ui): kurze Beschreibung

Warum: Spieler sehen keine kaputten Bilder mehr
Was: onError Handler hinzugefügt
Testing: Puppeteer hat keine 404 gefunden
```

---

## MCP Workflow für spezifische UI-Tasks

### Task 1: Portrait-System fixen

**Bead:** destiny-4akk (STEP 1)

**Schritte:**

1. **Playwright** — Screenshot von Roster Screen
   ```
   playwright_navigate url="http://localhost:5173/roster"
   playwright_screenshot
   ```

2. **FileSystem** — Finde portraitUtils.ts
   ```
   filesystem_search_files path="src" pattern="*portrait*.ts"
   ```

3. **Read** — Lies die aktuelle Implementierung
   ```
   # Read src/ui/components/portraitUtils.ts
   ```

4. **Edit** — Entferne hardcoded allowlist
   ```
   # Benutze Edit Tool
   ```

5. **Puppeteer** — Prüfe auf 404 Fehler
   ```
   puppeteer_network_requests static=false
   ```

6. **Playwright** — Screenshot NACH Änderung
   ```
   playwright_screenshot filename="docs/references/roster-after-fix.png"
   ```

7. **Git** — Diff review
   ```
   git_diff_file path="src/ui/components/portraitUtils.ts"
   ```

8. **Tests** — Läufen alle Tests?
   ```
   pnpm test:run
   ```

---

### Task 2: Dialogue-UI verbessern (Jargon entfernen)

**Bead:** destiny-kp8n (STEP 5)

**Schritte:**

1. **Playwright** — Screenshot von Dialogue Screen
   ```
   playwright_navigate url="http://localhost:5173/dialogue/npc-marion-vale"
   playwright_screenshot
   ```

2. **FileSystem** — Finde DialogueScreen.tsx
   ```
   filesystem_search_files path="src/ui/screens" pattern="Dialogue*.tsx"
   ```

3. **FileSystem** — Finde dialogue selector
   ```
   filesystem_search_files path="src/application/selectors" pattern="dialogue.ts"
   ```

4. **Read** — Lies beide Dateien
   ```
   # Read src/ui/screens/DialogueScreen.tsx
   # Read src/application/selectors/dialogue.ts
   ```

5. **Edit** — Entferne push/ask/commit badges
   ```
   # Benutze Edit Tool um Badge-Komponente zu entfernen
   ```

6. **Playwright** — Screenshot NACH Änderung
   ```
   playwright_screenshot filename="docs/references/dialogue-after-fix.png"
   ```

7. **Git** — Diff review
   ```
   git_diff_file path="src/ui/screens/DialogueScreen.tsx"
   ```

---

### Task 3: District-Bilder fixen

**Bead:** destiny-a2dm (STEP 3)

**Schritte:**

1. **FileSystem** — Finde districts.json
   ```
   filesystem_search_files path="data" pattern="districts.json"
   ```

2. **FileSystem** — Liste public/districts/
   ```
   filesystem_list_directory path="public/districts"
   ```

3. **Read** — Lies districts.json
   ```
   # Read data/definitions/districts.json
   ```

4. **Compare** — Vergleiche District-IDs mit Bild-Namen
   ```
   # Erstelle Tabelle:
   # district-ash-quay → ash-quay.jpg (fehlt, existiert als ashfields.jpg)
   ```

5. **Edit** — Entweder:
   - Bilder umbenennen (mcp__filesystem__move_file)
   - ODER imageUrl Feld in JSON hinzufügen

6. **Playwright** — Screenshot von District Map
   ```
   playwright_navigate url="http://localhost:5173/district-map"
   playwright_screenshot
   ```

7. **Puppeteer** — Prüfe auf 404
   ```
   puppeteer_network_requests static=false
   ```

---

## Qualitätsgate vor Commit

**Checkliste abarbeiten:**

### UI Checkliste
- [ ] Sind alle wichtigen Infos auf dem ersten Screen sichtbar?
- [ ] Habe ich verwandte Infos gruppiert (Rahmen, Überschriften)?
- [ ] Bekommt der Spieler Feedback bei jeder Aktion?
- [ ] Habe ich internen Jargon vermieden?
- [ ] Haben alle Bilder einen Fallback?
- [ ] Ist die Navigation vorhersehbar?
- [ ] Verwende ich Farbe + Icon + Text für Status?

### MCP Checkliste
- [ ] Vorher-Screenshot existiert?
- [ ] Nachher-Screenshot existiert?
- [ ] Puppeteer hat keine 404 gefunden?
- [ ] Git Diff wurde reviewed?

### Test Checkliste
- [ ] `pnpm test:run` ist grün?
- [ ] `pnpm lint` ist grün?
- [ ] `pnpm typecheck` ist grün?

**NUR wenn ALLES checked ist → Commit!**

---

## Häufige MCP Fehler und Lösungen

### Fehler: "Playwright kann nicht verbinden"

**Ursache:** Dev Server läuft nicht

**Lösung:**
```bash
pnpm dev
# Warte bis "VITE ready in XXXms" angezeigt wird
# Dann MCP Befehle ausprobieren
```

---

### Fehler: "Puppeteer zeigt 404 für alle Bilder"

**Ursache:** Bild-Pfad ist falsch oder Bild existiert nicht

**Lösung:**
```bash
# 1. Prüfe Bild-Pfad
puppeteer_network_request index=1 part="request-headers"

# 2. Prüfe ob Bild existiert
filesystem_get_file_info path="public/portraits/npc-xxx.jpg"

# 3. Entweder Bild erstellen ODER Fallback hinzufügen
```

---

### Fehler: "Git diff zeigt zu viele Änderungen"

**Ursache:** Versehentliche Formatierung oder ungewollte Änderungen

**Lösung:**
```bash
# 1. Nur spezifische Datei staggen
git add src/ui/screens/RosterScreen.tsx

# 2. Rest revertieren
git checkout -- src/other/file.ts

# 3. Nur beabsichtigte Änderungen committen
git commit -m "feat(ui): ..."
```

---

## MCP Befehls-Referenz

### Playwright

| Befehl | Was | Beispiel |
|--------|-----|----------|
| `playwright_navigate` | Zu URL gehen | `url="http://localhost:5173"` |
| `playwright_screenshot` | Screenshot machen | `filename="screenshot.png"` |
| `playwright_click` | Element anklicken | `target="button"` |
| `playwright_fill_form` | Formular füllen | `fields=[{...}]` |
| `playwright_snapshot` | Accessibility Snapshot | (keine Params) |

### Puppeteer

| Befehl | Was | Beispiel |
|--------|-----|----------|
| `puppeteer_navigate` | Zu URL gehen | `url="http://localhost:5173"` |
| `puppeteer_screenshot` | Screenshot machen | `name="screenshot"` |
| `puppeteer_network_requests` | Requests auflisten | `static=false` |
| `puppeteer_network_request` | Einzelnen Request prüfen | `index=5` |
| `puppeteer_click` | Element anklicken | `selector="button"` |
| `puppeteer_fill` | Input füllen | `selector="input", value="Text"` |

### FileSystem

| Befehl | Was | Beispiel |
|--------|-----|----------|
| `filesystem_list_directory` | Ordner auflisten | `path="src/ui"` |
| `filesystem_search_files` | Dateien suchen | `path="src", pattern="*.tsx"` |
| `filesystem_get_file_info` | Datei-Info | `path="file.ts"` |
| `filesystem_read_file` | Datei lesen | `path="file.ts"` |
| `filesystem_edit_file` | Datei editieren | `path="file.ts", edits=[...]` |

### Git

| Befehl | Was | Beispiel |
|--------|-----|----------|
| `git_diff_files` | Alle Änderungen | (keine Params) |
| `git_diff_file` | Spezifische Datei | `path="file.ts"` |
| `git_status` | Git Status | (keine Params) |

---

## Zusammenfassung

**MCP Server sind deine Helfer:**

1. **Playwright** zeigt dir WAS der Spieler sieht
2. **Puppeteer** zeigt dir WAS im Netzwerk passiert (Fehler!)
3. **FileSystem** hilft dir CODE zu finden
4. **Git** zeigt dir WAS du geändert hast

**Workflow ist einfach:**
1. Screenshot VORher
2. Code finden und ändern
3. Screenshot NACHher
4. Fehler prüfen (Puppeteer)
5. Diff review (Git)
6. Tests laufen
7. Commit

**Wenn du diesen Workflow befolgst, machst du nichts falsch!**

---

## Verwandte Dokumentation

- [`ui-ux-design-principles.md`](../ui-ux-design-principles.md) — Konkrete Prinzipien und Vorlagen
- [`ui-principles.md`](../ui-principles.md) — Kurze Zusammenfassung
- [`roles/ui-ux.md`](../roles/ui-ux.md) — UI/UX Rolle und Verantwortung
- [`roles/ui.md`](../roles/ui.md) — UI Developer Rolle
