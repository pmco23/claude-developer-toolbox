# Drift Check Interview Fields

Use this file with `../../docs/guides/interview-system.md`.

Only ask about inputs that are still missing after checking:
- build context
- `.pipeline/plan.md`
- current working directory
- invocation arguments or explicit user context

## Field Types

- **Source document** — mutually exclusive → single-select
- **Target scope** — mutually exclusive → single-select
- **Verification focus** — additive if the user wants a narrower subset → `multiSelect: true`

## Defaults

- Default source: `.pipeline/plan.md`
- Default target: current working directory
- Default focus: full drift verification

## Prompt Rules

- Ask only for the missing half of the input pair. If source is known, ask for target only. If target is known, ask for source only.
- Include a free-form option for custom paths.
- Do not use `all of the above`.

## Handoff

Emit `[Requirements]` before dispatching the verifiers. The block should include:
- source document
- target scope
- verification focus
- assumptions if defaults were accepted
