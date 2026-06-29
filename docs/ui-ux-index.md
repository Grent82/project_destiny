# UI/UX Dokumentation — Master Index

**Willkommen zur UI/UX Dokumentation für Project Destiny!**

Diese Index-Datei hilft dir die richtigen Dokumente für deine Aufgabe zu finden.

---

## Ich bin...

### ...Junior Developer und brauche konkrete Anleitung

**Starte hier:**
1. [`ui-ux-design-principles.md`](./ui-ux-design-principles.md) — **LESE DAS ZUERST!** Kind-erklärungen, ASCII-Mockups, Code-Vorlagen
2. [`ui-ux-cheat-sheet.md`](./ui-ux-cheat-sheet.md) — Schnelle Code-Snippets und Checklisten
3. [`workflows/ui-ux-with-mcp.md`](./workflows/ui-ux-with-mcp.md) — Schritt-für-Schritt MCP Workflow

**Du brauchst wissen:**
- Wie man Bilder mit Fallback lädt → Cheat Sheet, Abschnitt "Wie mache ich ein Portrait mit Fallback?"
- Wie man Status anzeigt → Cheat Sheet, Abschnitt "Wie zeige ich Status mit Farbe + Icon + Text?"
- Wie man MCP Server benutzt → `workflows/ui-ux-with-mcp.md`
- Was vor Commit zu prüfen ist → Beide Dokumente haben Checklisten

---

### ...Senior Developer und mache Review

**Starte hier:**
1. [`ui-principles.md`](./ui-principles.md) — Kurze Zusammenfassung der Prinzipien
2. [`ui-ux-design-principles.md`](./ui-ux-design-principles.md) — Teil 4 (Checkliste) für Review-Kriterien
3. [`roles/ui-ux.md`](./roles/ui-ux.md) — Section "Was Senior Developer vom Junior erwarten"

**Du brauchst wissen:**
- Definition of Done → `roles/ui-ux.md` Section "Definition of Done für UI/UX Beads"
- Review-Kriterien → `ui-ux-design-principles.md` Teil 4
- MCP Workflow für Review → `workflows/ui-ux-with-mcp.md`

---

### ...auf der Suche nach spezifischem Thema

#### Portrait-System
- **Problem:** Bilder laden mit Fallback
- **Lösung:** `ui-ux-design-principles.md` Teil 2, Regel 5 + Cheat Sheet Code-Snippet
- **Audit:** `analysis/ui-forensic-audit-2026-06-29.md` Finding 1

#### Jargon in UI entfernen
- **Problem:** "push/ask/commit" badges zeigen interne Mechanik
- **Lösung:** `ui-ux-design-principles.md` Teil 2, Regel 4
- **Audit:** `analysis/ui-forensic-audit-2026-06-29.md` Finding 3

#### Informations-Gruppierung
- **Problem:** Zu viele Infos unstrukturiert
- **Lösung:** `ui-ux-design-principles.md` Teil 2, Regel 2 + Vorlagen
- **Prinzip:** `ui-principles.md` Section "Density with structure"

#### Navigation
- **Problem:** "Zurück"-Button unvorhersehbar
- **Lösung:** `ui-ux-design-principles.md` Teil 2, Regel 6
- **Code:** Cheat Sheet Abschnitt "Wie mache ich eine Breadcrumb Navigation?"

#### Netzwerk-Fehler (404 Bilder)
- **Problem:** Kaputte Bild-Links verursachen Console-Fehler
- **Lösung:** `ui-ux-design-principles.md` Teil 2, Regel 5
- **MCP:** `workflows/ui-ux-with-mcp.md` Schritt 5 (Puppeteer)

---

## Dokumenten-Hierarchie

```
ui-ux-index.md (DU BIST HIER)
│
├── Schnellzugriff
│   ├── ui-ux-cheat-sheet.md — Code-Snippets, 1 Seite
│   └── workflows/ui-ux-with-mcp.md — MCP Schritt-für-Schritt
│
├── Hauptdokumente
│   ├── ui-ux-design-principles.md — Ausführliche Anleitung (Kindgerecht!)
│   └── ui-principles.md — Kurze Zusammenfassung
│
├── Rollen
│   ├── roles/ui-ux.md — UI/UX Designer Rolle
│   └── roles/ui.md — UI Developer Rolle
│
├── Audit & Quality
│   ├── analysis/ui-forensic-audit-2026-06-29.md — Aktuelle Probleme
│   └── analysis/ui-art-audit-2026-06-29.md — Art Asset Status
│
└── Referenzen
    ├── art-direction.md — Visuelle Richtung
    └── workflows/game-ui.md — Allgemeiner UI Workflow
```

