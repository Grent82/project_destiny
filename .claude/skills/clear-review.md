# C.L.E.A.R. Code Review Skill

Führe ein strukturiertes Code-Review basierend auf dem C.L.E.A.R. Framework durch.

## Usage

```
/clear-review <path-to-code-or-diff>
```

Optional mit Fokus:
```
/clear-review --focus=security <path>
/clear-review --focus=architecture <path>
```

## Framework

### C - Correctness (Korrektheit)

**Prüffragen:**
- Kompiliert/interpretiert der Code ohne Fehler?
- Erfüllt der Code die funktionalen Anforderungen?
- Sind Edge Cases berücksichtigt?
- Stimmt die Logik? (Off-by-One-Errors, Null-Checks, Boundary Conditions)

**Typische KI-Probleme:**
- Semantische Fehler bei korrekter Syntax
- Fehlende Fehlerbehandlung
- Unvollständige Implementierungen ("Happy Path only")
- Annahmen über Daten die nicht validiert sind

**Checklist:**
- [ ] Keine TypeScript/Compiler-Fehler
- [ ] Alle return paths covered
- [ ] Null/undefined checks an System-Boundaries
- [ ] Edge Cases getestet (leere Arrays, Grenzwerte, negative Werte)
- [ ] Invarianten werden erhalten

### L - Libraries & Dependencies (Bibliotheken)

**Prüffragen:**
- Existieren alle importierten Packages tatsächlich?
- Sind die verwendeten API-Methoden in der aktuellen Version verfügbar?
- Passen die Versionen zu unserem Tech-Stack?
- Gibt es bekannte Sicherheitslücken in den vorgeschlagenen Libraries?

**Typische KI-Probleme:**
- Package-Halluzinationen (nicht-existente Packages)
- Veraltete API-Methoden
- Version-Inkompatibilitäten
- Transitive Dependency-Konflikte

**Checklist:**
- [ ] Alle Imports existieren in `package.json`
- [ ] API-Methoden in Dokumentation nachweisbar
- [ ] Keine deprecated APIs ohne Migration
- [ ] Dependencies符合 clean architecture (Domain hat keine externen Dependencies)
- [ ] Security audit passed (`npm audit`)

**Verifikationsbefehle:**
```bash
# Package-Existenz prüfen
npm view <package-name>

# Projekt-Dependencies checken
grep "<package-name>" package.json

# Security audit
npm audit
```

### E - Efficiency & Performance (Effizienz)

**Prüffragen:**
- Ist die algorithmische Komplexität angemessen?
- Werden unnötige Operationen durchgeführt (Schleifen in Schleifen)?
- Gibt es offensichtliche Performance-Probleme?
- Werden Ressourcen korrekt freigegeben?

**Typische KI-Probleme:**
- Ineffiziente Algorithmen (O(n²) statt O(n log n))
- Redundante Berechnungen in Schleifen
- Memory Leaks durch nicht geschlossene Ressourcen
- Unnötige Re-Renderings in React

**Checklist:**
- [ ] Keine NESTED loops ohne Notwendigkeit
- [ ] Datenbank-Abfragen gebatcht wo möglich
- [ ] Memoization bei teuren Berechnungen
- [ ] React: keine unnötigen Re-Renderings
- [ ] Event-Listener werden entfernt

### A - Architecture Fit (Architekturpassung)

**Prüffragen:**
- Passt der Code in unsere bestehende Architektur?
- Werden unsere Design Patterns eingehalten?
- Entspricht der Code unseren Team-Standards?
- Ist der Code wartbar und erweiterbar?

**Typische KI-Probleme:**
- Domain-Logik in UI-Komponenten
- Framework-Dependencies in Domain-Layer
- Umgehung von Dependency-Injection
- Verletzung der Clean-Architecture-Regeln

**Checklist:**
- [ ] Domain depends on nothing (project-specific)
- [ ] Application depends only on Domain
- [ ] Infrastructure depends on Application + Domain
- [ ] UI depends only on Application contracts
- [ ] Keine business rules in UI components
- [ ] Side effects at the edges

**Project Destiny Architecture Rules:**
```
UI → Application → Domain
Infrastructure → Application → Domain
```

