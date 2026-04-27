# NPC Portrait Style Guide

## Purpose

This document is the production specification for all NPC portrait art in Project Destiny. It must be read and applied before generating any NPC portrait at volume.

Portraits are the most important single asset class in this project. Players manage people, not stat arrays. The portrait creates the first attachment and persists across every NPC detail tab. A weak or inconsistent portrait undermines the entire relationship and roster system.

This guide defines every constraint required to generate portraits that are coherent, characterful, and system-ready without the author present.

---

## 1. Framing Standards

### Primary frame: bust or three-quarter view only

All NPC portraits use one of two frames:

| Frame type | When to use |
|---|---|
| **Bust (chest-up)** | Default for most NPCs. Shows face, shoulders, and chest. Character identity reads at a glance. |
| **Three-quarter (torso to mid-thigh)** | Use for characters where posture, clothing silhouette, or body language is a primary identity signal. Combat-trained, elite, and underworld NPCs benefit from this. |

Full body portraits are **not** used in the NPC detail panel. Head-only crops are **not** used — they eliminate the clothing and posture signals that carry class and faction identity.

### Crop height rules

- **Bust**: crop at approximately upper chest. The chin and top of the head are never cropped. Eyes are in the upper half of the frame — roughly 55–65% up from the bottom.
- **Three-quarter**: crop at approximately mid-thigh. The head is not cropped at the top. The figure should feel grounded, not floating.

### Gaze and orientation

- Direct gaze (facing viewer) is the default. It creates attachment and makes the portrait feel like a character, not a figure.
- Slight three-quarter head angle (15–25°) is acceptable and often more naturalistic. Avoid sharp profile angles — they suppress attachment.
- Looking away is only appropriate when character-motivated: surveillance types looking past the viewer, exhausted or emotionally distant characters avoiding direct contact.

---

## 2. Aspect Ratio

### Required ratio: **3:4 (portrait orientation)**

This is the only permitted aspect ratio for NPC portraits. Do not use 2:3, 1:1, or 16:9.

**Why 3:4:**

- Fits the NPC detail panel's right column (40–50% of panel width) without dead space or awkward cropping.
- Tall enough to show collar, shoulders, and upper chest for both bust and three-quarter frames.
- Wide enough to show a relaxed or expressive pose without crowding.
- Standard across AI image generation tools — predictable framing behavior.
- Consistent across all NPCs regardless of body type — prevents composition drift.

**Thumbnail derivation:** The roster list uses a square thumbnail cropped from the center of the 3:4 image, biased slightly upward to favor the face. Do not generate separate thumbnails — crop from the master portrait in the build pipeline.

---

## 3. Background Treatment

### Three permitted background types

#### A. Neutral dark (default)

- A dark, non-distracting backdrop — deep charcoal, ink navy, or near-black with slight textural variation (rough stone, dark fabric, indistinct shadow).
- The background should not identify a specific location.
- Use for: all NPCs without strong faction or district identity, all Tier 1 portraits (see §7).
- Preferred when in doubt. It is always safe and never clashes with the figure.

**Prompt guidance:** "dark abstract background, deep charcoal, faint stone texture, no location detail, soft vignette"

#### B. District-contextual

- Suggests the NPC's home district without depicting a specific scene.
- Background elements: architectural shapes, ambient lighting quality, material texture (rope and timber for Harbor Ward; lacquered wood and soft drape for Gilded Heights; riveted metal and warm haze for Ironworks).
- Keep background dark enough that the figure reads first. Subject-to-background contrast ratio must favor the figure.
- Never use outdoor daylight or bright open backgrounds.

**Prompt guidance (Harbor Ward):** "blurred dock background, faint signal lamp glow, dark wet stone, rope silhouette, no detailed scene"

**Prompt guidance (Gilded Heights):** "soft blurred interior, warm candlelight, dark lacquered wood, indistinct drapery"

**Prompt guidance (Ironworks):** "dark industrial background, blurred riveted metal, distant furnace glow, steel-blue shadow"

