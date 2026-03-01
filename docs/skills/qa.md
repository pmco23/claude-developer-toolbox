# /qa — Post-Build QA Pipeline

**Gate:** `.pipeline/build.complete` must exist
**Flags:** `--parallel` | `--sequential`

## Usage

```
/qa --parallel    # All QA skills dispatched simultaneously
/qa --sequential  # cleanup → frontend-audit → backend-audit → doc-audit → security-review in order
/qa               # Prompts you to choose
```

Individual skills are also available standalone (each requires `build.complete`):

| Skill | What it does |
|-------|-------------|
| `/cleanup` | Strips dead code, unused imports, unreachable branches |
| `/frontend-audit` | Frontend style audit (TypeScript/JS/CSS) |
| `/backend-audit` | Backend style audit (Go/Python/C#/TS) |
| `/doc-audit` | Documentation freshness — docs vs. implementation drift |
| `/security-review` | OWASP Top 10 vulnerability scan |
