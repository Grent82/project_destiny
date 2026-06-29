# Art Direction

## Purpose

This document is the visual world and asset direction source of truth for Project Destiny.

Its purpose is to keep UI, illustration, iconography, and environmental mood coherent before a full production art pipeline exists.

## Current Art Direction Goal

Project Destiny should look:

- grounded
- tactical
- urban
- layered
- slightly decadent

The world should feel lived-in and politically strained, not clean or futuristic by default.

## Visual Priorities

### 1. Functional worldbuilding

Visual design should clarify:

- class differences
- faction control
- district identity
- danger level
- institutional power

### 2. UI and world art must support the same tone

The UI should not feel detached from the world.

That means:

- materials
- color accents
- typography choices
- icon treatment

should reinforce the same setting language.

### 3. Asset systems over one-off assets

Early art work should prefer:

- style guides
- icon rules
- palette rules
- prompt templates
- asset naming standards

over isolated polished pieces with no pipeline.

## Early Style Constraints

- avoid generic fantasy ornament overload
- avoid glossy mobile-game polish
- avoid hyper-clean sci-fi UI language
- avoid incoherent mix-and-match illustration styles

## Visual Baseline

### Material language

The world should read as a mix of:

- worn metal
- dark stone
- paper records
- polished wood
- stained fabric
- institutional brass

This supports both civic authority and urban wear.

### Surface feeling

Nothing should feel perfectly pristine. Even elite spaces should suggest maintenance, ownership, and pressure rather than sterile luxury.

## Palette Direction

### Base palette

- ink navy
- charcoal iron
- smoke gray
- parchment cream
- tarnished brass

### Accent palette by function

- authority accents: muted gold, brass, seal red
- industrial accents: rust orange, furnace amber, oxidized steel
- elite accents: wine, ivory, faded teal, lacquer black

### Palette rules

- use warm metallic accents sparingly for importance
- do not oversaturate the full UI
- keep background fields dark or muted enough for dense information display
- let faction color accents identify pressure, not flood the interface

## Faction Mark Guidance

Faction marks should read clearly at:

- small UI icon size
- card-header size
- banner or concept-art size

### Civic Compact

#### Shape language

- shields
- seals
- gates
- columns
- chained rings

#### Meaning

Order, process, and guarded continuity.

#### Avoid

- flashy heraldry
- militant skull imagery

### Gilded Court

#### Shape language

- crests
- keys
- fans
- mirrored ornament
- filigree frames

#### Meaning

Prestige, control through taste, and social exclusion masked as refinement.

#### Avoid

- cartoon aristocratic excess
- oversaturated royal fantasy tropes

### Foundry League

#### Shape language

- anvils
- hammers
- pressure gauges
- chain links
- geometric workshop marks

#### Meaning

Work, leverage, continuity through production.

#### Avoid

- generic steampunk clutter
- novelty gear spam

## District Mood References

### Harbor Ward

#### Mood

- wet stone
- rope, timber, tar
- crate stacks
- signal lamps
- crowded movement

#### Lighting

- overcast daylight
- sodium dock glow
- reflected water highlights

#### UI translation

Harbor-adjacent surfaces can use rougher contrast, dirtier texture suggestions, and more active accent patterns.

### Gilded Heights

#### Mood

- curated interiors
- trimmed stone
- lacquered wood
- soft drapery
- guarded calm

#### Lighting

- filtered afternoon light
- candle or chandelier warmth
- controlled interior illumination

#### UI translation

Court-adjacent panels can feel cleaner and more deliberate, but should still avoid luxurious emptiness.

### Ironworks

#### Mood

- heat haze
- rivets
- soot
- pressure valves
- heavy silhouettes

#### Lighting

- furnace orange
- steel-blue shadow
- workshop task lighting

#### UI translation

Industrial contexts can carry stronger warm-vs-cool contrast and harder geometric structure.

## UI and World Coherence Rules

- faction accents should influence markers, chips, and emphasis states rather than replace the global palette
- typography should feel deliberate and functional, not whimsical
- iconography should support fast scanning before decorative flair
- world-art prompts and UI motifs should share the same material vocabulary

## Prompt Pack Baseline

Use these patterns when generating early concept or support assets.

### Faction concept prompt template

`Create a grounded tactical city-faction concept sheet for [FACTION NAME]. Emphasize [SOCIAL BASE], [METHOD OF POWER], and [VISUAL MATERIALS]. The style should feel urban, political, and slightly decadent, with readable silhouette language and restrained color accents. Avoid cartoon fantasy, glossy mobile-game polish, and overdesigned ornament.`

### District mood prompt template

`Create an environment mood board for [DISTRICT NAME]. Emphasize [ECONOMIC FUNCTION], [EMOTIONAL CHARACTER], and [LIGHTING]. Show a lived-in city space with pressure, class signals, and functional detail. Keep the tone grounded, strategic, and readable rather than cinematic excess.`

### UI texture prompt template

