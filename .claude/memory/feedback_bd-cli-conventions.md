---
name: feedback_bd-cli-conventions
description: bd-CLI-Konventionen die nur per Fehlermeldung gelernt wurden — Epic-Parenting, Typ-Pflichtsektionen
metadata:
  type: feedback
---

**Regel:** Vor Batch-Operationen mit `bd` die Typ-Konventionen anwenden, nicht erraten.

**Warum:** Session 2026-06-12: 21 Fehlermeldungen bei `bd dep add <epic> <child>` ("epics can only block other epics") plus zwei Patch-Runden für fehlende Pflichtsektionen. Alles vermeidbar.

**Wie zu apply:**
- Epic-Kinder verknüpfen mit `bd update <child> --parent <epic>` — NICHT mit `bd dep add`. Deps zwischen Epics sind erlaubt (Epic darf Epic blocken).
- Pflichtsektionen je Typ (sonst Warnung bei create, Lint-Treffer später):
  - `bug` → `## Steps to Reproduce`
  - `epic` → `## Success Criteria`
  - alle → `## Acceptance Criteria` (validation.on-create = warn)
- Prioritäten numerisch (0–4), nie "high/medium/low". Kein `bd edit` (öffnet $EDITOR, blockiert Agenten).
- Cross-File-Sequenzierung: Wenn mehrere Beads dieselbe Datei anfassen, Ordering-Edges setzen — parallele Agenten ziehen sonst kollidierende Beads aus `bd ready` (siehe [[feedback_backlog-review-subagent]]).

**Beispiel:**
```bash
bd update destiny-nflm --parent destiny-fidq   # richtig
bd dep add destiny-fidq destiny-nflm           # falsch: "epics can only block other epics"
```
