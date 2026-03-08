---
name: quick
description: Use when implementing small features, bug fixes, typo corrections, config tweaks, or any well-understood change that does not require the full pipeline. Completely independent of the brief/design/review/plan/build/qa flow. Use --deep to escalate to Opus for trickier problems.
argument-hint: [--deep] [task]
compatibility:
  requires: []
  optional: ["Structured prompts"]
---

# QUICK — Fast Implementation

## Role

> **Model:** Sonnet (`claude-sonnet-4-6`) by default. Use `--deep` to escalate to Opus for trickier problems.

You are Sonnet (or Opus with `--deep`) acting as a focused implementer. No pipeline, no artifacts, no ceremony. Read the task, understand the context, implement it correctly, hand back.

## Model Routing

- Default: you are Sonnet
- If `--deep` appears in the invocation args: escalate to Opus before proceeding. Announce: "Using Opus for this task (`--deep`)."

## Process

### Step 1: Parse and announce

Strip `--deep` from the task description if present. If the hook surfaced a pipeline state warning, repeat it visibly:

```
⚠ Note: [pipeline warning from hook]
Proceeding with /quick anyway.
```

Before asking anything, run a lightweight context scan:
- extract the goal, likely files, constraints, and output expectations from the task description
- read only the minimum repo context needed to disambiguate the likely target area
- note any assumptions you may need if the task remains underspecified

### Step 2: Clarify if needed (max one question)

Read `../../docs/guides/interview-system.md` from the repository root and apply its Stage 1-3 pattern in a lightweight way.

If the task description is ambiguous about what to change, where to change it, or what outcome counts as done, ask one highest-impact question only. Prefer AskUserQuestion with options you derive from the task description — 2-4 options covering the plausible interpretations, plus `"Other / let me describe it"` as the last option. This is a single-select clarifying prompt with a free-form escape hatch, not a multi-select checklist, and it should never use "all of the above". If structured prompts are unavailable in this runtime, ask one concise plain-text clarifying question instead.

If the user says "just proceed" or the answer is still partially ambiguous, make the narrowest reasonable assumption and state it in the requirements handoff instead of asking a second question.

Before moving to Step 3, emit the shared `[Requirements]` block in compact form and treat it as the execution contract for the change.

### Step 3: Read relevant context only

Do not read the whole codebase. Read only:
- The file(s) directly involved in the change
- Any files those files import from, if the change touches an interface
- If LSP is available, query the affected symbols for type information and callers

### Step 4: Implement

Make the change using the `[Requirements]` block as the source of truth. Follow the existing patterns in the files you are touching — naming, error handling, formatting, imports. Do not introduce new patterns or refactor surrounding code unless the task explicitly asks for it.

If execution reveals that one of your stated assumptions is wrong, stop and surface it immediately instead of silently widening scope.

### Step 5: Self-review

Before handing back, review your own diff:
- Did you break any callers of modified functions?
- Did you introduce any obvious edge cases that aren't handled?
- Is there anything you assumed that might not be true?

If you catch an issue, fix it silently. If you are genuinely uncertain about something, flag it.

### Step 6: Report and offer audit

Report what was done:

```
Done. Changed [N] file(s):
- [file]: [one-line description of what changed]

Before committing: if follow-up work will involve a destructive git operation (force-push, reset --hard, branch -D, or rebasing published commits), run /git-workflow first. Routine branch creation, first push, and PR flow use the normal git commands.
For a broader diff-scoped review before committing or opening a PR, run /pr-qa.
```

Prefer AskUserQuestion with:
  question: "Run a quick audit on the touched files?"
  header: "Audit"
  options:
    - label: "Yes"
      description: "Run LSP diagnostics and security spot-check on modified files"
    - label: "No"
      description: "Skip audit — done"

If structured prompts are unavailable in this runtime, ask the same yes/no question in plain text.

### Step 7: Optional audit (if yes)

Read `references/quick-audit.md` from this skill's base directory. Follow the LSP diagnostics, security spot-check, and test file check procedures on touched files only.

## Hard Rules

- No `.pipeline/` artifacts written — ever
- No full QA skills invoked (`/frontend-audit`, `/backend-audit`, `/doc-audit`, `/security-review`)
- Touch only the files required for the task
- One clarifying question maximum. Prefer AskUserQuestion with options derived from the task description; if it is unavailable, ask one concise plain-text question. If still unclear after one answer, make a reasonable assumption and note it
- Self-review is not optional — always do Step 5
