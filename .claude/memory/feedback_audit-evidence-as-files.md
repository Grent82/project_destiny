---
name: feedback_audit-evidence-as-files
description: Audit-Artefakte sofort als Datei nach reports/ schreiben oder in Beads einbetten — nie auf Chat verweisen
metadata:
  type: feedback
---

**Regel:** Jedes Artefakt, auf das ein Bead oder Report sich stützt (Listen, Simulations-Outputs, Offender-Tabellen, Zahlen), wird im selben Arbeitsschritt als Datei nach `reports/` geschrieben oder vollständig in die Bead-Beschreibung eingebettet. Quantitative Claims bekommen das Regenerations-Skript dazu.

**Warum:** Session 2026-06-12: Beads verwiesen auf eine "68-Label-Liste", die nur im Chat existierte — ein delegierter Agent hätte sie nie gefunden (Review-BLOCKER). Zusätzlich enthielt die 68 Wildcard-False-Positives; die exakte Regeneration ergab 41. Außerdem wurden Evidence-Pfade geraten (Plan-Memo statt der echten `reports/`-Audits), weil der User die Reports manuell gespeichert hatte und ich den Ablageort annahm statt prüfte.

**Wie zu apply:**
- `reports/` ist der etablierte Ablageort für Audit-/Analyse-Reports in diesem Projekt.
- Vor dem Schreiben eines Evidence-Verweises: `ls reports/` — Pfad verifizieren, nie raten.
- Tabellen/Listen, die ein Bead-Implementierer braucht: direkt in die Beschreibung, plus Skript zur Regeneration in die Notes.
- Zahlen aus Pattern-Matching (Regex-Counts) gegen bekannte Gut-Beispiele gegenprüfen, bevor sie als Finding-Zahl in einen Report gehen.

**Beispiel:** destiny-wwp6 trägt jetzt die exakte 41er-Offender-Tabelle plus Python-Einzeiler zur Regeneration — delegierbar ohne Rückfragen.
