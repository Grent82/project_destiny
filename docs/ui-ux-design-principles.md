# UI/UX Design-Prinzipien — Kindgerecht für Project Destiny

**Zielgruppe:** Junior UI Designer, Junior UX Designer, Junior Developer  
**Ziel:** Jeder Punkt muss so klar sein, dass ein Kind es verstehen kann. Kein abstrakter Blabla.

**Wichtig:** Diese Prinzipien ERGÄNZEN die bestehenden Dokumente:
- `docs/ui-principles.md` — Kurze Zusammenfassung
- `docs/art-direction.md` — Visuelle Richtung
- `docs/roles/ui-ux.md` — Rolle und Verantwortung

---

## Teil 1: Was ist eigentlich UI/UX? (Für Anfänger)

### UI = User Interface (Benutzeroberfläche)

**UI ist alles was der Spieler ANSICHT und ANKLICKT:**
- Buttons
- Texte
- Bilder
- Menüs
- Farben
- Rahmen um Dinge

**Beispiel:**
```
┌─────────────────────────────────────┐
│  MARION VALE                        │
│  ┌─────────────────────────────┐    │
│  │      [PORTRÄT BILD]         │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Status: Bereit                     │
│  Treue: ████████░░ 80%              │
│                                     │
│  [Gespräch führen]  [Auftrag geben] │  ← BUTTONS
└─────────────────────────────────────┘
```
**Das hier ist UI:** Alles was du siehst!

---

### UX = User Experience (Nutzer-Erfahrung)

**UX ist WIE sich das ANFÜHLT zu benutzen:**
- Ist es einfach zu verstehen?
- Findet man was man sucht?
- Bekommt man gutes Feedback?
- Fühlt es sich gut an oder frustrierend?

**Gute UX Beispiel:**
```
Spieler klickt "Auftrag geben"
↓
Sofort erscheint: "Marion geht auf Mission"
↓
Marions Status ändert sich zu "Auf Mission"
```
**Das ist gute UX:** Klare Reaktion, nichts hängt, nichts ist verwirrend.

**Schlechte UX Beispiel:**
```
Spieler klickt "Auftrag geben"
↓
... (nichts passiert)
↓
... (immer noch nichts)
↓
Fehlermeldung: "Internal Error Code: 404"
```
**Das ist schlechte UX:** Spieler weiß nicht was los ist.

---

## Teil 2: Die 7 Goldenen Regeln für Project Destiny UI

### Regel 1: WICHTIGE INFOS müssen SOFORT SICHTBAR sein

**Was das bedeutet:**
Wenn ein Spieler einen Screen öffnet, muss er in **3 Sekunden** verstehen:
- Was ist hier los?
- Was kann ich tun?
- Was ist dringend?

**BEISPIEL — ROSTER SCREEN:**

```
❌ SCHLECHT — Wichtige Infos versteckt:
┌─────────────────────────────────────┐
│  ROSTER                             │
│  ┌─────────────────────────────┐    │
│  │ • Marion Vale               │    │  ← Nur Name sichtbar
│  │ • Verek Sorn                │    │  ← Keine Infos!
│  │ • Ida Rhys                  │    │  ← Wo ist Status?
│  └─────────────────────────────┘    │
│  [Detail anzeigen]                   │  ← Muss man klicken!
└─────────────────────────────────────┘
```

```
✅ GUT — Wichtige Infos auf einen Blick:
┌─────────────────────────────────────┐
│  ROSTER (5 von 10 einsatzbereit)    │
├──────────┬──────────┬───────────────┤
│ NAME     │ STATUS   │ EINSATZBEREIT │
├──────────┼──────────┼───────────────┤
│ Marion   │ Bereit   │ ████████░░ 80 │
│ Verek    │ Mission  │ ██████░░░░ 60 │
│ Ida      │ Verletzt │ ███░░░░░░░ 30 │
└──────────┴──────────┴───────────────┘
```

**Die Regel für dich:**
1. Liste alle WICHTIGEN Infos auf (z.B. Name, Status, Einsatzbereitschaft)
2. Stelle sicher, dass diese Infos auf dem ERSTEN Screen sichtbar sind
3. Verstecke NICHTS WICHTIGES hinter "Mehr anzeigen" oder Klicks

**Checkliste für Junior Devs:**
- [ ] Habe ich alle wichtigen Infos auf dem ersten Screen?
- [ ] Kann ein Spieler in 3 Sekunden verstehen was los ist?
- [ ] Muss ich für wichtige Infos klicken? (Wenn ja → SCHLECHT!)