#### C. Faction-tinted

- A neutral dark background with a subtle color bias pulled from the faction's accent palette:
  - Civic Compact: muted blue-gray tint, faint brass detail
  - Gilded Court: warm ivory-gold tint, faint lacquer sheen
  - Foundry League: rust-orange tint, steel-blue shadow
- Do not use faction marks or explicit heraldry in the portrait background — that is for card headers, not portraits.

**When to use:** For NPCs with strong faction identity where the neutral dark feels too generic and district-contextual feels too specific.

### Rules that apply to all backgrounds

- Never place the NPC against a white, cream, or bright-field background.
- Never use photographic real-world backgrounds or specific architectural reference.
- Never use backgrounds that compete visually with the figure's silhouette edge.
- The figure must be legible at 200px wide (roster thumbnail size).

---

## 4. Lighting Language

### Direction

- **Primary light source: 30–45° above and slightly to one side (typically left).** This is the standard for most portraits. It models the face without flattening, creates shadow that adds depth, and feels naturally interior without being theatrical.
- **Secondary fill light: opposite side, low intensity.** Prevents the shadow side from going completely opaque. Keep the fill at 20–35% of the primary intensity.

### Warmth and temperature

- **Base lighting: cool-neutral to cool-warm.** The default should feel like controlled interior light — not warm domestic firelight, not cold hospital fluorescence.
- **Accent warmth:** Tarnished brass, candlelight, and amber lamp tones are acceptable as practical sources — use them to warm one side of the figure while keeping the shadow side cool. This creates the slightly dramatic, layered quality from the art direction.
- **Avoid:** flat frontal lighting (removes dimensionality), harsh uplighting (horror effect), pure blue-white cold light (removes warmth from character), blown-out highlights that eliminate clothing or skin texture detail.

### Contrast level

- **Medium-high contrast.** Shadows should be visible and intentional. Not photography HDR contrast — no crushed blacks or highlight clipping.
- Skin, fabric, and material should retain readable texture detail in both lit and shadow regions.
- The overall mood should feel: controlled, slightly dramatic, grounded. Not cinematic spectacle.

### Per-district lighting guidance

| District | Lighting cue |
|---|---|
| Harbor Ward | Overcast diffuse light, faint sodium-lamp warmth, hints of reflected water highlight |
| Gilded Heights | Filtered afternoon warmth, candle or chandelier glow, soft and deliberate interior illumination |
| Ironworks | Furnace amber primary, steel-blue shadow fill, hard shadows, texture-forward |

---

## 5. Rendering and Stylization Level

### Required style

**Stylized painterly illustration.** The target sits between:

- Semi-realistic digital painting (detailed but not photographic)
- Character-concept illustration (designed, not rendered from life)

Think: character concept art from a grounded tactical game. Faces have readable anatomy. Clothing has material texture. Light behaves consistently. The style is deliberate, not gestural.

### Acceptable

- Painterly brushwork with visible texture
- Clean digital painting with strong value structure
- Matte illustration style with restrained saturation
- Semi-stylized with slightly exaggerated expressiveness (eyes, posture emphasis)

### Forbidden — no exceptions

- **Photorealistic renders.** Do not use AI image styles that target photographic realism. They are incompatible with the illustrated stylized characters and produce uncanny results at scale.
- **Anime or manga stylization.** Strong cel-shading, flat color, minimal nose rendering, and anime eye conventions all break the world's tone and feel genre-displaced.
- **Cartoon or caricature.** No exaggerated proportions, no comic-style inking.
- **Mixing stylization levels within the roster.** If one character looks painted and another looks like a photograph, the roster breaks. Once a style is chosen, every portrait must match it.
- **Fantasy trope-heavy illustration styles.** Avoid AI styles that default to generic high-fantasy aesthetic (glowing eyes, dramatic magical particle effects, oversaturated saturated skin).

### Consistency enforcement

Before adding a new portrait to the roster, compare it against the two most recently approved portraits for:

- Line quality and brushwork texture
- Value range (highlights to shadow depth)
- Color temperature in lit and shadow regions
- Apparent rendering technique

If it does not match on all four axes, regenerate or adjust before use.

---

## 6. Expression and Posture Guidelines

Expression and posture are the primary tools for communicating personality. Every portrait must read as a specific person, not a character class placeholder.

### By NPC class

#### Combat-trained

**Aim for:**
- Direct, controlled gaze — not aggressive, but not soft
- Strong postural alignment: upright spine, shoulders set, chin level or slightly raised
- Visible tension or readiness without theatrical pose
- Scarring, worn equipment, or practical clothing reads as lived-in, not costumed
- Expression range: composed alertness, quiet fatigue, wary assessment

**Avoid:**
- Theatrical battle poses, open-mouth aggression, exaggerated war-face
- Pristine or aristocratic posture that undermines the physical reality of combat
- Blank neutral expression that erases personality

#### Administrative or scholarly

**Aim for:**
- Composed, slightly reserved expression — the person is processing, observing, or waiting
- Upright but not rigid posture; formal without military bearing
- Clothing detail carries faction and status signals: collar quality, document stain, ink mark, official emblem
- Expression range: measured assessment, dry amusement, quiet authority, suppressed frustration

**Avoid:**
- Open warmth — administrative characters earn warmth through relationship progression, not by default
- Absent or unfocused expression that reads as unimportant
- Casual or relaxed posture that undercuts the formal register

#### Elite or court-adjacent

**Aim for:**
- Deliberate self-presentation — these characters know they are being looked at
- Controlled affect: a slight controlled smile, studied calm, or appraising look rather than open expression
- Refined posture with subtle weight — not military, but not casual
- Clothing is the most information-dense layer: material quality, restraint in ornamentation, precision of fit
- Expression range: studied warmth, social calculation, quiet contempt, carefully deployed charm

**Avoid:**
- Excessive jewelry or ornament that overwhelms the face
- Blank aristocratic vacancy
- Overtly friendly or warm expression that breaks the controlled register

#### Working class or underworld

**Aim for:**
- Practical, direct, unselfconscious expression
- Posture that reads as physical confidence without formal training — relaxed, unguarded, sometimes slightly closed or guarded depending on character
- Clothing shows function and wear: fabric stress, repair marks, district-appropriate practicality
- Expression range: frank assessment, dry humor, wariness, hard tiredness, direct challenge

**Avoid:**
- Servile or defeated expression — working class and underworld characters are not diminished by their position
- Generic roughness (dirt for its own sake, unspecific damage)
- Glamorous styling that contradicts the register

#### Intimate or household role

**Aim for:**
- Warmer default expression — approachable without being generic
- Softer framing: slightly lower camera angle or closer crop than combat portraits; less formal posture
- Styling that feels personal — what this character chose to wear rather than what their role requires
- Expression range: genuine warmth, personal curiosity, familiar ease, quiet amusement, private sadness

**Avoid:**
- Generic exposure or uniform sexualization as the default register (see §7 for tier rules)
- Completely passive expression with no agency
- Styling that is generically revealing rather than character-appropriate

---

## 7. Sensual Presentation Tiers

Sensual and intimate presentation is a deliberate product pillar in Project Destiny. It is gated to relationship progression — not used as a default state for new NPCs.

The system has three tiers. Each portrait is tagged with its tier. No NPC should have Tier 2 or Tier 3 assets displayed to a player who has not reached the corresponding relationship state.

### Tier 1 — Characterful and Evocative (default / low relationship)

**This is the portrait the player sees at first contact.**

Goals:
- The character reads as a specific, interesting person within the first two seconds
- Visual appeal is built through posture, expression, styling, and material richness — not through exposure
- The portrait should be compelling enough that the player wants to know more

Rules:
- Framing is bust or three-quarter; no deliberate decolletage emphasis
- Clothing is setting-appropriate to the character's role — not generic or removed
- Expression may be warm or inviting, but is primarily characterful
- Lighting emphasizes the face and personality, not body contour

