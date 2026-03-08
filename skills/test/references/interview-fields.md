# Test Interview Fields

Use this file with `../../docs/guides/interview-system.md`.

The test skill should ask only when runner detection or scope selection is still
ambiguous after scanning the repo.

## Field Types

- **Runner choice** — mutually exclusive → single-select
- **Scope** — mutually exclusive unless the runtime supports a list of files/patterns that are intentionally combined
- **Failure follow-up** — micro-prompt, not part of the pre-run interview

## Defaults

- If a runner can be detected confidently, do not ask.
- If a scope was passed in the invocation args, do not ask about scope again.
- If both runner and scope are still ambiguous, ask the runner question first.

## Prompt Rules

- Use a free-form option for a custom command.
- Do not use `multiSelect: true` for runner selection.
- Do not use `all of the above`.

## Handoff

Emit `[Requirements]` before execution. Include:
- chosen runner
- scope filter
- assumptions or defaults used