`Create subtle UI material references for a browser strategy RPG interface using dark metal, paper, stone, and brass accents. Prioritize clarity, low visual noise, and atmosphere that supports dense information layouts.`

### NPC portrait prompt template

`Create a portrait concept for an urban political RPG NPC. Emphasize role, competence, and faction relationship through clothing, posture, and material detail. Keep the style grounded and consistent with a tactical city setting, avoiding exaggerated fantasy tropes.`

## Asset Naming and Packaging Rules

- use stable, descriptive names
- prefix by asset family when useful
- distinguish concept, UI, icon, and portrait assets explicitly

Examples:

- `faction_civic_compact_mark_v1`
- `district_harbor_moodboard_v1`
- `ui_material_dark_brass_v1`
- `npc_port_merchantbroker_v1`

## Character and Portrait Direction

### Portrait as primary identity anchor

Character portraits are the most important single asset class in Project Destiny. The player manages people, not stat arrays. The portrait is the first thing that creates attachment, and it persists across every NPC detail tab. A weak or inconsistent portrait undermines the entire relationship and roster system.

All portrait work must be treated as a system, not as individual commissions.

### Portrait style constraints

Every NPC portrait must share the same:

- **Framing**: bust or three-quarter view, consistent crop height
- **Aspect ratio**: fixed (3:4 or 2:3 — to be confirmed in a dedicated style guide bead)
- **Background treatment**: neutral dark or district-contextual, not random per character
- **Lighting language**: consistent with the art direction palette — controlled, slightly dramatic, urban
- **Line and rendering style**: consistent stylization level across all characters — no mixing photorealistic and illustrated styles in the same roster

Style guide must be produced and approved before generating NPC art at volume.

### Character-consistent sensual presentation

Sensual or revealing presentation is a deliberate product pillar in Project Destiny. It is connected to the relationship, attraction, and household systems — not used as generic decoration.

The rules for sensual presentation are:

**Present through character, not through uniform exposure.**

A court-affiliated character, a mercenary, and a dockworker occupy different social and visual registers. Their presentation — dress, posture, styling, degree of exposure — should reflect who they are inside the world. Forced uniform sexualization collapses character distinction and weakens the setting.

**Attraction should be readable before it is explicit.**

The primary tool for sensual appeal is expressiveness, posture, and styling. Characters should feel desirable and distinct at the portrait stage before any explicit content is introduced. A strong character read at the portrait level makes later relationship or intimacy content feel earned.

**Visual appeal should serve the systems.**

Attraction, courtship, compatibility, and household mechanics depend on the player caring about specific characters. Portraits that create personality investment are more valuable than portraits that are visually intense but interchangeable. Both goals should be pursued together, not traded off.

**Presentation should scale with relationship progression.**

Initial portrait framing can be characterful and evocative without being explicit. Deeper relationship states may unlock more intimate presentation. This creates progression incentive and avoids front-loading content that has not been earned through gameplay.

**Avoid:**

- Uniform body type across all characters
- Identical pose or composition regardless of personality
- Explicit presentation as a default state for low-relationship NPCs
- Pin-up framing that removes personality from the portrait
- Styles inconsistent with the world's material language (generic fantasy lingerie in a dark industrial city)

### NPC visual classes

Characters should be designed with distinct visual registers that reflect their role and background:

| Class | Framing cues | Styling notes |
|-------|-------------|---------------|
| Combat-trained | Strong posture, visible gear or scarring, direct gaze | Materials: leather, metal, practical cloth |
| Administrative or scholarly | Composed, slightly reserved, formal dress details | Materials: paper, ink, tailored fabric |
| Elite or court-adjacent | Deliberate presentation, refined styling, controlled affect | Materials: curated cloth, jewelry, lacquer |
| Working class or underworld | Practical, harder-worn, more direct expression | Materials: rougher fabric, wear marks, functional tools |
| Intimate or household role | Warmer expression, softer framing, personal styling | Setting-appropriate dress rather than generic exposure |

These are not archetypes that lock design — they are baseline registers. Individual characters should deviate in ways that create interest and signal backstory.

## Priority Asset Backlog

The first useful asset direction outputs should be:

1. Portrait style guide (framing, lighting, aspect ratio, background treatment)
2. Faction mark explorations
3. District mood boards
4. UI material references
5. Icon style references

Portrait sets follow the style guide. Decorative illustrations come after the visual system is stable.

## UI/UX Design Principles

**WICHTIG:** Für UI/UX Design-Prinzipien, Screen-Vorlagen, und konkrete Implementierungs-Regeln siehe:
- [`ui-ux-design-principles.md`](./ui-ux-design-principles.md) — Ausführliche Anleitung für UI/UX Arbeit

Die Art Direction in diesem Dokument ergänzt die UI-Prinzipien, ersetzt sie aber nicht.

## Expected Future Content

- type direction
- icon style guide
- portrait style guide (priority — must precede portrait generation)
- export and naming rules
- intimacy and relationship progression asset guidelines