What "evocative" means at Tier 1: the portrait has enough personality and presence that the viewer can project attraction. Not blank, not sanitized — characterful.

### Tier 2 — Personal and Intimate (mid relationship)

**Unlocked after meaningful relationship progress.**

Goals:
- A more personal version of the same character — same face, same personality, but the guard is lower
- Physical presence becomes more deliberate — posture invites, styling is more personal
- The portrait should feel like a shift in access, not a costume change

Rules:
- Framing may include a closer crop or slightly lower neckline
- Clothing is still character-consistent but may be more relaxed, less formal, or styled for a private context
- Expression is warmer, more direct, more personally available
- Lighting may be softer and more intimate — warmer, closer
- No explicit nudity or graphic content at this tier

What distinguishes Tier 2 from Tier 1: the viewer feels they are seeing a version of the character the character controls who gets to see it. It is earned access, not uniform exposure.

### Tier 3 — Explicitly Sensual (deep relationship)

**Unlocked only at deep relationship states, earned through gameplay.**

Goals:
- Explicit sensual presentation that is still character-specific and emotionally coherent
- The portrait should feel like intimacy, not like decoration

Rules:
- Framing may depict significant exposure consistent with the character's sensual register
- The character's face and expression remain primary — not cropped out or deemphasized
- Expression should have emotional weight, not be vacant or performative
- Staging should feel consistent with where this specific character would actually be in this state
- Body type, styling, and presentation must still be character-consistent — not the NPC replaced with a generic template

What distinguishes Tier 3 from generic adult content: the character's individuality is the focus. Tier 3 fails if the NPC becomes interchangeable with other Tier 3 portraits.

### Tier rules that apply to all levels

- Never generate Tier 2 or Tier 3 portraits as default assets — they must be explicitly tagged and gated
- A court-affiliated character presents differently from a mercenary at every tier. The tier scales the intimacy level, not the register
- Uniform body type across tiers is a failure — Tier 3 assets must match the physique and styling established at Tier 1
- Do not use explicit content for characters where the narrative does not support it

---

## 8. Per-Class Prompt Templates

These are worked examples. Adapt the bracketed fields to the specific NPC. Use these as your starting prompt structure, then add character-specific detail.

---

### Class: Combat-trained

#### Tier 1 (default)

```
Portrait of a [gender] mercenary/guard in a dark medieval urban setting. Bust framing, direct gaze, 30-degree head angle. Practical [leather armor / worn scale / military jacket] with visible wear and minor scarring. Expression: controlled alertness, slight fatigue. Dark abstract background, deep charcoal, faint stone texture. Lighting: primary light 40 degrees above left, cool-neutral tone, warm amber accent from right, medium-high contrast. Painterly digital illustration style, semi-realistic but not photographic. Matte finish, detailed clothing texture. Grounded, tactical, urban tone.
```

#### Tier 2 (mid relationship)

```
Portrait of a [gender] mercenary/guard in a dark medieval urban setting. Bust framing, slightly closer crop, direct and slightly warmer gaze. [Jacket open / armor removed, wearing simple undershirt]. Expression: guarded warmth, personal ease — the careful exterior lowered slightly. Warm candlelight source from left, cool fill from right, intimate quality. Same painterly digital illustration style as Tier 1 portrait. Character-consistent physique and face. Dark blurred interior background. Slightly softer lighting contrast than Tier 1.
```

---

### Class: Administrative or scholarly

#### Tier 1 (default)

```
Portrait of a [gender] civic administrator/archivist/court clerk in a dark medieval urban setting. Bust framing, direct or slightly averted gaze (assessing, not unfriendly). Formal [dark wool coat / tailored jacket / robes] with visible institutional detail — brass button, document fold at collar, ink stain on fingers. Expression: composed authority, measured assessment. Neutral dark background with faint suggestion of parchment or paper behind. Lighting: cool filtered interior light, primary above-left, soft fill. Painterly digital illustration style, restrained saturation. Urban, institutional, slightly decadent tone.
```

