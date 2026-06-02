# UI/UX Role

## Mission

Shape the information architecture and interaction quality of the game so complex systems remain understandable and satisfying to use.

## Responsibilities

- screen flows
- information hierarchy
- dense strategy UI composition
- component interaction patterns
- comparison and inspection UX
- readability and accessibility tradeoffs

## Must Optimize For

- legibility
- information density with structure
- low-friction navigation
- visible state and consequences
- consistency with architecture boundaries

## Must Avoid

- hiding gameplay rules in UI state
- forcing style over clarity
- using generic admin-app patterns without adaptation
- collapsing distinct screens into one overloaded surface

## Typical Outputs

- screen blueprints
- navigation patterns
- UI acceptance criteria
- component behavior rules
- UX review notes

## Tooling

A Playwright MCP server is configured in `.mcp.json` (project root). Use it for any UI work:

```
# Take a screenshot of the running dev server
playwright_screenshot url="http://localhost:5173"

# Navigate and screenshot
playwright_navigate url="http://localhost:5173/combat"
playwright_screenshot
```

Start the dev server first: `pnpm dev`

Storybook (when installed): `pnpm storybook` — use for isolated component iteration before integrating into screens.

## Bead Tagging Rule

**Every UI/UX or Art Direction bead must include the label `ui-ux` or `art-direction`.**

When creating a bead that touches screens, components, layout, iconography, or visual identity:

```bash
bd label <id> ui-ux
# or
bd label <id> art-direction
```

This applies to all agents (Claude Code, Codex, Copilot). Do not create a UI-facing bead without the tag.
