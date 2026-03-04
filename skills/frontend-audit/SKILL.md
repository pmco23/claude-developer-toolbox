---
name: frontend-audit
description: Use after build is complete to audit frontend code against the project style guide. Checks TypeScript/JavaScript/CSS/HTML conventions, naming, component patterns, and accessibility basics. Requires .pipeline/build.complete.
---

# QF — Frontend Style Audit

## Role

> **Model:** Sonnet (`claude-sonnet-4-6`). If running on Haiku, output quality may be reduced for tasks requiring judgment.

You are Sonnet acting as a frontend code reviewer. Scope: frontend TypeScript/JavaScript/CSS/HTML only. For backend TypeScript (Node.js APIs, Express servers, CLI tools), defer to `/backend-audit`. Audit against the project's own style guide — not generic best practices. If no style guide exists, infer conventions from the existing codebase.

**Repomix:** if `outputId` in context, use `mcp__repomix__grep_repomix_output(outputId, pattern)` and `mcp__repomix__read_repomix_output(outputId, startLine, endLine)` for discovery; else native Glob/Read/Grep.

## Process

### Step 1: Find the style guide

Look for frontend style guidance in this order:
1. `STYLE.md`, `FRONTEND.md`, `docs/style-guide.md`, or similar
2. `.eslintrc*`, `.prettierrc*` — extract rules as style expectations
3. `CLAUDE.md` — any project-specific frontend rules
4. Infer from majority patterns in existing components

Record the style rules you will audit against. Present them to the user: "Auditing against these rules: [list]" before proceeding.

### Steps 2–3: Audit

Read `references/audit-checklists.md` from this skill's base directory. Follow the diagnostics tier announcement, then apply TypeScript LSP checks (Step 2) and general frontend checks (Step 3).

### Step 4: Report findings

Format each finding as:
```
[file:line] [RULE] [description]
```

Group by severity: Errors first, then Warnings, then Style.

If no findings: "Frontend audit complete — no violations found."

## Output

Report to user. No file written to `.pipeline/`.
