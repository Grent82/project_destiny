# Memory & Documentation Audit 2026-06-30

## Executive Summary

**Problem:** Der Kontext ist massiv aufgebläht mit redundanten, historischen und nicht-aktionablen Inhalten.

| Metrik | Wert | Bewertung |
|--------|------|-----------|
| `.claude/memory/*.md` Dateien | 41 | **Zu viel** (Ziel: 10-15) |
| Gesamt-Zeilen in Memories | ~1730 | **~4000-6000 Tokens** |
| `docs/analysis/*.md` Dateien | 7 | **Teilweise redundant** |
| Session-Learning-Duplikate | 11+ | **Sofort konsolidieren** |

---

## Kategorie 1: SOFORT LÖSCHEN (Historie ohne actionable Rules)

Diese Dateien enthalten nur "was passiert ist" ohne Konsequenzen für zukünftige Arbeit.

### Session-Learning-Dateien (11 Dateien, ~600 Zeilen)

| Datei | Grund zum Löschen |
|-------|-------------------|
| `session-2026-06-28-council-politics-complete.md` | Nur Session-Historie |
| `session_learnings_2026-06-28-pbft.md` | Nur Session-Historie |
| `session_learnings_2026-06-28-playwright-verification.md` | Nur Session-Historie (wichtigste Punkte schon in `verification_protocol.md`) |
| `session_learnings_2026-06-27-i6xc.3.md` | Nur Session-Historie |
| `session_learnings_2026-06-27-i6xc.3-4.md` | Nur Session-Historie |
| `session_learnings_2026-06-27-tdo4.md` | Nur Session-Historie |
| `session_learnings_2026-06-27-tdo4-final.md` | Nur Session-Historie |
| `session_learnings_2026-06-27-naked-npc.md` | Nur Session-Historie |
| `session_learnings_2026-06-27-naked-npc-fix.md` | Nur Session-Historie |
| `session_learnings_log.md` | Konsolidierung von oben - jetzt auch veraltet |
| `ki_retro_2026-06-27_npc_npc_dating.md` | Nur Session-Historie |

**Aktion:** ALLE 11 Dateien löschen via `bd forget <memory-name>`

### Projekt-spezifische Historie (4 Dateien)

| Datei | Grund zum Löschen |
|-------|-------------------|
| `project_employment-system-implementation.md` | Nur Implementierungshistorie |
| `project_destiny-jed7-epic-complete.md` | Nur Epic-Abschluss ohne Rules |
| `project_subagent-definitions.md` | Nur technische Dokumentation |
| `project_test-tooling-quirks.md` | Nur Tooling-Historie |

**Aktion:** ALLE 4 Dateien löschen

### DATED Feedback (3 Dateien)

| Datei | Grund zum Löschen |
|-------|-------------------|
| `dead-content-audit-findings-2026-06-24.md` | Einmaliges Audit-Ergebnis (nicht wiederholbar) |
| `terminology_cleanup_2026-06-26.md` | Terminology-Audit schon in `terminology_audit_group_coalition.md` |
| `schema_change_hygiene_corridor.md` | Spezifisch für Corridor-Run (nicht allgemein gültig) |

**Aktion:** ALLE 3 Dateien löschen

**SUBTOTAL LÖSCHEN: 18 Dateien (~800 Zeilen, ~2000 Tokens gespart)**

---

## Kategorie 2: KONSOLIDIEREN (Redundante Inhalte)

### Schema Change Hygiene (5 Dateien → 1 Datei)

| Aktuelle Datei | Problem |
|----------------|---------|
| `feedback_schema-change-consumer-analysis.md` | Überschneidet sich mit `schema_change_hygiene.md` |
| `feedback_schema_change_verify_data.md` | Überschneidet sich mit `schema_change_hygiene.md` |
| `schema_change_hygiene_inventory.md` | Spezifisch für Inventory (könnte als Abschnitt integriert werden) |
| `schema_change_pattern.md` | Überschneidet sich mit `schema_change_hygiene.md` |
| `schema_change_hygiene.md` | **BEHALTEN** als Hauptdatei |

**Aktion:**
1. Alle 4 anderen Dateien lesen
2. Wichtige Punkte in `schema_change_hygiene.md` integrieren
3. 4 Dateien löschen

### STEP-Ticket / Portrait Refactoring (4 Dateien → 1 Datei + Rules)

| Aktuelle Datei | Problem |
|----------------|---------|
| `step-ticket-improvements.md` (docs/analysis) | **BEHALTEN** - enthält Template |
| `portrait-refactoring-step-ticket-analysis.md` (docs/analysis) | **ARCHIVIEREN** - nur Historie |
| `feedback_ticket_creation.md` (memory) | Überschneidet sich mit step-ticket-improvements |
| `step-tickets-m-ssen-haben-1-explicit-scope` (memory via bd remember) | **BEHALTEN** als Rule |

