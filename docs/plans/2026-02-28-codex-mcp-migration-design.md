# Codex MCP Migration Design

**Date:** 2026-02-28
**Goal:** Replace "OpenAI MCP Codex" subagent dispatch pattern with direct `mcp__codex__codex` calls using the Codex MCP server.

## Approach

Two skills currently reference an "OpenAI MCP Codex tool" by instructing a dispatched Claude subagent to use it. No MCP server was ever registered to back this up. This migration replaces that pattern with direct calls to the Codex MCP server (`codex mcp-server`), which the user already has installed.

The structural change: instead of dispatching a Claude subagent (via Task) that is told to use a Codex tool, the Opus lead calls `mcp__codex__codex` directly in the same parallel batch as the Agent 1 Task dispatch. This removes one layer of indirection and makes the Codex invocation explicit and verifiable.

## MCP Server Registration

**Location:** `~/.claude/settings.json` (global — available across all Claude Code sessions)

**Entry to add:**
```json
"mcpServers": {
  "codex": {
    "command": "codex",
    "args": ["mcp-server"]
  }
}
```

This exposes two tools to all sessions:
- `mcp__codex__codex` — start a new Codex session with a prompt
- `mcp__codex__codex-reply` — continue an existing Codex session by threadId

## Affected Skills

### `skills/review/SKILL.md`

**Frontmatter description:** Replace "Codex for code-grounded critique via OpenAI MCP" → "Codex for code-grounded critique via Codex MCP".

**Agent 2 section (lines 59-82):** Replace the Task-dispatch subagent pattern with a direct `mcp__codex__codex` call. The prompt content is unchanged — Codex reads `.pipeline/design.md`, `.pipeline/brief.md`, and the codebase, then returns a structured findings list.

New Agent 2 instruction:
```
**Agent 2 — Codex Code-Grounded Critic**

Call `mcp__codex__codex` directly with:
- `prompt`: [existing code-grounded critique prompt, unchanged]
- `approval_policy`: "never"

Codex will read the design and codebase files and return a structured findings list.
```

Both calls (Task for Agent 1, mcp__codex__codex for Agent 2) are issued in the same response turn — parallel execution.

### `skills/drift-check/SKILL.md`

**Frontmatter description:** Replace "via OpenAI MCP" → "via Codex MCP".

**Agent 2 section (lines 45-47):** Replace the Task-dispatch subagent pattern with a direct `mcp__codex__codex` call. The prompt is the same verifier prompt as Agent 1 (with source/target paths filled in).

New Agent 2 instruction:
```
**Agent 2 — Codex Verifier (via Codex MCP)**

Call `mcp__codex__codex` directly with:
- `prompt`: [same verifier prompt as Agent 1, with source/target paths filled in]
- `approval_policy`: "never"

Codex operates independently to surface any claims the Sonnet agent misses.
```

## Files Touched

| File | Change |
|------|--------|
| `~/.claude/settings.json` | Add `mcpServers.codex` entry |
| `skills/review/SKILL.md` | Update frontmatter + Agent 2 section |
| `skills/drift-check/SKILL.md` | Update frontmatter + Agent 2 section |

## Constraints

- The `codex` CLI must be installed and on PATH for the MCP server to start
- `approval_policy: "never"` prevents Codex from pausing for interactive approval during automated skill execution
- The existing prompt content for both Codex agents is preserved unchanged — only the dispatch mechanism changes
- No `.pipeline/` artifacts are affected