#### Tier 2 (mid relationship)

```
Portrait of a [gender] civic administrator/archivist in a dark medieval urban setting. Bust or slight three-quarter framing. Formal jacket open or jacket removed, showing shirt beneath. Same character face and physique as Tier 1. Expression: more personally direct, slight warmth cracking through the institutional reserve — access that is earned, not default. Warm lamp light, soft interior background. Same painterly style. The formality has lowered one layer, not removed.
```

---

### Class: Elite or court-adjacent

#### Tier 1 (default)

```
Portrait of a [gender] [noble / court official / gilded heights resident] in a dark medieval urban setting. Three-quarter framing, deliberate posture, controlled presentation. Refined [dark brocade coat / silk dress / tailored court garment] with restrained ornament — one piece of significant jewelry, precise fit, high material quality. Expression: studied warmth or appraising calm — the social performance of someone who always knows they are seen. Warm interior lighting, soft candle glow, clean deliberate shadow. Dark background with faint lacquered wood or drapery suggestion. Painterly digital illustration style, controlled color temperature. Gilded Heights register: no excessive ornament.
```

---

### Class: Working class or underworld

#### Tier 1 (default)

```
Portrait of a [gender] [dock worker / courier / black market contact / fence] in a dark medieval urban setting. Bust framing, unguarded direct expression. Practical working clothing — [rough linen / patched wool / functional vest] with visible wear, stitching detail, district-specific marks. Expression: frank and direct — no pretension, no social performance, either wariness or dry confidence. Dark background with faint harbor or ironworks ambient light. Lighting: sodium lamp warmth or furnace amber from one side, cool fill. Medium-high contrast. Painterly digital illustration style, gritty material texture.
```

---

### Class: Intimate or household role

#### Tier 1 (default)

```
Portrait of a [gender] household [cook / attendant / companion / steward] in a dark medieval urban setting. Bust framing, soft close crop, warm expression — personal and present, not performative. Clothing is personal-choice styling appropriate to domestic setting — [simple dress / practical but personal garment / neat informal wear]. The styling reflects who the character is, not a uniform. Expression: genuine warmth, curiosity, or quiet private mood — not blank or generic. Lighting: soft warm interior, candlelit quality, intimate shadow. Dark background, warm ambient. Painterly digital illustration style, warmer palette than combat or administrative portraits.
```

#### Tier 2 (mid relationship)

```
Portrait of a [gender] household [role] in a dark medieval urban setting. Close bust framing. Relaxed domestic setting or neutral dark warm background. Clothing: more casual and personal — the styling chosen for a private context, not public presentation. [Robe loosely tied / simple shift / personal garment]. Same character face and physique as Tier 1. Expression: familiar ease, warm directness, personal intimacy — the version of this character seen only by someone they trust. Warm soft candlelight. Same painterly style.
```

---

## 9. Anti-Patterns

These must never appear in any Project Destiny portrait. Treat this as a hard exclusion list.

