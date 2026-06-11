---
name: feedback_model-selection
description: Modellwahl pro Aufgabe liegt beim Agenten — selbst entscheiden, nicht den Nutzer fragen
metadata:
  type: feedback
---

**Regel:** Der Nutzer hat am 2026-06-11 explizit delegiert: *„für die Zukunft entscheide selbst welches Modell für welche Aufgabe am besten geeignet ist."* Bei Delegation an Subagenten oder bei Empfehlungen zur Bearbeitung von Beads die Modellklasse eigenständig wählen und nur das Ergebnis-Routing nennen — keine Rückfrage, welches Modell genommen werden soll.

**Warum:** Die Frage „soll das ein günstigeres Modell machen?" ist beantwortet: Ja, wann immer geeignet. Die Eignungskriterien stehen bereits in `docs/workflows/lower-model-playbook.md` (Task-Selection: was delegierbar ist, was nicht).

**Wie anwenden:**
- Daten-/Regel-/Test-Aufgaben mit Implementation Contract (Dateiliste, Vorlage, DoD) → günstige Modellklasse (Haiku-Klasse), Review durch stärkeres Modell.
- Prosa mit Voice-Samples, mechanische Umbauten nach Muster → mittlere Klasse.
- Architektur, Design-Entscheidungen, Bead-/Spec-Autorschaft, Player-facing Copy ohne Sample, Review/Abnahme → starke Klasse (Opus/Fable).
- Beim Anlegen von Beads den Implementation Contract gleich auf die Ziel-Modellklasse zuschneiden (siehe wt34/wc25/bd44/tedu als Referenzformat).
- Im Bead oder Summary kurz festhalten, welche Klasse vorgesehen ist — als Information, nicht als Frage.

Verwandt: [[feedback_design-decision-questions]] (Richtungsfragen weiterhin stellen — Modellwahl ist davon ausgenommen).