**Aktion:**
1. `portrait-refactoring-step-ticket-analysis.md` nach `docs/analysis/archive/` verschieben
2. `feedback_ticket_creation.md` löschen (redundant)

### Verification Protocol (2 Dateien → 1 Datei)

| Aktuelle Datei | Problem |
|----------------|---------|
| `verification_protocol.md` | **BEHALTEN** - zentrale Checkliste |
| `playwright-verification-protocol.md` (docs/analysis) | **BEHALTEN** - spezifisch für Playwright |

**Aktion:** Keine - beide sind komplementär

**SUBTOTAL KONSOLIDIEREN: 5 Dateien löschen, 2 behalten**

---

## Kategorie 3: BEHALTEN (Actionable Rules)

Diese Dateien enthalten konkrete Regeln die bei zukünftiger Arbeit angewendet werden sollten.

### Core Rules (15 Dateien)

| Datei | Warum behalten |
|-------|---------------|
| `verification_protocol.md` | Zentrale Read/Verify Before Write Checkliste |
| `feedback_schema-change-consumer-analysis.md` | Schema-Änderungen erfordern Consumer-Analyse |
| `feedback_circular_dependency_check.md` | Circular Dependency Prevention |
| `feedback_destructive-cli-pipelines.md` | Nie aus ungeprüften Pipelines schreiben |
| `feedback_avoid_bash_json_manipulation.md` | JSON nie mit Bash-Heredocs editieren |
| `feedback_bd-cli-conventions.md` | bd-CLI Konventionen (Epic-Parenting etc.) |
| `feedback_backlog-review-subagent.md` | Batches vor Freigabe reviewen |
| `feedback_beads-child-close.md` | Child-Schließung bei offenem Parent |
| `feedback_design-decision-questions.md` | Richtungsfragen mit Optionen + Empfehlung |
| `feedback_verify-claims-against-code.md` | Code-Fakten gegen Live-Code prüfen |
| `feedback_house-geometry-planning.md` | House Geometry bounds/overlaps prüfen |
| `feedback_npc-content-validation.md` | Enemy NPCs in npcs.json UND enemy-npcs.json |
| `feedback_quest_discovery_debugging.md` | Read data flow before Playwright |
| `feedback_test-mock-strategy.md` | Test mock strategy |
| `feedback_corridor_implementation.md` | Corridor-run Implementation Lessons |

### Architecture / Patterns (5 Dateien)

| Datei | Warum behalten |
|-------|---------------|
| `intention-system-architecture.md` | Intention System Design (5-stage pipeline) |
| `test-fixture-pattern.md` | Test Fixture Pattern für komplexe State |
| `schema_change_hygiene.md` | Schema Change Hygiene (konsolidiert) |
| `terminology_audit_group_coalition.md` | Terminology Audit (coalition→group) |
| `immer-current-does-not-fix-nested-mutations.md` | Immer current() Limitierung |
| `questsettlement-architecture-inconsistency.md` | Architecture Inconsistency (mutate vs return) |

### Economy / Lore (1 Datei)

| Datei | Warum behalten |
|-------|---------------|
| `economy_lore_consistency.md` | Wirtschaftssystem muss lore-konsistent sein |

**SUBTOTAL BEHALTEN: 22 Dateien (~930 Zeilen, ~2300 Tokens)**

---

## Kategorie 4: docs/analysis/ Bereinigung

| Datei | Entscheidung | Grund |
|-------|--------------|-------|
| `step-ticket-improvements.md` | **BEHALTEN** | Enthält actionable Template |
| `portrait-refactoring-step-ticket-analysis.md` | **ARCHIVIEREN** | Nur Historie |
| `ui-forensic-audit-2026-06-29.md` | **BEHALTEN** | UI-Audit mit konkreten Findings |
| `ui-art-audit-2026-06-29.md` | **BEHALTEN** | Art-Audit mit konkreten Findings |
| `ui-test-audit-framework.md` | **BEHALTEN** | Test-Framework Definition |
| `playwright-verification-protocol.md` | **BEHALTEN** | Playwright-spezifische Rules |
| `playwright-analysis-script.md` | **LÖSCHEN** | Nur Script, keine Rules |

**SUBTOTAL docs/analysis: 1 löschen, 1 archivieren, 5 behalten**

---

## Kategorie 5: CLAUDE.md & AGENTS.md Check

### CLAUDE.md - Überprüfung

**Inhalt:**
- Workflow-Dokumentation (beads, workflows) ✅ **Korrekt**
- Architecture Guardrails (Redux/Immer) ✅ **Korrekt**
- Verification Protocol ✅ **Korrekt** (doppelte Definition mit `verification_protocol.md`)
- Circular Dependency Prevention ✅ **Korrekt**

