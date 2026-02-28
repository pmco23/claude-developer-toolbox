# Codex MCP Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the "OpenAI MCP Codex" subagent dispatch pattern in `/review` and `/drift-check` with direct `mcp__codex__codex` calls, and register the Codex MCP server globally.

**Architecture:** Three independent edits — one to `~/.claude/settings.json` (MCP registration) and one each to the two affected SKILL.md files. No pipeline artifacts change. No hook or test changes needed (gate tests don't cover skill content).

**Tech Stack:** JSON (settings), Markdown (skill files), `codex mcp-server` (Codex CLI MCP mode)

---

### Task 1: Register Codex MCP server in global settings

**Files:**
- Modify: `~/.claude/settings.json`

**Step 1: Read the current file**

```bash
cat ~/.claude/settings.json
```

Expected output: JSON with `permissions` and `enabledPlugins` keys, no `mcpServers` key.

**Step 2: Add the `mcpServers` block**

Add a top-level `"mcpServers"` key to `~/.claude/settings.json`. The final file must look like:

```json
{
  "permissions": {
    "allow": [
      "Bash(uvx:*)",
      "Bash(curl:*)",
      "Bash(source:*)"
    ],
    "defaultMode": "default"
  },
  "enabledPlugins": {
    "context7@claude-plugins-official": true,
    "github@claude-plugins-official": true,
    "playwright@claude-plugins-official": true,
    "typescript-lsp@claude-plugins-official": true,
    "serena@claude-plugins-official": true,
    "gopls-lsp@claude-plugins-official": true,
    "claude-session-driver@superpowers-marketplace": true,
    "episodic-memory@superpowers-marketplace": true,
    "superpowers@superpowers-marketplace": true,
    "superpowers-developing-for-claude-code@superpowers-marketplace": true,
    "csharp-lsp@claude-plugins-official": true
  },
  "mcpServers": {
    "codex": {
      "command": "codex",
      "args": ["mcp-server"]
    }
  }
}
```

**Step 3: Verify the file is valid JSON**

```bash
python3 -c "import json; json.load(open('/home/pemcoliveira/.claude/settings.json')); print('valid JSON')"
```

Expected: `valid JSON`

**Step 4: Verify the mcpServers key is present**

```bash
python3 -c "import json; d=json.load(open('/home/pemcoliveira/.claude/settings.json')); print(d['mcpServers'])"
```

Expected: `{'codex': {'command': 'codex', 'args': ['mcp-server']}}`

> Note: `~/.claude/settings.json` is outside the git repo — do NOT commit this file. No commit for this task.

---

### Task 2: Update `skills/review/SKILL.md` — frontmatter + Agent 2 section

**Files:**
- Modify: `skills/review/SKILL.md`

**Step 1: Read the current file**

Read `skills/review/SKILL.md`. Confirm:
- Line 3: frontmatter description says "via OpenAI MCP"
- Lines 59-82: Agent 2 says "Dispatch a subagent that uses the OpenAI MCP Codex tool with this prompt:"

**Step 2: Update frontmatter description (line 3)**

Change `"via OpenAI MCP"` → `"via Codex MCP"` in the frontmatter description field.

Old:
```
description: Use after /design to adversarially review the design document. Dispatches Opus and Codex in parallel — Opus for strategic critique grounded in Context7, Codex for code-grounded critique via OpenAI MCP. Lead deduplicates, runs cost/benefit analysis, loops until no findings warrant mitigation. Writes .pipeline/design.approved on loop exit.
```

New:
```
description: Use after /design to adversarially review the design document. Dispatches Opus and Codex in parallel — Opus for strategic critique grounded in Context7, Codex for code-grounded critique via Codex MCP. Lead deduplicates, runs cost/benefit analysis, loops until no findings warrant mitigation. Writes .pipeline/design.approved on loop exit.
```

**Step 3: Replace the Agent 2 dispatch instruction**

Old (lines 59-61):
```
**Agent 2 — Codex Code-Grounded Critic**

Dispatch a subagent that uses the OpenAI MCP Codex tool with this prompt:
```

New:
```
**Agent 2 — Codex Code-Grounded Critic**

Call `mcp__codex__codex` directly (do not dispatch a subagent) with:
- `prompt`: the prompt below
- `approval_policy`: `"never"`

```

The prompt block that follows (the triple-backtick block from current line 62 through 82) is unchanged — keep it exactly as-is.

**Step 4: Verify the file looks correct**

Read `skills/review/SKILL.md` and confirm:
- Frontmatter says "via Codex MCP" (not "via OpenAI MCP")
- Agent 2 header now says "Call `mcp__codex__codex` directly"
- The prompt content block (interface compatibility, pattern consistency, etc.) is unchanged
- No other lines changed

**Step 5: Commit**

```bash
git add skills/review/SKILL.md
git commit -m "refactor: /review — replace OpenAI MCP subagent dispatch with direct mcp__codex__codex call"
```

---

### Task 3: Update `skills/drift-check/SKILL.md` — Agent 2 section

**Files:**
- Modify: `skills/drift-check/SKILL.md`

**Step 1: Read the current file**

Read `skills/drift-check/SKILL.md`. Confirm:
- Line 45: `**Agent 2 — Codex Verifier (via OpenAI MCP)**`
- Line 47: "Dispatch a subagent using the OpenAI MCP Codex tool with the same prompt as Agent 1."

**Step 2: Replace the Agent 2 section (lines 45-47)**

Old:
```
**Agent 2 — Codex Verifier (via OpenAI MCP)**

Dispatch a subagent using the OpenAI MCP Codex tool with the same prompt as Agent 1. Codex operates independently to surface any claims the Sonnet agent misses.
```

New:
```
**Agent 2 — Codex Verifier (via Codex MCP)**

Call `mcp__codex__codex` directly (do not dispatch a subagent) with:
- `prompt`: the same verifier prompt as Agent 1 (fill in `[source document path]` and `[target path]` with the values identified in Step 1)
- `approval_policy`: `"never"`

Codex operates independently to surface any claims the Sonnet agent misses.
```

**Step 3: Verify the file looks correct**

Read `skills/drift-check/SKILL.md` and confirm:
- Agent 2 header now says "(via Codex MCP)"
- The dispatch instruction now says "Call `mcp__codex__codex` directly"
- Agent 1 section is unchanged
- Steps 3 and 4 (reconcile, mitigate) are unchanged

**Step 4: Commit**

```bash
git add skills/drift-check/SKILL.md
git commit -m "refactor: /drift-check — replace OpenAI MCP subagent dispatch with direct mcp__codex__codex call"
```
