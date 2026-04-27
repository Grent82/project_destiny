# Data Layout

This directory separates immutable content definitions from mutable runtime state.

## Definitions

`data/definitions/` contains authored game content such as:

- districts
- factions
- items
- NPC definitions
- shops

These files should validate against the domain contracts.

## Runtime

`data/runtime/` contains example or seeded game-state instances.

Runtime files represent save-state style data and must not duplicate the content definitions inline.
