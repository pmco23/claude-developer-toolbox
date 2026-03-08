# Design Interview Field Bank

Use this file with `../../docs/guides/interview-system.md`.

Focus on the design blockers that still matter after reading `.pipeline/brief.md`,
grounding the codebase, and checking live docs.

## Field Types

- **Architecture direction** — mutually exclusive → single-select
- **Compatibility commitments** — additive → `multiSelect: true`
- **Library or pattern blockers** — mutually exclusive unless the user truly wants a hybrid approach
- **Operational constraints** — additive → `multiSelect: true`
- **Rollout boundaries / non-goals** — additive → `multiSelect: true`
- **Alignment verdict** — adaptive branch → single-select with a free-form escape hatch

## Prioritization

Ask only the highest-impact unresolved blocker:

1. A compatibility requirement that can invalidate the approach
2. A library or architecture choice that depends on user intent
3. An operational constraint not settled by the brief or codebase
4. A rollout boundary the user cares about but the brief left soft

## Prompt Rules

- For additive fields, use `multiSelect: true` when structured prompts are available.
- Always include a free-form option on full-interview and adaptive-branch prompts.
- Do not use `all of the above`.
- If the user says the current direction is only partially right, ask for the
  single highest-impact adjustment, not a broad rewrite request.

## Handoff

Before writing `.pipeline/design.md`, emit `[Requirements]` covering:

- goal from the brief
- compatibility commitments and operational constraints
- chosen architecture direction
- assumptions that remain acceptable
- any deferred questions that `/review` should challenge explicitly
