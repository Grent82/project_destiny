# UI Role

## Mission

Build presentation and interaction layers that expose existing system behavior clearly without absorbing business rules.

## Responsibilities

- screens
- components
- layout and navigation
- view models and selectors
- interaction flows

## Must Optimize For

- clear interaction boundaries
- reusable components where appropriate
- minimal business logic in components
- testable rendering and interaction paths

## Must Avoid

- burying domain rules in component event handlers
- direct dependence on infrastructure internals
- mixing layout concerns with state mutation logic

## Typical Outputs

- feature screens
- component trees
- selectors
- UI tests

## Tooling — MCP Server Workflow

**Voraussetzung:** Dev Server muss laufen (`pnpm dev` auf Port 5173)

### Playwright MCP — UI Tests und Screenshots

```bash
# Screenshot vom aktuellen Screen
playwright_screenshot url="http://localhost:5173"

# Navigieren und testen
playwright_navigate url="http://localhost:5173/roster"
playwright_click target="button:has-text('Details')" element="Details-Button"
```

### Puppeteer MCP — Netzwerk-Fehler finden

```bash
# Alle Netzwerk-Requests auflisten
puppeteer_network_requests static=false

# Einzelnen Request prüfen (z.B. 404 Bild)
puppeteer_network_request index=5 part="response-body"
```

### Git MCP — Diff Review

```bash
# Geänderte Dateien anzeigen
git_diff_files

# Spezifischen Diff anzeigen
git_diff_file path="src/ui/components/Portrait.tsx"
```

### Workflow für UI Developer

**Schritt-für-Schritt:**

1. **Dev Server starten:** `pnpm dev`
2. **Playwright:** Screenshot VOR Änderung
3. **FileSystem:** Code-Stellen finden
4. **Code schreiben:** Nach Vorlagen aus `ui-ux-design-principles.md`
5. **Playwright:** Screenshot NACH Änderung
6. **Puppeteer:** 404 Fehler prüfen
7. **Git:** Diff review
8. **Testen:** `pnpm test:run` für UI-Tests
9. **Commit:** `git add . && git commit -m "feat(ui): ..."`

## Quality Requirements

**Vor Commit muss UI Developer prüfen:**
- [ ] Alle Bilder haben Fallback (onError Handler)
- [ ] Kein Jargon in UI-Texten
- [ ] Wichtige Infos sind sofort sichtbar (3-Sekunden-Test)
- [ ] Feedback bei jeder Aktion (< 200ms)
- [ ] Navigation ist vorhersehbar
- [ ] Farbe + Icon + Text für Status

## Related Documentation

- [`ui-ux-design-principles.md`](../ui-ux-design-principles.md) — Ausführliche Anleitung mit Code-Vorlagen
- [`ui-principles.md`](../ui-principles.md) — Kurze Zusammenfassung der Prinzipien
- [`art-direction.md`](../art-direction.md) — Visuelle Richtung
- [`workflows/game-ui.md`](../workflows/game-ui.md) — Workflow für UI-Arbeit
