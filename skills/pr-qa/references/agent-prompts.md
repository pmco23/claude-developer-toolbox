# PR QA Task Prompts

Dispatch these three review tracks against the current branch diff. Substitute the placeholders before launching each task.

Shared scope:
- Base ref: `<base-ref>`
- Base commit: `<base-commit>`
- Branch: `<branch-name>`
- Changed files:

```
<changed-files>
```

- Diff summary JSON:

```json
<diff-summary-json>
```

All tracks must review only the changed files plus the minimum surrounding code needed for context. Do not broaden into a full repo audit.

---

## Track 1 — General Code Review

```
PR QA track: general code review.

Review only the changed files relative to <base-ref> (<base-commit>) on branch <branch-name>.
Focus on correctness, API misuse, broken assumptions, maintainability regressions, and mismatches with surrounding code patterns.

Changed files:
<changed-files>

Diff summary:
<diff-summary-json>

Return exactly:
```json
{
  "reviewer": "pr-code-review",
  "verdict": "pass | warn | fail",
  "confidence": "high | medium | low",
  "summary": "One short sentence.",
  "findings": [
    {
      "severity": "HIGH | MEDIUM | LOW",
      "path": "path[:line]",
      "summary": "Issue and why it matters."
    }
  ]
}
```

Rules:
- Wrap the JSON in a fenced code block with info string `json`
- Use `[]` when there are no findings
- Keep findings scoped to changed files only
```

## Track 2 — Test Quality Review

```
PR QA track: test quality review.

Review only the changed files relative to <base-ref> (<base-commit>) on branch <branch-name>.
Focus on whether the changed code has adequate tests, edge-case coverage, regression protection, and realistic assertions. If production code changed without meaningful tests nearby, call that out.

Changed files:
<changed-files>

Diff summary:
<diff-summary-json>

Return exactly:
```json
{
  "reviewer": "pr-test-analyzer",
  "verdict": "pass | warn | fail",
  "confidence": "high | medium | low",
  "summary": "One short sentence.",
  "findings": [
    {
      "severity": "HIGH | MEDIUM | LOW",
      "path": "path[:line]",
      "summary": "Test gap and why it matters."
    }
  ]
}
```

Rules:
- Wrap the JSON in a fenced code block with info string `json`
- Use `[]` when there are no findings
- Keep findings scoped to changed files only
```

## Track 3 — Silent Failure Review

```
PR QA track: silent failure review.

Review only the changed files relative to <base-ref> (<base-commit>) on branch <branch-name>.
Focus on swallowed exceptions, ignored return values, weak fallback paths, missing error propagation, missing logging for failure paths, and success responses on partial failure.

Changed files:
<changed-files>

Diff summary:
<diff-summary-json>

Return exactly:
```json
{
  "reviewer": "silent-failure-review",
  "verdict": "pass | warn | fail",
  "confidence": "high | medium | low",
  "summary": "One short sentence.",
  "findings": [
    {
      "severity": "HIGH | MEDIUM | LOW",
      "path": "path[:line]",
      "summary": "Failure mode and why it matters."
    }
  ]
}
```

Rules:
- Wrap the JSON in a fenced code block with info string `json`
- Use `[]` when there are no findings
- Keep findings scoped to changed files only
```
