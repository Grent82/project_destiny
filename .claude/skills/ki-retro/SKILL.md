---
name: ki-retro
description: |
  Session-Retrospektive für Workflow, Zusammenarbeit und Fehler.
  Aktivieren am Ende einer Session oder wenn sich Muster wiederholt haben.
  Analysiert was gut/schlecht lief und bringt Erkenntnisse direkt in
  persistente Artefakte ein (Memory, Rules, AGENTS.md, Skills).
---

# KI-Retro

Führe eine strukturierte Retrospektive dieser Session durch.
**Ziel ist nicht ein Bericht — Ziel ist das konsolidierte Einschreiben von Erkenntnissen.**

**WICHTIG: Nicht jede Erkenntnis braucht eine neue Datei! Konsolidierung hat Vorrang vor Neuerstellung.**

---

## Schritt 1 — Session-Rückblick (kurz)

Nenne in maximal 5 Stichpunkten was in dieser Session gemacht wurde.

---

## Schritt 2 — Workflow & Zusammenarbeit

Beantworte ehrlich und konkret:

**Was hat gut funktioniert?**
- Welche Abläufe, Rollen oder Kommunikationsmuster haben Reibung reduziert?
- Was sollte explizit beibehalten und ggf. als Feedback-Memory gespeichert werden?

**Was hat Reibung erzeugt?**
- Wo gab es Missverständnisse, Korrekturrunden oder Hin-und-her?
- Welche Annahmen wurden getroffen statt nachgefragt?
- Welche Rolle fehlte oder wurde falsch gewählt?

---

## Schritt 3 — Fehler-Analyse

Liste jeden konkreten Fehler dieser Session:

| Fehler | Ursache | Wie oft korrigiert? |
|--------|---------|---------------------|
| ...    | Annahme statt Nachfragen / fehlende Regel / falsches Scope / ... | ... |

Sei ehrlich — auch kleinere Korrekturen zählen.

---

## Schritt 4 — Maßnahmen bestimmen (mit Konsolidierungs-Check)

**BEVOR du eine neue Datei schreibst: Prüfe ob bestehende Dateien aktualisiert werden können!**

### Konsolidierungs-Check (mandatory vor jedem Write)

```bash
# 1. Existiert schon ein ähnlicher Memory-Eintrag?
ls .claude/memory/feedback_*.md | xargs grep -l "Thema" 2>/dev/null

# 2. Gibt es eine bestehende Rule die passt?
ls .claude/rules/*.md | xargs grep -l "Thema" 2>/dev/null

# 3. Ist es wirklich neu oder nur Session-spezifisch?
#    Session-spezifisch → NICHT als Memory speichern!
```

### Maßnahmen-Matrix (priorisiert)

| Erkenntnis | PRIORITÄT | Maßnahme | Wo |
|------------|-----------|----------|----|
| Feedback das sich wiederholt hat | **Aktualisieren** | Bestehende `feedback_*.md` aktualisieren | `.claude/memory/` |
| Feedback das sich wiederholt hat | **Konsolidieren** | Mehrere `feedback_*.md` zu einer zusammenführen | `.claude/memory/` |
| Feedback das sich wiederholt hat | **Neu** (nur wenn 3+ mal) | Neue `feedback_*.md` schreiben | `.claude/memory/` |
| Neue Projektinformation | **Prüfen** | Ist es dauerhaft relevant oder Session-spezifisch? | Nur dauerhaft → Memory |
| Wiederkehrender Fehler (2x+) | **Rule prüfen** | Existiert schon eine ähnliche Rule? | `.claude/rules/` |
| Wiederkehrender Fehler (3x+) | **Rule anlegen** | Neue Rule wenn kein existierender Pass | `.claude/rules/` |
| Rollenrouting war falsch | **Dokumentieren** | AGENTS.md oder Skill-Doku anpassen | `AGENTS.md` / Skill |
| Skill fehlt oder ist unvollständig | **Ergänzen** | Skill anpassen (nicht sofort neu erstellen) | `.claude/skills/` |
| Offene technische Schuld | **Bead** | `bd create ...` für technische Schuld | Beads |

### WICHTIGE Regeln

**❌ NICHT schreiben als Memory:**
- Session-spezifische Learnings (`session_learnings_*.md`)
- Einmalige Events ohne wiederkehrendes Pattern
- "X wurde am Y gemacht" Historie
- Komplett neue Files für jedes Feedback

**✓ STATTDESSEN:**
- Bestehende Feedback-Files aktualisieren
- Konsolidieren wenn mehrere ähnliche Files existieren
- Session-spezifisches in Bead beschreiben (nicht als File!)
- Rules nur bei 3+ Wiederholungen

**Prüfe VOR jedem Write:**
1. `grep -r "Thema" .claude/memory/ --include="*.md"` → Existiert schon?
2. `ls .claude/rules/*.md | xargs grep -l "Thema"` → Gibt es eine Rule?
3. "Ist dies dauerhaft relevant oder nur für diese Session?"

---

## Schritt 5 — Abschluss

Bestätige konkret:
- Welche Dateien wurden erstellt, aktualisiert oder konsolidiert?
- Was gilt explizit für die nächste Session?
- Was bleibt als offenes Risiko?

**Hygiene-Check vor Beendigung:**
```bash
# Zähle Memory-Dateien
ls -1 .claude/memory/*.md | wc -l
# Wenn > 35: Hinweis auf Bereinigung geben
# Wenn > 45: Dringende Bereinigung empfehlen
```
