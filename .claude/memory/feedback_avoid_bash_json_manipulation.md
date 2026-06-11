---
name: feedback-avoid-bash-json-manipulation
description: JSON-Dateien nie mit Bash-Heredocs oder head/tail piped writes editieren — immer Read → Edit workflow verwenden
metadata:
  type: feedback
---

**Was:** JSON-Dateien (insbesondere große wie `npcs.json`, `quests.json`) **niemals** mit Bash-Commands wie `head -n`, `tail -n`, `cat >>` Heredocs manipulieren.

**Warum:**
- Bash-Zeilennummern können falsch zählen (z.B. `head -n -9` funktioniert nicht wie erwartet)
- JSON-Struktur wird nicht validiert vor dem Schreiben
- Doppelte Closing-Brackets oder fehlende Kommas führen zu korrupten Dateien
- Mehrere Iterationen nötig → Zeitverlust und Risiko von Datenverlust

**Richtiger Workflow:**
1. `Read` tool verwenden um Datei zu laden
2. `Edit` tool mit exakter `old_string` → `new_string` Replacement verwenden
3. Bei großen Änderungen: Datei in kleinere Sektionen aufteilen und sequentiell editieren
4. **Immer** nach Edit `pnpm test:run` oder zumindest Schema-Validation laufen lassen

**Beispiel dieser Session:**
- ❌ Falsch: `head -n -2 file.json > temp && cat >> temp << EOF ... && mv temp file.json` → Syntax Error
- ❌ Falsch: `cat >> file.json << EOF ...` → Doppelte `]` Closing Bracket
- ✅ Richtig: `Read` → `Edit` mit exaktem String-Match → Validierung mit Tests
