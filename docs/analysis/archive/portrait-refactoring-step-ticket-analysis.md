# Portrait System Refactoring: STEP Ticket Analysis

## Executive Summary

This analysis examines the STEP ticket descriptions from the portrait system refactoring that went wrong. The refactoring involved 6 tickets (destiny-4akk, destiny-auq5, destiny-kp8n, destiny-mba6, destiny-6c3c, destiny-ynxu) that aimed to remove hardcoded portrait allowlists and clean up UI elements.

**Key Finding:** The tickets were unusually detailed and prescriptive, yet the refactoring still encountered issues. This suggests that ticket quality alone cannot prevent implementation errors—verification processes and adherence to existing patterns (like the STEP-Ticket Execution Rules in global instructions) are equally critical.

---

## Ticket-by-Ticket Analysis

### STEP 1: destiny-4akk - "Remove hardcoded portrait allowlist"

#### What the Ticket Said

**Core Instruction:**
> "Die Funktion soll immer true zurückgeben. Der Code wird: `export function hasPortraitAvailable(npcId: string): boolean { return true }`"

**Explicit Warnings:**
- "Nicht die Funktion löschen"
- "Nicht andere Logik hinzufügen"
- "Nur diese eine Funktion ändern"

**Context Provided:**
- Exact file path: `src/ui/components/portraitUtils.ts`
- Exact line numbers: 57-67
- Exact function code to find
- Analogy: "Stell dir vor: Du hast ein Haus mit 49 Türen. Aber nur 4 Türen haben ein Fenster."

**Safety Assurance:**
> "Großer Bruder Hinweis: Diese Änderung ist sicher weil alle UI-Komponenten schon einen onError Handler haben der den Fallback zeigt wenn das Bild nicht lädt."

#### What Went Wrong

The ticket explicitly stated that "alle UI-Komponenten schon einen onError Handler haben" — but this was **factually incorrect**. STEP 2 (destiny-auq5) was specifically about adding onError handlers that were *missing* from some components.

**The Contradiction:**
- STEP 1 claimed: "alle UI-Komponenten schon einen onError Handler haben"
- STEP 2's purpose: "Einige Bilder haben keinen onError Handler"

This created a logical inconsistency where STEP 1's safety assurance was based on a false premise.

#### How the Ticket Should Have Been Written

```markdown
## Sicherheitshinweis (WICHTIG)

Diese Änderung VORAUSSETZT dass alle Portrait-Bilder einen onError Handler haben.

**BEVOR du diese Änderung machst:**
1. Prüfe mit `grep -r 'onError' src/ui --include='*.tsx'` welche Bilder einen Handler haben
2. Wenn onError Handler fehlen: ZUERST destiny-auq5 abarbeiten (onError hinzufügen)
3. DANN erst diese Änderung machen

**Warum:** Ohne onError Handler würde das Bild bei NPCs ohne Portrait ein "kaputtes Bild"-Icon zeigen.
```

**Better phrasing for the safety note:**
> "Diese Änderung ist sicher VORAUSSETZT dass alle Portrait-Bilder einen onError Handler haben. Falls onError Handler fehlen, werden sie in STEP 2 hinzugefügt."

---

### STEP 2: destiny-auq5 - "Add onError fallback to portrait images"

#### What the Ticket Said

**Core Instruction:**
> "Jedes Portrait-Bild muss diesen onError Handler haben:"

**Files Listed:**
1. `src/ui/screens/DialogueScreen.tsx`
2. `src/ui/screens/NpcDetailPanel.tsx`
3. `src/ui/screens/MissionPrepScreen.tsx`
4. `src/ui/screens/EventModal.tsx`

**Explicit Warnings:**
- "Nicht die src URL ändern"
- "Nicht den alt Text ändern"
- "Nur den onError Handler hinzufügen wenn er fehlt"

**Context Provided:**
> "Prüfe jede Datei sorgfältig. Manche Bilder haben den Handler schon (DialogueScreen), manche nicht (EventModal)."

#### What Went Wrong

The ticket correctly identified that some files needed onError handlers, but the dependency chain was backwards:

**The Dependency Problem:**
- destiny-auq5 DEPENDS ON destiny-4akk (STEP 1 must complete first)
- But destiny-4akk's safety assurance assumed destiny-auq5 was already done

