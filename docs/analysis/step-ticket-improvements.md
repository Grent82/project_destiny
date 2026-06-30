# STEP-Ticket Verbesserungen: Analyse der Portrait-System Refaktorierung

## Kontext

Diese Analyse dokumentiert, wie STEP-Ticket-Beschreibungen klarer und fehlerresistenter gestaltet werden können. Grundlage ist die Portrait-System-Refaktorierung (Juni 2026), bei der mehrere Tickets falsch umgesetzt wurden.

---

## Problematische Tickets im Detail

### STEP 1: Remove hardcoded portrait allowlist (destiny-4akk)

**Was das Ticket sagte:**
```
Die Funktion soll immer true zurückgeben.
Nicht die Funktion löschen!
Nicht andere Logik hinzufügen!
Nur diese eine Funktion ändern!
```

**Was gut war:**
- ✅ Explizite Warnung "Nicht die Funktion löschen"
- ✅ Klare Code-Beispiel für das Ziel
- ✅ Genaue Dateipfad und Zeilennummer

**Was fehlte:**
- ❌ Keine Erwähnung der **Caller** dieser Funktion
- ❌ Keine Warnung vor "unused import" Cleanup
- ❌ Keine Definition was "nur diese Funktion ändern" bedeutet

**Wie es besser sein sollte:**

```markdown
## WAS SICH NICHT ÄNDERT

- Alle UI-Komponenten die hasPortraitAvailable() aufrufen bleiben unverändert
- PortraitFallback-Komponente bleibt erhalten
- onError Handler in allen img-Tags bleiben erhalten

## WAS DU NICHT ANRÜHREN DARFST

❌ Nicht hasPortraitAvailable() aus anderen Dateien entfernen
❌ Nicht PortraitFallback imports löschen
❌ Nicht onError Handler ändern oder entfernen
❌ Nicht "unused import" bereinigen in anderen Dateien

## VERIFICATION CHECKLIST

Nach der Änderung:
1. grep -r 'hasPortraitAvailable' src/ui --include='*.tsx'
   → Alle Calls auf hasPortraitAvailable() sollten immer noch existieren
2. grep -r 'PortraitFallback' src/ui --include='*.tsx'
   → Alle Importe sollten unverändert sein
3. git diff --stat
   → Nur portraitUtils.ts sollte geändert sein
```

---

### STEP 2: Add onError fallback (destiny-auq5)

**Was das Ticket sagte:**
```
Jedes Portrait-Bild muss einen onError Handler haben.
```

**Was gut war:**
- ✅ Liste der zu prüfenden Dateien
- ✅ Code-Beispiel für den onError Handler

**Was fehlte:**
- ❌ Keine Unterscheidung zwischen "bereits vorhanden" vs "fehlt"
- ❌ Keine Warnung vor inkonsistenten Implementierungen
- ❌ Keine Definition was bei Fehlern passieren soll

**Wie es besser sein sollte:**

```markdown
## ZUSTAND ERMITTELN

Vor der Änderung:
1. grep -r 'onError' src/ui --include='*.tsx' | grep portraits
   → Welche Dateien haben schon onError?
2. grep -r 'PortraitFallback' src/ui --include='*.tsx'
   → Welche Dateien nutzen PortraitFallback?

## ZIELZUSTAND

Jedes Portrait-Bild muss:
1. onError Handler haben
2. onError zeigt PortraitFallback bei Fehler (nicht nur display: none!)
3. Konsistente Implementierung über alle Dateien

## INKONSISTENZEN ERKENNEN

❌ MissionPrepScreen: Hat onError aber zeigt inline SVG (NICHT PortraitFallback)
❌ EventModal: Hat onError aber kein PortraitFallback

Wenn inkonsistente Implementierungen gefunden werden:
→ NICHT ändern (außer Ticket sagt explizit "konsistent machen")
→ Kommentar im Ticket hinterlassen
```

---

### STEP 5: Remove push/ask/commit badges (destiny-kp8n)

**Was das Ticket sagte:**
```
Lösche die kind-badge Zeilen aus DialogueScreen.tsx
```

**Was gut war:**
- ✅ Genaue Zeilennummer
- ✅ Code-Beispiel zu löschen