---

### Regel 2: GRUPPIERE verwandte Dinge zusammen

**Was das bedeutet:**
Ähnliche Informationen gehören zusammen. Nicht alles wild verteilt.

**BEISPIEL — NPC DETAIL SCREEN:**

```
❌ SCHLECHT — Alles verstreut:
┌─────────────────────────────────────┐
│  MARION VALE                        │
│                                     │
│  Treue: 80%              [Bild]     │  ← Bild getrennt
│                                     │
│  Auftrag: Keine                    │
│                                     │
│  Skills:                            │
│  • Intrige 75                      │  ← Skills hier
│  • Verhandlung 60                  │
│                                     │
│  Status: Bereit                     │
│  Versteckt irgendwo:                │
│  • Gesundheit 100%                 │  ← Gesundheit versteckt
└─────────────────────────────────────┘
```

```
✅ GUT — Alles gruppiert:
┌─────────────────────────────────────┐
│  MARION VALE                        │
│  ┌─────────────────────────────┐    │
│  │  [BILD]  Status: Bereit     │    │  ← Bild + Status zusammen
│  │          Gesundheit: 100%   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─── EIGENSCHAFTEN ────────────┐   │
│  │ Treue: ████████░░ 80%        │   │  ← Alle Stats zusammen
│  │ Intrige: 75                  │   │
│  │ Verhandlung: 60              │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌─── AKTUELL ──────────────────┐   │
│  │ Auftrag: Keine               │   │  ← Aktuelle Infos zusammen
│  │ Einsatzbereitschaft: 80%     │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Die Regel für dich:**
1. Überlege: Welche Infos gehören zusammen? (z.B. alle Stats, alle aktuellen Aufgaben)
2. Mache Rahmen/Boxen um每组 (每组 = jede Gruppe)
3. Verwende Überschriften wie "EIGENSCHAFTEN", "AKTUELL", "AUSRÜSTUNG"

**Visuelle Gruppen-Regeln:**
- Gleicher Abstand INNERHALB einer Gruppe
- Größerer Abstand ZWISCHEN Gruppen
- Rahmen oder Hintergrundfarbe für Gruppen
- Überschriften über jeder Gruppe

---

### Regel 3: FEEDBACK GEBEN wenn etwas passiert

**Was das bedeutet:**
Wenn der Spieler etwas tut, MUSS das Spiel reagieren. Sofort!

**BEISPIEL — BUTTON KLICK:**

```
❌ SCHLECHT — Kein Feedback:
Spieler klickt [Gespräch führen]
↓
(nichts passiert auf dem Screen)
↓
(spieler klickt nochmal)
↓
(plötzlich öffnet sich Gespräch)
```
**Problem:** Spieler denkt "Hat das geklappt? Soll ich nochmal klicken?"

```
✅ GUT — Sofortiges Feedback:
Spieler klickt [Gespräch führen]
↓
Button wird grün: "Gespräch startet..."
↓
Lade-Animation (kleiner Kreis dreht sich)
↓
Gesprächsscreen öffnet sich
```

**Feedback-Arten die du benutzen kannst:**

| Aktion | Feedback |
|--------|----------|
| Button klicken | Button wird kurz heller/dunkler |
| Auftrag geben | Status ändert sich sofort zu "Auf Mission" |
| Item kaufen | Geld-Display aktualisiert sich |
| Quest abschließen | Große Meldung: "QUEST ABGESCHLOSSEN!" + Belohnung angezeigt |
| Fehler | Rote Meldung: "Nicht genug Geld" |

**Die Regel für dich:**
1. Jede Aktion braucht Feedback
2. Feedback muss SOFORT kommen (max 200ms)
3. Feedback muss KLAR sein (nicht nur "etwas passiert")

**Code-Beispiel für Developer:**
```typescript
// ❌ SCHLECHT — Kein Feedback
function startConversation() {
  navigate('/dialogue')
}

