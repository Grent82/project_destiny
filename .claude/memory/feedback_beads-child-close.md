---
name: feedback_beads-child-close
description: Child beads können nicht normal geschlossen werden wenn Parent-Epic offen ist
metadata:
  type: feedback
---

**Regel:** Child beads dürfen unabhängig von Parent-Epic Status geschlossen werden, wenn die implementierungsarbeit abgeschlossen ist.

**Warum:** Das Beads-System blockiert `bd close` auf Child-Tasks wenn das Parent-Epic noch offen ist. Dies steht im Widerspruch zum "thin slice" delivery Ansatz, bei dem kleine, unabhängige Wertlieferungen bevorzugt werden. Ein abgeschlossenes Child sollte nicht durch einen übergeordneten Status blockiert werden.

**Wie zu apply:** 
- Wenn `bd close <child>` mit "blocked by open issues" fehlschlägt wegen Parent-Epic → `--force` Flag verwenden
- Diese Erkenntnis in zukünftigen Retrospektiven prüfen, ob sich ein Muster von Parent/Child-Blocking bildet
- Alternative: Parent-Epic schließen wenn alle sichtbaren Children abgeschlossen sind (manueller Workflow)

**Beispiel aus Session 2026-06-10:**
```bash
bd close destiny-26u3  # fehlschlägt: blocked by destiny-rjyy
bd close destiny-26u3 --force  # erfolgreich
```
