# Workflow: Specialist Panel Review

Use this workflow when you need **multiple expert perspectives on a topic** — especially before creating beads, making architectural decisions, or evaluating a cluster of findings where different disciplines will have conflicting opinions.

The point is not consensus. It is **productive disagreement**. Each specialist sees different risks. Beads become richer when they carry the tension between design intent, UX clarity, narrative coherence, and technical feasibility.

## Related workflows

Before running a specialist panel, complete the [Session-Start RPG Audit](session-rpg-audit.md). The audit ensures the findings you bring into a panel are already filtered through the RPG north star. This avoids spending panel time on work that fails the four core audit questions.

## When to use

- Audit findings have been collected and need to be prioritized or enriched
- A significant new feature affects multiple disciplines (game design + UI + narrative + art)
- A design decision has no obvious right answer
- A bead is being debated between disciplines
- After a playtest session where issues cross-cut multiple concerns

## Inputs

- A list of findings, beads, or open questions
- Relevant file paths or system descriptions per cluster
- The GDD section covering the topic
- Any screenshots, reference material, or prior session context

## Process

### 1. Identify the specialists needed

Choose from the project's defined roles. Typical panels:

| Specialist | Perspective |
|---|---|
| Game Designer | Fun, feedback loops, progression, player agency, core fantasy |
| UI/UX Specialist | Navigation, cognitive load, information hierarchy, flows, onboarding |
| Art Director | Visual identity, atmosphere, typography, portraits, dark fantasy aesthetic |
| Narrative Designer | Story coherence, authored events, faction voice, lore integrity |
| Systems Architect | Data model, technical debt, clean architecture, testability |
| Verifier | Edge cases, bugs, regression risk, acceptance criteria |

You do not need all six. Use the ones whose expertise is relevant to the findings at hand.

### 2. Launch parallel agents

Give each specialist:
- The full audit findings list
- Specific files to read (their domain)
- Their role framing ("You are a Senior Game Designer with…")
- An explicit instruction to **disagree** where their expertise says something is wrong
- Questions specific to their domain

**Always run specialist agents in parallel** — they are independent thinkers, not sequential reviewers.

### 3. Collect and compare

Read each agent output. Look for:
- Where specialists agree → high-confidence finding, raise priority
- Where specialists disagree → note the tension in the bead description
- What one specialist caught that others missed → potential new bead
- Where a finding is reframed completely by one specialist → update finding

### 4. Synthesize into beads

For each finding that survives review:
- Title: concise, actionable
- Description: include the specialist context (e.g. "Game Designer rates P0. Art Director rates P2. Disagreement: GD argues this blocks the core fantasy; AD argues visual atmosphere is more urgent.")
- Acceptance criteria: written from the perspective of the specialist who owns it
- Tags: which role owns delivery

### 5. Surface new beads

Specialists will identify issues the audit missed. Capture these immediately.

## Required Expert Output Format

Each specialist agent **must** structure their output using this exact format so findings can be collected programmatically into the SQL `expert_findings` table:

```
## Findings

| severity | area | finding | recommendation |
|----------|------|---------|----------------|
| critical | combat/balance | Guard spam provides 55% free damage reduction | Add action cost; limit guards per round |
| major | ui/tooltips | No tooltips on stat bars | Add title attributes to all stat elements |
```

Severity values: `critical` / `high` / `major` / `medium` / `minor`

This format is **mandatory** when the panel output will feed a synthesis round. Without it, findings must be manually extracted and risk being lost.

## Synthesis Round: Bead Traceability

After collecting all specialist outputs into the SQL table, the synthesis agent **must**:

1. Number every finding in the table (1 to N)
2. Produce an explicit mapping: `finding # → bead ID` (or `grouped into bead X`)
3. Verify completeness: every finding has a bead or a named group
4. Any finding not in the mapping is a gap — create the bead before closing

**Grouping is allowed. Silent dropping is not.**

See `bd memories audit-traceability` for the persistent rule.

## Output Standard

- Every surviving finding has a bead with specialist-enriched description
- Disagreements are recorded in the bead, not discarded
- New beads from specialist review are filed before implementation begins
- `bd remember` is updated with any reusable patterns discovered during the panel

## Example prompt pattern for each specialist

```
You are a [Role] with [N] years experience in [domain].
You are reviewing audit findings for Project Destiny — [one-line game description].

[Full findings list]

Your tasks:
1. Review each finding from your perspective. Agree, disagree, or reframe. Be specific.
2. Add new findings the other analysts missed.
3. Prioritize differently if your expertise says the current priority is wrong.
4. Comment specifically on [domain-specific questions].

Be opinionated. Disagree where your expertise says something is wrong.
```

## Storing reusable patterns

After each panel, run:
```bash
bd remember "specialist-panel: [topic] — [key insight that should survive sessions]"
```

Workflow files in `docs/workflows/` are for **process patterns**.  
`bd remember` is for **project-specific decisions and reusable knowledge**.  
Beads are for **actionable work**.

These three together are the memory of the project.
