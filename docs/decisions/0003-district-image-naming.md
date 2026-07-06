# District Image Naming Convention

Date: 2026-07-06
Beads: `destiny-a2dm`, `destiny-k9xa`

## Decision

**Option A: filenames match district IDs**, using the exact same convention already
established for NPC portraits: strip the entity's id prefix (`district-`, matching how
`scripts/generate-portraits.ts` strips `npc-`) and use `{stripped-id}.jpg`.

So `district-harbor` → `public/districts/harbor.jpg`, `district-the-pale` → `the-pale.jpg`, etc.

## Why Option A, not Option B (code-side mapping) or Option C (renormalize district IDs)

- One of the five existing images (`the-pale.jpg`) **already follows this exact convention**
  against `district-the-pale` — evidence this was the originally-intended pattern, not
  something invented for this decision.
- The portrait system already proved this convention works well for this codebase: a plain
  `{stripped-id}.jpg` filename needs no lookup table, no schema field, and no code-side
  mapping to maintain — the id *is* the filename. Introducing Option B's mapping file here
  would create two different asset-naming strategies (portraits: convention-based,
  districts: table-based) for what is otherwise the exact same problem shape.
- Option C (change the 11 canonical district IDs in `districts.json` to match the odd
  filenames instead) was never seriously in the running: `districts.json`'s IDs are referenced
  everywhere — `districtTension`, `assignedDistrictId`, quest `discoveryDistrictId`, POI
  `districtId`, this session's own `travel-district` feature's adjacency lookups, etc. Renaming
  IDs to chase stale image filenames would be a much larger, riskier migration to solve a
  problem that a two-file rename already solves.

## What this means for the 5 existing files (`public/districts/`)

| Existing file | Verdict | Action |
|---|---|---|
| `the-pale.jpg` | Already matches `district-the-pale` | Keep as-is |
| `ashfields.jpg` | Near-miss for `district-ash-quay` (both ash-themed) | Rename to `ash-quay.jpg` |
| `iron-docks.jpg` | Near-miss for `district-ironworks` (both industrial/dock-themed) | Rename to `ironworks.jpg` |
| `the-city.jpg` | No matching district anywhere in `districts.json`'s 11 IDs; zero code references (confirmed via grep before touching it) | Delete |
| `the-tangle.jpg` | No matching district; the only code hits for the string `district-the-tangle` are in `proceduralQuestGeneration.ts`'s flavor-text lookup table and its own test — a separate, already-stale placeholder district id that was never one of the 11 real navigable districts and isn't wired to any image lookup. Not this ticket's concern to clean up, but noted for anyone auditing that file later. | Delete the image (unreferenced); leave the unrelated lookup-table entry alone |

Net: 3 of 11 districts covered by renamed/kept existing art (`district-the-pale`,
`district-ash-quay`, `district-ironworks`); the remaining 8
(`district-harbor`, `district-gilded-heights`, `district-the-warrens`, `district-the-hollows`,
`district-the-mireward`, `district-cinder-row`, `district-the-northbank`, `district-the-below`)
need new art, generated the same way portraits are: `scripts/generate-district-images.ts`
(new script, modeled directly on `scripts/generate-portraits.ts`'s Pollinations.ai flow), using
each district's `name`, `narrativeSummary`, and `dangerLevel` to build the prompt.

## Where the images actually get used — a visual-fit finding, not assumed

Before deciding a UI placement, ran the app (Playwright) through the actual District Map and
District Interior screens. Both are a cohesive **hand-drawn parchment map** aesthetic (SVG
streets/blocks/textures, painterly borders, "added in the house hand" annotations) with **zero
photographic elements anywhere in the district system today** — confirmed by reading
`DistrictMap.tsx`/`DistrictLedgerPanel.tsx`/`PoiLedgerPanel.tsx` and by screenshotting the
running app, not assumed from the ticket's "same pattern as portraits" framing (which turned out
to describe the asset-naming problem accurately but not the UI-wiring state: district images were
never wired into any screen at all, unlike portraits).

A full-bleed photographic background would clash with this established parchment-map identity.
The chosen integration point mirrors how NPC portraits are already used elsewhere: a small,
bordered thumbnail, not a full-screen image — added to `DistrictLedgerPanel` (the City Map's
per-district info panel) and `DistrictInteriorScreen`'s header. Generation prompts are written to
match the portrait generator's established painterly style (`oil painting style, atmospheric,
dark fantasy medieval`, not photographic), for the same reason.

## Next ticket

`destiny-k9xa` (already filed, parented under `destiny-8tga`) already covers the implementation
work end to end (rename/delete existing files, generate the missing 8, wire the UI) — no separate
ticket needed beyond it.
