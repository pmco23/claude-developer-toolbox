# PR QA Report Template

Use this structure for the consolidated result.

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
