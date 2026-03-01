# Repomix Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Repomix MCP into the plugin pipeline — new `/pack` skill stores a codebase snapshot outputId in `.pipeline/`, which `/qa` shares across all five parallel audit agents, while `/plan` and `/brief` use pack_codebase for structured file-tree context.

**Architecture:** Pipeline-aware — `/pack` writes `.pipeline/repomix-pack.json` with an outputId; `/qa` reads it (auto-packing if stale/missing) and injects the outputId into each audit agent's prompt; audit skills use `grep_repomix_output` + `read_repomix_output` when the id is available. `/plan` and `/brief` call `pack_codebase` for one-off file-tree reads (no stored state).

**Tech Stack:** Markdown (SKILL.md), Repomix MCP tools: `mcp__repomix__pack_codebase`, `mcp__repomix__grep_repomix_output`, `mcp__repomix__read_repomix_output`

---

### Task 1: Create `/pack` skill

**Files:**
- Create: `skills/pack/SKILL.md`

**Step 1: Create the skill file**

Create `skills/pack/SKILL.md` with this exact content:

```markdown
---
name: pack
description: Pack the local codebase using Repomix MCP and store the outputId in .pipeline/repomix-pack.json for sharing across /qa audit agents. Run before /qa for maximum token efficiency. Usage: /pack [path] (defaults to cwd).
---

# PACK — Codebase Snapshot

## Role

Pack the current project into a compressed Repomix snapshot. The outputId is stored in `.pipeline/repomix-pack.json` and shared with `/qa` agents so all five audits read from one pack instead of independently discovering files (~70% token reduction via Tree-sitter compression).

## Process

### Step 1: Resolve path

If an argument is provided, use it as the target directory. Otherwise use the current working directory.

### Step 2: Pack the codebase

Call `mcp__repomix__pack_codebase` with:
- `directory`: resolved path from Step 1
- `compress`: `true`

### Step 3: Write state file

Write `.pipeline/repomix-pack.json`:

```json
{
  "outputId": "<outputId from pack response>",
  "source": "<absolute path>",
  "packedAt": "<current ISO timestamp>",
  "fileCount": "<fileCount from pack response>",
  "tokensBefore": "<tokensBefore from pack response>",
  "tokensAfter": "<tokensAfter from pack response>"
}
```

### Step 4: Report

Report to user:

```
Pack complete.
  outputId:  <id>
  Files:     <count>
  Tokens:    <before> → <after> (<N>% reduction)
  Top files: [top 5 largest from pack response]

Run /qa to use this pack across all audits.
```
```

**Step 2: Verify**

Read `skills/pack/SKILL.md` and confirm:
- Frontmatter has `name: pack`
- Four process steps are present
- `.pipeline/repomix-pack.json` schema is documented

**Step 3: Commit**

```bash
git add skills/pack/SKILL.md
git commit -m "feat: add /pack skill — Repomix codebase snapshot with pipeline state"
```

---

### Task 2: Update `/qa` — pack preamble + outputId pass-through

**Files:**
- Modify: `skills/qa/SKILL.md`

**Step 1: Add pack preamble section**

Insert the following section immediately before `## Mode Selection` (before line 8):

```markdown
## Repomix Preamble

Before dispatching any agents, acquire a Repomix outputId for the codebase:

1. Check if `.pipeline/repomix-pack.json` exists
2. If it exists, read `packedAt` — if less than 1 hour old, use the stored `outputId`
3. If missing or stale, call `mcp__repomix__pack_codebase` on the current working directory with `compress: true` and update `.pipeline/repomix-pack.json` with the new outputId and current timestamp

Store the outputId for use in agent prompts below.

```

**Step 2: Update parallel agent prompts**

The five agent prompts in `## Process → Parallel Mode` currently end without Repomix context. Append the following to each prompt string (replace the existing prompt text with the extended version):

**Agent 1 — Dead Code Removal**
```
Invoke the cleanup skill to audit this codebase for dead code. .pipeline/build.complete exists. Repomix outputId: <outputId> — use mcp__repomix__grep_repomix_output for file discovery and mcp__repomix__read_repomix_output for file contents. Report all findings.
```

**Agent 2 — Frontend Audit**
```
Invoke the frontend-audit skill to audit frontend code quality. .pipeline/build.complete exists. Repomix outputId: <outputId> — use mcp__repomix__grep_repomix_output for file discovery and mcp__repomix__read_repomix_output for file contents. Report all findings.
```

**Agent 3 — Backend Audit**
```
Invoke the backend-audit skill to audit backend code quality. .pipeline/build.complete exists. Repomix outputId: <outputId> — use mcp__repomix__grep_repomix_output for file discovery and mcp__repomix__read_repomix_output for file contents. Report all findings.
```

**Agent 4 — Documentation Freshness**
```
Invoke the doc-audit skill to check documentation freshness. .pipeline/build.complete exists. Repomix outputId: <outputId> — use mcp__repomix__grep_repomix_output for file discovery and mcp__repomix__read_repomix_output for file contents. Report all findings.
```

**Agent 5 — Security Review**
```
Invoke the security-review skill to scan for OWASP Top 10 vulnerabilities. .pipeline/build.complete exists. Repomix outputId: <outputId> — use mcp__repomix__grep_repomix_output for file discovery and mcp__repomix__read_repomix_output for file contents. Report all findings.
```

**Step 3: Verify**

