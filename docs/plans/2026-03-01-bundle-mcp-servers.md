# Bundle MCP Servers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Declare Repomix and Codex as plugin MCP servers in `plugin.json` so registration is automatic on install, and trim the README setup sections to install + troubleshooting only.

**Architecture:** Two parallel changes — add `mcpServers` block to `plugin.json`, and rewrite both MCP setup sections in `README.md` to remove the now-automatic `claude mcp add` and verify steps.

**Tech Stack:** JSON (`plugin.json`), Markdown (`README.md`)

---

### Task 1: Add `mcpServers` to `.claude-plugin/plugin.json`

**Files:**
- Modify: `.claude-plugin/plugin.json`

**Step 1: Read the current file**

Read `.claude-plugin/plugin.json` in full.

**Step 2: Add `mcpServers` block**

Replace the entire file content with:

```json
{
  "name": "claude-agents-custom",
  "version": "1.3.0",
  "description": "Quality-gated development pipeline: brief → design → review → plan → build → qa",
  "author": {
    "name": "pemcoliveira"
  },
  "keywords": ["pipeline", "quality-gates", "tdd", "adversarial-review"],
  "mcpServers": {
    "codex": {
      "command": "codex",
      "args": ["mcp-server"]
    },
    "repomix": {
      "command": "repomix",
      "args": ["--mcp"]
    }
  }
}
```

**Step 3: Verify**

Read `.claude-plugin/plugin.json` and confirm `mcpServers` contains both `codex` and `repomix` entries with correct commands and args.

**Step 4: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "feat: declare codex and repomix as plugin MCP servers"
```

---

### Task 2: Simplify Codex MCP Setup section in README

**Files:**
- Modify: `README.md`

**Step 1: Read the current Codex section**

Read `README.md` lines 54–91 (the full Codex MCP Setup section).

**Step 2: Replace the entire section**

Find the block from `## Codex MCP Setup` through the closing ```` ``` ```` of the troubleshooting bash block (line 91), and replace it with:

```markdown
## Codex MCP Setup

MCP registration is handled automatically by the plugin. You only need to install the binary.

**Install Codex CLI**

```bash
npm install -g @openai/codex
```

**Troubleshooting — server not connecting**

If Codex was installed via nvm, the `codex` binary may not be on PATH in non-interactive shells. Fix by using the absolute path:

```bash
# Find the path
which codex

# Edit ~/.claude/settings.json — replace "command": "codex" with the absolute path
# under the mcpServers entry for your plugin installation path
```
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: simplify Codex MCP setup — registration is now automatic via plugin"
```

---

### Task 3: Simplify Repomix MCP Setup section in README

**Files:**
- Modify: `README.md`

**Step 1: Read the current Repomix section**

Read `README.md` lines 93–115 (the full Repomix MCP Setup section).

**Step 2: Replace the entire section**

Find the block from `## Repomix MCP Setup` through the `---` separator (line 115), and replace it with:

```markdown
## Repomix MCP Setup

MCP registration is handled automatically by the plugin. You only need to install the binary.

**Install Repomix**

```bash
npm install -g repomix
```

**Troubleshooting — server not connecting**

If Repomix was installed via nvm, the `repomix` binary may not be on PATH in non-interactive shells. Fix by using the absolute path:

```bash
# Find the path
which repomix

# Edit ~/.claude/settings.json — replace "command": "repomix" with the absolute path
# under the mcpServers entry for your plugin installation path
```

---
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: simplify Repomix MCP setup — registration is now automatic via plugin"
```