// ✅ GUT — Feedback geben
function startConversation() {
  setLoading(true)  // ← Zeige Lade-Animation
  navigate('/dialogue')
  setTimeout(() => setLoading(false), 200)  // ← Nach 200ms wieder weg
}
```

---

### Regel 4: KEIN JARGON — Spieler verstehen deine internen Begriffe NICHT

**Was das bedeutet:**
Du kennst Begriffe wie "push", "ask", "commit", "questId", "NPC runtime state".  
Spieler NICHT!

**BEISPIEL — DIALOGUE SCREEN:**

```
❌ SCHLECHT — Interner Jargon:
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │ [push] "Ich mache das nicht"│    │  ← Was ist "push"?
│  │ [ask] "Was weißt du?"       │    │  ← Was ist "ask"?
│  │ [commit] "Ich erledige es"  │    │  ← Was ist "commit"?
│  └─────────────────────────────┘    │
│                                     │
│  Conversation shift:                │  ← Was ist das???
│  "Das Thema verändert sich..."      │
└─────────────────────────────────────┘
```

```
✅ GUT — Spieler-verständlich:
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │ "Ich mache das nicht"       │    │  ← Nur der Text
│  │   → Spannt die Beziehung an │    │  ← Konsequenz erklärt
│  ├─────────────────────────────┤    │
│  │ "Was weißt du darüber?"     │    │
│  │   → Marion könnte antworten │    │
│  ├─────────────────────────────┤    │
│  │ "Ich erledige es"           │    │
│  │   → Marion vertraut dir mehr│    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Die Regel für dich:**
1. Schreibe alle Texte im Spiel auf
2. Frage dich: "Würde mein Opa verstehen was das bedeutet?"
3. Wenn NEIN → Umformulieren!

**Jargon-Liste die VERBOTEN ist:**
- "push/ask/commit" → Ersetze durch Konsequenzen
- "questId" → Zeige Quest-Name
- "NPC runtime state" → Zeige "Status: Bereit/Auf Mission/Verletzt"
- "activityLog" → Zeige "Aktivitäts-Verlauf" oder "Was passiert ist"
- "factionStanding" → Zeige "Verhältnis zu [Faktion]: Gut/Schlecht"

---

### Regel 5: BILDER LADEN — Immer mit Fallback!

**Was das bedeutet:**
Bilder gehen kaputt. Immer! Ein Bild-Link kann fehlen, Server kann down sein, etc.

**BEISPIEL — PORTRAIT LADEN:**

```
❌ SCHLECHT — Kein Fallback:
<img src="/portraits/npc-unknown-guy.jpg" />

// Was passiert wenn das Bild nicht existiert?
→ Spieler sieht ein kaputtes Bild-Symbol (X in Quadrat)
→ Browser Console zeigt "404 Not Found" Fehler
→ Spieler denkt "Das Spiel ist kaputt!"
```

```
✅ GUT — Mit Fallback:
<img 
  src="/portraits/npc-unknown-guy.jpg" 
  onError={(e) => {
    e.target.style.display = 'none'  // ← Kaputtes Bild verstecken
    document.getElementById('fallback-portrait').style.display = 'block'  // ← Ersatz zeigen
  }}
/>

<div id="fallback-portrait" style="display: none;">
  <img src="/portraits/generic-silhouette.svg" />  // ← Allgemeines Ersatz-Bild
</div>
```

**Die Regel für dich:**
1. JEDES Bild braucht einen `onError` Handler
2. Fallback-Bild muss existieren (z.B. allgemeines Silhouette-Bild)
3. Teste: Lösche ein Bild und starte das Spiel → Was siehst du?

**Code-Template für Developer:**
```typescript
// Wiederverwendbare Portrait-Komponente
function Portrait({ npcId, size = 'medium' }: { npcId: string, size?: 'small' | 'medium' | 'large' }) {
  const [hasError, setHasError] = useState(false)
  const portraitPath = `/portraits/${npcId}.jpg`
  const fallbackPath = `/portraits/generic-silhouette.svg`
  
  return (
    <img 
      src={portraitPath}
      alt="NPC Portrait"
      style={{ width: size === 'large' ? 200 : size === 'medium' ? 100 : 50 }}
      onError={(e) => {
        e.currentTarget.src = fallbackPath  // ← Sofort auf Ersatz-Bild wechseln
        setHasError(true)
      }}
    />
  )
}
```

---

### Regel 6: NAVIGATION muss vorhersehbar sein

**Was das bedeutet:**
"Zurück"-Button muss immer zum SELBEN Ort bringen. Nicht manchmal hier, manchmal dort.

**BEISPIEL — ZURÜCK BUTTON:**

