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

## Traceability rule

For every substantial finding:
- map it to an existing Bead, or
- create a new Bead

Do not let retrospectives end as pure prose.

## Agent-specific use

### Codex
- Use the `ki-retro` skill when the user explicitly asks for lessons learned, workflow insights, or sustainable improvements.

### Claude Code
- Use this workflow doc directly.
- Mirror the same output structure and evidence standard.

### Copilot
- Use this workflow doc directly.
- Keep the result concise and action-oriented.
- Prefer proposing instruction updates, tests, and Bead changes over vague advice.
