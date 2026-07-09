---
name: feedback_design-decision-questions
description: Bei gestalterischen Richtungsentscheidungen 2–4 Optionen mit Empfehlung (und Preview) fragen — funktioniert nachweislich
metadata:
  type: feedback
---

**Regel:** Vor größeren gestalterischen oder UX-Richtungsentscheidungen dem Nutzer 2–4 konkrete Optionen mit klarer Empfehlung und (wo sinnvoll) ASCII-Preview vorlegen — statt still die plausibelste Variante zu bauen.

**Warum:** In der Session 2026-06-10/11 wurde das Muster viermal angewendet (Pergament vs. dunkles Vellum, Zensur-Tintenschichten, Stadtkarten-Klick-Semantik, Raumzuweisung ins Panel). Alle vier Entscheidungen hielten ohne eine einzige Korrekturrunde — während still getroffene Gestaltungsannahmen (POIs auf Straßen, „seen here"-Namensliste, fehlende Legende) später vom Nutzer als Befunde zurückkamen.

**5. Bestätigung (Session 2026-07-07):** Vor der Neubearbeitung dreier zuvor per `git revert` zurückgesetzter UI-Tickets (destiny-pjby/cabf/pbsw, siehe [[feedback_ui_restraint_colors_and_numbers]]) wurden 3 gebündelte Fragen mit je 2–3 Optionen + Empfehlung gestellt, statt aus der Git-History zu raten, warum genau zurückgesetzt wurde. Ergebnis: klare Antworten in einer Runde, keine zweite Revert-Runde nötig — inklusive einer Antwort, die eine vorbereitete Option ("gedämpft neu bauen") explizit zugunsten von "einfach schließen" ablehnte. Ohne die Rückfrage wäre eine plausible, aber falsche Annahme (nur Farben, nicht auch Zahlen; alle drei aus demselben Grund reverted) in den Code geflossen.

**Wie anwenden:**
- Schwelle: Entscheidung prägt das sichtbare Ergebnis dauerhaft ODER ist teuer umzubauen → fragen. Reversible Detailfragen → empfohlene Option bauen und im Summary nennen.
- Immer eine Option als „(Empfohlen)" markieren und zuerst listen; Previews bei visuellen Vergleichen.
- Die Antworten im Bead/Plan als „User decisions (asked & answered)" festhalten.

Verwandt: Spieler-Feedback kommt als Fresh-Eyes-Liste — der Map/Plate-Review in `docs/workflows/design-review.md` ist die Selbst-Prüfung davor.
