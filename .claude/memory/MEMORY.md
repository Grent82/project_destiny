- [Feedback: Beads Child-Schließung bei offenem Parent-Epic](feedback_beads-child-close.md)
- [Feedback: Destruktive CLI-Writes nie aus ungeprüften Pipelines](feedback_destructive-cli-pipelines.md) — 8 Bead-Beschreibungen durch leeren Pipeline-Output gelöscht
- [Feedback: Gestaltungs-Richtungsfragen mit 2–4 Optionen + Empfehlung stellen](feedback_design-decision-questions.md) — 5× ohne Korrekturrunde bestätigt
- [Feedback: UI-Zurückhaltung bei Farben und exakten Zahlen](feedback_ui_restraint_colors_and_numbers.md) — 3 Tickets reverted: "zu bunt" + Beziehungs-Deltas als "too much"
- [Feedback: Modellwahl pro Aufgabe selbst entscheiden](feedback_model-selection.md) — Nutzer-Direktive 2026-06-11, Kriterien im lower-model-playbook
- [Feedback: Enemy NPCs müssen in npcs.json UND enemy-npcs.json existieren](feedback_npc-content-validation.md) — contentCatalog validiert enemyNpcId gegen npcsById, nicht enemyNpcsById
- [Feedback: JSON-Dateien nie mit Bash-Heredocs editieren](feedback_avoid_bash_json_manipulation.md) — Immer Read → Edit workflow verwenden
- [Feedback: bd-CLI-Konventionen — Epic-Parenting via --parent, Pflichtsektionen je Typ](feedback_bd-cli-conventions.md) — 21 Fehlermeldungen + 2 Patch-Runden 2026-06-12
- [Feedback: Bead-Batches vor Freigabe durch Fact-Check-Subagent reviewen](feedback_backlog-review-subagent.md) — fand 2 Blocker in 21 frischen Beads; Auslöser 2026-06-14 auf Auto verschärft
- [Feedback: Code-Fakten gegen Live-Code prüfen, nicht aus Kompaktierungs-Summary](feedback_verify-claims-against-code.md) — Save-Version v2→v3 statt v3→v4, Phantom-Befehl setBondForSale (2026-06-14)
- [Feedback: Audit-Artefakte sofort nach reports/ oder in Beads einbetten, nie Chat-Verweise](feedback_audit-evidence-as-files.md) — Review-BLOCKER wegen nicht existenter 68er-Liste
- [Feedback: House Geometry — bounds und overlaps vor Positionierung prüfen](feedback_house-geometry-planning.md) — 3 Iterationen für room-east-wing/servant-quarters/barracks 2026-06-14
- [Test mock strategy](feedback_test-mock-strategy.md) — only mock fields code reads, cast at boundary
- [Feedback: Circular Dependency Check — verify import graph before schema refactors](feedback_circular_dependency_check.md) — 187 test files failed after moving npcIntentionTypeSchema, fixed by moving back to shared/contracts
- [Intention System Architecture](intention-system-architecture.md) — 5-stage pipeline, Fuzzy + ML, 35 types
- [Test Fixture Pattern for Complex State](test-fixture-pattern.md) — minimal mocks, eslint-disable any
- [Feedback: Corridor-run Implementation — Schema Change Propagation](feedback_corridor_implementation.md) — 5 Korrektur-Iterationen vermieden durch enemyNpcId nullable, syncFoodSecurityToStock return value, procedural generation updates
- [Verification Protocol](verification_protocol.md) — zentrale Read/Verify Before Write-Checkliste — Bead-Hygiene + Ticket-Scope-Bewertung vor Claim + externe Hand-Edits/Remote-Reverts erkennen
- [Terminology Audit: Coalition ist keine echte Koalition](terminology_audit_group_coalition.md) — Coalition sollte zu group umbenannt werden
- [Feedback: BD-CLI — Vermeide Pipe-Charaktere in Shell-Commands bei komplexen Beschreibungen](docs_bead_creation.md) — zsh-Parsing-Fehler bei Markdown-Tabellen
- [Feedback: NPC-NPC dating implementation](feedback_npc_npc_dating_implementation.md) — Reuse existing date templates, integrate into endDay phases, bidirectional relationship tracking
- [Feedback: NPC-NPC romance fullstack](feedback_npc_npc_romance_fullstack.md) — Flirtation + Courtship + Dating + Jealousy layers, not just dating proposals
- [Immer current() does not fix nested mutations](immer-current-does-not-fix-nested-mutations.md) — current() creates shallow plain object, nested refs still same
- [questSettlement architecture inconsistency](questsettlement-architecture-inconsistency.md) — functions mutate but callers expect immutable returns
- [Feedback: Quest Discovery Debugging — Read data flow before Playwright](feedback_quest_discovery_debugging.md) — 30+ Playwright clicks wasted investigating "missing quests" that were actually data/trigger issues
- [Schema Change Hygiene](schema_change_hygiene.md) — Konsolidierte Schema-Change Checklist (5 Files zusammengeführt 2026-06-30)

### Economy & Lore

- [Economy Lore Consistency](economy_lore_consistency.md) — Wirtschaftssystem muss lore-konsistent sein, keine abstrakten Einkommen