This created a **chicken-and-egg problem**: STEP 1 claimed safety based on handlers that STEP 2 was supposed to add.

**Ordering Issue:**
The correct order should have been:
1. Add onError handlers (destiny-auq5)
2. Remove hardcoded allowlist (destiny-4akk)

Not:
1. Remove hardcoded allowlist (destiny-4akk)
2. Add onError handlers (destiny-auq5)

#### How the Ticket Should Have Been Written

```markdown
## Dependencies (WICHTIG)

**Dieses Ticket MUSS VOR destiny-4akk abgearbeitet werden!**

Warum: destiny-4akk entfernt die allowlist. Ohne onError Handler würden Bilder ohne Portrait ein "kaputtes Bild"-Icon zeigen.

## Reihenfolge

1. ZUERST: onError Handler zu allen Portrait-Bildern hinzufügen (DIESER SCHRITT)
2. DANN: destiny-4akk (allowlist entfernen)
```

**Acceptance Criteria should have included:**
- "grep -r 'portraits/' src/ui --include='*.tsx' zeigt keine img Tags ohne onError"
- "pnpm test:run zeigt keine Fehler"

---

### STEP 5: destiny-kp8n - "Remove push/ask/commit badges from DialogueScreen"

#### What the Ticket Said

**Core Instruction:**
> "Entweder: Option A (einfach): Die Badge komplett löschen"
> "Option B (besser): Zeige stattdessen die Konsequenz"

**Context Provided:**
> "Die Badges zeigen 'push', 'ask', 'commit' - das sind interne Begriffe die der Spieler NICHT sehen soll."

**Großer Bruder Hinweis:**
> "Option B ist besser weil der Spieler dann die Konsequenz sieht statt eines leeren Platzhalters."

#### What Went Wrong

The ticket presented two options but **did not mandate which one to choose**. This ambiguity could lead to:
- Different implementers choosing different options
- Option B requiring more domain knowledge (what are `effectNotes`?)
- No clear acceptance criteria for Option B

**Missing Information:**
- What should happen to `choice.effectNotes` if they don't exist?
- Should the new badge use the same styling as the old one?
- What if `effectNotes[0]` is undefined?

#### How the Ticket Should Have Been Written

```markdown
## Was du ändern musst (EINDEUTIG)

**Wähle EINE Option:**

**Option A (einfach, empfohlen):** Die Badge komplett löschen

Lösch diese Zeilen (ca. 174-176):
<span className="dialogue-choice-kind-badge">
  {choice.kind}
</span>

**Option B (fortgeschritten):** Zeige Konsequenz statt internen Begriffs

Ersetze die Zeilen (ca. 174-176) mit:
<span className="dialogue-choice-consequence">
  {choice.effectNotes?.[0] || 'Keine Konsequenz'}
</span>

## Entscheidungshilfe

- Wähle Option A wenn: Du unsicher bist oder Zeitdruck hast
- Wähle Option B wenn: Du das EffectNotes-Konzept verstehst und bessere UX willst
```

**Acceptance Criteria should have been more specific:**
- "Keine 'push', 'ask', 'commit' Texte mehr in Dialogue-Buttons"
- "Wenn Option B: Buttons zeigen Konsequenz-Text oder 'Keine Konsequenz'"

---

### STEP 6: destiny-mba6 - "Remove Conversation shift panels from DialogueScreen"

#### What the Ticket Said

**Core Instruction:**
> "Entweder komplett entfernen" oder "Oder umgestalten (fortgeschritten)"

**Files/Locations:**
- Line ~163: recentBeat DialogueBeatPanel
- Line ~85: closingBeat DialogueBeatPanel
- Lines 20-37: DialogueBeatPanel function definition

**Context Provided:**
> "Diese Panels zeigen Texte wie 'Conversation shift' - das ist sinnvoller Ballast."

**Großer Bruder Hinweis:**
> "Entfernen ist der sichere Weg. Wenn du umgestalten willst, brauchst du ein neues Design zuerst."

#### What Went Wrong

Similar to STEP 5, this ticket presented **two options without clear guidance on which to choose**. The "fortgeschritten" option required design input that wasn't provided.

**The Ambiguity:**
- "Entfernen ist der sichere Weg" suggests Option A
- But "Oder umgestalten" implies Option B is valid
- No acceptance criteria for Option B

