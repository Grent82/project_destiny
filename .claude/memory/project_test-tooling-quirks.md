---
name: project_test-tooling-quirks
description: Tooling-Eigenheiten — vitest unterdrückt Console-Output, Playwright-MCP-Screenshots landen nicht im Repo
metadata:
  type: project
---

**Fakt 1 — vitest schluckt console.log:** Die vitest-Konfiguration dieses Projekts unterdrückt Console-Output in Test-Runs. Für Ad-hoc-Diagnose-Tests (z. B. Simulations-Audits): Ergebnisse mit `writeFileSync` in eine Datei (z. B. `/tmp/...`) schreiben und danach lesen — nicht auf stdout hoffen.

**Fakt 2 — Playwright-MCP-Dateien:** `browser_take_screenshot` mit relativem Dateinamen speichert ins MCP-eigene Output-Verzeichnis (`.playwright-mcp/` bzw. Session-Verzeichnis), NICHT ins Repo-CWD — und die Dateien sind flüchtig. Wer einen Screenshot als Bead-Evidence braucht: sofort nach dem Shot den realen Pfad verifizieren (`find . -name "<name>.png"`) und an den Zielort kopieren. Accessibility-Snapshots (`browser_snapshot`) landen als .yml im selben Verzeichnis und sind zum Nachlesen per `sed`/`grep` zuverlässiger als Screenshots.

**Fakt 3 — Headless-Simulation als Audit-Werkzeug:** Ein temporärer vitest-Test, der `endDay` 40× von `initialGameStateSnapshot` aus laufen lässt, fand 2026-06-12 vier Bug-Klassen, die Unit-Tests und Live-Spielen einzeln nicht fanden. Muster ist als permanente Suite beauftragt (destiny-lzke); bis die existiert, ist der Wegwerf-Test das Mittel der Wahl für Systemaudits. Siehe [[feedback_audit-evidence-as-files]] für die Ablage der Outputs.
