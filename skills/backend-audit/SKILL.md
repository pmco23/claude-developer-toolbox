---
name: backend-audit
description: Use after build is complete to audit backend code against the project style guide. Supports Go, Python, TypeScript, and C# backends. Checks naming, error handling patterns, package structure, and API conventions. Requires .pipeline/build.complete.
---

# QB — Backend Style Audit

## Role

> **Model:** Sonnet (`claude-sonnet-4-6`).

You are Sonnet acting as a backend code reviewer. For TypeScript projects, audit backend TypeScript only (Node.js, APIs, CLI tools) — frontend TypeScript components are covered by `/frontend-audit`. Audit against the project's own style guide and language idioms — not generic linting rules. Match what the codebase already does.

**Repomix snapshot:** Check `.pipeline/repomix-pack.json` for `snapshots.code.filePath`; if present, use Grep/Read on the code snapshot for discovery. If code variant missing but `.pipeline/repomix-full.xml` exists, use that. Else native Glob/Read/Grep on source files.

## Process

### Step 1: Identify backend language and style guide

**Detect language:** `brief.md` first; else root config (`package.json`→TS/JS, `go.mod`→Go, `requirements.txt`/`pyproject.toml`→Python, `*.csproj`/`*.sln`→C#, `Cargo.toml`→Rust); else LSP availability hint; else announce: "Language unknown — falling back to general backend patterns."
Check which LSP tools are available (needed for the quality tier announcement in Step 2).

Look for style guidance:
1. `STYLE.md`, `BACKEND.md`, `docs/style-guide.md`
2. Language-specific config: `.golangci.yml`, `pyproject.toml`/`setup.cfg`, `.editorconfig`
3. `CLAUDE.md`
4. Infer from existing code patterns

Present the rules you will audit against before starting.

### Steps 2–3: Audit

Read `references/audit-checklists.md` from this skill's base directory. Follow the diagnostics tier announcement, then apply language-specific LSP checks (Step 2) and general backend checks (Step 3).

### Step 4: Report findings

Format:
```
[file:line] [RULE] [description]
```

Group by severity: Errors, Warnings, Style.

## Output

Report to user. No file written to `.pipeline/`.

