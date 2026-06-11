---
name: feedback-npc-content-validation
description: Enemy NPCs must exist in both enemy-npcs.json AND npcs.json; validate schema fields before writing
metadata:
  type: feedback
---

**Was:** Enemy NPCs in Quest-Definitionen (`enemyNpcId`) müssen in **beiden** Dateien existieren:
- `data/definitions/enemy-npcs.json` (für enemyNpcDefinitionSchema)
- `data/definitions/npcs.json` (für npcDefinitionSchema validation in contentCatalog)

**Warum:** Der contentCatalog validiert `quest.enemyNpcId` gegen `npcsById` Map, nicht gegen `enemyNpcsById`. Dies ist ein bekanntes Design-Muster im Projekt — alle enemy NPCs die in Quests referenziert werden sind in beiden Dateien dupliziert.

**Wie anwenden:**
1. Vor Hinzufügen eines neuen Enemy-NPC prüfen ob er in `npcs.json` existiert
2. Falls nicht: Entry in `npcs.json` mit `npcType: "enemy"` hinzufügen
3. Felder die nur in `enemyNpcDefinitionSchema` existieren (`isRecurring`, `organizationId`, `encounterRole`, `recruitableOnDefeat`, `recruitCondition`, `loyaltyOnRecruit`, `lore`, `creatureType`) **nicht** in `npcs.json` verwenden — diese fallen durch `.strict()` Schema-Validierung
4. `loyalties.type` muss im `npcLoyaltyTypeSchema` Enum sein (`'sibling'`, `'ex-lover'`, `'creditor'`, `'debtor'`, `'rival'`, `'fosterling'`, `'handler'`, `'dead-spouse'`, `'old-comrade'`, `'hated-foreman'`, `'missing-child'`, `'favored-animal'`, `'parent'`, `'child'`, `'bastard-kin'`, `'witness'`, `'romantic'`)

**Beispiel:** `npc-enemy-tomas-rell` wurde zuerst nur in `enemy-npcs.json` erstellt → validation error. Korrektur: Minimaler Entry in `npcs.json` mit `npcType: "enemy"` und leeren `loyalties: []` hinzugefügt.
