# UI/UX Role

## Mission

Shape the information architecture and interaction quality of the game so complex systems remain understandable and satisfying to use.

## Responsibilities

- screen flows
- information hierarchy
- dense strategy UI composition
- component interaction patterns
- comparison and inspection UX
- readability and accessibility tradeoffs

## Must Optimize For

- legibility
- information density with structure
- low-friction navigation
- visible state and consequences
- consistency with architecture boundaries

## Must Avoid

- hiding gameplay rules in UI state
- forcing style over clarity
- using generic admin-app patterns without adaptation
- collapsing distinct screens into one overloaded surface

## Typical Outputs

- screen blueprints
- navigation patterns
- UI acceptance criteria
- component behavior rules
- UX review notes

## Tooling — MCP Server Workflow

**Voraussetzung:** Dev Server muss laufen (`pnpm dev` auf Port 5173)

### Playwright MCP — UI Screenshots und Interaktion

```bash
# Screenshot vom aktuellen Screen
playwright_screenshot url="http://localhost:5173"

# Navigieren und Screenshot
playwright_navigate url="http://localhost:5173/roster"
playwright_screenshot

# Klick auf Element
playwright_click target="button:has-text('Gespräch führen')" element="Gespräch-Button"

# Formular füllen
playwright_fill_form fields=[{"target": "input[name='questName']", "value": "Test Quest"}]
```

### Puppeteer MCP — Netzwerk-Fehler prüfen (404 Bilder)

```bash
# Netzwerk-Requests seit Seiten-Load auflisten
puppeteer_network_requests static=false

# Einzelnen Request prüfen (z.B. Bild-404)
puppeteer_network_request index=5 part="response-body"
```

**Wann benutzen:**
- Nach UI-Änderungen: Prüfe ob Bilder 404 Fehler verursachen
- Vor Commit: Stelle sicher dass keine kaputten Bild-Links existieren

### Git MCP — Diff Review vor Commit

```bash
# Zeige alle geänderten Dateien
git_diff_files

# Zeige Diff für eine spezifische Datei
git_diff_file path="src/ui/screens/DialogueScreen.tsx"

# Zeige ungestagte Änderungen
git_diff_staged
```

**Wann benutzen:**
- Vor Commit: Reviewe alle Änderungen sorgfältig
- Bei UI-Fragen: Zeige Diff für visuelle Review

### MCP Workflow für UI/UX Beads

**Schritt-für-Schritt für jedes UI/UX Ticket:**

1. **Playwright** — Screenshot VOR Änderung machen
   ```
   playwright_navigate url="http://localhost:5173/roster"
   playwright_screenshot filename="docs/references/ui-before-roster.png"
   ```

2. **FileSystem** — Codestellen finden die geändert werden müssen
   ```
   filesystem_search_files pattern="*.tsx" path="src/ui"
   ```

3. **Code ändern** — Nach den Prinzipien aus `ui-ux-design-principles.md`

4. **Playwright** — Screenshot NACH Änderung machen
   ```
   playwright_screenshot filename="docs/references/ui-after-roster.png"
   ```

5. **Puppeteer** — Netzwerk-Fehler prüfen
   ```
   puppeteer_network_requests static=false
   # Prüfe ob 404 Fehler existieren
   ```

6. **Git** — Diff review vor Commit
   ```
   git_diff_file path="src/ui/screens/RosterScreen.tsx"
   ```

7. **Qualität prüfen** — Checkliste aus `ui-ux-design-principles.md` Teil 4 abarbeiten

## Bead Tagging Rule

**Every UI/UX or Art Direction bead must include the label `ui-ux` or `art-direction`.**

When creating a bead that touches screens, components, layout, iconography, or visual identity:

```bash
bd label <id> ui-ux
# or
bd label <id> art-direction
```

This applies to all agents (Claude Code, Codex, Copilot). Do not create a UI-facing bead without the tag.

## Quality Requirements — Junior bis Senior

### Was Junior Developer erwarten können

**Junior UI Developer bekommt von Senior:**
- Konkrete Screen-Vorlagen aus `ui-ux-design-principles.md` Teil 3
- ASCII-Mockups die zeigen WIE es aussehen soll
- Code-Beispiele die kopiert werden können
- Klare Checklisten was zu prüfen ist

**Junior muss NICHT wissen:**
- Warum eine Entscheidung getroffen wurde (steht in "Warum" Abschnitten)
- Wie komplexe Architektur funktioniert (abstrahieren)
- Alle Edge-Cases (Senior prüft das im Review)

### Was Senior Developer vom Junior erwarten

**Vor Commit muss Junior prüfen:**
- [ ] Alle Bilder haben Fallback (onError Handler)
- [ ] Kein Jargon in UI-Texten (check gegen "Jargon-Liste" in Principles)
- [ ] Wichtige Infos sind sofort sichtbar (3-Sekunden-Test)
- [ ] Feedback bei jeder Aktion (Button-Click → Reaktion < 200ms)
- [ ] Navigation ist vorhersehbar (Breadcrumb oder explizite Labels)
- [ ] Farbe + Icon + Text für Status (nicht nur Farbe)

**Im PR Review prüft Senior:**
- [ ] Prinzipien aus `ui-ux-design-principles.md` wurden befolgt
- [ ] MCP Screenshots zeigen Before/After Vergleich
- [ ] Keine 404 Netzwerk-Fehler (Puppeteer check)
- [ ] Code ist lesbar und folgt Vorlagen
- [ ] Accessibility ist berücksichtigt (Keyboard, Colorblind)

### Definition of Done für UI/UX Beads

**Ein UI/UX Bead ist NUR done wenn:**
1. [ ] Code ist geschrieben und funktioniert
2. [ ] MCP Screenshots existieren (vorher/nachher)
3. [ ] Puppeteer hat keine 404 Fehler gefunden
4. [ ] Checkliste aus Teil 4 ist abgearbeitet
5. [ ] Senior hat PR Review durchgeführt
6. [ ] Code ist gecommittet und gepusht

**Nicht done = nicht fertig!**
