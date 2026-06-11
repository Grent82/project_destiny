---
name: feedback_destructive-cli-pipelines
description: Destruktive CLI-Writes (bd update --description u.ä.) nie aus ungeprüften Shell-Pipelines speisen
metadata:
  type: feedback
---

**Regel:** Befehle, die Daten überschreiben (`bd update --description/--notes/--design`, `git push --force`, Datei-Overwrites aus Variablen), niemals direkt aus einer ungeprüften Pipeline füttern. Erst den Variableninhalt verifizieren (echo / Länge prüfen / auf eine ID testen), dann schreiben.

**Warum:** Am 2026-06-10 hat ein Loop `desc=$(bd show … | python …)` bei einem JSON-Parse-Fehler eine leere Variable geliefert; der nachfolgende `bd update --description="$desc"` hat die Beschreibungen von **8 Beads gelöscht**. Der Fehler war im selben Output sichtbar (Traceback + „updated"), wurde aber erst nach dem achten Write bemerkt. Wiederherstellung kostete 8 manuelle Restores.

**Wie anwenden:**
- Pipeline-Ergebnis zuerst in Variable, dann `[ -n "$var" ] || exit 1` (oder Python: `assert`) **vor** dem destruktiven Befehl.
- Bei Loops über mehrere IDs: zuerst mit **einer** ID komplett durchlaufen und Ergebnis prüfen (`bd show <id>`), erst dann den Rest.
- Nach jedem destruktiven Batch sofort eine Stichprobe lesen — nicht erst am Ende.

Verwandt: [[feedback_beads-child-close]]
