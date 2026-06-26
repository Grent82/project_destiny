# KI Retro

Use this workflow after:
- a session with regressions or user-reported surprises
- a broken implementation that passed the wrong checks
- collaboration friction between agents, roles, or prompts
- an interrupted session that needs process lessons, not only code continuation

Core prompt:

```text
Was sind deine Erkenntnisse dieser Session bzgl. Workflow Zusammenarbeit und Fehlern? Wie können wir dies nachhaltig einbringen?
```

## Purpose

`KI Retro` is the project method for turning session mistakes into durable improvements for:
- Codex
- Claude Code
- Copilot
- role prompts
- Bead quality
- tests and validation gates
- design and product review workflow

It is not a blame exercise. It is a conversion step:
- from mistakes
- to process
- to durable artifacts

## Required inputs

Base the retro on evidence, not vibes:
- conversation history
- current git diff and recent commits
- failing or missing tests
- relevant Beads
- affected workflow docs or agent instructions

## Output structure

Every `KI Retro` should produce:

1. `Observed`
   Concrete findings from the session.
2. `Why it slipped`
   The missing workflow, prompt, acceptance, or validation condition.
3. `Sustainable fix`
   The change that should live in docs, prompts, tests, Beads, or gates.
4. `Priority`
   `now`, `next`, or `later`.

## Verification failures to examine

When running a retro, explicitly check for these verification failure patterns:

### Assumption vs. Verification
- Did any "assumption vs. verification" errors occur?
- Were any files written without reading them first?
- Were any symbols (functions, schemas, fields) used without grepping their existence?

### Schema Change Hygiene
- Were any schemas changed without full consumer analysis (`grep -r` before writing)?
- Were test fixtures updated in one batch or incrementally patched?
- Was `pnpm typecheck` run immediately after schema changes?

### Pipeline Validation
- Were any pipeline outputs used without validation (destructive `bd update`, file writes)?
- Was the variable content verified before writing (echo, length check, single-item test)?

### Post-Compaction Facts
- Were any compaction-summary facts used without re-verification?
- Were version numbers, symbol names, or paths re-grepped after compaction?

### Entry Point Completeness
- Were all entry points for a constraint identified and tested?
- Or was only one path fixed while others remained unguarded?

If any of these patterns appear, the sustainable fix should prefer:
1. Adding the verification step to `agent-operating-model.md` Task Verification Protocol
2. Creating a focused memory file with the specific checklist (e.g., `schema_change_hygiene.md`)
3. Updating the Bead acceptance criteria to require evidence of verification

## Buckets

Classify findings into these buckets:

### 1. Workflow and collaboration
- wrong task slicing
- implementation before claim/clarity
- agent overlap
- missing handoff data

### 2. Prompting and roles
- prompts too vague
- roles not explicit enough
- no adversarial review pass
- no product/design role engaged when needed

### 3. Validation and quality gates
- only state correctness checked
- missing route-truth, day-1-truth, aftermath, or pacing tests
- wrong test level
- no player-comprehension verification
- no per-outcome verification for `success`, `partial`, and `failure`

### 4. Product and design comprehension
- wrong information hierarchy
- wrong abstraction level
- too much meta-navigation
- systems correct but player meaning unclear

## Sustainable integration ladder

Prefer durable fixes in this order:

1. Tighten Bead acceptance or split the Bead better.
2. Update a workflow doc.
3. Add or tighten a verifier/test/gate.
4. Update agent instructions.
5. Only then rely on future memory or reminders in chat.

## Session pattern to watch for

If a session starts from a finding labeled `runtime too shallow`, explicitly check whether the work is drifting into:

- copy polish before state-model clarification
- clue flavor before outcome semantics
- UI before settle / setback / branch rules are decided

When that drift appears, the sustainable fix is usually:

1. tighten the Bead acceptance with an outcome matrix
2. add outcome-specific tests
3. only then continue content or UI polish

## Traceability rule

For every substantial finding:
- map it to an existing Bead, or
- create a new Bead

Do not let retrospectives end as pure prose.

## Agent-specific use

### Codex
- Use the `ki-retro` skill when the user explicitly asks for lessons learned, workflow insights, or sustainable improvements.
- When the session exposed a quest/runtime contract gap, prefer updating `docs/task-contract.md`, `docs/workflows/bead-creation.md`, or the active Bead acceptance over leaving the lesson in chat only.

### Claude Code
- Use this workflow doc directly.
- Mirror the same output structure and evidence standard.

### Copilot
- Use this workflow doc directly.
- Keep the result concise and action-oriented.
- Prefer proposing instruction updates, tests, and Bead changes over vague advice.
