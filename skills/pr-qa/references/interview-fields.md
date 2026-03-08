# PR QA Interview Fields

Use this file with `../../docs/guides/interview-system.md`.

This is a compact preflight interview. Most of the context should come from the
bundled diff collector, not from repeated questions.

## Field Types

- **Base ref** — mutually exclusive → single-select with free-form custom ref
- **Diff scope** — fixed to changed files only; no question unless the collector blocks
- **Stop state** — `ok`, `empty`, `docsOnly`, or `error`; record it in the handoff

## Defaults

- Prefer the collector's auto-detected base before asking.
- Only ask when the collector returns `base_ref_required`.

## Prompt Rules

- Offer likely refs first (`origin/main`, `main`, `origin/master`) and a free-form option last.
- Do not use `all of the above`.
- Do not ask for information the collector already returned.

## Handoff

Emit `[Requirements]` immediately after diff collection resolves, even when the
result is `empty`, `docsOnly`, or `error`.

Include:
- base ref
- base commit if known
- diff scope
- current stop state
- assumptions used to continue