| Anti-pattern | Why it fails |
|---|---|
| **Uniform body type across all NPCs** | Collapses character distinction. Signals the NPC is a template, not a person. |
| **Identical neutral expression across NPCs** | Expression is the primary personality signal. Blank faces are placeholder faces. |
| **Random or unrelated backgrounds** | Breaks roster coherence and disconnects the character from the world. |
| **Style mixing within the roster** | Photorealistic and illustrated characters in the same roster destroy visual coherence. Every NPC must match the same stylization level. |
| **Explicit or revealing content at Tier 1** | Front-loading intimacy removes the relationship progression incentive and forces all NPCs into the same mode. |
| **Uniform sexualization regardless of character** | The dock worker and the court noble do not dress, pose, or present the same way. Forced uniform exposure collapses the world's social texture. |
| **Pin-up framing that suppresses personality** | A portrait where the character's expression, posture, and clothing details are subordinated to body display is a failed portrait. Personality must remain primary at every tier. |
| **Generic fantasy lingerie in a dark industrial city** | Anachronistic styling breaks immersion. Intimate presentation must use setting-appropriate materials and staging. |
| **Anime or manga stylization** | Incompatible with the world tone. Breaks cross-NPC consistency. |
| **Photorealistic rendering** | Cannot be matched consistently across the roster. Feels inconsistent alongside illustrated characters. |
| **Bright, white, or neutral-light backgrounds** | Breaks the established dark-material palette. Makes the portrait feel genre-less. |
| **Outdoor bright daylight portraits** | Breaks the controlled interior lighting language. |
| **Characters cropped at the chin or mid-forehead** | Removes the face, which is the attachment anchor. |
| **Full-body portraits** | Do not fit the NPC detail panel layout and are harder to make consistent. |
| **Faction marks or heraldry in the portrait background** | Use in card headers and UI elements. Not in character portraits. |
| **Tier 2 or 3 portraits used as Tier 1 defaults** | Violates the relationship progression system. |
| **Tier 3 portraits where the character face is cropped or deemphasized** | The character remains the subject at every tier. Cropping the face produces generic content, not character intimacy. |

---

## 10. Asset Naming and File Conventions

### File naming pattern

```
npc_[id]_[tier]_[version].[ext]
```

| Field | Values | Notes |
|---|---|---|
| `npc` | literal prefix | Required prefix for all NPC portrait assets |
| `[id]` | stable NPC identifier | Lowercase, underscore-separated. Use the NPC's role slug if no canonical ID exists yet. Example: `harbor_guardcaptain`, `gilded_archivist`, `ironworks_liaison` |
| `[tier]` | `t1`, `t2`, `t3` | Required. Always tag the tier explicitly |
| `[version]` | `v1`, `v2`, etc. | Increment when regenerating or revising; do not overwrite approved versions |
| `[ext]` | `png` or `webp` | See format rules below |

**Examples:**

```
npc_harbor_guardcaptain_t1_v1.png
npc_gilded_archivist_t1_v1.png
npc_gilded_archivist_t2_v1.png
npc_ironworks_foreman_t1_v1.png
npc_household_cook_t1_v2.png
```

### Resolution targets

| Use | Dimensions | Notes |
|---|---|---|
| **Production portrait** | 600 × 800 px | Master asset. 3:4 ratio. |
| **NPC detail panel display** | 600 × 800 px (scaled down by browser) | Use the production file; do not downsample separately unless performance requires |
| **Roster thumbnail** | 100 × 100 px (square crop) | Generated from production portrait at build time; not a separate file |
| **Event modal portrait** | 480 × 640 px | Optionally produce a separate export if the event panel has different dimensions |

Minimum acceptable portrait width: **600 px.** Do not use AI-generated portraits at their raw small output size without upscaling — most AI tools default to 512px or smaller at base resolution.

### Export format

- **Primary format: PNG** — lossless, supports transparency if needed for compositing.
- **Web delivery format: WebP** — convert from PNG for browser delivery. Target quality 85–90.
- Do not deliver JPEG — compression artifacts are visible on portrait edges and fine clothing detail.
- Do not deliver raw AI image files (WEBP or PNG from AI tools may have inconsistent color profiles — convert to sRGB before use).

### Storage and access tiers

- Store Tier 1 assets in the public asset path — they display at first contact.
- Store Tier 2 and Tier 3 assets in a **gated asset path** that requires the relationship state to be evaluated before delivery. Do not expose Tier 2/3 file paths in the client bundle without access control.
- Maintain an asset manifest file (`npc-portraits.json` or equivalent) that maps NPC ID → tier → file path. The game UI reads from this manifest rather than constructing paths directly.

### Versioning and approvals

- Never delete approved portrait versions. Increment the version number when replacing.
- A portrait is approved when it has passed the consistency check against the two most recently approved portraits (see §5).
- Mark approved assets in the asset manifest with `"approved": true`.
- Unapproved or draft portraits must not appear in any shipped build.