**Was fehlte:**
- ❌ Keine Warnung vor "related code" Cleanup
- ❌ Keine Definition was "Badges entfernen" bedeutet (nur Anzeige oder auch Logik?)

**Wie es besser sein sollte:**

```markdown
## WAS DU ÄNDERST

Lösche NUR diese Zeilen:
<span className="dialogue-choice-kind-badge">
  {choice.kind}
</span>

## WAS DU NICHT ANRÜHREN DARFST

❌ Nicht choice.kind aus dem Datenmodell entfernen
❌ Nicht die ganze Button-Klasse ändern
❌ Nicht andere "badge" Klassen entfernen (z.B. badge-positive)
❌ Nicht "unused imports" bereinigen

## VERIFICATION

Nach der Änderung:
1. git diff src/ui/screens/DialogueScreen.tsx
   → Nur die kind-badge Zeilen sollten fehlen
2. pnpm typecheck
   → choice.kind sollte immer noch definiert sein (nur nicht angezeigt)
```

---

### STEP 6: Remove Conversation shift panels (destiny-mba6) - KRITISCH

**Was das Ticket sagte:**
```
Option A (einfach): Entfernen
- Lösche Line 163: {recentBeat && <DialogueBeatPanel ... />}
- Lösche Lines 77-90 (das closingBeat Panel)
- Lösche die ganze DialogueBeatPanel Funktion (Lines 20-37)

Option B (besser): Umgestalten
```

**Was SCHLECHT war:**
- ❌ "Option A" und "Option B" in einem Ticket → Verwirrung
- ❌ Keine Warnung vor "unused imports" in anderen Dateien
- ❌ Keine Definition der Abhängigkeiten zu STEP 1+2

**Was passiert ist:**
- DialogueBeatPanel entfernt (korrekt)
- **AUCH** hasPortraitAvailable() aus portraitUtils.ts entfernt (FALSCH!)
- **AUCH** PortraitFallback imports aus DialogueScreen/NpcDetailPanel entfernt (FALSCH!)

**Wie es besser sein sollte:**

```markdown
## SCOPE - WAS DU ÄNDERST

NUR in src/ui/screens/DialogueScreen.tsx:
1. Lösche {recentBeat && <DialogueBeatPanel ... />} (Line 163)
2. Lösche closingBeat Panel (Lines 77-90)
3. Lösche DialogueBeatPanel Funktion (Lines 20-37)

## SCOPE - WAS DU NICHT ANRÜHREN DARFST

❌ NICHT portraitUtils.ts ändern (hasPortraitAvailable bleibt!)
❌ NICHT PortraitFallback imports entfernen (wird von STEP 1+2 benötigt!)
❌ NICHT onError Handler ändern
❌ NICHT "unused imports" in anderen Dateien bereinigen

## ABHÄNGIGKEITEN

Dieses Ticket HÄNGT AB VON:
→ STEP 1 (destiny-4akk): hasPortraitAvailable() existiert
→ STEP 2 (destiny-auq5): onError Handler + PortraitFallback

Wenn du PortraitFallback oder hasPortraitAvailable entfernst:
→ HAST DU EIN ANDERES TICKET ZERSTÖRT!

## VERIFICATION CHECKLIST

Nach der Änderung:
1. grep -r 'hasPortraitAvailable' src/ui --include='*.tsx'
   → Sollte immer noch Calls in DialogueScreen zeigen
2. grep -r 'PortraitFallback' src/ui --include='*.tsx'
   → Sollte immer noch Importe in DialogueScreen und NpcDetailPanel zeigen
3. grep -r 'onError' src/ui --include='*.tsx' | grep portraits
   → onError Handler sollten unverändert sein
4. git diff --stat
   → Nur DialogueScreen.tsx sollte geändert sein
   → portraitUtils.ts darf NICHT geändert sein
   → NpcDetailPanel.tsx darf NICHT geändert sein
```

---

### STEP 7: Remove Quality Bands explanation (destiny-6c3c)

**Was das Ticket sagte:**
```
Lösche den ganzen article-Block (Lines 90-110)
Die Rarity-Badges auf den einzelnen Recruiten bleiben erhalten!
```

**Was gut war:**
- ✅ Explizite Warnung "Rarity-Badges bleiben"
- ✅ Genaue Zeilennummer
- ✅ Code-Block zu löschen

