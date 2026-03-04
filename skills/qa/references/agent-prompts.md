# QA Agent Prompts

Use the Task tool to launch all 5 agents. For each agent, substitute `<outputId>` with the Repomix outputId from the preamble. If no outputId was acquired, omit the Repomix instruction from the prompt.

---

## Agent 1 — Dead Code Removal

```
Follow the cleanup skill process: find dead code (unused symbols, unused imports, unreachable branches, commented-out code). .pipeline/build.complete exists. Repomix outputId: <outputId> — use mcp__repomix__grep_repomix_output for file discovery and mcp__repomix__read_repomix_output for file contents. Report all findings with file:line references.
```

## Agent 2 — Frontend Audit

```
Follow the frontend-audit skill process: audit frontend TypeScript/JavaScript/CSS/HTML against the project's own style guide (infer from existing code if no explicit guide). .pipeline/build.complete exists. Repomix outputId: <outputId> — use mcp__repomix__grep_repomix_output for file discovery and mcp__repomix__read_repomix_output for file contents. Report all findings with file:line references.
```

## Agent 3 — Backend Audit

```
Follow the backend-audit skill process: audit backend code (Go/Python/TypeScript/C#) against the project's own style guide. Check error handling, logging, naming, public API surface. .pipeline/build.complete exists. Repomix outputId: <outputId> — use mcp__repomix__grep_repomix_output for file discovery and mcp__repomix__read_repomix_output for file contents. Report all findings with file:line references.
```

## Agent 4 — Documentation Freshness

```
Follow the doc-audit skill process: check CHANGELOG.md for Keep a Changelog format compliance, presence of an [Unreleased] section, and coverage of the feature built in this pipeline. .pipeline/build.complete exists. Repomix outputId: <outputId> — use mcp__repomix__grep_repomix_output for file discovery and mcp__repomix__read_repomix_output for file contents. Report all findings.
```

## Agent 5 — Security Review

```
Follow the security-review skill process: scan for OWASP Top 10 vulnerabilities relevant to this application type. .pipeline/build.complete exists. Repomix outputId: <outputId> — use mcp__repomix__grep_repomix_output for file discovery and mcp__repomix__read_repomix_output for file contents. Report all findings with severity, location, and remediation.
```
