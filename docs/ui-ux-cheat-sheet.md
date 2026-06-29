# UI/UX Cheat Sheet — Quick Reference

**Für:** Junior Developer die schnell nachschlagen wollen  
**Nicht für:** Erklärungen (dafür gibt es `ui-ux-design-principles.md`)

---

## Schnelle Antworten auf häufige Fragen

### Wie mache ich ein Portrait mit Fallback?

```typescript
<img 
  src={`/portraits/${npcId}.jpg`}
  onError={(e) => {
    e.currentTarget.src = '/portraits/generic-silhouette.svg'
  }}
  alt="NPC Portrait"
/>
```

### Wie zeige ich Status mit Farbe + Icon + Text?

```typescript
function StatusBadge({ status }: { status: 'ready' | 'mission' | 'injured' }) {
  const config = {
    ready: { color: 'green', icon: '✓', text: 'Bereit' },
    mission: { color: 'yellow', icon: '⏳', text: 'Auf Mission' },
    injured: { color: 'red', icon: '⚠️', text: 'Verletzt' },
  }[status]
  
  return (
    <span style={{ color: config.color }}>
      {config.icon} {config.text}
    </span>
  )
}
```

### Wie gruppiere ich Informationen?

```typescript
<div className="group">
  <h3 className="group-title">EIGENSCHAFTEN</h3>
  <StatBar label="Treue" value={loyalty} />
  <StatBar label="Intrige" value={intrigue} />
</div>

<div className="group" style={{ marginTop: 24 }}>
  <h3 className="group-title">AKTUELL</h3>
  <p>Auftrag: {assignment || 'Keine'}</p>
</div>
```

### Wie mache ich Feedback bei Button-Click?

```typescript
function ConversationButton({ npcId }: { npcId: string }) {
  const [loading, setLoading] = useState(false)
  
  const handleClick = async () => {
    setLoading(true)  // ← Feedback: Lade-Animation
    await startConversation(npcId)
    setLoading(false) // ← Feedback: Wegnehmen
  }
  
  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? 'Startet...' : 'Gespräch führen'}
    </Button>
  )
}
```

### Wie schreibe ich player-friendly Texte?

```typescript
// ❌ SCHLECHT — Jargon
<span>[push] "Ich mache das nicht"</span>

// ✅ GUT — Spieler versteht es
<span>
  "Ich mache das nicht"
  <small className="consequence">→ Spannt die Beziehung an</small>
</span>
```

### Wie mache ich eine Breadcrumb Navigation?

```typescript
function Breadcrumb({ paths }: { paths: string[] }) {
  return (
    <nav className="breadcrumb">
      {paths.map((path, index) => (
        <span key={index}>
          {index > 0 && ' > '}
          <a href={`/${path.toLowerCase()}`}>{path}</a>
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

## MCP Commands Quick Reference

### Playwright (Screenshots, Navigation)

```bash
# Navigieren
playwright_navigate url="http://localhost:5173/roster"

# Screenshot
playwright_screenshot filename="docs/references/before.png"

# Klick
playwright_click target="button:has-text('Details')" element="Details Button"
```

### Puppeteer (Netzwerk-Fehler)

```bash
# Alle Requests auflisten
puppeteer_network_requests static=false

# Einzelnen Request prüfen
puppeteer_network_request index=5 part="response-body"
```

### Git (Diff Review)

```bash
# Alle Änderungen
git_diff_files

# Spezifische Datei
git_diff_file path="src/ui/screens/RosterScreen.tsx"
```

---

## Checkliste VOR Commit

**UI Checkliste:**
- [ ] Wichtige Infos sofort sichtbar? (3-Sekunden-Test)
- [ ] Informationen gruppiert? (Rahmen, Überschriften)
- [ ] Feedback bei jeder Aktion? (< 200ms)
- [ ] Kein Jargon in UI-Texten?
- [ ] Alle Bilder haben Fallback?
- [ ] Navigation vorhersehbar?
- [ ] Farbe + Icon + Text für Status?

**MCP Checkliste:**
- [ ] Vorher-Screenshot gemacht?
- [ ] Nachher-Screenshot gemacht?
- [ ] Puppeteer hat keine 404 gefunden?
- [ ] Git Diff reviewed?

**Test Checkliste:**
- [ ] `pnpm test:run` grün?
- [ ] `pnpm lint` grün?
- [ ] `pnpm typecheck` grün?

---

## Verbotener Jargon (nicht in UI!)

| Verboten | Stattdessen |
|----------|-------------|
| push/ask/commit | Konsequenzen erklären |
| questId | Quest-Name |
| NPC runtime state | "Status: Bereit" |
| activityLog | "Was passiert ist" |
| factionStanding | "Verhältnis zu [Faktion]" |
| pushActivityLog | "Ereignis hinzugefügt" |

---

## Screen-Vorlagen (Links)

- NPC Detail Screen: `ui-ux-design-principles.md` Teil 3, Vorlage 1
- Roster Screen: `ui-ux-design-principles.md` Teil 3, Vorlage 2

---

## MCP Workflow (Kurz)

1. `playwright_screenshot` — VORher
2. Code finden und ändern
3. `playwright_screenshot` — NACHher
4. `puppeteer_network_requests` — 404 prüfen
5. `git_diff_file` — Review
6. `pnpm test:run` — Tests
7. Commit

---

## Verwandte Dokumente

- **Hauptdokument:** `ui-ux-design-principles.md` — Ausführliche Anleitung
- **MCP Workflow:** `workflows/ui-ux-with-mcp.md` — Schritt-für-Schritt
- **Prinzipien:** `ui-principles.md` — Kurze Zusammenfassung
- **Rollen:** `roles/ui-ux.md`, `roles/ui.md` — Verantwortung
