# MCP Server Usage Guidelines — Verknüpft mit STEP-Tickets

## Quick Start für STEP-Tickets

**Bevor du ein STEP-Ticket beginnst:**

1. Lies die MCP-Anweisungen in diesem Dokument
2. Stelle sicher alle 4 MCP Server sind geladen (`.mcp.json`)
3. Folge dem spezifischen Workflow für dein STEP-Ticket
4. Quality Gate (destiny-ynxu) muss ALLES verifizieren bevor Ticket geschlossen wird

## Verknüpfung mit STEP-Tickets

| STEP-Ticket | MCP Server Required | Checkliste |
|-------------|---------------------|------------|
| **destiny-4akk** (STEP 1) | FileSystem, Git | [ ] hasPortraitAvailable gefunden [ ] Code geändert [ ] Git Diff geprüft |
| **destiny-auq5** (STEP 2) | FileSystem, Puppeteer, Playwright, Git | [ ] Alle 4 Dateien gefunden [ ] onError Handler hinzugefügt [ ] Keine 404-Fehler [ ] Screenshot OK |
| **destiny-kp8n** (STEP 5) | FileSystem, Playwright, Git | [ ] Badge-Code gefunden [ ] Entfernt [ ] Screenshot zeigt keine Badges |
| **destiny-mba6** (STEP 6) | FileSystem, Playwright, Git | [ ] DialogueBeatPanel gefunden [ ] Entfernt [ ] Screenshot zeigt keine Panels |
| **destiny-6c3c** (STEP 7) | FileSystem, Playwright, Git | [ ] Quality Bands article gefunden [ ] Entfernt [ ] Screenshot zeigt mehr Platz |

## Verfügbare MCP Server

Dieses Projekt verwendet 4 MCP Server für effiziente Entwicklung und Qualitätssicherung.

### 1. Playwright MCP

**Zweck:** UI-Tests, Screenshots, visuelle Verifikation

**Wann verwenden:**
- Bei allen `ui-ux` gelabelten Beads
- Vor und nach UI-Änderungen Screenshots machen
- DialogueScreen, RecruitmentScreen, District Map Änderungen verifizieren
- Jede visuelle Regression testen

**Beispiel-Workflow:**
```
1. playwright_navigate: "http://localhost:5173/dialogue"
2. playwright_snapshot: { depth: 10, boxes: true }
3. playwright_take_screenshot: { filename: "dialogue-before.png" }
4. Code ändern
5. playwright_take_screenshot: { filename: "dialogue-after.png" }
6. Vergleich der Screenshots
```

**Verbindet mit Beads:**
- destiny-4akk (STEP 1) - Screenshot nach Änderung
- destiny-auq5 (STEP 2) - Verifikation aller Portrait-Platzhalter
- destiny-kp8n (STEP 5) - Badges entfernt?
- destiny-mba6 (STEP 6) - Panels weg?
- destiny-6c3c (STEP 7) - Quality Bands weg?

---

### 2. FileSystem MCP

**Zweck:** Dateisuche, Batch-Operationen, Code-Analyse

**Wann verwenden:**
- Bei allen Code-Änderungen die mehrere Dateien betreffen
- "Finde alle Vorkommen von X" queries
- Batch-Änderungen an vielen Dateien
- Vor Code-Änderungen: Abhängigkeiten verstehen

**Beispiel-queries:**
```
- "Finde alle <img> Tags die /portraits/ laden"
- "Zeige alle Dateien die hasPortraitAvailable importieren"
- "Suche nach 'npc-marion-vale' in allen .tsx Dateien"
- "Liste alle Komponenten die PortraitFallback verwenden"
```

**Verbindet mit Beads:**
- destiny-4akk (STEP 1) - Finde hasPortraitAvailable Definition
- destiny-auq5 (STEP 2) - Finde alle Portrait-Bilder ohne onError
- destiny-kp8n (STEP 5) - Finde dialogue-choice-kind-badge Verwendungen
- destiny-mba6 (STEP 6) - Finde DialogueBeatPanel Referenzen
- destiny-6c3c (STEP 7) - Finde Quality Bands article

