# Repomix Integration Design

**Date:** 2026-03-01
**Status:** Approved
**Scope:** Local codebase only (no remote repo support)

## Goal

Integrate the Repomix MCP plugin into the plugin pipeline to reduce redundant file reads, share a single codebase pack across parallel audit agents, and ground `/plan` and `/brief` in a structured file-tree overview.

## Approach: Pipeline-aware integration (Option A)

A new `/pack` skill stores a Repomix `outputId` in `.pipeline/repomix-pack.json`. Downstream skills read the stored outputId and use `grep_repomix_output` / `read_repomix_output` instead of native Glob/Read/Grep for file discovery.

## Section 1: New `/pack` skill

**File:** `skills/pack/SKILL.md`
**Invocation:** `/pack [path]` — defaults to cwd

### Steps
1. Call `mcp__repomix__pack_codebase` on the given path with `compress: true`
2. Write `.pipeline/repomix-pack.json`:
   ```json
   {
     "outputId": "...",
     "source": "/abs/path",
     "packedAt": "<ISO timestamp>",
     "fileCount": 42,
     "tokensBefore": 120000,
     "tokensAfter": 36000
   }
   ```
3. Report to user: outputId, file count, token compression ratio, top 5 largest files

## Section 2: `/qa` integration

### Preamble step (before dispatching agents)
1. Check `.pipeline/repomix-pack.json`:
   - If exists and `packedAt` < 1 hour old → use stored `outputId`
   - If missing or stale → call `mcp__repomix__pack_codebase` on cwd automatically
2. Pass `outputId` to each agent dispatch as context:
   `"Repomix outputId: <id> — use grep_repomix_output for discovery and read_repomix_output for file contents"`

### Audit skill updates
Each of the 5 audit skills gets a short Repomix section:
> When `repomixOutputId` is provided in context, prefer `grep_repomix_output` + `read_repomix_output` over native Glob/Read/Grep for file discovery.

**Affected:** `skills/qa/SKILL.md`, `skills/frontend-audit/SKILL.md`, `skills/backend-audit/SKILL.md`, `skills/security-review/SKILL.md`, `skills/doc-audit/SKILL.md`, `skills/cleanup/SKILL.md`

**Key benefit:** One pack shared across 5 parallel agents instead of each independently discovering and reading files.

## Section 3: `/plan` and `/brief` touchpoints

### `/plan` Step 2 replacement
Replace the current manual `ls` + config-file reads with:
1. Call `mcp__repomix__pack_codebase` with `compress: false, topFilesLength: 20`
2. Use the returned file tree to ground paths, naming conventions, and existing directory layout
3. No `outputId` stored — one-off read for planning context

### `/brief` existing-codebase step
When invoked on a project that already has code:
1. Early step: call `pack_codebase` on cwd to get file tree + top files by size
2. Use that overview to inform what questions to ask (what exists, dominant language/framework, gaps)
3. No `outputId` stored — brief is conversational, not pipeline state

## Files touched

| File | Change |
|------|--------|
| `skills/pack/SKILL.md` | New skill |
| `skills/qa/SKILL.md` | Pack preamble + outputId pass-through |
| `skills/frontend-audit/SKILL.md` | Repomix section |
| `skills/backend-audit/SKILL.md` | Repomix section |
| `skills/security-review/SKILL.md` | Repomix section |
| `skills/doc-audit/SKILL.md` | Repomix section |
| `skills/cleanup/SKILL.md` | Repomix section |
| `skills/plan/SKILL.md` | Replace Step 2 scan with pack_codebase |
| `skills/brief/SKILL.md` | Pack step for existing codebase |

## Out of scope
- Remote repository support (`pack_remote_repository`)
- `/drift-check` integration
- Graceful degradation (personal use — repomix-mcp is a hard dependency)
