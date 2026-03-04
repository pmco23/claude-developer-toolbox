# QA Report Template

Use this format for both parallel and sequential modes.

---

## Consolidated Report

```markdown
# QA Report

## /cleanup
[findings or "clean — no dead code found"]

## /frontend-audit — Frontend
[findings or "no violations found"]

## /backend-audit — Backend
[findings or "no violations found"]

## /doc-audit — Documentation
[findings or "all docs reflect current implementation"]

## /security-review
[findings or "no OWASP Top 10 vulnerabilities found"]
```

## Overall QA Verdict

Append after the consolidated report:

```markdown
## Overall QA Verdict

| Audit | Result |
|-------|--------|
| /cleanup | [PASS — no dead code found / FAIL — N items found] |
| /frontend-audit | [PASS / FAIL — N violations] |
| /backend-audit | [PASS / FAIL — N violations] |
| /doc-audit | [PASS / FAIL — N stale or missing entries] |
| /security-review | [PASS / FAIL — N findings (X CRITICAL, Y HIGH)] |

**Overall: PASS** *(all audits clean)*
— or —
**Overall: FAIL** *([N] audits have findings requiring action)*
```

Apply PASS Criteria from the main skill.
