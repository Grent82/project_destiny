---
name: feedback_backlog-review-subagent
description: Bead-Batches vor Freigabe durch unabhängigen Fact-Check-Subagenten reviewen — fand 2 Blocker
metadata:
  type: feedback
---

**Regel:** Jeder im Batch erstellte Backlog (≥3 Beads) wird vor Freigabe von einem unabhängigen Subagenten reviewt: Fakten gegen Code prüfen, Dependency-Graph gegen Notes prüfen, Delegations-Ratings hinterfragen.

**Warum:** Session 2026-06-12 (User-Mandat: "du kannst einen extra Agenten spawnen der das Review macht"): Der Review fand 2 Blocker und 13 weitere Findings in 21 frisch erstellten Beads — darunter Fehler, die schwache Ausführungs-Modelle hart hätten scheitern lassen. Der Autor übersieht eigene Lücken systematisch; ein frischer Kontext nicht.

**Wie zu apply:** Review-Prompt muss enthalten: (a) READ-ONLY-Mandat, (b) Fact-Check-Auftrag gegen den echten Code (Pfade, Zeilennummern, IDs per Grep/Read verifizieren), (c) Dependency-Abgleich Notes↔Graph, (d) Severity-Format (BLOCKER/SHOULD-FIX/NIT). Typische Fehlerklassen aus dieser Session, gezielt prüfen lassen:
- Phantom-IDs (Plan-interne Codes wie "B1" statt echter Bead-IDs)
- Verweise auf Artefakte, die nur im Chat existieren (siehe [[feedback_audit-evidence-as-files]])
- parallele ready-Beads auf derselben Datei ohne Ordering-Edge
- zwei Beads mit widersprüchlicher Ownership desselben Doku-Satzes
- GREEN-Delegations-Rating, das in Wahrheit unentschiedene Design-Fragen versteckt

**Beispiel:** Review 2026-06-12 fand: Flag-Liste in destiny-nflm unvollständig (event-marion-milestone-motivation fehlte UND wäre vom Fallback-Grep nicht erfasst worden) — exakt der Fehlertyp, der einen Folge-Bug reaktiviert hätte.