```
❌ SCHLECHT — Unvorhersehbar:
┌─────────────────────────────────────┐
│  ← Zurück                           │  ← Wohin geht das???
│                                     │
│  Wenn ich von Roster kam:           │
│  → Geht zurück zu Roster            │
│                                     │
│  Wenn ich von District kam:         │
│  → Geht zurück zu District          │
│                                     │
│  Spieler kann das NICHT wissen!     │
└─────────────────────────────────────┘
```

```
✅ GUT — Immer gleich:
┌─────────────────────────────────────┐
│  ← Zurück zu Roster                 │  ← Explizit sagen wohin!
│                                     │
│  ODER:                              │
│                                     │
│  [Roster] [District] [Mission]      │  ← Breadcrumb Navigation
│                                     │
│  ← Zurück                           │  ← Geht immer eine Ebene zurück
└─────────────────────────────────────┘
```

**Die Regel für dich:**
1. "Zurück" bedeutet "eine Ebene zurück in der Hierarchie"
2. Schreibe hinzu WOhin "Zurück" bringt (z.B. "Zurück zu Roster")
3. Verwende Breadcrumbs für komplexe Navigation: `Roster > Marion > Details`

**Breadcrumb-Template:**
```typescript
function Breadcrumb({ paths }: { paths: string[] }) {
  return (
    <nav className="breadcrumb">
      {paths.map((path, index) => (
        <span key={index}>
          {index > 0 && ' > '}
          <a href={`/${path}`}>{path}</a>
        </span>
      ))}
    </nav>
  )
}

// Verwendung:
<Breadcrumb paths={['Roster', 'Marion Vale', 'Details']} />
// Zeigt: Roster > Marion Vale > Details
```

---

### Regel 7: FARBNUTZUNG — Farbe ist NICHT der einzige Hinweis

**Was das bedeutet:**
Blindespieler können Rot/Grün nicht unterscheiden. Verlasse dich NICHT nur auf Farbe!

**BEISPIEL — STATUS ANZEIGE:**

```
❌ SCHLECHT — Nur Farbe:
Status: [████]  ← Rot = schlecht? Grün = gut? Gelb = mittel?
              ← Spieler ohne Farbe kann das nicht wissen!
```

```
✅ GUT — Farbe + Text + Icon:
Status: 🔴 Verletzt     ← Farbe + Icon + Text
Status: 🟢 Bereit       ← Alle 3 Hinweise!
Status: 🟡 Auf Mission  ← Jeder versteht das!
```

**Die Regel für dich:**
1. Jeder Status braucht: Farbe + Icon + Text
2. Verwende nicht nur Farbe für wichtige Infos
3. Teste: Schalte Farben auf deinem Monitor aus → Kannst du noch verstehen was los ist?

**Farb-Table für Project Destiny:**

| Status | Farbe | Icon | Text |
|--------|-------|------|------|
| Bereit | Grün 🟢 | ✓ | "Bereit" |
| Auf Mission | Gelb 🟡 | ⏳ | "Auf Mission" |
| Verletzt | Rot 🔴 | ⚠️ | "Verletzt" |
| Gefangengenommen | Lila 🟣 | 🔒 | "Gefangengenommen" |

---

## Teil 3: Konkrete Screen-Vorlagen (Copy & Paste!)

### Vorlage 1: NPC Detail Screen

```typescript
// Struktur die du immer benutzen kannst:
<div className="npc-detail-screen">
  {/* HEADER — Bild + Wichtige Infos */}
  <header className="npc-header">
    <Portrait npcId={npc.id} size="large" />
    <div className="npc-basic-info">
      <h1>{npc.name}</h1>
      <p className="status">Status: {npc.status}</p>
      <p className="assignment">Auftrag: {npc.assignment || 'Keine'}</p>
    </div>
  </header>
  
  {/* HAUPTINHALT — Gruppierte Tabs */}
  <main className="npc-content">
    <Tabs>
      <Tab label="Eigenschaften">
        {/* Alle Stats, Traits, Skills hier */}
        <StatBar label="Treue" value={npc.loyalty} />
        <StatBar label="Intrige" value={npc.skills.intrigue} />
      </Tab>
      <Tab label="Ausrüstung">
        {/* Alle Items hier */}
        <EquipmentList items={npc.equipment} />
      </Tab>
      <Tab label="Beziehungen">
        {/* Alle Beziehungen hier */}
        <RelationshipList relationships={npc.relationships} />
      </Tab>
    </Tabs>
  </main>
  
  {/* FOOTER — Aktionen */}
  <footer className="npc-actions">
    <Button onClick={() => startConversation(npc.id)}>Gespräch führen</Button>
    <Button onClick={() => assignMission(npc.id)}>Auftrag geben</Button>
    <Button onClick={() => navigate('/roster')}>Zurück zu Roster</Button>
  </footer>
</div>
```

