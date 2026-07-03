# Recovery, Rest, and Injury Contract

Date: 2026-07-03
Bead: `destiny-i8nc`
Epic: `destiny-m916`

## Purpose

Define one coherent semantic contract for:

- `health`
- `injury`
- `recovering`
- player rest
- treatment support
- readiness for duty

This contract exists so the next implementation beads can change runtime and UI behavior without guessing.

## Current problem summary

The current implementation mixes incompatible meanings:

- `recovering` currently heals `health`, but not visible `injury`
- `recovering` ends on a high-health threshold, not on wound recovery
- expedition treatment reduces `injury`, but normal item use does not
- player recovery does not clearly route through the same house logic as roster NPCs
- sleep, daily recovery, and medical support are not separated by purpose

The result is a system that is technically active but not semantically trustworthy.

## Version 1 contract

### 1. `health` means immediate physical readiness

`health` is the short-term condition value that answers:

- can this person keep going right now?
- how close are they to collapse?
- how much immediate damage remains after a fight?

Rules:

- `health` changes quickly
- `health` can be restored by time, sleep, and treatment
- `health` is not the same as wound severity
- high `health` does not automatically mean the person is truly recovered

For roster NPCs, `health` remains on the existing `0..100` scale.

For the player, `combatState.health` remains on the existing player-max scale in combat logic. The semantic meaning is the same even if the numeric max differs.

### 2. `injury` means lasting wound severity

`injury` is the persistent wound burden that answers:

- was this person seriously hurt?
- do they need structured recovery rather than just sleep?
- are they fit for normal duty again?

Rules:

- `injury` rises from meaningful physical harm, especially collapse, KO, and severe encounters
- `injury` falls slowly
- `injury` should not be reduced implicitly by every generic heal path
- `injury` is the main reason `recovering` exists

`injury` is not just flavor. If it is visible to the player, it must matter to readiness and treatment.

### 3. `recovering` means medically out of normal duty

`recovering` is not a synonym for "gaining some HP."

It means:

- this character is currently removed from normal house duty
- they need structured recovery time
- the house's treatment support matters for how quickly they return

Version 1 rule:

- enter `recovering` when a character is knocked out or otherwise crosses the serious-wound threshold
- remain `recovering` until both immediate readiness and lasting wound burden are back below the return threshold

### 4. Injury thresholds

Version 1 uses three semantic injury bands:

- `0..14` — light injury
  The character may still be fit for duty if `health` is sufficient.
- `15..29` — wounded but functional
  The character is visibly hurt and not fully well, but is not automatically forced into `recovering`.
- `30+` — serious injury
  The character must enter or remain in `recovering`.

Why these numbers:

- current KO aftermath already adds `30` injury, so the contract aligns with existing author intent
- the bands create a real distinction between "hurt" and "medically out of action"
- the next runtime slice can use these thresholds without a broad combat rebalance

## Readiness contract

### 5. Fit for normal duty

A roster NPC is fit for normal duty only when both are true:

- `health >= MIN_DEPLOYABLE_HEALTH`
- `injury < 15`

This defines the "fully ready" state for returning from `recovering`.

### 6. Can still be wounded without being in `recovering`

Version 1 allows a character to be visibly wounded without being forced into `recovering` if:

- `health >= MIN_DEPLOYABLE_HEALTH`
- `injury < 30`

This supports mild and moderate wound carry-over without turning every scratch into a bed-rest state.

### 7. Deployment and readiness

Version 1 deployment rules should converge on:

- never deploy while `assignment === 'recovering'`
- never deploy below `MIN_DEPLOYABLE_HEALTH`
- once injury-specific readiness is wired, serious injury must not bypass deployment guards through UI inconsistency

This does not require new injury-specific combat penalties in version 1. Readiness and treatment meaning come first.

## Rest and treatment contract

### 8. Brief rest

`sleepBrief` or similar short rests are for:

- fatigue relief
- stress relief

They do not materially treat `injury`.

They may provide little or no `health` recovery depending on the exact runtime slice, but they are not wound treatment.

### 9. Sleep

Normal overnight sleep is for:

- restoring fatigue
- lowering stress
- modest `health` recovery

Sleep alone is not enough to erase serious `injury`.

### 10. Treatment

Treatment is the main way to reduce `injury`.

Version 1 treatment sources:

- medical infrastructure such as an infirmary
- medical role support such as a medic title
- explicitly authored injury-treatment item effects

Generic `heal` effects should restore `health` only.

If an item is supposed to reduce `injury`, it should do so through an explicit typed effect such as `cureInjury` or equivalent authored treatment semantics.

This avoids the current inconsistency where one subsystem treats medkits as wound care and another treats them as pure HP.

### 11. Treatment quality tiers

Version 1 should use these semantic support tiers:

- `none`
  Makeshift rest only. Good for fatigue and some `health`, poor for `injury`.
- `lodging`
  Intact quarters or equivalent sheltered rest. Better general recovery, still limited treatment.
- `treatment`
  Infirmary-grade support. Meaningful `injury` reduction.
- `treatment-plus-medic`
  Best available house support. Fastest wound recovery and clearest readiness improvement.

The runtime bead does not need to expose these names literally, but it should implement this structure.

## Player contract

### 12. Player participates in the same house model

The player should not sit outside the recovery system.

Version 1 rule:

- the player uses an implicit lodging model
- no explicit room-assignment UI is required yet
- the house determines the player's rest quality the same way it determines house-level recovery support

### 13. Player lodging in version 1

The player is assumed to rest in the best valid house space available under current conditions:

- default salvage lodging if nothing better exists
- private quarters-quality rest when suitable quarters support exists
- treatment support when the player is seriously injured and the house has infirmary-grade care

This keeps the house diegetically coherent without adding unnecessary micromanagement.

### 14. Player-facing outcomes

When the player rests, the result should be explainable in house terms:

- poor rest
- sheltered rest
- treated overnight
- treated with medic support

The player should not heal through an abstract shortcut that bypasses the house.

## What version 1 does not promise

This contract intentionally does not require:

- surgery gameplay
- permanent maiming
- disease simulation
- separate wound location systems
- explicit player room assignment UI
- injury-based combat accuracy penalties beyond existing readiness rules

Those may be future work. They are not prerequisites for making the system coherent now.

## Required downstream changes

The next implementation beads should follow this order:

1. `destiny-uj3s`
   Route player rest and lodging through the house model.
2. `destiny-o8mn`
   Make runtime injury, treatment, and return-to-duty obey this contract.
3. `destiny-shaf`
   Make the resulting state legible on player-facing surfaces.

East Wing medical buildout work should depend on the runtime slice, not reinvent treatment semantics locally.

## Non-goals for downstream implementation

Downstream beads should not:

- restore `injury` through every generic heal path
- keep player healing on a separate hidden model
- leave `recovering` tied to high `health` alone
- add busywork treatment clicks just to make recovery feel "deeper"

## Bottom line

`health` is immediate readiness.

`injury` is lasting wound severity.

`recovering` means medically out of normal duty because injury still matters.

Sleep restores the body.

Treatment heals the wound.

The player and the roster must live under the same house logic.