**Line Number Reliance:**
The ticket references specific line numbers (~163, ~85, 20-37) which can shift if previous tickets made changes. This is fragile.

#### How the Ticket Should Have Been Written

```markdown
## Was du ändern musst (EINDEUTIG)

**Entferne ALLES:**

1. Suche nach: `DialogueBeatPanel` (nicht nach Zeilennummern!)
2. Lösche alle Vorkommnisse von `<DialogueBeatPanel ... />`
3. Lösche die `DialogueBeatPanel` Funktionsdefinition

**Warum nicht umgestalten?**
Die Umgestaltung erfordert neue Design-Entscheidungen (welche Texte zeigen?).
Das ist OUT OF SCOPE für dieses Ticket.

## Wie du weißt dass es fertig ist

1. grep -r 'DialogueBeatPanel' src/ui/screens/DialogueScreen.tsx → keine Treffer
2. grep -r 'Conversation shift' src/ui → keine Treffer
3. pnpm typecheck zeigt keine Fehler
```

---

### STEP 7: destiny-6c3c - "Remove redundant Quality Bands explanation"

#### What the Ticket Said

**Core Instruction:**
> "Die ganze <article> Klasse löschen (Lines 90-110)"

**Context Provided:**
> "Dieser Abschnitt nimmt 30% des Bildschirms ein und erklärt was 'common', 'uncommon', 'rare' bedeutet."

**Explicit Warnings:**
- "Nicht die Rarity-Badges auf Recruiten löschen"
- "Nicht die RARITY_DESCRIPTIONS löschen (werden noch gebraucht)"
- "Nur den article-Block oben entfernen"

#### What Went Wrong

This ticket was relatively well-specified. The main issue was:

**Line Number Fragility:**
Referencing "Lines 90-110" is fragile if previous steps changed the file.

**Missing Verification:**
No explicit instruction to verify that RARITY_DESCRIPTIONS is still used elsewhere before deletion.

#### How the Ticket Should Have Been Written

```markdown
## Vor der Änderung (WICHTIG)

1. Prüfe ob RARITY_DESCRIPTIONS noch verwendet wird:
   grep -r 'RARITY_DESCRIPTIONS' src/ui --include='*.tsx'

2. Wenn nur in RecruitmentScreen.tsx: Kann gelöscht werden
3. Wenn anderswo verwendet: Behalte die Konstante

## Was du löschen musst

Suche nach dem <article className="detail-panel"> mit <h2>Quality Bands</h2>
(Nicht nach Zeilennummern - die können verschoben sein!)

Lösche DEN BLOCK nur:
<article className="detail-panel" style={{ margin: '1rem 0' }}>
  <h2>Quality Bands</h2>
  ...
</article>

## Nach der Änderung prüfen

1. pnpm typecheck → keine Fehler
2. Recruite zeigen noch ihre Rarity-Badges (visuell prüfen)
3. RARITY_DESCRIPTIONS Konstante ist entweder gelöscht (wenn unbenutzt) oder erhalten (wenn benutzt)
```

---

### Quality Gate: destiny-ynxu - "Verify all portrait and UI fixes"

#### What the Ticket Said

**Core Instruction:**
> "Du darfst NICHT selbst code schreiben. Deine Aufgabe ist es zu PRUFEN."

**Verification Checklist:**
- STEP 1: hasPortraitAvailable returns true, knownPortraits weg
- STEP 2: Alle Portrait-Bilder haben onError Handler
- STEP 5: Keine push/ask/commit Badges
- STEP 6: Keine DialogueBeatPanel-Verweise
- STEP 7: Kein Quality Bands article

**Tools Specified:**
- FileSystem MCP (code lesen)
- Playwright MCP (Screenshots)
- Puppeteer MCP (404-Fehler)
- Git MCP (Diff Review)

#### What Went Wrong

The Quality Gate ticket was **well-structured but came too late**. It should have been:
1. Created BEFORE the STEP tickets started
2. Referenced as a dependency in ALL STEP tickets
3. Used to verify EACH step before allowing the next step to begin

**The Fatal Flaw:**
The Quality Gate was a "blocker" for all STEP tickets (they all depended on it), but it couldn't verify STEP 1's safety claim because STEP 2's work hadn't been done yet.

