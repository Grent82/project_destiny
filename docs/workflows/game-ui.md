# Workflow: Game UI

Use this workflow when designing or refining:

- management screens
- dense data views
- comparison layouts
- mission prep and combat support UI
- navigation patterns

## Inputs

- `docs/product.md`
- `docs/ui-principles.md`
- `docs/architecture.md`
- existing application selectors and use cases

## Process

1. Define the player decision the screen must support.
2. List the state that must be visible at first glance.
3. Separate read-only display from mutating actions.
4. Keep business logic in application/domain layers.
5. Test the screen for scanability, not only aesthetics.

## Output Standard

- state is visible
- actions are understandable
- hierarchy is clear
- architecture boundaries remain intact