**Was fehlte:**
- ❌ Keine Warnung vor "unused imports/variables"
- ❌ Keine Definition was mit qualityBands const passiert

**Wie es besser sein sollte:**

```markdown
## WAS DU ÄNDERST

Lösche NUR diesen article-Block in RecruitmentScreen.tsx:
<article className="detail-panel" style={{ margin: '1rem 0' }}>
  <h2>Quality Bands</h2>
  ...
</article>

## WAS PASSIERT MIT qualityBands?

Das Ticket sagt NICHT was mit qualityBands const passieren soll.
→ LASS ES UNBERÜHRT (auch wenn ESLint warnt)
→ Nicht "unused import" bereinigen

## VERIFICATION

Nach der Änderung:
1. git diff src/ui/screens/RecruitmentScreen.tsx
   → Nur der article-Block sollte fehlen
   → qualityBands const sollte immer noch da sein
2. pnpm typecheck
   → ESLint warnings sind OK (nicht bereinigen!)
```

---

### Quality Gate: destiny-ynxu

**Was das Ticket sagte:**
```
Prüfe gegen die Kriterien oben
Playwright Screenshot zeigt keine Badges?
pnpm typecheck zeigt keine Fehler?
```

**Was SCHLECHT war:**
- ❌ Quality Gate hat KEINE "Scope-Check" definiert
- ❌ Keine "Cross-File" Verifikation
- ❌ Keine Definition was bei "unused imports" zu tun ist

**Wie es besser sein sollte:**

```markdown
## QUALITY GATE CHECKLIST - JEDEN SCHRItt VERIFIZIEREN

### Nach STEP 1:
- [ ] hasPortraitAvailable() hat return true
- [ ] knownPortraits array ist weg
- [ ] git diff zeigt NUR portraitUtils.ts
- [ ] grep -r 'hasPortraitAvailable' src/ui zeigt alle Calls noch
- [ ] grep -r 'PortraitFallback' src/ui zeigt alle Importe noch

### Nach STEP 2:
- [ ] Alle 4 Dateien haben onError Handler
- [ ] onError zeigt PortraitFallback (nicht nur display: none)
- [ ] git diff zeigt NUR die erwarteten Dateien
- [ ] pnpm typecheck zeigt keine Fehler

### Nach STEP 5:
- [ ] Keine push/ask/commit Badges mehr
- [ ] git diff zeigt NUR DialogueScreen.tsx
- [ ] choice.kind ist immer noch im Datenmodell

### Nach STEP 6:
- [ ] Keine DialogueBeatPanel mehr in DialogueScreen
- [ ] grep -r 'hasPortraitAvailable' src/ui zeigt immer noch Calls
- [ ] grep -r 'PortraitFallback' src/ui zeigt immer noch Importe
- [ ] git diff zeigt NUR DialogueScreen.tsx
- [ ] portraitUtils.ts wurde NICHT geändert!
- [ ] NpcDetailPanel.tsx wurde NICHT geändert!

### Nach STEP 7:
- [ ] Kein "Quality Bands" article mehr
- [ ] Rarity-Badges auf Recruiten sind noch da
- [ ] git diff zeigt NUR RecruitmentScreen.tsx
- [ ] qualityBands const ist immer noch da

## CRITICAL RULE

Wenn git diff mehr Dateien zeigt als erwartet:
→ TICKET NICHT SCHLIESSEN
→ Kommentar schreiben: "Unerwartete Änderungen in: [Dateien]"
→ User muss bestätigen ob Änderungen beabsichtigt waren

## CROSS-FILE VERIFICATION

Vor jedem Close:
1. git diff --stat
   → Welche Dateien wurden geändert?
   → Entspricht das dem Ticket-Scope?
2. grep -r 'hasPortraitAvailable|PortraitFallback|onError' src/ui
   → Wurden Abhängigkeiten von STEP 1+2 zerstört?
3. pnpm typecheck
   → Keine neuen Fehler?
```

---

## Allgemeine Prinzipien für bessere STEP-Tickets

### 1. Explizite Scope-Begrenzung

**Schlecht:**
```
Entferne unused imports
```

**Gut:**
```
SCOPE: Nur imports in der geänderten Datei bereinigen
NICHT ANRÜHREN: imports in anderen Dateien, auch wenn ESLint warnt
```