---

## Neue Dokumente (diese Session erstellt)

| Dokument | Zweck | Zielgruppe |
|----------|-------|------------|
| `ui-ux-design-principles.md` | Ausführliche Anleitung mit Kind-erklärungen | Juniors |
| `ui-ux-cheat-sheet.md` | Quick Reference mit Code-Snippets | Alle |
| `workflows/ui-ux-with-mcp.md` | MCP Server Schritt-für-Schritt | Juniors + Seniors |
| `ui-ux-index.md` | Diese Index-Datei | Alle |

---

## Updates zu bestehenden Dokumenten

Diese Dokumente wurden aktualisiert um auf neue Dokumente zu verweisen:

- `ui-principles.md` — Verweise auf neue Dokumente + Quick Reference
- `art-direction.md` — Verweis auf `ui-ux-design-principles.md`
- `roles/ui-ux.md` — MCP Workflow + Quality Requirements
- `roles/ui.md` — MCP Workflow + Quality Checklist
- `analysis/ui-forensic-audit-2026-06-29.md` — Verweise auf neue Dokumente

---

## Wie verwende ich diese Dokumentation?

### Für UI/UX Arbeit (Beads)

1. **Bead lesen** — Was muss gemacht werden?
2. **Index öffnen** — Welches Dokument brauche ich?
3. **Hauptdokument lesen** — `ui-ux-design-principles.md` für Prinzipien
4. **Cheat Sheet** — Code-Snippets kopieren
5. **MCP Workflow** — Schritt-für-Schritt abarbeiten
6. **Checkliste** — Vor Commit alle Punkte abhaken

### Für Code Review

1. **PR öffnen** — Git Diff ansehen
2. **Checkliste prüfen** — `ui-ux-design-principles.md` Teil 4
3. **MCP Screenshots** — Vorher/Nachher Vergleich
4. **Puppeteer** — Keine 404 Fehler
5. **Tests** — `pnpm test:run` grün

### Für Audit/Forensik

1. **Audit lesen** — `analysis/ui-forensic-audit-2026-06-29.md`
2. **Beads finden** — STEP-by-STEP Implementation Plan
3. **MCP nutzen** — Puppeteer für 404, Playwright für Screenshots

---

## FAQ

### Wo finde ich Code-Beispiele?

→ `ui-ux-design-principles.md` Teil 3 (Vorlagen) oder `ui-ux-cheat-sheet.md`

### Wie benutze ich MCP Server?

→ `workflows/ui-ux-with-mcp.md` — Schritt-für-Schritt Anleitung

### Was muss ich vor Commit prüfen?

→ `ui-ux-design-principles.md` Teil 4 ODER `ui-ux-cheat-sheet.md` Checkliste

### Wo steht was über Portrait-Fallback?

→ `ui-ux-design-principles.md` Teil 2, Regel 5 + Cheat Sheet Code-Snippet

### Wie prüfe ich auf 404 Fehler?

→ `workflows/ui-ux-with-mcp.md` Schritt 5 (Puppeteer)

### Was ist "Definition of Done" für UI Beads?

→ `roles/ui-ux.md` Section "Definition of Done für UI/UX Beads"

---

## Verwandte Dokumentation

**Nicht UI-spezifisch:**
- `CLAUDE.md` — Project workflow and engineering standards
- `engineering-standards.md` — Architecture and code quality
- `art-direction.md` — Visuelle Richtung (ergänzt UI-Prinzipien)

**MCP Usage:**
- `mcp-usage-guidelines.md` — Allgemeine MCP Guidelines

**Workflows:**
- `workflows/game-ui.md` — Allgemeiner UI Workflow (ohne MCP Details)

---

**Letzte Aktualisierung:** 2026-06-30  
**Dokumente:** 4 neu erstellt, 5 aktualisiert