**Problem:**
- `Verification Protocol` ist **DOPPELT** definiert (in CLAUDE.md UND `verification_protocol.md`)
- `Schema-Change Hygiene` ist **DOPPELT** definiert (in CLAUDE.md UND `schema_change_hygiene.md`)

**Aktion:**
- CLAUDE.md sollte nur Verweise enthalten, nicht den vollen Inhalt
- Oder: CLAUDE.md behalten als "Quick Reference", Memories als "detailed docs"

### AGENTS.md - Datei existiert nicht

**Problem:** `AGENTS.md` wurde angefragt aber existiert nicht.

**Aktion:**
- Prüfen ob `docs/agent-operating-model.md` den Zweck erfüllt
- Falls ja: Keine Aktion nötig

---

## Empfohlene Aktionsschritte

### Schritt 1: Sofort löschen (18 Dateien)

```bash
bd forget session-2026-06-28-council-politics-complete
bd forget session_learnings_2026-06-28-pbft
bd forget session_learnings_2026-06-28-playwright-verification
bd forget session_learnings_2026-06-27-i6xc.3
bd forget session_learnings_2026-06-27-i6xc.3-4
bd forget session_learnings_2026-06-27-tdo4
bd forget session_learnings_2026-06-27-tdo4-final
bd forget session_learnings_2026-06-27-naked-npc
bd forget session_learnings_2026-06-27-naked-npc-fix
bd forget session_learnings_log
bd forget ki_retro_2026-06-27_npc_npc_dating
bd forget project_employment-system-implementation
bd forget project_destiny-jed7-epic-complete
bd forget project_subagent-definitions
bd forget project_test-tooling-quirks
bd forget dead-content-audit-findings-2026-06-24
bd forget terminology_cleanup_2026-06-26
bd forget schema_change_hygiene_corridor
```

**Erwarteter Gewinn: ~800 Zeilen, ~2000 Tokens**

### Schritt 2: Konsolidieren (5 Dateien)

```bash
# 1. Schema Change Hygiene konsolidieren
# - Read: feedback_schema-change-consumer-analysis.md
# - Read: feedback_schema_change_verify_data.md
# - Read: schema_change_hygiene_inventory.md
# - Read: schema_change_pattern.md
# - Integrieren in: schema_change_hygiene.md
# - Delete die 4 Quelldateien

# 2. STEP-Ticket konsolidieren
bd forget feedback_ticket_creation
```

**Erwarteter Gewinn: ~300 Zeilen, ~750 Tokens**

### Schritt 3: docs/analysis/ bereinigen

```bash
# 1. portrait-refactoring-step-ticket-analysis.md archivieren
mkdir -p docs/analysis/archive
mv docs/analysis/portrait-refactoring-step-ticket-analysis.md docs/analysis/archive/

# 2. playwright-analysis-script.md löschen
rm docs/analysis/playwright-analysis-script.md
```

**Erwarteter Gewinn: ~200 Zeilen, ~500 Tokens**

### Schritt 4: CLAUDE.md bereinigen

**Option A (Verweise):**
- Verification Protocol aus CLAUDE.md entfernen → Verweis auf `docs/verification_protocol.md`
- Schema-Change Hygiene aus CLAUDE.md entfernen → Verweis auf `schema_change_hygiene.md`

**Option B (Quick Reference behalten):**
- CLAUDE.md unverändert lassen (ist als Quick Reference nützlich)
- Aber: Memories die doppelten Inhalt haben löschen

**Empfehlung: Option B** - CLAUDE.md ist der "Quick Start" für neue Sessions

---

## Gesamtübersicht

| Aktion | Dateien | Zeilen | Tokens |
|--------|---------|--------|--------|
| Sofort löschen | 18 | ~800 | ~2000 |
| Konsolidieren | 5 | ~300 | ~750 |
| docs/analysis bereinigen | 2 | ~200 | ~500 |
| **GESAMT** | **25** | **~1300** | **~3250** |

**Vorher:** 41 Dateien, ~1730 Zeilen, ~4000-6000 Tokens
**Nachher:** 16 Dateien, ~430 Zeilen, ~750-1500 Tokens

**Gewinn: ~60-75% Kontext-Reduktion**

---

## Next Steps

**Soll ich:**
1. **Alle Löschungen automatisch durchführen** (25 `bd forget` Calls)
2. **Konsolidierung manuell machen** (Schema Change Hygiene zusammenführen)
3. **docs/analysis/ bereinigen** (Archive erstellen, Scripts löschen)
4. **Nur bestätigen lassen** und du machst es selbst

**Empfehlung:** Option 1+3 automatisch, Option 2 manuell (wegen inhaltlicher Arbeit)
