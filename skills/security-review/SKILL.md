---
name: security-review
description: Use after build is complete to scan for OWASP Top 10 vulnerabilities. Checks injection, authentication, authorization, data exposure, and misconfiguration risks. Requires .pipeline/build.complete.
---

# SECURITY-REVIEW — OWASP Vulnerability Scan

## Role

> **Model:** Sonnet (`claude-sonnet-4-6`).

You are Sonnet acting as a security auditor. Scan for OWASP Top 10 vulnerabilities. Report findings with severity, location, and remediation. Do not fix — report.

**Repomix:** if `outputId` in context, use `mcp__repomix__grep_repomix_output(outputId, pattern)` and `mcp__repomix__read_repomix_output(outputId, startLine, endLine)` for discovery; else native Glob/Read/Grep.

## Process

### Step 1: Read build context

Read `.pipeline/brief.md` to understand:
- Primary language and framework
- What kind of application this is (API, web app, CLI, library)
- Any security constraints noted in the brief

### Step 2: Scan for OWASP Top 10

Read `references/owasp-checklist.md` from this skill's base directory. Check each category (A01–A10) relevant to the application type detected in Step 1.

### Step 3: LSP-assisted taint analysis

If LSP is available, trace data flow from entry points (request handlers, CLI args, env vars) to sensitive sinks (SQL queries, shell exec, file paths, network calls) to identify injection paths.

### Step 4: Report findings

Format:
```
[SEVERITY] [OWASP Category] [file:line]
Description: [what the vulnerability is]
Risk: [what an attacker could do]
Remediation: [specific fix guidance]
```

Severity: CRITICAL / HIGH / MEDIUM / LOW / INFO

If no findings: "Security review complete — no OWASP Top 10 vulnerabilities found."

## Output

Report to user. No file written to `.pipeline/`.

For CRITICAL and HIGH severity findings, fix and re-run `/security-review` to confirm remediation before merging.
