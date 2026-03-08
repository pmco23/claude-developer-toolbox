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
Reviewer: pr-code-review
Verdict: pass|warn|fail
Confidence: high|medium|low
Findings:
- [SEVERITY] path[:line] — issue and why it matters
Notes:
- optional short notes

If there are no findings, write:
Findings: none
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
Reviewer: pr-test-analyzer
Verdict: pass|warn|fail
Confidence: high|medium|low
Findings:
- [SEVERITY] path[:line] — test gap and why it matters
Notes:
- optional short notes

If there are no findings, write:
Findings: none
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
Reviewer: silent-failure-review
Verdict: pass|warn|fail
Confidence: high|medium|low
Findings:
- [SEVERITY] path[:line] — failure mode and why it matters
Notes:
- optional short notes

If there are no findings, write:
Findings: none
```