### 2. Abhängigkeiten definieren

**Schlecht:**
```
Lösche die DialogueBeatPanel Funktion
```

**Gut:**
```
ABHÄNGIGKEITEN:
→ Dieses Ticket setzt STEP 1+2 voraus (hasPortraitAvailable, PortraitFallback)
→ NICHT hasPortraitAvailable oder PortraitFallback entfernen
→ Wenn du diese entfernst: HAST DU EIN ANDERES TICKET ZERSTÖRT!
```

### 3. Verifikation vor Close

**Schlecht:**
```
pnpm typecheck zeigt keine Fehler
```

**Gut:**
```
VERIFICATION CHECKLIST:
- [ ] git diff --stat zeigt nur erwartete Dateien
- [ ] grep -r 'hasPortraitAvailable' zeigt alle Calls noch
- [ ] grep -r 'PortraitFallback' zeigt alle Importe noch
- [ ] pnpm typecheck zeigt keine Fehler
- [ ] pnpm test:run zeigt alle Tests grün
```

### 4. "Was passiert mit X?" klären

**Schlecht:**
```
Lösche den article-Block
```

**Gut:**
```
WAS PASSIERT MIT qualityBands const?
→ LASS ES UNBERÜHRT (auch wenn ESLint warnt)
→ Nicht "unused import" bereinigen
```

### 5. Keine "Optionen" in einem Ticket

**Schlecht:**
```
Option A (einfach): Entfernen
Option B (besser): Umgestalten
```

**Gut:**
```
ENTWEDER:
→ Ticket A: "Entferne DialogueBeatPanel komplett"
ODER:
→ Ticket B: "Gestalte DialogueBeatPanel um"

NICHT beide Optionen in einem Ticket!
```

### 6. "Großer Bruder" Hinweise konkretisieren

**Schlecht:**
```
Diese Änderung ist sicher weil alle UI-Komponenten schon einen onError Handler haben.
```

**Gut:**
```
GRUND: Alle UI-Komponenten haben schon onError Handler (STEP 2).
VERIFICATION: grep -r 'onError' src/ui --include='*.tsx' | grep portraits
→ Sollte 4 Treffer zeigen (DialogueScreen, NpcDetailPanel, MissionPrepScreen, EventModal)
```

---

## Zusammenfassung: Die 5 Goldenen Regeln für STEP-Tickets

1. **Scope-Begrenzung explizit definieren**
   - "NUR in Datei X ändern"
   - "NICHT in Datei Y anrühren"

2. **Abhängigkeiten zwischen Tickets dokumentieren**
   - "Dieses Ticket setzt STEP N voraus"
   - "NICHT Code aus STEP N entfernen"

3. **Verifikation vor Close erzwingen**
   - Checkliste mit konkreten Commands
   - "git diff --stat zeigt nur X"
   - "grep -r 'symbol' zeigt noch Y"

4. **Unklare Fälle als separates Ticket**
   - Nicht "Option A oder B" in einem Ticket
   - Entweder Ticket A oder Ticket B

5. **"Unused imports/variables" explizit behandeln**
   - "LASS UNBERÜHRT (auch wenn ESLint warnt)"
   - ODER: "Bereinige NUR in der geänderten Datei"

---

## Template für zukünftige STEP-Tickets

```markdown
## WAS DU ÄNDERST

[Konkrete Änderungen mit Dateipfaden und Zeilennummern]

## WAS DU NICHT ANRÜHREN DARFST

❌ Nicht [Datei X] ändern
❌ Nicht [Symbol Y] entfernen
❌ Nicht "unused imports" in anderen Dateien bereinigen

## ABHÄNGIGKEITEN

→ Dieses Ticket setzt STEP N ([Ticket-ID]) voraus
→ [Symbol Z] wird von anderen Tickets benötigt

## VERIFICATION CHECKLIST

- [ ] git diff --stat zeigt nur [erwartete Dateien]
- [ ] grep -r '[Symbol]' src/ zeigt [erwartete Treffer]
- [ ] pnpm typecheck zeigt keine Fehler
- [ ] pnpm test:run zeigt alle Tests grün

## NÄCHSTER SCHRITT

Wenn fertig: [Nächstes Ticket ID]
```