---

### 3. Puppeteer MCP

**Zweck:** Alternative Browser-Automation, Network Error Detection

**Wann verwenden:**
- Wenn Playwright nicht verfügbar ist
- Element-spezifische Screenshots (nur Portrait-Bereich)
- Network Request-Logging (404-Fehler für Portraits finden)
- PDF-Generierung von Documentation

**Beispiel-Workflow:**
```
1. puppeteer_navigate: "http://localhost:5173/roster"
2. puppeteer_screenshot: { selector: ".npc-portrait", filename: "portrait.png" }
3. puppeteer_network_requests: { filter: "portraits", static: true }
4. Prüfe auf 404-Fehler
```

**Verbindet mit Beads:**
- destiny-auq5 (STEP 2) - 404-Fehler für fehlende Portraits finden
- destiny-ynxu (Quality Gate) - Network Error Verification

---

### 4. Git MCP

**Zweck:** Code Review, Diff-Ansichten, Commit-Hygiene

**Wann verwenden:**
- Vor jedem Commit: Diff aller Änderungen ansehen
- Quality Gate: Prüfen ob nur erwartete Dateien geändert wurden
- Bei Konflikten: Merge-Status prüfen
- History-Analyse: Wann wurde eine Datei zuletzt geändert?

**Beispiel-Workflow:**
```
1. git_status: Zeige alle geänderten Dateien
2. git_diff: { path: "src/ui/components/portraitUtils.ts" }
3. Prüfe ob Änderungen mit Bead-Scope übereinstimmen
4. git_commit: Wenn alles stimmt
```

**Verbindet mit Beads:**
- destiny-ynxu (Quality Gate) - Primärer Verifier
- ALLE STEP-Beads: Pre-commit verification

---

## MCP Server im Bead-Workflow

### STEP 1: Remove hardcoded portrait allowlist

**Verwendete MCPs:**
1. **FileSystem** - Finde `hasPortraitAvailable` in `portraitUtils.ts`
2. **Playwright** - Screenshot vor/nach (optional, keine visuelle Änderung)
3. **Git** - Diff vor Commit ansehen

**Checkliste:**
- [ ] FileSystem: `grep "hasPortraitAvailable" -r src`
- [ ] Code geändert: `return true` statt Liste
- [ ] Git: Diff zeigt nur erwartete Änderung
- [ ] Playwright: Screenshot von NpcDetailPanel (optional)

---

### STEP 2: Add onError fallback to portrait images

**Verwendete MCPs:**
1. **FileSystem** - Finde alle `<img>` Tags mit `/portraits/`
2. **Puppeteer** - Network Request-Logging für 404-Fehler
3. **Playwright** - Screenshot aller Screens mit Portraits
4. **Git** - Diff aller geänderten Dateien

**Checkliste:**
- [ ] FileSystem: Alle 4 Dateien gefunden (DialogueScreen, NpcDetailPanel, MissionPrepScreen, EventModal)
- [ ] Code geändert: onError Handler auf jedem Bild
- [ ] Puppeteer: Keine 404-Fehler mehr für Portraits
- [ ] Playwright: Screenshots zeigen korrekte Fallbacks
- [ ] Git: Diff zeigt nur erwartete Änderungen

---

### STEP 5: Remove push/ask/commit badges

**Verwendete MCPs:**
1. **FileSystem** - Finde `dialogue-choice-kind-badge` Verwendungen
2. **Playwright** - Screenshot vor/nach (BADGES SOLLTEN WEG SEIN)
3. **Git** - Diff vor Commit

**Checkliste:**
- [ ] FileSystem: Badge-Code gefunden und entfernt
- [ ] Playwright: Screenshot zeigt KEINE Badges mehr
- [ ] Git: Diff zeigt nur erwartete Änderung