---

### Vorlage 2: Roster Screen (Liste)

```typescript
<div className="roster-screen">
  {/* HEADER — Zusammenfassung */}
  <header className="roster-header">
    <h1>Roster</h1>
    <p>{roster.filter(n => n.ready).length} von {roster.length} einsatzbereit</p>
  </header>
  
  {/* HAUPTINHALT — Tabelle */}
  <main className="roster-list">
    <table>
      <thead>
        <tr>
          <th>Bild</th>
          <th>Name</th>
          <th>Status</th>
          <th>Auftrag</th>
          <th>Einsatzbereit</th>
          <th>Aktion</th>
        </tr>
      </thead>
      <tbody>
        {roster.map(npc => (
          <tr key={npc.id}>
            <td><Portrait npcId={npc.id} size="small" /></td>
            <td>{npc.name}</td>
            <td>
              <StatusBadge status={npc.status} />  {/* Farbe + Icon + Text */}
            </td>
            <td>{npc.assignment || '-'}</td>
            <td>
              <ProgressBar value={npc.readiness} max={100} />
            </td>
            <td>
              <Button onClick={() => navigate(`/roster/${npc.id}`)}>
                Details
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </main>
</div>
```

---

## Teil 4: Checkliste VOR dem Commit

Bevor du Code pushst, checke diese Liste:

### UI Checkliste
- [ ] Sind alle wichtigen Infos auf dem ersten Screen sichtbar?
- [ ] Habe ich verwandte Infos gruppiert (Rahmen, Überschriften)?
- [ ] Bekommt der Spieler Feedback bei jeder Aktion?
- [ ] Habe ich internen Jargon vermieden?
- [ ] Haben alle Bilder einen Fallback?
- [ ] Ist die Navigation vorhersehbar?
- [ ] Verwende ich Farbe + Icon + Text für Status?

### UX Checkliste
- [ ] Kann ein Spieler in 3 Sekunden verstehen was los ist?
- [ ] Muss der Spieler zu selten klicken für wichtige Infos?
- [ ] Fühlt sich die Navigation natürlich an?
- [ ] Bekommt der Spieler klare Konsequenzen angezeigt?
- [ ] Habe ich mit einem Freund getestet ob er es versteht?

---

## Teil 5: Häufige Fehler (NICHT machen!)

### Fehler 1: "Der Spieler versteht das schon"

```
❌ FALSCH:
Button mit Label "X" ohne Erklärung
Text: "Push the push button"

✅ RICHTIG:
Button mit Label "Verhandlung starten"
Text: "Versuche einen besseren Preis zu verhandeln"
```

### Fehler 2: "Ich füge das später hinzu"

```
❌ FALSCH:
// Placeholder text
<p>Lorem ipsum dolor sit amet...</p>

✅ RICHTIG:
// Echter Text oder leer lassen
<p>{npc.biography || 'Noch keine Biografie verfügbar.'}</p>
```

### Fehler 3: "Die Farbe reicht schon"

```
❌ FALSCH:
<div style={{ backgroundColor: 'red' }} />  // Nur rot = schlecht?

✅ RICHTIG:
<div style={{ backgroundColor: 'red' }}>
  <Icon name="warning" />
  <span>Gefahr</span>
</div>
```

---

## Teil 6: Ressourcen für Weiteres Lernen

### Bücher (wenn du mehr wissen willst)
- "Don't Make Me Think" von Steve Krug — UX Grundlagen
- "The Design of Everyday Things" von Don Norman — Warum Design wichtig ist

### Websites
- https://uxdesign.cc — Artikel über UX Design
- https://www.nngroup.com — Nielsen Norman Group (UX Forschung)

### Spiele zum Analysieren
- **Crusader Kings 3** — Wie zeigt man viele Charakter-Infos?
- **Pillars of Eternity** — Wie zeigt man Party-Management?
- **Papers Please** — Minimalistische UI, wie wenig mit viel erreichen

---

**ENDE DER DOKUMENTATION**

Wenn du Fragen hast, frage einen Senior! Nicht raten.
