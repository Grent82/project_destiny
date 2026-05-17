# Cross-System UI/UX Audit
**Date:** 2026-05-16  
**Status:** First pass — findings only, no fixes applied  
**Scope:** Screen inventory, information hierarchy, feedback loops, cross-screen consistency, missing views

---

## What this looks at

The game has 21 screen routes. This audit checks whether each system has adequate UI coverage, whether the player gets the information they need to make decisions, whether feedback is consistent and visible, and where architectural violations (business logic in components) create maintenance risk.

---

## Screen inventory

**Primary navigation (8 screens):**
Dashboard, Roster, Work Board (Contracts), Districts, Factions, Journal (Event Log), Ledger, The House

**Secondary/embedded (13 screens):**
Recruitment, District detail, District POI, Shops, Combat, Investigation, Mission detail, Contract execution, Expedition prep/travel/return, Dialogue

**Navigation pattern:** Sidebar with `NavLink` routing. `GlobalStatusBar` (day, money, debt, renown, end-day button) is always visible. No breadcrumb trails. Back buttons exist contextually but inconsistently.

---

## Critical findings

### C1 — Business logic inline in NpcDetailPanel (two violations)

**Income calculation** (`NpcDetailPanel.tsx:238–251`):
```tsx
const income = Math.max(3, Math.min(15, Math.floor(
  Math.max(...(['administration', 'medicine', 'engineering', ...] as const)
    .map((s) => detail.skills[s] ?? 0)) / 7
)))
```

The player sees "Est. daily: ~8 Mk" with no explanation. They cannot tell which skill drives the number, how to improve it, or what the formula is. This is also identified in the clean-architecture audit (C1) and the traits/skills audit (C1).

**Dominant trait sentences** (`NpcDetailPanel.tsx:125–134`):
```tsx
function getDominantTraitSentences(traits): string[] {
  return Object.entries(traits)
    .filter(([, val]) => val > 65 || val < 35)
    .sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50))
    .slice(0, 2)
    .map(...)
}
```

The thresholds 65/35/50 are game rules, not display logic.

**Fix:** Create `selectEstimatedNpcIncome(npcId)` and `selectNpcCharacterDescription(npcId)` selectors. The component reads the result, never computes it.

---

### C2 — Three screens import directly from command layer

| Screen | Import |
|--------|--------|
| `DialogueScreen.tsx:5` | `isDialogueChoiceAvailable` from `commands/dialogue` |
| `InvestigationScreen.tsx:10` | `INVESTIGATION_APPROACHES`, `InvestigationApproach` from `commands/investigation` |
| `ShopsScreen.tsx:7` | `getDurabilityTier` from `commands/durability` |

Each of these performs logic in the component that belongs in a selector. This is identified in the clean-architecture audit (C2).

**Fix:** Wrap each in a selector. `selectVisibleDialogueChoices(nodeId)`, `selectInvestigationApproaches()`, `selectEquippedItemDurabilityStatus(npcId, slot)`.

---

## Medium findings

### M1 — No income breakdown visible to player

The Ledger screen shows daily wage outgo but no income line items. The player cannot see:
- How much income working NPCs generate
- Which title effects add passive income
- Whether the net position is improving or worsening

The `selectLedgerSummary` selector already has a comment "no passive income yet tracked here" — but passive income does exist via title effects (steward, quartermaster, fence). The projection is pessimistic and misleading.

**Fix:** Create `selectDailyIncomeBreakdown()` returning `{ wages, workingIncome, titleIncome, net }`. Display as a table on the Ledger screen. Mirror the net figure on the Dashboard.

---

### M2 — Shop price modifier displayed with inline formatting

`ShopsScreen.tsx:121–139` formats market pressure labels inline:
```tsx
`${Math.round((1 - shop.marketPressureMod) * 100)}% low-demand discount`
```

The player sees "15% low-demand discount" but cannot tell how faction standing, corridor status, and market pressure combine. These are three separate modifiers and their interaction is invisible.