---

### STEP 6: Remove Conversation shift panels

**Verwendete MCPs:**
1. **FileSystem** - Finde `DialogueBeatPanel` Referenzen
2. **Playwright** - Screenshot vor/nach (PANELS SOLLTEN WEG SEIN)
3. **Git** - Diff vor Commit

**Checkliste:**
- [ ] FileSystem: Alle Panel-Verweise gefunden und entfernt
- [ ] Playwright: Screenshot zeigt KEINE "Conversation shift" Panels
- [ ] Git: Diff zeigt nur erwartete Änderung

---

### STEP 7: Remove Quality Bands explanation

**Verwendete MCPs:**
1. **FileSystem** - Finde `Quality Bands` article in RecruitmentScreen
2. **Playwright** - Screenshot vor/nach (ARTICLE SOLLTE WEG SEIN)
3. **Git** - Diff vor Commit

**Checkliste:**
- [ ] FileSystem: Article-Block gefunden und entfernt
- [ ] Playwright: Screenshot zeigt mehr Platz für Recrutes
- [ ] Git: Diff zeigt nur erwartete Änderung

---

## Quality Gate Protocol (destiny-ynxu)

Der Quality Gate Aufseher verwendet ALLE MCPs:

### Für jedes abgeschlossene STEP-Ticket:

1. **FileSystem MCP** - Prüfe Code-Änderungen
   - "Zeige den aktuellen Inhalt von [Datei]"
   - "Sind alle erwarteten Änderungen da?"

2. **Playwright MCP** - Visuelle Verifikation
   - "Mache Screenshot von [Screen]"
   - "Sieht die Änderung korrekt aus?"

3. **Puppeteer MCP** - Network Error Check
   - "Liste alle 404-Fehler für /portraits/"
   - "Gibt es noch kaputte Bilder?"

4. **Git MCP** - Diff Review
   - "Zeige diff für [Datei]"
   - "Sind alle Änderungen im Scope?"

### Wenn ALLES stimmt:
- Ticket kann geschlossen werden
- Nächstes STEP-Ticket kann beginnen

### Wenn ETWAS fehlt:
- Ticket OFFEN lassen
- Kommentar mit fehlenden Schritten schreiben
- Entwickler benachrichtigen

---

## MCP Server Installation

Alle Server sind in `.mcp.json` konfiguriert:

```json
{
  "mcpServers": {
    "playwright": { ... },
    "filesystem": { ... },
    "puppeteer": { ... },
    "git": { ... }
  }
}
```

**Neustart erforderlich:** Claude Code neu starten nach Änderungen an `.mcp.json`

---

## Troubleshooting

### MCP Server startet nicht
```bash
# Prüfe ob npx funktioniert
npx -y @modelcontextprotocol/server-filesystem --help

# Installiere neu
rm -rf node_modules/.cache/mcp
```

### Playwright Screenshot zeigt Fehler
```bash
# Dev server muss laufen
pnpm dev

# Port prüfen
lsof -i :5173
```

### Puppeteer 404-Fehler finden
```bash
# Network Request-Filterung
puppeteer_network_requests: { filter: "portraits", static: true }
```

---

## Best Practices

1. **Immer Screenshot vor Änderung** - Für Vergleich
2. **FileSystem zuerst** - Verstehe die Codebase vor Änderung
3. **Git Diff vor Commit** - Keine Überraschungen
4. **Puppeteer für Network Errors** - 404-Fehler finden bevor Spieler sie sehen

---

## Verwandte Dokumentation

- `docs/analysis/ui-forensic-audit-2026-06-29.md` - Complete UI Audit
- `docs/analysis/ui-art-audit-2026-06-29.md` - Art Asset Analysis
- `docs/art-direction.md` - Visual Style Guide
- `CLAUDE.md` - Project Workflow und Engineering Standards