Read `skills/qa/SKILL.md` and confirm:
- `## Repomix Preamble` section appears before `## Mode Selection`
- All 5 agent prompts include `Repomix outputId: <outputId>`

**Step 4: Commit**

```bash
git add skills/qa/SKILL.md
git commit -m "feat: add Repomix preamble to /qa — one pack shared across all 5 audit agents"
```

---

### Task 3: Update 5 audit skills — add Repomix context section

**Files:**
- Modify: `skills/frontend-audit/SKILL.md`
- Modify: `skills/backend-audit/SKILL.md`
- Modify: `skills/security-review/SKILL.md`
- Modify: `skills/doc-audit/SKILL.md`
- Modify: `skills/cleanup/SKILL.md`

**Step 1: Add Repomix section to each skill**

In each of the five files, insert the following section between `## Role` and `## Process`:

```markdown
## Repomix Context

If a Repomix outputId is provided in the context (injected by `/qa`), use Repomix tools for file discovery instead of native Glob/Read/Grep:

- `mcp__repomix__grep_repomix_output(outputId, pattern)` — search for patterns across the packed codebase
- `mcp__repomix__read_repomix_output(outputId, startLine, endLine)` — read specific sections by line range

Fall back to native Glob/Read/Grep only if no outputId is available.

```

Apply this to all five files:
1. `skills/frontend-audit/SKILL.md` — insert after line 12 (`You are Sonnet acting as a frontend...`)
2. `skills/backend-audit/SKILL.md` — insert after the `## Role` paragraph
3. `skills/security-review/SKILL.md` — insert after the `## Role` paragraph
4. `skills/doc-audit/SKILL.md` — insert after the `## Role` paragraph
5. `skills/cleanup/SKILL.md` — insert after the `## Role` paragraph

**Step 2: Verify**

Read each file and confirm `## Repomix Context` section is present between `## Role` and `## Process`.

**Step 3: Commit**

```bash
git add skills/frontend-audit/SKILL.md skills/backend-audit/SKILL.md skills/security-review/SKILL.md skills/doc-audit/SKILL.md skills/cleanup/SKILL.md
git commit -m "feat: add Repomix context section to all 5 audit skills"
```

---

### Task 4: Update `/plan` Step 2 — use pack_codebase for file-tree grounding

**Files:**
- Modify: `skills/plan/SKILL.md`

**Step 1: Replace Step 2 content**

The current Step 2 in `skills/plan/SKILL.md` is:

```markdown
### Step 2: Ground file paths in the actual project structure

Before writing any task group, scan the real project layout so the plan's file paths match reality.

1. List the root directory contents (one level)
2. List source directories one level deep — look for common roots: `src/`, `app/`, `lib/`, `pkg/`, `cmd/`, `internal/`, `frontend/`, `backend/`
3. If not already read in Step 1, read the primary language config file (`package.json`, `go.mod`, `requirements.txt`, `*.csproj`) to confirm module name and structure
4. Note actual directory names and naming conventions (kebab-case vs snake_case, flat vs nested)

Use this scan to:
- Correct any file paths in the design that don't match the real layout
- Ensure new files are placed in existing directories where possible
- Flag in the task group if a new directory needs to be created first
```

Replace it with:

```markdown
### Step 2: Ground file paths in the actual project structure

Before writing any task group, scan the real project layout using Repomix so the plan's file paths match reality.

Call `mcp__repomix__pack_codebase` with:
- `directory`: current working directory
- `compress`: `false`
- `topFilesLength`: 20

Use the returned file tree and top-files list to:
- Confirm actual directory names and naming conventions (kebab-case vs snake_case, flat vs nested)
- Correct any file paths in the design that don't match the real layout
- Ensure new files are placed in existing directories where possible
- Flag in the task group if a new directory needs to be created first

> The outputId from this pack is not stored — this is a one-off read for planning context only.
```

**Step 2: Verify**

Read `skills/plan/SKILL.md` Step 2 and confirm:
- References `mcp__repomix__pack_codebase` with `compress: false, topFilesLength: 20`
- Includes the "outputId not stored" note
- Step numbering (Steps 1-6) is intact

**Step 3: Commit**

```bash
git add skills/plan/SKILL.md
git commit -m "feat: use pack_codebase in /plan Step 2 for structured file-tree grounding"
```

---

### Task 5: Update `/brief` Step 1 — add pack for existing-codebase overview

**Files:**
- Modify: `skills/brief/SKILL.md`

**Step 1: Extend Step 1**

The current Step 1 in `skills/brief/SKILL.md` ends with the `Record:` block (line 28). After the `Record:` block (after `- **Existing patterns**: note dominant architectural patterns visible in the codebase`), insert:

```markdown

If the project already contains code (non-empty source directories detected above), call `mcp__repomix__pack_codebase` on the current working directory to get a structured file tree and top-files overview. Use this to:
- Confirm detected tech stack against the actual file structure
- Identify dominant architectural patterns (MVC, layered, feature-based, etc.)
- Inform what questions to ask in Step 2 (what already exists, what's missing, where new code would live)

> The outputId is not stored — this is a one-off read for brief context only.
```

**Step 2: Verify**

Read `skills/brief/SKILL.md` and confirm:
- The pack_codebase call appears inside Step 1, after the `Record:` block
- The "outputId not stored" note is present
- Step 2 (`## Step 2: Extract signal through Q&A`) is still intact

**Step 3: Commit**

```bash
git add skills/brief/SKILL.md
git commit -m "feat: use pack_codebase in /brief Step 1 for existing-codebase overview"
```