**Fix:** Selector `selectShopPricingBreakdown(shopId, itemId)` returns `{ basePrice, marketMod, factionMod, corridorMod, finalPrice }`. Tooltip or collapsed breakdown in UI shows the math.

---

### M3 — Active quests not sorted by urgency

`ContractBoardScreen.tsx:86–88` computes days remaining inline. But quest rows are not sorted by deadline. A 2-day deadline quest looks identical to a 20-day quest in the list. The Dashboard's "What next" section does not surface imminent deadlines.

**Fix:** Selector `selectActiveQuestsWithUrgency()` returns quests sorted by `daysRemaining`, with an `urgencyLevel: 'critical' | 'high' | 'normal'` field. Color-code rows in the Contract Board. Surface critical deadlines on the Dashboard.

---

### M4 — Confirmation missing for irreversible actions

Actions that permanently change state dispatch immediately without confirmation:
- Revoking an NPC's title (NpcDetailPanel)
- Selling an item from the stash (ShopsScreen)
- Searching a house room (HouseScreen — one-time event)
- Assigning an NPC to a role (changes their working income and deployment eligibility)

**Fix:** Create a `ConfirmationModal` component. Wrap destructive dispatches. Include the consequence in the confirmation text: "Revoke 'Quartermaster' from Marion? This removes the 20% repair discount."

---

### M5 — Investigation results show no per-operative breakdown

After an investigation resolves, the player sees success/partial/failure. They do not see which operative contributed, which skill check passed or failed, or what would have changed with a different team.

**Fix:** Post-resolution screen section showing per-operative roll results. Selector `selectLastInvestigationResult()` returns `{ operativeId, skill, roll, passed }[]`.

---

### M6 — Combat ends with minimal feedback

After a combat encounter, the player is returned to the previous screen. There is no post-combat result screen showing casualties, loot, faction standing changes, or quest progress from the encounter.

**Fix:** New `CombatResultScreen` or modal shown between combat end and navigation, showing: outcome label, squad losses, items acquired, Marks gained, faction changes, quest progress triggered.

---

### M7 — Purchase feedback is local and ephemeral

`ShopsScreen` sets `lastPurchaseMessage` in local React state. The message disappears on unmount. No entry is added to the activity log. If the player navigates away immediately after buying, there is no record of the purchase.

**Fix:** Dispatch an activity log entry at purchase time. Optionally show a toast notification. The Journal / Event Log becomes the persistent receipt.

---

### M8 — NPC status terminology is not unified across screens

| Screen | How NPC status appears |
|--------|----------------------|
| Roster | Group label "Available" |
| NpcDetailPanel | Badge showing raw enum value "idle" |
| ContractBoard | Not shown (uses `readiness.blocked` internally) |
| InvestigationScreen | Filtered by `idleRoster`, not labeled |

The same concept (NPC assignment state) is displayed differently in each context.

**Fix:** Create an `ASSIGNMENT_DISPLAY_LABELS` map and use it everywhere. One label per state, consistently applied.

---

### M9 — Money display format varies across screens

| Screen | Format |
|--------|--------|
| GlobalStatusBar | `{money} Mk` (bold) |
| DashboardScreen | `{money} Marks` |
| LedgerScreen | `{amount} Mk` |
| ShopsScreen | `{price} Marks` |

Some use the abbreviation "Mk," some use the full word "Marks," and bold styling is inconsistent.

**Fix:** Define `formatMarks(amount): string` helper returning "X Marks" (full form in context) or "X Mk" (abbreviated for inline/badge). Use consistently.

---

### M10 — Empty states are handled inconsistently

| Screen | Empty state |
|--------|-------------|
| Shops (no offers) | "No traders operate here. Travel to..." |
| Quest board (no leads) | "No fresh leads at the moment..." |
| Roster group (no members) | Hidden entirely |
| Dialogue (no topics) | Button shown, no fallback text |

Some screens show an explicit empty state with a CTA. Others hide the section. Others show a broken state.

**Fix:** Create an `EmptyState` component with icon + message + optional CTA. Use consistently wherever a list or section can be empty.

---

### M11 — Expedition has no mid-journey feedback

