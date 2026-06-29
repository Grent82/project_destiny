# Warenwirtschaft und Ökonomie-System - Analyse

## Inhaltsverzeichnis
1. [Waren-Kategorien](#1-waren-kategorien)
2. [Preis-Mechaniken](#2-preis-mechaniken)
3. [Geldsystem](#3-geldsystem)
4. [NPC-Ökonomie](#4-npc-ökonomie)
5. [Shop-System](#5-shop-system)
6. [UI-Komponenten](#6-ui-komponenten)
7. [Weitere Untersuchungsfragen](#7-weitere-untersuchungsfragen)

---

## 1. Waren-Kategorien

Die Spiel-Waren sind in 12 Kategorien unterteilt (`src/domain/items/contracts.ts:13-25`):

### 1.1 Ausrüstungs-Items

| Kategorie | Effekt/Nutzen | Spieler | NPCs |
|-----------|--------------|---------|------|
| **weapon** | Schaden (min/max), Genauigkeit, Rüstungs-Durchdringung, Krit-Chance | ✅ Equip | ✅ Equip (loadout.primaryWeaponId) |
| **armor** | Soak (%), Evasion-Penalty, Speed-Penalty, Resistances | ✅ Equip | ✅ Equip (armor slots) |
| **accessory** | Spezial-Effekte, Stat-Boni | ✅ Equip (2 Slots) | ✅ Equip (max 2) |

### 1.2 Verbrauchsgüter

| Kategorie | Effekt/Nutzen | Beispiele |
|-----------|--------------|-----------|
| **consumable** | Einmalgebrauch: Heilung, Stat-Mods, Status-Entfernung | Field Medkit (+25 HP), Gray Dust (-40 Stress), Combat Stim (+8 Strength) |
| **document** | Beweise, Permits, Aktionen freischalten | Bureau Ledger (cover), Compact Permit (investigation authority) |
| **tool** | Skill-Boni, Aktionen ermöglichen | Lockpick Set (+15 Lockpicking), Engineering Caliper (+12 Engineering) |

### 1.3 Wirtschaftsgüter

| Kategorie | Effekt/Nutzen | Verwendung |
|-----------|--------------|------------|
| **tradeGood** | Reiner Handelswert (tradeValue effect) | Verkauf für Marks, Spekulation |
| **material** | Rohstoffe für Crafting/Reparatur | Verkauf oder zukünftige Nutzung |
| **gift** | Beziehungs-Boni bei NPCs | Affinity +6-20 je nach Zielgruppe |

### 1.4 Haushalts-Module

| Kategorie | Effekt/Nutzen | Installation |
|-----------|--------------|--------------|
| **module** | Haus-Verbesserungen | Install in house (storage_expand, rest_quality_bonus) |
| **householdModule** | Infrastruktur: Wasser, Kräuter, Sicherheit | Water purifier, Herb garden, Lock reinforcement |

---

## 2. Preis-Mechaniken

### 2.1 Kauf-Preise (ShopPricing)

**Formel** (`src/application/content/shopPricing.ts:53-67`):
```typescript
finalPrice = basePrice × corridorMod × tensionMod × factionMod × marketMod
```

**Modifier im Detail:**

| Modifier | Formel | Werte |
|----------|--------|-------|
| `corridorMod` | blocked: 1.3, disrupted: 1.15, open: 1.0 | ±0-30% |
| `tensionMod` | 1 + (tension/100) × 0.2 | 1.0-1.2 |
| `factionMod` | standing ≥75: 0.85, ≥50: 0.90, ≤-30: 1.10, else: 1.0 | -15% bis +10% |
| `marketMod` | pressure ≥70: 1.15, ≥50: 1.05, ≤30: 0.92, else: 1.0 | -8% bis +15% |

**Beispiel** (`shopPricing.ts:89-95`):
```
Item basePrice: 100 Mk
Corridor: open (1.0)
Tension: 60 (1.12)
Faction standing: 60 → 0.90
Market pressure: 75 → 1.15

finalPrice = 100 × 1.0 × 1.12 × 0.90 × 1.15 = 116.28 Mk → 117 Mk (aufgerundet)
```

### 2.2 Verkaufs-Preise

**Formel** (`sellItem.ts:11-26`):
```typescript
baseValue = tradeValue effect ?? (item.value × 0.5)
multiplier = 0.7 + (marketPressure/100) × 0.6
sellPrice = baseValue × multiplier
```

**Beispiel:**
```
Item value: 100 Mk
tradeValue effect: 65 Mk
marketPressure: 50

baseValue = 65
multiplier = 0.7 + 0.5 × 0.6 = 1.0
sellPrice = 65 × 1.0 = 65 Mk
```

### 2.3 Markt-Preise (Goods)

Für Goods (food, water, materials, etc.) gilt eine separate Formel (`priceDerivation.ts:21-41`):

```typescript
stockRatio = stock / stockCapacity (clamped 0-1)
demandFactor = (demandBaseline/100) - 1 (range: -0.5 bis 1.0)
priceMultiplier = 1 + demandFactor - (stockFactor × 0.5)
price = clamp(basePrice × priceMultiplier, priceFloor, priceCeiling)
```

**Bounds:**
- `priceFloor = basePrice × 0.5` (sehr niedriger Preis bei Überangebot)
- `priceCeiling = basePrice × 2.5` (sehr hoher Preis bei Knappheit)

---

## 3. Geldsystem

### 3.1 Währung

- **Einheit:** Marks (Mk)
- **Formatierung:** `formatMarks(100)` → "100 Marks", `formatMarksAbbrev(100)` → "100 Mk"

### 3.2 Einnahme-Quellen

| Quelle | Mechanismus |
|--------|-------------|
| Quest-Belohnungen | Events, Quest-Completion |
| Warenverkauf | tradeGoods, Materialien, Ausrüstung |
| NPC-Löhne (als Einnahme) | Mercenary-Verträge |

### 3.3 Ausgaben

#### Löhne (`applyWages.ts:8-31`)

| Status | Basis-Lohn | Mit Kitchen intact |
|--------|-----------|-------------------|
| Retainer | 4 Mk/Tag | 3 Mk/Tag |
| Mercenary | 8-20 Mk/Tag* | -1 Mk/Tag |
| Citizen | 5 Mk/Tag | 4 Mk/Tag |
| Servant | 2 Mk/Tag | 1 Mk/Tag |
| Apprentice | 3 Mk/Tag | 2 Mk/Tag |
| Noble | 14 Mk/Tag | 13 Mk/Tag |
| Prisoner/Family | 0 Mk/Tag | 0 Mk/Tag |

*Mercenary-Lohn basierend auf Top-3-Skills: `max(3, min(20, floor(average/5)))`

#### Schulden-System (`initial-game-state.json:398-403`)

```json
{
  "debtAmount": 800,
  "debtDueDay": 30,
  "debtClaimantNpcId": "npc-enemy-harlen-voss",
  "debtEnforcementFactionId": "faction-gilded-court",
  "debtBeneficiaryFactionId": "faction-house-merrow"
}
```

**Konsequenzen bei Nicht-Zahlung:**
- `debtCrisisTriggered` → Faction-Druck, Event-Trigger
- Mögliche Konfiszierung von Eigentum
- Reputation-Verlust

### 3.4 NPC-Personalfonds (`npc/contracts.ts:487-494`)

```typescript
{
  savings: 0,        // Gespartes Vermögen (banked)
  carriedCash: 0,    // Bar auf der Person
  lastWagePaymentDay: null,
  lastTipAmount: 0
}
```

**Lohn-Auszahlung** (`applyWages.ts:62-76`):
- 50% → savings
- 50% → carriedCash
- Bei pünktlicher Zahlung: loyalty +2

---

## 4. NPC-Ökonomie

### 4.1 Geschäftsstrategien (`applyShopOwnerAgency.ts:24-52`)

| Strategie | Preis-Volatilität | Min/Max Multiplikator |
|-----------|------------------|----------------------|
| **conservative** | Minimal, immer profitabel | 0.95 - 1.05 |
| **balanced** | Moderate Anpassungen | 0.85 - 1.15 |
| **aggressive** | Maximale Volatilität | 0.70 - 1.30 |

### 4.2 Shop-Owner-Profile (`npc/contracts.ts:677-686`)

```typescript
{
  shopId: string,
  businessStrategy: 'conservative' | 'balanced' | 'aggressive',
  profitMargin: 0.2,        // 10-50%
  restockThreshold: 10,      // Stock-Level für Nachbestellung
  restockBudget: 500,        // Budget für Nachbestellung
  specialtyCategories: []    // Spezialisierte Kategorien
}
```

### 4.3 Wirtschaftliche Teilnahme

**NPCs als Economic Agents** (`economy/contracts.ts:175-186`):
- `money`: Liquid currency (personalFunds)
- `inventory`: Per-good quantities
- `needs`: Per-good consumption requirements
- `decisionPolicy`: Wie Entscheidungen getroffen werden
- `productionCapacity`: Was produzieren kann
- `productionCost`: Produktionskosten

---

## 5. Shop-System

### 5.1 Shop-Typen

| Typ | Beschreibung | Beispiele |
|-----|-------------|-----------|
| `weapon_dealer` | Waffen-Spezialist | Harbor, Ironworks |
| `armorer` | Rüstungen, Reparatur | Ironmonger |
| `general_store` | Allgemeine Versorgung | Harbor Provisions, Back Counter |
| `apothecary` | Heilmittel, Drogen | Pale Apothecary, Restored Dispensary |
| `bookshop` | Dokumente, Verträge | Ledger House Atelier |
| `tailor` | Feine Kleidung, Luxus | Gilded Register |
| `black_market` | Schmuggelware, Illegal | Unmarked Stall |
| `workshop` | Werkzeuge, Ersatzteile | Foundry Supply Cage |

### 5.2 Shops-Übersicht (`data/definitions/shops.json`)

| Shop | District | Typ | Spezialität |
|------|----------|-----|-------------|
| Harbor Provisions | Harbor | general_store | Versorgung, Dokumente |
| Ledger House Atelier | Gilded Heights | bookshop | Verträge, Aufzeichnungen |
| Foundry Supply Cage | Ironworks | workshop | Reparatur, Werkzeuge |
| The Gilded Register | Gilded Heights | tailor | Luxus, court-grade Ausrüstung |
| The Ironmonger | Ironworks | armorer | Schweres Equipment |
| The Back Counter | The Pale | general_store | Billige Waren, Waffen |
| The Pale Apothecary | The Pale | apothecary | Heilmittel, Drogen |
| Wardhouse Supply | Warrens | general_store | Kompakt-Rationen, Formulare |
| The Restored Dispensary | Warrens | apothecary | Heilmittel, Restored Order |
| The Unmarked Stall | The Hollows | black_market | Schmuggelware, Fälschungen |

### 5.3 Faction-Zugangsbeschränkungen

```typescript
// shop-definitions.json:201-202
{
  "requiredFactionId": "faction-tallow-ring",
  "minFactionStanding": -10
}
```

**Blockierte Shops** (`shops.ts:96-110`):
- Faction-Standing ≤ -50 → `isBlocked: true`
- Institutional-Status "blacklisted"/"hostile" → `institutionalBlock: true`
- `requiredFactionId` mit zu niedrigem Standing → `accessDenied: true`

---

## 6. UI-Komponenten

### 6.1 Screens

#### ShopsScreen (`src/ui/screens/ShopsScreen.tsx`)

**Funktionen:**
- Shop-Übersicht mit Preis-Breakdown
- Kauf/Verkauf von Items
- Equipment-Stash (Waffen/Rüstungen)
- Reparatur-Management für NPCs

**Preis-Details** (Zeilen 172-180):
```tsx
<details className="shop-price-breakdown">
  <summary>Price factors</summary>
  <p>Base price: {formatMarks(offer.pricingBreakdown.basePrice)}</p>
  <p>Corridor: x{offer.pricingBreakdown.corridorMod.toFixed(2)}</p>
  <p>District tension: x{offer.pricingBreakdown.tensionMod.toFixed(2)}</p>
  <p>Faction standing: x{offer.pricingBreakdown.factionMod.toFixed(2)}</p>
  <p>Market pressure: x{offer.pricingBreakdown.marketMod.toFixed(2)}</p>
  <p>Final price: {formatMarks(offer.pricingBreakdown.finalPrice)}</p>
</details>
```

#### PlayerInventoryScreen (`src/ui/screens/PlayerInventoryScreen.tsx`)

**Funktionen:**
- Inventar-Management
- Item-Aktionen (Use, Give, Equip, Sell)
- Container-Übersicht

### 6.2 Components

#### ItemCard (`src/ui/components/ItemCard.tsx`)

**Darstellung:**
- Name, Kategorie, Menge
- Primär-Aktion (kategorienbasiert)
- Menü für weitere Aktionen

**Primär-Aktionen nach Kategorie** (`inventory.ts:22-34`):
```typescript
consumable → Use
document → Open
gift → Give (requires target)
tool → Equip
household_module → Install
tradeGood → Sell
material → Sell
weapon/armor/accessory → Equip
```

### 6.3 Selectors

#### selectShopOverview (`shops.ts:55-172`)

**Berechnet:**
- Money available
- Shops im aktuellen District
- Preis-Breakdown für jedes Angebot
- Ownership-Quantitäten
- Erschwinglichkeit
- Best-Price-Identifikation

#### selectInventory (`inventory.ts`)

**Helper-Funktionen:**
- `getPlayerItemsFromInventory()`
- `getHouseStorageItems()`
- `getMissionPackItems()`

---

## 7. Weitere Untersuchungsfragen

### 7.1 Fragen zur Spielmechanik

1. **Wie wirken sich Waren auf Quest-Verläufe aus?**
   - Welche Items sind Quest-Katalysatoren?
   - Welche Items sind Quest-Belohnungen?
   - Gibt es Item-basierte Quest-Lösungen?

2. **Gibt es dynamische Preis-Anpassungen über Zeit?**
   - Wie reagieren Preise auf Spieler-Handeln?
   - Kann Knappheit erzeugt werden?
   - Gibt es Spekulations-Möglichkeiten?

3. **Wie interagiert das Schulden-System mit der Wirtschaft?**
   - Was passiert bei Nicht-Zahlung am Tag 30?
   - Welche Faction-Konsequenzen gibt es?
   - Gibt es Stundungs-Optionen?

### 7.2 Fragen zur Wirtschaftsdynamik

4. **Welche faction-spezifischen Handels-Routinen existieren?**
   - Haben Fraktionen eigene Wirtschaftskreisläufe?
   - Gibt es Fraktions-exklusive Items?
   - Wie beeinflussen Agenden den Handel?

5. **Wie funktioniert der Corridor-Import?**
   - 500 Einheiten bei "open" - was genau?
   - Welche Goods werden importiert?
   - Wer profitiert finanziell?

6. **Wie wirken sich Stadt-Events auf die Wirtschaft aus?**
   - Gibt es Wirtschaftsschocks?
   - Wie reagieren Preise auf Katastrophen?
   - Gibt es Versicherungsmöglichkeiten?

### 7.3 Fragen zu Investition und Strategie

7. **Welche Rolle spielen Household Modules langfristig?**
   - ROI-Berechnung für Investitionen?
   - Passive Einkommensquellen?
   - Synergien zwischen Modulen?

8. **Wie wird NPC-Equipment finanziert?**
   - Kaufen NPCs eigene Ausrüstung?
   - Wird Equipment bereitgestellt?
   - Wer zahlt für Reparaturen?

### 7.4 Fragen zu Spiel-Strategie

9. **Gibt es Arbitrage-Möglichkeiten zwischen Districts?**
   - Unterschiedliche Preise für Gewinnmaximierung?
   - Transport-Kosten vs. Gewinnspanne?
   - Timing-Strategien für Preis-Schwankungen?

10. **Welche ökonomischen Entscheidungen sind irreversibel?**
    - Schulden (kann man sie jemals vollständig tilgen?)
    - Faction-Standing (kann man Blacklisting aufheben?)
    - Equipment-Verkäufe (kann man seltene Items zurückkaufen?)

---

---

## 8. ⚠️ KRITISCHE FINDINGS - Forensische Analyse

### 8.1 NPC Wirtschafts-System: Was machen NPCs wirklich?

#### Geld-Verdien-Intentions (4 Typen - funktionieren!)

| Intention | Einkommen | Skills erforderlich | Code-Stelle |
|-----------|-----------|-------------------|-------------|
| **seek-tips** | 1-5 Mk | performance + presence | `seekTips.ts` |
| **black-market-trade** | 5-20 Mk | intrigue >= 40 ODER security >= 40 | `blackMarketTrade.ts` |
| **beg-for-coin** | 0-2 Mk | presence + desperation (stress > 60) | `begForCoin.ts` |
| **scavenge-for-sell** | 2-8 Mk | survival >= 30 ODER perception >= 40 | `scavengeForSell.ts` |

**Wie es funktioniert:**
- NPCs mit `assignment: idle` können spontane Intentions bilden
- `currentIntention` wird täglich neu berechnet basierend auf:
  - State needs (Hunger > 50 → eat-meal, Fatigue > 70 → sleep)
  - Personality traits (Prudence >= 65 → protect-house, Curiosity >= 60 → meditate)
  - Relationships (Affinity >= 60 → spend-time-with, Trust >= 65 → court-romantically)
  - Urgency (Stress >= 60 → meditate, Anger >= 55 → confront-rival)

#### Working Assignment - Passives Einkommen

**Formel** (`applyTitleEffects.ts:346-364`):
```typescript
const workingNpcs = roster.filter(r => r.assignment === 'working')
for (const npc of workingNpcs) {
  baseIncome = computeWorkingIncome(npc.skills)  // Best non-combat skill / 7, clamped 3-15
  bondMultiplier = npc.bondStatus?.holderId === 'player' ? 1.2 : 1
  prosperityMult = cityDials.prosperity >= 60 ? 1.1 : cityDials.prosperity <= 30 ? 0.9 : 1
  income = floor(baseIncome * prosperityMult * bondMultiplier)
  money += income
}
```

**JOB_CATALOG** (`jobCatalog.ts`):
| Job | Skill | District |
|-----|-------|----------|
| Dock Work | survival | Harbor Ward |
| Clerk Work | administration | Civic Quarter |
| Field Medicine | medicine | The Pale |
| Workshop Labor | engineering | Ironworks |
| Trade Brokering | negotiation | Harbor Ward |
| Ward Enforcement | security | Gilded Heights |
| Craft Work | crafting | Ironworks |
| Street Performance | performance | The Warrens |
| Research Work | academics | Gilded Heights |
| Shadow Work | intrigue | The Hollows |
| General Labor | melee | The Warrens |

#### Employment Contracts - Task-System

**Task-Typen:** scout, protect, retrieve, deliver, guard, negotiate, sabotage, escort, work

**Fortschritt-Berechnung** (`progressEmployment.ts:123-149`):
```typescript
// Base progress: skillValue / 100 * 50% (max 50% pro Tag)
progress = (skillValue / 100) * 50
// Trait bonuses: curiosity/discipline/empathy/ruthlessness / 200
// Random variance: -10% bis +10%
```

### 8.2 NPC Intention System - Vollständig dokumentiert

**30+ Intention-Typen** in `pipeline.ts:135-186`:

| Kategorie | Intentions |
|-----------|-----------|
| **Survival** | eat-meal, drink, sleep, rest, groom, meditate |
| **Social** | socialize, flirt-with, court-romantically, visit-lover, spend-time-with, gossip, host-gathering, mediate-conflict |
| **Work** | seek-employment, seek-tips, black-market-trade, beg-for-coin, scavenge-for-sell |
| **Protection** | protect-house, patrol-district, fortify-position, seek-shelter |
| **Aggression** | confront-rival, assert-dominance, challenge-authority, spy-on, intercept-communication |
| **Intellect** | investigate-threat, meditate, practice-skill, train-self, people-watch |
| **Leadership** | lead-group, support-group, form-squad, recruit-member, consolidate-power |
| **Romance** | seek-intimacy, flirt-aggressively, visit-romantic-partner |
| **Special** | shop-for-goods, scavenge, escape-attempt, care-for-injured, gather-leverage |

**Blockiert wenn:**
- `assignment !== 'idle'` (deployed, working, defense, training)
- `currentDirectiveId !== null` (Faction Directive)
- `status === 'ward'`
- `captivityState?.status === 'captive'`

### 8.3 WAS NICHT existiert - Die leeren Versprechen (FORENSISCH VERIFIZIERT)

| Behauptetes Feature | Code-Präsenz | Realität |
|-------------------|--------------|----------|
| **NPC Loot-System** | ❌ KEIN Code | Combat-Loot geht NUR an Player (`combat.ts:250-260`). NPCs sammeln KEIN Loot |
| **NPC Crafting** | ❌ KEIN Code | `crafting` Skill existiert, aber 0 Crafting-Commands. Job-Catalog ist abstrakt |
| **NPC Repair-System** | ❌ KEIN Code | Durability-System existiert, aber NPCs reparieren NICHT. Player bezahlt Reparaturen |
| **NPC Gift-Giving** | ❌ KEIN Code | `giftItem.ts` ist Player→NPC NUR. Kein NPC→NPC oder NPC→Player |
| **NPC-Handel** | ❌ KEIN Code | Keine NPC-Transaktionen. PersonalFunds sind eine "Sink" - NPCs sammeln, aber geben NICHT aus |
| **Item-Nutzung durch NPCs** | ❌ KEIN Code | NPCs verwenden KEINE consumables. Keine Item-Aktivierung |

**Die Leichen im Keller:**

1. **NPCs sind ökonomisch PASSIV** - Sie verdienen abstraktes Geld, aber kaufen/verkaufen/tauschen NICHTS
2. **Intention-System ist eine FASSADE** - Von 37 Intention-Typen sind 32 PLACEHOLDER (return state unchanged)
3. **Keine NPC-Wirtschaftssimulation** - Kein NPC-zu-NPC-Handel, keine Geschenk-Ökonomie, keine Marktteilnahme
4. **PersonalFunds sind eine Senke, keine Quelle** - NPCs akkumulieren `personalFunds.savings/carriedCash`, aber haben KEINE Ausgabemöglichkeit
5. **Captivity ist die einzige Inventory-Interaktion** - Konfiszierung/Rückgabe ist die EINZIGE NPC-Item-Interaktion außerhalb Player-Steuerung

### 8.4 NPC Intention System - Die wahre Geschichte

**37 Intention-Typen definiert, aber:**

| Kategorie | Intentions | Status |
|-----------|-----------|--------|
| **Implementiert** | flirt-with, court-romantically, visit-lover, jealousy-check, spend-time-with | ✅ Funktioniert |
| **Money-Earning** | seek-tips, black-market-trade, beg-for-coin, scavenge-for-sell | ⚠️ Funktioniert, aber NICHT in Pipeline integriert |
| **Placeholder** | lead-group, support-group, scout-ahead, resource-gather, confront-rival, protect-house, investigate-threat, patrol-district, eat-meal, drink, sleep, rest, groom, shop-for-goods, train-self, meditate, practice-skill, people-watch, gossip, assert-dominance, spy-on, intercept-communication, gather-leverage, form-squad, recruit-member, host-gathering, mediate-conflict, scavenge, fortify-position, escape-attempt, seek-shelter, care-for-injured | ❌ return state (NO-OP) |

**Die Pipeline** (`intentions/pipeline.ts`) ist komplex und sophisticated - aber die meisten Intentions führen zu NICHTS.

---

## 9. 15 Kritische Forschungs-Fragen

### Frage 1-5: Item-Effekte (siehe Abschnitt 8.1)

### Frage 6: Haben NPCs ein Loot-System?

**Antwort:** **NEIN.** Es gibt keinen Code der nach Combat oder Events Loot auf NPCs generiert oder speichert. NPCs haben `personalFunds` (Geld), aber keine Item-Inventare die durch Aktionen wachsen.

### Frage 7: Stellen NPCs Items her?

**Antwort:** **NEIN.** Kein Crafting-System für NPCs. Der `crafting` Skill existiert im Job-Catalog, aber keine Implementierung die Items produziert.

### Frage 8: Reparieren NPCs ihre eigene Ausrüstung?

**Antwort:** **NEIN.** Das `repairItem` Command ist nur für Player-NPC-Equipment im `ShopsScreen` implementiert. NPCs haben keinen Code der ihre装备 automatisch repariert.

### Frage 9: Verschenken NPCs Items?

**Antwort:** **NEIN.** `giftItem` ist nur Player → NPC implementiert. Keine NPC → NPC oder NPC → Player Gift-Giving Logik.

### Frage 10: Was passiert mit verschenkten Items?

**Antwort:** Items werden aus dem Inventar entfernt (`removePlayerItem`) und **verschwinden für immer**. Kein Empfänger-Inventar, keine Persistenz.

### Frage 11: Was arbeiten NPCs im Roster wenn sie auf "working" gestellt werden?

**Antwort:** Sie generieren **passives Einkommen** basierend auf ihrem besten nicht-Kampf Skill (3-15 Mk/Tag). Keine spezifische Aufgabe, kein Fortschritt - nur Geld-Generierung.

### Frage 12: Wie funktioniert das NPC Intention-System?

**Antwort:** **Sehr komplex und vollständig implementiert!** 5-Stufen Pipeline:
1. State-driven (Hunger, Fatigue, Stress) - höchste Priorität
2. Personality-driven (traits als Quirk-Proxy)
3. Trait-driven (Capabilities basierend auf Skills/Attributes)
4. Relationship-driven (Affinity, Trust, Loyalty)
5. State Urgency-driven (Anger, Fear, Morale)

Dann ML-gewichtet, kontext-modifiziert, und die beste Intention wird ausgewählt.

### Frage 13: Gehen NPCs kämpfen und bringen Loot mit?

**Antwort:** **NEIN.** Combat existiert, aber keine Loot-Generierung danach. NPCs können in Combat deployt werden, aber bringen nichts zurück.

### Frage 14: Verkaufen NPCs gefundene Items?

**Antwort:** **NEIN.** Die `scavenge-for-sell` Intention gibt direkt Geld (2-8 Mk), keine Items die dann verkauft werden müssen.

### Frage 15: Gibt es eine NPC-Ökonomie die den Markt beeinflusst?

**Antwort:** **NEIN.** NPCs verdienen Geld (personalFunds), aber:
- Kein Kaufverhalten dokumentiert
- Kein Verkaufsverhalten (außer Player kann an NPCs verkaufen)
- Keine Markt-Preise die durch NPC-Aktivität beeinflusst werden
- Keine Wirtschaftssimulation zwischen NPCs

---

## 10. Wirtschaftliche Exploit-Möglichkeiten


### 8.1 Implementierte vs. Nicht-Implementierte Effekte

**Von 20 definierten Effekt-Typen sind NUR 5 tatsächlich implementiert:**

| Effekt | Items | Status | Code-Stelle |
|--------|-------|--------|-------------|
| ✅ heal | 14 | **IMPLEMENTIERT** | `useItem.ts:51-69` |
| ✅ relationship_gift | 5 | **IMPLEMENTIERT** | `giftItem.ts:57-125` |
| ✅ contraception | 3 | **IMPLEMENTIERT** | `engagePhysicalIntimacy.ts:40-46` |
| ✅ storage_expand | 1 | **IMPLEMENTIERT** | `installModule.ts:44-48` |
| ✅ tradeValue | 17 | **IMPLEMENTIERT** | `sellItem.ts:18-19` |
| ⚠️ stat_mod | 9 | **PARTIELL** (nur NPCs) | `useItem.ts:70-91` |
| ⚠️ affinityBonus | 5 | **PARTIELL** (ignored) | `giftItem.ts` ignoriert es |
| ❌ enableAction | 17 | **NICHT IMPLEMENTIERT** | Kein Code prüft diese Actions |
| ❌ evidence_use | 4 | **NICHT IMPLEMENTIERT** | Dokumente haben keinen Spiel-Einfluss |
| ❌ grantRight | 1 | **NICHT IMPLEMENTIERT** | Keine Rechte-Vergabe |
| ❌ grantStatus | 1 | **NICHT IMPLEMENTIERT** | Kein Identity-System |
| ❌ grantAccess | 1 | **NICHT IMPLEMENTIERT** | Kein Access-Control |
| ❌ baseImprovement | 3 | **NICHT IMPLEMENTIERT** | Module haben keinen Haus-Einfluss |
| ❌ training_bonus | 3 | **NICHT IMPLEMENTIERT** | Keine Skill-Boni |
| ❌ rest_quality_bonus | 2 | **NICHT IMPLEMENTIERT** | Keine Schlaf-Qualitäts-Verbesserung |
| ❌ skillBonus | 3 | **NICHT IMPLEMENTIERT** | Tools geben keine aktiven Boni |
| ❌ addStatus | 3 | **NICHT IMPLEMENTIERT** | Kein Status-System |
| ❌ removeStatus | 3 | **NICHT IMPLEMENTIERT** | Kann keine Status entfernen |
| ❌ boostStat | 1 | **NICHT IMPLEMENTIERT** | Temporäre Boosts funktionieren nicht |
| ❌ reduceStat | 4 | **NICHT IMPLEMENTIERT** | Hunger/Fatigue/Stress-Reduktion nicht aktiv |

### 8.2 Die "Flavor-Text"-Items (haben keine gameplay-Wirkung)

| Item | Behaupteter Effekt | Wirklichkeit |
|------|-------------------|--------------|
| `item-ration-compact-brick` | `reduceStat: hunger -30` | **Hunger ändert sich NICHT** |
| `item-tonic-fatigue-ironworks` | `reduceStat: fatigue -25` | **Fatigue bleibt unverändert** |
| `item-graydust` | `reduceStat: stress -40` + `addStatus` | **Stress bleibt, Status nicht gesetzt** |
| `item-compact-permit-official` | `enableAction: present-official-permit` | **Action existiert nicht** |
| `item-papers-false-citizen` | `grantStatus: false-citizen-identity` | **Identity wird nicht gespeichert** |
| `item-module-water-purifier` | `baseImprovement: water-quality +2` | **Wasserqualität ändert sich nicht** |
| `item-module-herb-garden` | `training_bonus: medicine +5` | **Kein Skill-Bonus** |
| `item-lockpick-ringcut` | `skillBonus: lockpicking +15` | **Lockpicking-Skill nicht modifiziert** |

### 8.3 Wirtschaftliche Exploit-Möglichkeiten

1. **Arbitrage zwischen Districts**: Kein Preis-Ausgleichs-Mechanismus. Kauf bei Shop A für 50 Mk, Verkauf bei Shop B für 80 Mk → **theoretisch unbegrenzter Gewinn**.

2. **TradeGood-Spekulation**: `item-tally-debt-instrument` hat `tradeValue: 400` aber `shopPrice: 50`. Wenn Verkauf 400 Mk bringt und Kauf nur 50 Mk → **800% Gewinn**.

3. **Gift-Farm**: `item-gift-*` Items geben Relationship-Boni ohne Cooldowns oder Limits → **beliebig hohe Standing-Werte** möglich.

---

## 9. 5 Kritische Forschungs-Fragen

### Frage 1: Haben Items einen echten gameplay-impact oder sind sie mostly cosmetic?

**Antwort:** Ca. **60% der Item-Effekte sind reiner Flavor-Text**. Die Items haben Description, Effects im Schema, aber **keinen implementierten Code**. Ein "Compact Ration Brick" mit `reduceStat: hunger -30` - dieser Effekt wird **niemals ausgeführt**. Der Player kann das Item "use"en, aber es passiert nichts außer einem Activity Log Eintrag.

### Frage 2: Wo sind die Effekt-Implementierungen - komplett oder Stubs?

**Antwort:** Die Implementierungen sind **fragmentiert und unvollständig**:
- `useItem.ts` behandelt nur `heal` und `stat_mod` (und nur für NPCs)
- `giftItem.ts` behandelt nur `relationship_gift`
- `installModule.ts` behandelt nur `storage_expand`
- **Alle anderen 15+ Effekttypen haben 0 Code-Zeilen Implementierung**

### Frage 3: Welche Effekte sind definiert aber NIEMALS verwendet?

**Antwort:** Diese Items sind **tot** - sie haben keinen Spiel-Einfluss:

| Item | Behaupteter Effekt | Wirklichkeit |
|------|-------------------|--------------|
| `item-ration-compact-brick` | `reduceStat: hunger -30` | Hunger bleibt unverändert |
| `item-tonic-fatigue-ironworks` | `reduceStat: fatigue -25` | Fatigue bleibt unverändert |
| `item-graydust` | `reduceStat: stress -40` | Stress bleibt, Status nicht gesetzt |
| `item-compact-permit-official` | `enableAction: present-official-permit` | Action existiert nicht |
| `item-papers-false-citizen` | `grantStatus: false-citizen-identity` | Identity wird nicht gespeichert |
| `item-module-water-purifier` | `baseImprovement: water-quality +2` | Wasserqualität ändert sich nicht |
| `item-module-herb-garden` | `training_bonus: medicine +5` | Kein Skill-Bonus |
| `item-lockpick-ringcut` | `skillBonus: lockpicking +15` | Lockpicking-Skill nicht modifiziert |

### Frage 4: Welche Effekte werden genutzt aber haben kein UI-Feedback?

**Antwort:**
- **heal auf NPCs** - Funktioniert, aber kein UI zeigt "Used medkit on Marion → +25 HP"
- **storage_expand** - Funktioniert, aber kein UI zeigt "Storage expanded from 40 to 48"
- **contraception** - Funktioniert, aber keine Anzeige "Using Herbal Preventative (50% effective)"

### Frage 5: Gibt es wirtschaftliche Loops die ausgebeutet werden können?

**Antwort:** **JA - mehrere**:

1. **Arbitrage zwischen Districts**: Kein Mechanismus der Preise angleicht.
2. **TradeGood-Spekulation**: `item-tally-debt-instrument` tradeValue 400 vs shopPrice 50.
3. **Heal-Item Loop**: Keine Begrenzung der NPC-Heilung.
4. **Gift-Farm**: Keine Cooldowns auf Relationship-Boni.

---

## Anhang: Referenzen

### Dateipfade


| Thema | Pfad |
|-------|------|
| Item-Kontracts | `src/domain/items/contracts.ts` |
| Economy-Kontracts | `src/domain/economy/contracts.ts` |
| Preis-Berechnung | `src/application/content/shopPricing.ts` |
| Kauf-Command | `src/application/commands/purchase.ts` |
| Verkauf-Command | `src/application/commands/sellItem.ts` |
| Shop-Owner Agency | `src/application/commands/economy/applyShopOwnerAgency.ts` |
| Lohn-System | `src/application/commands/applyWages.ts` |
| Wage-Rates | `src/application/commands/wageRates.ts` |
| Shop-Selector | `src/application/selectors/shops.ts` |
| Inventory-Selector | `src/application/selectors/inventory.ts` |
| Item-Definitions | `data/definitions/items.json` |
| Shop-Definitions | `data/definitions/shops.json` |
| Initial Game State | `data/runtime/initial-game-state.json` |

### UI-Komponenten

| Komponente | Pfad |
|-----------|------|
| ShopsScreen | `src/ui/screens/ShopsScreen.tsx` |
| PlayerInventoryScreen | `src/ui/screens/PlayerInventoryScreen.tsx` |
| ItemCard | `src/ui/components/ItemCard.tsx` |
| InventoryPanels | `src/ui/components/InventoryPanels.tsx` |
