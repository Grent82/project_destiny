Journal („The Record" / EventLogScreen) — Detailanalyse
 
  TL;DR

  Ihr Gefühl täuscht Sie nicht: Das Journal hat aktuell keinen Spielerwert — und es kann auch keinen haben, weil das Problem vor der UI liegt. Die Datenquelle ist ein
  40-Zeilen-Ringpuffer, der auf Tag 7 nur noch bis Tag 5 zurückreicht; alles davor ist unwiederbringlich gelöscht. Was drinsteht, ist zu 90% mit dem Badge „system" und
  zu 100% mit „morning" gestempelt — beide Spalten tragen null Information. Die Hälfte des Bildschirms ist ein dauerhaft leeres „Combat Recap"-Panel. Und live
  bestätigt: Ein ID-Kollisions-Bug (37 React-Fehler auf der Seite) führt dazu, dass das Journal Einträge stillschweigend verdoppeln oder verschlucken kann. Gleichzeitig
  erzeugt das Spiel reichlich echtes Journal-Material — aufgelöste Events samt getroffener Wahl, Quest-Beats, Kampfergebnisse — und zeigt davon nichts. Das Journal ist
  ein Debug-Log im Kostüm eines Journals.

  Was ich gemacht habe

  Code gelesen (EventLogScreen.tsx, eventLog.ts-Selector, activityLog.ts, alle 144 Schreibstellen), dann live verifiziert: mein Tag-2-Spielstand per Skript bis Tag 7
  gespielt (Events automatisch aufgelöst), Journal geöffnet, Konsole und persistierten Save ausgewertet, Screenshot genommen.

  ---
  Befunde

  J1 — Identitätskrise: vier Namen, kein Auftrag (Design-Red-Flag)

  Navigation sagt „Journal", die Überschrift sagt „The Record", die Route heißt /event-log, der Code heißt EventLogScreen, die Daten heißen activityLog. Das ist
  wörtlich der Red Flag aus Ihrer eigenen design-review.md („multiple overlapping names for the same concept"). Jeder Name verspricht etwas anderes — ein Journal
  verspricht persönliche Geschichte, ein Record ein Archiv, ein Event-Log Events — und die Seite liefert keines davon. Die Kernfrage aus dem Workflow („Welche
  Spielerfrage beantwortet diese Seite?") hat keine Antwort.

  J2 — Gedächtnis: 2 Tage (kritisch)

  MAX_ACTIVITY_ENTRIES = 40 (activityLog.ts:3 — CLAUDE.md behauptet übrigens 100, Doku-Drift). Bei ~13–18 Zeilen pro Tag heißt das: Auf Tag 7 ist der älteste Eintrag
  von Tag 5. Die Gründung des Hauses, die ersten Entscheidungen, die Tutorial-Ära — weg. Ein Journal, das vergisst, ist kein Journal. Und es ist schlimmer als es
  klingt: Laut meiner Event-Analyse sind 56% aller Event-Konsequenzen nur Log-Zeilen — d.h. der einzige Zeuge der meisten Weltveränderungen ist genau dieser
  2-Tage-Puffer.

  J3 — ID-Kollisions-Bug: Einträge können verschwinden (Bug, live bestätigt)

  activityLog.ts:14 baut die ID aus log-${day}-${timeSlot}-${alteLänge + 1}. Sobald der Puffer voll ist (Länge konstant 40), bekommt jeder weitere Eintrag desselben
  Tages die ID log-D-morning-41. Im persistierten Save fand ich drei doppelte IDs (log-5/6/7-morning-41), die Journal-Seite wirft 37 React-Fehler („children may be
  duplicated and/or omitted"). Da die ID gleichzeitig der React-Key ist, kann die Anzeige Zeilen verdoppeln oder auslassen — der Spieler merkt es nie.

  J4 — Die Metadaten sind 100% Rauschen

  - Zeitstempel: Alle 40 Einträge sagen „morning". Fast alles wird innerhalb von endDay geschrieben, nachdem der Tag weitergedreht und der Slot auf morning
  zurückgesetzt wurde. Ereignisse der Nacht von Tag 6 stehen als „Day 7 · morning" da — die Spalte differenziert nichts.
  - Kategorie-Badge: 36/40 Einträge „system", 4 „economy", 0 „combat". Über die ganze Codebasis: 34 von 38 literalen Schreibstellen nutzen 'system'. Drei Kategorien
  existieren im Schema ('economy' | 'combat' | 'system') — für ein Spiel mit Fraktionen, Beziehungen, Haushalt, Gerüchten, Quests ist das Vokabular ohnehin viel zu
  klein, und benutzt wird faktisch nur eins.
  - Layout: Jede einzelne Zeile bekommt eine Karte mit Stempel + Badge + Satz — ~3 Einträge pro Bildschirm, 40 Einträge = 13 Bildschirme Scrollen. Keine
  Tagesgruppierung, keine Filter, keine Suche, keine Links.

  J5 — Das halbe Layout ist permanent tot

  Das „Combat Recap"-Panel rendert nur bei activeCombat — aber concludeCombatEncounter (combat.ts:345) setzt activeCombat beim Abschluss auf null. Das Panel kann also
  nur während eines laufenden Kampfes etwas zeigen — auf der Journal-Seite, auf der man während eines Kampfes nie ist. Praktisch steht dort dauerhaft „The squad has not
  deployed yet." — was nach dem ersten Einsatz auch noch faktisch falsch ist. 50% der Fläche für eine leere Lüge.

  J6 — Der Inhalt ist Telemetrie, keine Geschichte

  Echte Zeilen aus meinem Durchlauf: „Gilded Court acted today." (Null Information — wer, wo, was, na und?). „New lead discovered: Forn's Quiet Hiring." — ohne Link zum
  Work Board. NPC-Namen ohne Weg zum Roster. Und durch die Event-Bugs aus dem ersten Report dokumentiert das Journal brav Fiktion, die nie stattfand: Mein
  Tag-7-Journal enthält „A ward in your household has grown from infant to child" und „…from child to teenager" am selben Tag — es existiert kein einziges Mündel. Das
  Journal ist der treueste Zeuge der kaputten Event-Pipeline.

  J7 — Das eigentliche Journal-Material existiert bereits und wird weggeworfen

  Das ist der Kernpunkt für den Rework. Das Spiel erzeugt genau die Daten, aus denen ein wertvolles Journal bestünde — und keine einzige davon erreicht diese Seite:

  ┌───────────────────────────────────────────────────────┬─────────────────────────────────────────────────┬───────────────────────────────────────────────────────┐
  │                   Vorhandene Daten                    │                 Wo sie stecken                  │                 Sichtbar im Journal?                  │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ Aufgelöste Events inkl. getroffener Wahl              │ eventInstances                                  │ Nein — null UI, wächst unbegrenzt im Save             │
  │ (chosenOptionId, resolvedOnDay)                       │                                                 │                                                       │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ Event-Konsequenz-Zusammenfassungen (Player/NPC/World  │ lastResolvedEventSummary                        │ Nein — wird beim nächsten Event überschrieben (die    │
  │ Effects)                                              │                                                 │ „verschluckten Summaries" aus Report 1)               │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ Quest-Journaleinträge                                 │ activeQuests[].journalEntries, vergraben im     │ Nein                                                  │
  │                                                       │ ContractBoardScreen                             │                                                       │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ Kampfergebnisse, Beute                                │ bei concludeCombatEncounter vernichtet          │ Nur als Log-Zeile, 2 Tage lang                        │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ Hauptquest-Stand (mainQuest.stage, lastClue)          │ GameState                                       │ Nein                                                  │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ Gehörte Gerüchte                                      │ state.rumors                                    │ Nein                                                  │
  └───────────────────────────────────────────────────────┴─────────────────────────────────────────────────┴───────────────────────────────────────────────────────┘

  Es gibt schlicht kein dauerhaftes Chronik-Modell im Domain Layer — nur den Ringpuffer. Deshalb kann keine UI-Politur allein das Journal retten.

  ---
  Rework-Empfehlung

  Die Seite braucht zuerst eine Antwort auf die Frage aus Ihrer design-review.md: Welche Spielerfrage beantwortet sie? Mein Vorschlag: „Was ist passiert, was habe ich
  entschieden, und was sollte ich weiterverfolgen?" Daraus folgt:

  1. Chronik als Domain-Konzept (nicht UI-Feature): ein tages-gebuckeltes, persistentes chronicle im GameState — Events mit getroffener Wahl + Konsequenz-Snapshot (die
  lastResolvedEventSummary-Struktur existiert schon und ist genau das richtige Format), Quest-Beats, Kampfergebnisse, Beziehungs-/Fraktions-Meilensteine. Eviction nach
  Tagen oder per Tages-Kompaktierung („Tag 6 — 2 Szenen, 1 Auftrag abgeschlossen, Korridor gestört"), nicht nach 40 Zeilen. Das löst nebenbei das Verschlucken der
  Event-Summaries: Was man im Modal-Stapel verpasst hat, steht im Journal.
  2. UI als Timeline: nach Tagen gruppiert, Filter nach sinnvollen Kategorien (Szene / Welt / Haushalt / Wirtschaft / Kampf), Einträge verlinken auf ihr Subjekt (NPC →
  Roster, Lead → Work Board, Distrikt → Karte). Das passt zur Narrative-First-Linie der neuen Quest-Lead-Karten.
  3. Combat-Recap-Panel streichen — Kampf-Nachbesprechung gehört in den Combat-Abschlussfluss; die Chronik speichert das Endergebnis.
  4. Sofort-Fixes unabhängig vom Rework: ID-Generierung reparieren (monotoner Zähler im State), Cap und CLAUDE.md angleichen, einen Namen wählen (Journal) für
  Route/Heading/Code, die activityLog-Schreibstellen auf ehrliche Kategorien verteilen.
  5. Aufräumen flussaufwärts: eventInstances ohne Anzeige und ohne Cap wachsen unbegrenzt — entweder sie werden die Chronik-Datenquelle (empfohlen) oder sie brauchen
  Kompaktierung.
