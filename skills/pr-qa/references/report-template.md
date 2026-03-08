# PR QA Report Template

Use this structure for the consolidated result.

Emit the fenced `json` block first, then the Markdown report.

```json
{
  "baseRef": "<base-ref>",
  "baseCommit": "<base-commit>",
  "overallVerdict": "<PASS | PASS WITH WARNINGS | FAIL>",
  "tracks": [
    {
      "reviewer": "pr-code-review",
      "verdict": "<pass|warn|fail>",
      "confidence": "<high|medium|low>",
      "summary": "<one-line summary>"
    },
    {
      "reviewer": "pr-test-analyzer",
      "verdict": "<pass|warn|fail>",
      "confidence": "<high|medium|low>",
      "summary": "<one-line summary>"
    },
    {
      "reviewer": "silent-failure-review",
      "verdict": "<pass|warn|fail>",
      "confidence": "<high|medium|low>",
      "summary": "<one-line summary>"
    }
  ],
  "findings": [
    {
      "track": "<reviewer>",
      "severity": "<HIGH|MEDIUM|LOW>",
      "path": "<path[:line]>",
      "summary": "<finding>"
    }
  ]
}
```

```markdown
PR QA complete.

**Base:** <base-ref> (<base-commit>)
**Branch:** <branch-name>
**Scope:** changed files only
**Overall verdict:** <PASS | PASS WITH WARNINGS | FAIL>

## Track Verdicts
| Track | Verdict | Confidence | Summary |
|-------|---------|------------|---------|
| General code review | <pass|warn|fail> | <high|medium|low> | <one-line summary> |
| Test quality review | <pass|warn|fail> | <high|medium|low> | <one-line summary> |
| Silent failure review | <pass|warn|fail> | <high|medium|low> | <one-line summary> |

## Findings
- [HIGH|MEDIUM|LOW] <track> — <path[:line]> — <finding>

## Next Step
- <short action based on verdict>
```

Rules:
- Omit the Findings bullets and write `- none` if no findings exist
- Deduplicate overlapping findings across tracks
- Keep summaries diff-scoped; do not drift into whole-repo commentary
- Keep the JSON summary block and Markdown report consistent