The expedition flow goes: prep screen → travel screen → return screen. There is no summary of what happened during travel: encounters, supply consumed, days elapsed, or encounters avoided. Travel feels like a teleport.

**Fix:** `ExpeditionTravelSummary` screen or modal between travel start and return, showing route, any encounters, resource consumption, and safe-return indication.

---

### M12 — Heir visibility missing from HouseScreen

`HouseScreen` shows `state.wards` but not `state.house.houseHeirs`. A player with a named succession heir sees no indication of this on the house screen. This is also documented in the housing audit (C1).

**Fix:** Add a succession section to `HouseScreen` using a new `selectHouseHeirs` selector.

---

### M13 — NPC pairing policy has no UI

The pairing policy (`npcPairingPolicy`) is enforced in the game engine but never shown to or changed by the player through any screen. The policy defaults to `'open'` and stays there.

**Fix:** Add a policy section to the house screen (or a dedicated policy panel) that shows current policy and lets the player dispatch a change.

---

## Low findings

### L1 — Button labels inconsistent for the same action

- "Accept contract" vs. "Accept lead" — same concept, different labels
- "Repair" vs. "Repair — 20 Mk" — cost sometimes shown inline, sometimes not
- "Pay Debt" vs. "Pay {amount} Marks" — different phrasing for the same payment action

**Fix:** Audit all action buttons. Define label patterns: `"Repair — {cost} Mk"`, `"Pay debt ({amount} Mk)"`, `"Accept contract"` (canonical form).

---

### L2 — District name formatting is inconsistent

The district ID `"district-harbor"` is rendered as "Harbor Ward" in one place and "harbor ward" in another (manual `.replace()` + case transform). No shared helper exists.

**Fix:** `getDistrictDisplayName(id: string): string` helper used everywhere.

---

### L3 — No NPC roster filters or comparison view

With 15+ NPCs, the player must click each entry to inspect skills or traits. There is no way to filter by skill threshold, compare candidates, or answer "who is my best negotiator?"

**Fix:** Add sortable columns or a filter panel to the Roster screen.

---

### L4 — No district overview map

The district map screen is primarily a navigation grid. Missing: faction control indicators, stability/danger ratings, trade corridor status at a glance.

**Fix:** Enhance `DistrictMapScreen` with color-coded control indicators and resource production icons per district card.

---

## UI/UX health summary

| Area | Status |
|------|--------|
| Screen coverage for all systems | ⚠ Most systems have screens; heir, pairing, income breakdown missing |
| Business logic in components | ✗ Income calc, trait sentences, price formatting, command imports |
| Activity log as feedback mechanism | ✓ Consistent; present on all relevant screens |
| Feedback on irreversible actions | ✗ No confirmation modals |
| Cross-screen label consistency | ⚠ NPC status, money format, button labels vary |
| Empty state handling | ⚠ Inconsistent across screens |
| Post-action result screens | ⚠ Combat and investigation lack detailed results |
| Quest urgency signaling | ⚠ No urgency sorting or deadline indicators |

---

## Recommended fix order

**Phase 1 — Selector violations (clean architecture + player clarity):**
1. `selectEstimatedNpcIncome(npcId)` — closes C1 in this audit and the architecture audit
2. `selectNpcCharacterDescription(npcId)` — closes C1 inline trait calc
3. `selectVisibleDialogueChoices`, `selectShopDurabilityStatus` — closes C2 imports

**Phase 2 — Information gaps (player decision quality):**
1. `selectDailyIncomeBreakdown()` + Ledger display
2. `selectActiveQuestsWithUrgency()` + Contract Board sort
3. `selectShopPricingBreakdown()` + Shop tooltip
4. Heir section on HouseScreen

**Phase 3 — Feedback and confirmation:**
1. Confirmation modal for irreversible actions
2. Persistent purchase activity log entry
3. Post-combat result screen or modal

**Phase 4 — Consistency polish:**
1. Unified `formatMarks()` helper
2. `ASSIGNMENT_DISPLAY_LABELS` map
3. `EmptyState` component
4. Button label audit
