Plan: Event-System & Journal — Epic-Schnitt, Ticket-Design, Migration

  1. Reform oder Neubau?

  Reform — mit zwei gezielten Neubauten. Die Architektur ist gesund: saubere Schichten, Zod-Contracts, pure Commands, deterministische RNG-Konvention, 127 authored
  Events mit guter Prosa, Testinfrastruktur inkl. Playthrough-Runner. Die Defekte sind lokalisiert: ein Evaluator-Command, ein Reducer, Content-Disziplin, fehlende
  Surfaces. Ein Greenfield-Neubau würde funktionierende Substanz (Content, Tests, Save-Migration) wegwerfen, um Probleme zu lösen, die chirurgisch behebbar sind.

  Die zwei Ausnahmen, wo Neues integriert statt reformiert wird:

  1. Chronicle (Journal-Datenmodell): Es gibt nichts zu reformieren — ein 40-Zeilen-Ringpuffer ist kein Geschichtsmodell. Neubau als Domain-Konzept, integriert nach
  Ihrem eigenen Muster capability → content → polish: erst das chronicle-Aggregat + Writer, dann speisen bestehende Systeme ein, dann die UI hinter der bestehenden
  Route /event-log. Kein Big Bang: das alte activityLog bleibt parallel bestehen, bis die Chronicle alle Writer übernommen hat (Strangler-Pattern).
  2. pendingEvents/eventInstances-Dualität: ebenfalls Strangler statt Rewrite — neuer Code schreibt nur noch Instances, pendingEvents wird daraus abgeleitet, Migration
  entfernt das Altfeld in einem zweiten, separaten Schritt.

  2. Epic-Schnitt

  Sechs Epics, geschnitten nach Schichtgrenze und Abhängigkeitsrichtung (Engine vor Vokabular vor Präsentation vor Content), nicht nach Report-Herkunft:

  EPIC A (P1) Event-Engine-Integrität        ──blockt──▶ B, C, E
  EPIC B (P1) Outcome-Vokabular & ehrliche   ──blockt──▶ E (Content-Retrofits)
              Konsequenzen
  EPIC C (P2) Event-Präsentation & Surface   = destiny-73ji (existiert, wird aktualisiert)
              Fit                               enthält destiny-i702
  EPIC D (P1) Chronicle & Journal            koordiniert mit destiny-y1et
  EPIC E (P3) Living-World-Event-Content     letztes; destiny-58n5 hängt hierunter
  EPIC F (P1) Präventions-Infrastruktur      startet SOFORT, parallel zu allem

  EPIC A — Event-Engine-Integrität (Domain/Application, kein UI)
  Slices: ① firingMode: 'world' | 'system' im Schema + Exclusion in evaluateEvents + Migration der 29 ungeschützten Templates (killt C1) · ② Burn-Fix: lastFiredDay nur
  für tatsächlich pending gewordene Events (C2) · ③ Content-Hotfixes als eigenes Mini-Bead: npcId-statt-target (C4) + ungültige District-IDs (M3) · ④ isAutoResolved
  vereinheitlichen: Auto-Events laufen durch applyOutcomes, erreichen nie das Modal (H2) · ⑤ Determinismus: Math.random-Default entfernen, Seed-Advance in
  addNpcToRoster (M1) · ⑥ Outcome-Applier härten: Validierung für adjustCityResource/setCorridorStatus, Warnungen bei fehlenden Feldern (M2) · ⑦ Instance-Unifikation +
  Queue-Bounds/Expiry (H1, H4) — das schwerste Slice, zuletzt.

  EPIC B — Outcome-Vokabular & ehrliche Konsequenzen (capability → content)
  ① Capability: adjustNpcState-Outcome mit Subjekt-Selektion (z. B. subject: 'highest-stress' | 'highest-loyalty' | npcId) + Namens-Templating in Texten · ② Capability:
  Item-/Ressourcen-Grants · ③ Capability: unlockDialogueTopic/createQuestLead-Ausbau, damit Szenen Türen öffnen · ④–⑥ Content-Retrofits als getrennte Beads mit exakter
  Before/After-JSON (loyal-npc-milestone, stressed-npc-warning, market-price-spike, …).

  EPIC C — Präsentation & Surface Fit = destiny-73ji weiterverwenden (sein Finding-Katalog F1–F10 deckt sich mit unseren N-Findings). Neue Slices darunter: ①
  Summary-nach-jeder-Auflösung (C3 — kleiner EventModal-Fix, früh ziehen) · ② Event-Typologie sichtbar: Kicker, Actor-Chip, Distrikt-Tag (braucht A①-Klassifikation) · ③
  destiny-i702 Morning Report (braucht ebenfalls A①: Decision-vs-Info-Klassifikation) · ④ presentationFlavour rendern oder Feld löschen · ⑤ Label-Lint verschärfen
  (generische Verben aus event-review.md verbieten).

  EPIC D — Chronicle & Journal
  ① Sofort-Bugfix (vorziehbar, winzig): activityLog-ID-Kollision + Cap/CLAUDE.md-Drift (J3) · ② Capability: chronicle-Aggregat in src/domain/ (tages-gebuckelt, Eviction
  nach Tagen, Schema + Migration) · ③ Writer: Event-Auflösungen inkl. chosenOptionId + Summary-Struktur · ④ Writer: Quest-Beats — hier andockt destiny-y1et
  (archivierte Runtimes sind die Datenquelle) · ⑤ Writer: Kampf-Ergebnisse (vor dem activeCombat-Nulling) · ⑥ Journal-UI: Timeline mit Tagesgruppen, Filtern, Links;
  Combat-Recap-Panel entfernen (J5) · ⑦ Kategorien-Redesign der Log-Schreibstellen.

  EPIC E — Living-World-Content (erst wenn A+B stehen): timeSlot/NPC-State-Trigger im Schema, Text-Varianten für Repeatables, Rumor-Track-Konsolidierung (3→1), neue
  zustandsreaktive Events. destiny-58n5 (Intrigue-Events) bekommt Dependency auf A.

  EPIC F — Prävention (Details unter Punkt 6): Validator-Ausbau, Simulations-Invarianten-Suite, Dead-Content-Checks, Workflow-Gates. Startet sofort, weil sie das Rework
  selbst absichert.

  3. Schnittprinzipien für die Tickets

  1. Ein beobachtbares Verhalten pro Bead, allein verifizierbar (Ihre Thin-Slice-Regel). Negativbeispiel: „Engine fixen" — Positivbeispiel: „Ein nicht-repeatable Event,
  das dem Tages-Cap zum Opfer fällt, feuert am Folgetag erneut."
  2. Bugfix ≠ Rework. C4/M3/J3 sind 10-Zeilen-Fixes — eigene Beads, sofort schließbar, nicht in Epics einbacken, wo sie wochenlang offen hängen.
  3. Schema-Änderung = eigenes Bead mit Migration, Fixture-Update und Default-Test. Save-Migration steht in Ihrem Playbook als „do not delegate" — das respektiert der
  Schnitt.
  4. Capability vor Content (Ihre preferred backlog shape): kein Content-Retrofit-Bead startet, bevor sein Outcome-Typ existiert.
  5. Content-Beads tragen die exakte JSON-Diff (Event-IDs, Before/After) in der Beschreibung — dann sind sie grün delegierbar.
  6. UI-Beads: Label ui-ux, Screenshot-Pflicht in der Acceptance (Ihre Regel: „A UI change without a screenshot is not done").

  4. Ticket-Beschreibung für schwache Modelle

  Ihre Doku hat das Prinzip schon perfekt formuliert: „lower models execute contracts, they do not write them." Konkret heißt das für diesen Backlog:

  a) Jedes Bead bekommt zusätzlich zum Task-Contract einen „Delegation Block" in den Notes — das Briefing-Template aus dem Playbook, vorausgefüllt vom starken Modell
  beim Bead-Schnitt, nicht vom Ausführenden:

  Files you may touch: src/application/commands/evaluateEvents.ts,
    src/application/commands/evaluateEvents.test.ts  — nothing else
  Template to imitate: isOnCooldown() in the same file / testFixtures-Pattern
  Forbidden: Math.random, Schema-Änderungen, Edits außerhalb der Liste
  Definition of done:
    1. <konkretes Verhalten, als Testname formuliert>
    2. pnpm exec vitest run src/application/commands/evaluateEvents.test.ts
    3. pnpm typecheck
  Voice sample: <nur bei Copy — 2–3 Sätze Bestandstext>

  b) Ampel-Klassifikation pro Bead (im Bead-Label oder Notes):

  ┌──────────────────────┬─────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────┐
  │                      │                        Kriterium                        │                           Beispiele aus diesem Plan                            │
  ├──────────────────────┼─────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ 🟢 delegierbar       │ bestehender Pattern, exakte File-Liste, JSON-Diff       │ A③ Content-Hotfixes, B④–⑥ Retrofits, C⑤ Lint, D① ID-Fix, Label-Fixes           │
  │                      │ vorgegeben                                              │                                                                                │
  ├──────────────────────┼─────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ 🟡 Mittelklasse      │ ein Command + Test nach Vorlage, kein Schema            │ A② Burn-Fix, A⑤ Determinismus, A⑥ Applier-Härtung, C① Summary-Fix              │
  ├──────────────────────┼─────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ 🔴 nur starkes       │ Schema+Migration, gameSlice-Wiring,                     │ A① firingMode, A⑦ Instance-Unifikation, D② Chronicle-Modell, alle              │
  │ Modell               │ Strukturentscheidung                                    │ Epic-/Bead-Schnitte                                                            │
  └──────────────────────┴─────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────┘

  c) Drei Regeln, die Fehler bei schwachen Modellen praktisch ausschließen:
  - Der Test steht im Bead. Nicht „schreibe Tests", sondern die konkreten Testnamen/Assertions („it('does not record lastFiredDay for truncated events')"). Das Modell
  füllt aus, es entwirft nicht.
  - Die Acceptance nennt jeden Entry-Point (Ihre „Cannot X"-Regel) — der Burn-Bug überlebte, weil ein Test das falsche Verhalten als korrekt festschrieb; das Bead muss
  explizit sagen: „der bestehende Test populates lastFiredDay… wird so geändert: …".
  - Stop Conditions ernst nehmen: „Wenn ein Schema-Feld fehlt → abbrechen und melden." Saubere Rückgabe wird belohnt, Improvisation nicht (steht schon im Playbook —
  gehört in jeden Delegation Block wiederholt).

  5. Was passiert mit den alten offenen Tickets?

  ┌────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │             Ticket             │                                                             Aktion                                                             │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │                                │ Behalten = Epic C. Finding-Coverage um die neuen Befunde ergänzen (presentationFlavour tot, sourceNpc unsichtbar, Typologie),  │
  │ destiny-73ji (Events-Epic)     │ Dependency auf Epic A eintragen. Notes aktualisieren: Engine-Defekte sind jetzt eigenes Epic, 73ji bleibt                      │
  │                                │ Comprehension-Umbrella.                                                                                                        │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ destiny-i702 (Morning Report)  │ Behalten, unter Epic C. Dependency auf A① (Decision-vs-Info-Klassifikation braucht firingMode/Typologie). Die                  │
  │                                │ Journal-Acceptance-Zeile („kein system-Badge") herauslösen → gehört zu Epic D, sonst Scope-Überlappung.                        │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ destiny-y1et (Failed Quests no │ Behalten, mit Epic D verknüpfen: D④ konsumiert dessen archivierte Runtimes. Reihenfolge klären: y1et liefert das Datenmodell   │
  │  record)                       │ für Quest-Historie, D macht es sichtbar — keine Doppelarbeit.                                                                  │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ destiny-dbyw (Tech-Infra:      │ Lehrreichster Fall: Epic offen, alle Kinder geschlossen — der Build-Time-Validator existiert (destiny-ws6b ✓), und trotzdem    │
  │ Branded IDs, Catalog Checks)   │ sind C4 und M3 durchgerutscht, weil er nur npcId/questId auf Outcomes prüft. Neues Kind-Bead „Validator-Lücken:                │
  │                                │ Outcome-Feldkombinationen, District-Refs, Enum-Targets" anlegen (= Teil von Epic F), Lesson in die Epic-Notes.                 │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ destiny-58n5, destiny-71m3     │ Dependency auf Epic A setzen — kein neuer Content auf kaputter Engine.                                                         │
  │ (neue Event-/Vote-Inhalte)     │                                                                                                                                │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ destiny-44ci (tote             │ Inhaltlich unabhängig, aber gleiche Defektklasse wie isAutoResolved/presentationFlavour (halb verdrahtete Features). In Epic   │
  │ Risk-Systeme)                  │ F's Dead-Content-Audit als bekannten Fall referenzieren.                                                                       │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ destiny-b475 (wait/sleep       │ Unabhängig lassen, aber Querverweis: berührt endDay-Timing, in dem auch evaluateEvents hängt — bei A nicht parallel am selben  │
  │ Midnight-Bug)                  │ File arbeiten.                                                                                                                 │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Geschlossene Beads             │ Keine Wiedereröffnungen nötig. Aber ein Audit-Traceability-Eintrag (Ihre Regel: jedes Finding → Bead-Mapping) gehört in die    │
  │                                │ neuen Epic-Beschreibungen.                                                                                                     │
  └────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  6. Zusatzfrage: Wie verhindern wir diese Fehlerklasse künftig?

  Erst die ehrliche Ursachenanalyse — fünf Wurzeln, alle systemisch, keine davon „ein Agent hat schlecht gearbeitet":

  1. Konventionen lebten in Werten statt im Schema (probability: 0 = „system-driven"). Wer die Konvention nicht kannte, konnte sie nicht einhalten — und nichts
  validierte sie.
  2. Der Validator prüfte, was beim letzten Mal kaputt war — nicht die Feldkombinationen, die diesmal kaputt waren (C4: beide Felder optional, also „valide").
  3. Ein Test schrieb das falsche Verhalten fest (Burn-Verhalten als Feature getestet). Grüne Tests erzeugten falsche Sicherheit — genau der Satz aus Ihrer
  design-review.md: green tests do not prove good player experience.
  4. Niemand spielte den Tag 2. Der Modal-Stapel mit Bond-Events ohne Bond-NPCs ist in 60 Sekunden Fresh-Eyes-Playthrough sichtbar. Die Workflows (event-review,
  design-review) existieren — sie wurden bei diesen Features nicht als Gate erzwungen.
  5. Felder ohne Konsumenten (presentationFlavour, isAutoResolved halb) — es gibt keinen Mechanismus, der „authored, aber nie gerendert" entdeckt.

  Daraus die Mechanismen — für Bestand:

  - Simulations-Invarianten-Suite (Epic F, höchster Hebel): Mein 40-Tage-Wegwerf-Test wird permanente Regression im Playthrough-Setup. Invarianten statt Einzelfälle:
  kein system-Event feuert je via evaluateEvents · Queue bleibt unter N · kein non-repeatable Event landet in lastFiredDay ohne pending gewesen zu sein · keine
  React-Key-Duplikate im Save. Das hätte C1, C2, H1 und J3 alle gefangen.
  - Validator-Ausbau als Build-Gate: Outcome-Typ → Pflichtfelder-Matrix, Enum-Targets, alle ID-Referenzen inkl. sourceDistrictId, Label-Blacklist. Läuft bei
  contentCatalog-Load und schlägt den Build fehl.
  - Dead-Content-Audit (einmalig, dann Check): jedes Schema-Feld braucht einen nachweisbaren Konsumenten; jeder Flag einen vollständigen Code-Pfad. Findet die nächsten
  presentationFlavours, bevor Content darauf authored wird.

  Für zukünftige Features — die wichtigere Hälfte:

  - Definition of Ready erweitern: Ein Feature-Bead ist erst implementierbar, wenn es benennt: (a) den Fiction Contract, (b) die Outcome-Matrix (haben Sie schon für
  runtime-shallow), (c) das Playthrough-Szenario, das es beweist — neue Features liefern ihren Sim-Test mit, so wie sie Tests mitliefern. Eine Zeile in task-contract.md
  und bead-creation.md genügt.
  - Konventionen müssen Schema werden: Neue Regel in engineering-standards.md: Wenn zwei Systeme über einen Wert kommunizieren (wie probability: 0), ist das ein
  fehlendes Schemafeld. Gleiches für geteilte State-Felder: jedes Feld wie lastFiredDay braucht dokumentierten Owner + Key-Namespace.
  - Fresh-Eyes-Gate erzwingen statt empfehlen: Player-facing Beads schließen nur mit Playthrough-Beleg (Screenshot + ausgefüllte Fresh-Eyes-Checkliste im Bead). Ihre
  event-review.md sagt das bereits — der Schritt fehlt als harter Haken im Session-Close-Protokoll. Genau dafür ist außerdem Ihr /ki-retro-Workflow da: Ich empfehle,
  nach diesem Gespräch eine Retro zu fahren, die diese fünf Ursachen in die Dauer-Artefakte schreibt (CLAUDE.md/Workflows), damit sie nicht nur in diesem Chat
  existieren.
  - Für schwache Modelle speziell: Content-JSON nur noch mit mitgeliefertem Validierungs-Test authoren lassen; system-Events nie von schwachen Modellen verdrahten
  lassen (rote Kategorie); der Delegation Block macht das pro Bead explizit.