### R - Risks & Security (Risiken und Sicherheit)

**Prüffragen:**
- Gibt es potenzielle Sicherheitslücken (SQL Injection, XSS, etc.)?
- Werden Credentials oder Secrets hartcodiert?
- Ist Input-Validierung vorhanden?
- Werden Daten korrekt verschlüsselt/gehasht?

**Typische KI-Probleme:**
- Fehlende Input-Sanitization
- Unsichere Default-Konfigurationen
- Veraltete Kryptographie-Praktiken
- Race Conditions bei State-Updates

**Checklist:**
- [ ] Keine Secrets im Code
- [ ] Input-Validierung an allen Boundaries
- [ ] XSS-Prävention bei user-generated content
- [ ] CSRF-Tokens bei State-changes
- [ ] Error messages leak keine internen Details

## Output Format

Das Review gibt folgende Struktur zurück:

```markdown
## C.L.E.A.R. Review Report

### Summary
- **Overall Score:** X/5
- **Critical Issues:** N
- **Warnings:** N
- **Suggestions:** N

### C - Correctness
✅ Pass / ⚠️ Warning / ❌ Fail
- [Findings]

### L - Libraries
✅ Pass / ⚠️ Warning / ❌ Fail
- [Findings]

### E - Efficiency
✅ Pass / ⚠️ Warning / ❌ Fail
- [Findings]

### A - Architecture
✅ Pass / ⚠️ Warning / ❌ Fail
- [Findings]

### R - Risks
✅ Pass / ⚠️ Warning / ❌ Fail
- [Findings]

### Action Items
1. [Priority] Issue description
2. [Priority] Issue description
```

## Integration mit Bead Workflow

Vor `bd close` auf Implementation-Beads:

```bash
# Automatische C.L.E.A.R. Review
/clear-review src/path/to/changed/files

# Manuelle Checklist
- [ ] C: Correctness verified (tests pass)
- [ ] L: Libraries validated (no hallucinations)
- [ ] E: Efficiency reviewed (no obvious anti-patterns)
- [ ] A: Architecture fit confirmed (clean boundaries)
- [ ] R: Risks assessed (security review complete)
```

## Persistenz und Memory

Project Destiny verwendet zwei komplementäre Persistenz-Systeme:

- **`bd remember`** — Für kurzfristige, session-relevante Erkenntnisse während der aktiven Arbeit
- **`.claude/memory/MEMORY.md`** — Für dauerhafte Projekt-Erkenntnisse, die über Sessions hinweg gelten

Beide Systeme sind gültig und ergänzen sich. Die ki-retro-Skill schreibt Erkenntnisse in `.claude/memory/` als dauerhafte Artefakte.

## Beispiel-Reviews

### Beispiel 1: Correctness Failure

```typescript
// ❌ FAIL: Missing null check
function getUserAge(userId: string): number {
  const user = db.findUser(userId)
  return user.age  // user can be null!
}

// ✅ PASS: With null check
function getUserAge(userId: string): number | null {
  const user = db.findUser(userId)
  if (!user) return null
  return user.age
}
```

### Beispiel 2: Architecture Violation

```typescript
// ❌ FAIL: Domain depends on framework
import { z } from 'zod'
export class Npc {
  schema: z.ZodType  // Zod is framework concern!
}

// ✅ PASS: Pure domain model
export class Npc {
  // Pure TypeScript, no framework dependencies
  validate(): boolean { /* ... */ }
}
// Zod validation in Infrastructure layer only
```

### Beispiel 3: Security Risk

```typescript
// ❌ FAIL: SQL Injection vulnerability
const query = `SELECT * FROM users WHERE id = '${userId}'`

// ✅ PASS: Parameterized query
const query = 'SELECT * FROM users WHERE id = $1'
db.execute(query, [userId])
```

## Metriken

Ein Code-Review ist erfolgreich wenn:

- **Critical Issues:** 0 (must fix before merge)
- **Warnings:** ≤ 3 (should fix soon)
- **Suggestions:** Unbounded (nice to have)

Review-Score berechnung:
```
Score = 5 - (critical * 1.5) - (warnings * 0.5) - (suggestions * 0.1)
```
