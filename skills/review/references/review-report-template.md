# Adversarial Review Report Template

## Cost/Benefit Classification

- HIGH impact + LOW cost → MUST FIX
- HIGH impact + HIGH cost → SHOULD FIX (flag for human judgment)
- MEDIUM impact + LOW cost → CONSIDER fixing
- LOW impact + any cost → SKIP
- MEDIUM/LOW impact + HIGH cost → SKIP

## Report Structure

```markdown
# Adversarial Review Report

**Round:** [N]
**Design:** .pipeline/design.md

## Findings Requiring Action

| ID | Source | Category | Finding | Impact | Cost | Mitigation |
|----|--------|---------|---------|--------|------|-----------|

## Findings for Human Judgment

| ID | Source | Category | Finding | Impact | Cost | Note |
|----|--------|---------|---------|--------|------|------|

## Findings Skipped (cost/benefit)

| ID | Source | Finding | Reason skipped |
|----|--------|---------|---------------|

## Loop Decision

[All required-action findings resolved / N findings remain]
```