**Missing:**
- No instruction to verify the *order* of execution
- No escalation path if a STEP ticket was done incorrectly
- No "stop the line" mechanism if verification failed

#### How the Ticket Should Have Been Written

```markdown
## Deine Rolle

Du bist die QUALITY GATE. Du hast VETO-Recht gegen das Schließen von STEP-Tickets.

## Arbeitsweise (STRICT)

**BEVOR ein STEP-Ticket geschlossen werden darf:**

1. Prüfe die vorherigen Schritte (falls vorhanden)
   - STEP 2 darf nicht geschlossen werden VOR STEP 1 ist verified
   - Warte auf manuelles Signal dass vorheriger Schritt verified ist

2. Führe ALLE Prüfungen durch:
   - Code lesen (FileSystem)
   - Screenshots (Playwright)
   - Network Errors (Puppeteer)
   - Git Diff (Git)
   - Tests laufen (pnpm test:run)

3. Wenn ALLES stimmt: Kommentar "✓ Verified" → Ticket kann geschlossen werden
4. Wenn ETWAS fehlt: Kommentar "✗ Failed: [what's missing]" → Ticket OFFEN lassen

## Stop-the-Line Regeln

**Schreibe sofort "STOP" und warte auf menschliche Entscheidung wenn:**

- Ein STEP-Ticket wurde geschlossen OHNE Quality Gate verification
- Tests sind rot aber jemand will trotzdem schließen
- Code wurde geändert die NICHT im Ticket beschrieben war
- Die Sicherheitsannahmen eines Tickets sind falsch (z.B. STEP 1 sagt "alle haben onError" aber STEP 2 zeigt dass nicht alle haben)

## Reihenfolge der Verifikation

1. destiny-auq5 (onError handlers) — VOR destiny-4akk
2. destiny-4akk (allowlist entfernen) — NACH destiny-auq5 verified
3. destiny-kp8n (badges entfernen)
4. destiny-mba6 (panels entfernen)
5. destiny-6c3c (quality bands entfernen)
```

---

## General Principles for Better STEP Ticket Descriptions

### 1. **Verify Safety Claims Before Making Them**

**Problem:** STEP 1 claimed "alle UI-Komponenten haben schon onError Handler" — this was false.

**Principle:** Never state a safety assumption as fact unless you've verified it. Use conditional language:

```markdown
❌ "Diese Änderung ist sicher weil alle Komponenten schon X haben."
✓ "Diese Änderung ist sicher VORAUSSETZT dass alle Komponenten X haben. 
   Falls X fehlt, zuerst Y machen (destiny-XXX)."
```

### 2. **Respect Dependency Order**

**Problem:** The dependency chain was backwards — STEP 1 needed STEP 2's work to be done first.

**Principle:** Map out the actual execution order vs. the logical dependency order. They may differ:

```markdown
## Dependencies

**Technisch:** destiny-4akk BLOCKT destiny-auq5 (destiny-auq5 depends on destiny-4akk)
**Praktisch:** destiny-auq5 MUSS VOR destiny-4akk gemacht werden

**Abarbeitungs-Reihenfolge:**
1. destiny-auq5 (onError hinzufügen)
2. destiny-4akk (allowlist entfernen)
```

### 3. **Avoid Ambiguous Options**

**Problem:** STEP 5 and STEP 6 presented "Option A" and "Option B" without clear guidance on which to choose.

**Principle:** If you present options, mandate which one to use:

```markdown
❌ "Entweder Option A oder Option B (besser)"
✓ "Wähle Option A (einfach, empfohlen). Option B erfordert Design-Entscheidungen die OUT OF SCOPE sind."
```

### 4. **Don't Rely on Line Numbers**

**Problem:** Multiple tickets referenced specific line numbers that could shift.

**Principle:** Use search patterns instead:

```markdown
❌ "Lösche Zeilen 90-110"
✓ "Suche nach <article className="detail-panel"> mit <h2>Quality Bands</h2> und lösche diesen Block"
```

### 5. **Make Acceptance Criteria Testable**

**Problem:** Some acceptance criteria were vague ("pnpm typecheck zeigt keine Fehler").

**Principle:** Make criteria verifiable with specific commands:

```markdown
## Wie du weißt dass es fertig ist

1. `grep -r 'DialogueBeatPanel' src/ui/screens/DialogueScreen.tsx` → keine Treffer
2. `grep -r 'Conversation shift' src/ui` → keine Treffer
3. `pnpm typecheck` → keine Fehler
4. `pnpm test:run` → alle Tests grün
```

### 6. **Quality Gates Should Be Active, Not Passive**

**Problem:** The Quality Gate ticket was a dependency blocker but couldn't actively enforce order.

**Principle:** Quality Gates should have explicit "stop the line" authority:

```markdown
## Stop-the-Line Authority

Du darfst sagen "STOP" und warten wenn:
- Ein Schritt wurde ohne deine Verifikation abgeschlossen
- Die Sicherheitsannahmen eines Tickets sind falsch
- Tests sind rot
- Jemand will mehr ändern als das Ticket beschreibt
```

### 7. **Document the "Why" Behind the Order**

**Problem:** No explanation for why the dependency chain was set up the way it was.

**Principle:** Explain the reasoning:

```markdown
## Warum diese Reihenfolge?

1. Zuerst onError handlers hinzufügen (destiny-auq5)
   - Ohne onError würden fehlende Portraits "kaputtes Bild"-Icons zeigen
   
2. Dann allowlist entfernen (destiny-4akk)
   - Jetzt ist es sicher weil onError Handler existieren
   
3. Dann UI-Cleanup (STEP 5-7)
   - Diese sind unabhängig von den Portrait-Änderungen
```

### 8. **Include Pre-Flight Checks**

**Problem:** No instruction to verify the current state before making changes.

**Principle:** Always include pre-flight verification:

```markdown
## BEVOR du beginnst

1. `git status` → keine uncommitted changes
2. `pnpm test:run` → alle Tests grün
3. `grep -r 'onError' src/ui --include='*.tsx' | grep -i portrait` → prüfe welche Bilder Handler haben
```

---

## Lessons Learned for Future STEP Tickets

### The "Großer Bruder" Pattern Failed Here

The tickets repeatedly used "Großer Bruder Hinweis" to provide safety assurances. But the "Großer Bruder" (Quality Gate) couldn't prevent the fundamental logical inconsistency between STEP 1 and STEP 2.

**Better approach:** The "Großer Bruder" should have been activated BEFORE STEP 1 started, not as a passive dependency.

### Assumptions Are the Enemy

STEP 1's fatal flaw was assuming "alle UI-Komponenten haben schon onError Handler" without verification. This single assumption created the entire logical problem.

**Rule:** Never state an assumption as fact. Use:
- "VORAUSSETZT dass..." (conditional)
- "Prüfe zuerst: ..." (verification required)
- "Wenn X fehlt, dann Y" (contingency planning)

### Dependency Chains ≠ Execution Order

Just because Ticket B depends on Ticket A doesn't mean A should be done first. Technical dependencies and safety dependencies can be opposite.

**Rule:** Explicitly document both:
```markdown
## Technical Dependencies
destiny-auq5 DEPENDS ON destiny-4akk (code structure)

## Safety Dependencies  
destiny-4akk REQUIRES destiny-auq5 (execution order)

## Abarbeitungs-Reihenfolge: destiny-auq5 → destiny-4akk
```

---

## Appendix: Original Ticket References

| Ticket ID | Title | Label | Priority | Status |
|-----------|-------|-------|----------|--------|
| destiny-4akk | STEP 1: Remove hardcoded portrait allowlist | ui-ux | P0 | CLOSED |
| destiny-auq5 | STEP 2: Add onError fallback to portrait images | ui-ux | P0 | CLOSED |
| destiny-kp8n | STEP 5: Remove push/ask/commit badges | ui-ux | P1 | CLOSED |
| destiny-mba6 | STEP 6: Remove Conversation shift panels | ui-ux | P1 | CLOSED |
| destiny-6c3c | STEP 7: Remove Quality Bands explanation | ui-ux | P2 | CLOSED |
| destiny-ynxu | QUALITY GATE: Verify all fixes | architecture | P0 | CLOSED |

---

## Related Documentation

- `docs/task-contract.md` — Task creation and refinement guidelines
- `.claude/rules/step-ticket-execution.md` — Global STEP ticket execution rules
- `docs/agent-operating-model.md` — Agent workflow guidance
