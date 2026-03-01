# Plugin Review Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix four manifest-compliance findings identified in the plugin review: missing reference files (CRITICAL), overly broad PostToolUse matcher (MEDIUM), stale plugin metadata + orphan file (MEDIUM), undocumented fallback behavior (MEDIUM).

**Architecture:** Four independent tasks in severity order. Tasks 1–3 are file operations with no cross-dependencies — each can be verified in isolation. Task 4 is SKILL.md edits to three skills. No task modifies the same file as another.

**Tech Stack:** Bash, JSON, Markdown. Test suite: `hooks/test_gate.sh` (44 tests). No build step.

---

## Task 1: Create git-workflow reference files (F1 — CRITICAL)

**Files:**
- Create: `references/code-path.md`
- Create: `references/infra-path.md`

**Context:** `skills/git-workflow/SKILL.md` Step 2 reads one of these files based on detected project type and uses it as the authoritative source for branch naming, commit format, PR strategy, and protected-branch rules. Both files are missing — the skill silently fails at Step 2 on every invocation. Every skill that delegates to git-workflow (the commit step in `/quick` and `/build` agents) is broken by this.

**Step 1: Confirm the files are missing**

```bash
ls references/ 2>&1
```

Expected: `ls: cannot access 'references/': No such file or directory` (or empty)

**Step 2: Create the directory and code-path.md**

Create `references/code-path.md` with this exact content:

```markdown
# Trunk-Based Workflow Reference

## Branch Naming

Conventional Branch spec: https://conventional-branch.github.io/

Pattern: `<type>/<short-description>`

Types: `feat`, `feature`, `fix`, `bugfix`, `hotfix`, `chore`, `release`

Rules: lowercase, hyphens only, no underscores or spaces, max ~50 chars.

Examples: `feat/add-login-page`, `fix/null-pointer-crash`, `chore/update-deps`

## Commit Format

Conventional Commits spec: https://www.conventionalcommits.org/en/v1.0.0/

Pattern: `<type>[optional scope]: <description>`

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`

Breaking changes: add `!` before the colon — e.g. `feat!: remove legacy API`

Examples:
- `feat: add user authentication`
- `fix(auth): handle token expiry correctly`
- `docs: update installation instructions`

## PR Strategy

- Branch from: `main`
- Merge target: `main`
- One PR per logical change
- PR title must follow commit format

## Protected Branches

Direct push is blocked on:
- `main`
- `master`

Use a PR for all changes to protected branches.

## Promotion Flow

```
feature branch → PR review → merge to main
```
```

**Step 3: Create references/infra-path.md**

Create `references/infra-path.md` with this exact content:

```markdown
# Three-Environment Workflow Reference

## Branch Naming

Conventional Branch spec: https://conventional-branch.github.io/

Pattern: `<type>/<short-description>`

Types: `feat`, `feature`, `fix`, `bugfix`, `hotfix`, `chore`, `release`

Rules: lowercase, hyphens only, no underscores or spaces, max ~50 chars.

Examples: `feat/add-login-page`, `fix/null-pointer-crash`

## Commit Format

Conventional Commits spec: https://www.conventionalcommits.org/en/v1.0.0/

Pattern: `<type>[optional scope]: <description>`

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`

Breaking changes: add `!` before the colon — e.g. `feat!: remove legacy API`

## PR Strategy

- Branch from: `development` (never directly from `preproduction` or `main`)
- Merge target: `development`
- Promotion is strictly sequential — never skip an environment
- Each promotion requires a PR and review

## Protected Branches

Direct push is blocked on all of:
- `main`
- `master`
- `development`
- `preproduction`

## Promotion Flow

```
feature branch → PR → development → PR → preproduction → PR → main
```

If the promotion path for a branch is unclear, escalate — do not guess.
```

**Step 4: Verify the files exist and have expected sections**

```bash
grep -l "Promotion Flow" references/code-path.md references/infra-path.md
```

Expected: both file paths printed (both contain "Promotion Flow")

**Step 5: Run the test suite to confirm no regressions**

```bash
bash hooks/test_gate.sh 2>&1 | tail -5
```

Expected: `44/44 tests passed`

**Step 6: Commit**

```bash
git add references/code-path.md references/infra-path.md
git commit -m "fix: add missing git-workflow reference files for code and infra paths"
```

---

## Task 2: Narrow PostToolUse matcher from "*" to Bash + Agent (F2 — MEDIUM)

**Files:**
- Modify: `hooks/hooks.json`

**Context:** `context-monitor.sh` fires after every tool call (`matcher: "*"`). Its purpose is valid — it injects context-usage ground truth into Claude's own context so lead agents know when to /compact. The problem is firing on cheap tool calls (Read, Grep, Edit) which don't materially change context and adds subprocess overhead on every operation. Fix: fire only on high-cost tool calls: `Bash` (shell execution) and `Agent` (subagent dispatch). These are the operations that spike context and where the warning is actionable.

**Step 1: Read the current file**

Read `hooks/hooks.json`. Confirm the PostToolUse entry has `"matcher": "*"`.

**Step 2: Replace the PostToolUse section**

Replace the current PostToolUse block with two entries — one for Bash, one for Agent:

The new `hooks/hooks.json` should be:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/pipeline_gate.sh\""
          }
        ]
      },
      {
        "matcher": "Skill",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/pipeline_gate.sh\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/context-monitor.sh\""
          }
        ]
      },
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/context-monitor.sh\""
          }
        ]
      }
    ]
  }
}
```

**Important:** Do NOT add `"matcher": "Bash"` to PreToolUse unless you have verified that the pipeline_gate.sh needs to run before Bash calls too. The current PreToolUse only has `"matcher": "Skill"`. Only change the PostToolUse section unless instructed otherwise.

Corrected `hooks/hooks.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Skill",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/pipeline_gate.sh\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/context-monitor.sh\""
          }
        ]
      },
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/context-monitor.sh\""
          }
        ]
      }
    ]
  }
}
```

**Step 3: Verify JSON is valid**

```bash
python3 -m json.tool hooks/hooks.json > /dev/null && echo "valid JSON"
```

Expected: `valid JSON`

**Step 4: Run the test suite**

```bash
bash hooks/test_gate.sh 2>&1 | tail -5
```

Expected: `44/44 tests passed`

**Step 5: Commit**

```bash
git add hooks/hooks.json
git commit -m "fix: narrow context-monitor PostToolUse matcher from '*' to Bash + Agent"
```

---

## Task 3: Fix plugin.json description + delete orphan echo file (F3 — MEDIUM)

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Delete: `echo` (repo root)

**Context:** `plugin.json` description still uses pre-rename skill names (arm, ar). Skills were renamed in commit `5fa267e` — arm→brief, ar→review — but the description was not updated. The `echo` file at the repo root is an empty accidental artifact (result of a `echo` shell command with output redirected to a file of the same name by mistake).

**Step 1: Verify the stale description**

```bash
cat .claude-plugin/plugin.json
```

Expected: description contains `"arm → design → ar → plan → build → qa"`

**Step 2: Verify echo is empty and untracked**

```bash
ls -la echo && git status echo
```

Expected: 0-byte file, shown as untracked or as a working-tree modification

**Step 3: Update plugin.json**

Replace the description field. The full updated file:

```json
{
  "name": "claude-agents-custom",
  "version": "1.0.0",
  "description": "Quality-gated development pipeline: brief → design → review → plan → build → qa",
  "author": {
    "name": "pemcoliveira"
  },
  "keywords": ["pipeline", "quality-gates", "tdd", "adversarial-review"]
}
```

**Step 4: Delete the orphan file**

```bash
rm echo
```

**Step 5: Verify**

```bash
python3 -m json.tool .claude-plugin/plugin.json > /dev/null && echo "valid JSON"
ls echo 2>&1
```

Expected: `valid JSON` and `ls: cannot access 'echo': No such file or directory`

**Step 6: Run the test suite**

```bash
bash hooks/test_gate.sh 2>&1 | tail -5
```

Expected: `44/44 tests passed`

**Step 7: Commit**

```bash
git add .claude-plugin/plugin.json
git rm --cached echo 2>/dev/null || true
git commit -m "fix: update plugin.json description to current skill names, remove orphan echo file"
```

Note: if `echo` was never tracked by git, `git rm --cached echo` will return an error — that's fine. Just `rm echo` and commit `plugin.json` alone.

---

## Task 4: Document fallback behavior for hard dependencies (F4 — MEDIUM)

**Files:**
- Modify: `skills/design/SKILL.md`
- Modify: `skills/review/SKILL.md`
- Modify: `skills/drift-check/SKILL.md`

**Context:** Three skills have hard dependencies that can be absent: `/design` requires Context7, `/review` and `/drift-check` require Codex MCP (`mcp__codex__codex`). Currently, absence causes the skill to silently violate its own invariants (e.g., Hard Rule 1 in /design says "never recommend without Context7" — but if Context7 isn't available, what happens?). Fix: add a graceful degradation note to each skill specifying what to do when the dependency is absent.

**Step 1: Add fallback note to skills/design/SKILL.md**

Find the Hard Rules section (lines 14–18). After Hard Rule 1, add this fallback note:

Locate this text:
```
1. **Never recommend a library or pattern without grounding it first.** Call Context7 to get the live docs. Do not rely on training data alone.
```

Replace with:
```
1. **Never recommend a library or pattern without grounding it first.** Call Context7 to get the live docs. Do not rely on training data alone. If Context7 is unavailable (tool not present in this session), document the library version and source URL manually in the Library Decisions table and flag the row as "Docs not verified — Context7 unavailable."
```

**Step 2: Verify the change**

```bash
grep -A2 "Never recommend a library" skills/design/SKILL.md
```

Expected: the updated line with the fallback note visible.

**Step 3: Add fallback note to skills/review/SKILL.md**

Find the Hard Rules section. After Hard Rule 1, add a Codex MCP fallback.

Locate this text in the Hard Rules section:
```
1. **Parallel dispatch.** Opus critique and Codex critique run simultaneously — Agent 1 via the Task tool, Agent 2 via direct `mcp__codex__codex` call. Issue both in the same response turn. Do not run them sequentially.
```

Replace with:
```
1. **Parallel dispatch.** Opus critique and Codex critique run simultaneously — Agent 1 via the Task tool, Agent 2 via direct `mcp__codex__codex` call. Issue both in the same response turn. Do not run them sequentially. **If `mcp__codex__codex` is unavailable** (Codex MCP not connected), run Agent 1 (Opus Strategic Critic) via the Task tool only, then run a second Opus agent for code-grounded critique with the Agent 2 prompt. Note in the report: "Codex MCP unavailable — both critics are Opus instances."
```

**Step 4: Verify the change in review**

```bash
grep -A3 "Parallel dispatch" skills/review/SKILL.md | head -10
```

Expected: the updated Hard Rule 1 with fallback visible.

**Step 5: Add fallback note to skills/drift-check/SKILL.md**

Find the Step 2 section header ("Step 2: Dispatch parallel verifiers"). After the intro line for Agent 2, add a fallback note.

Locate this text:
```
**Agent 2 — Codex Verifier (via Codex MCP)**

Call `mcp__codex__codex` directly (do not dispatch a subagent) with:
```

Replace with:
```
**Agent 2 — Codex Verifier (via Codex MCP)**

**If `mcp__codex__codex` is unavailable** (Codex MCP not connected), dispatch Agent 2 as a Sonnet subagent via the Task tool using the same prompt. Note in the drift report header: "Codex MCP unavailable — Agent 2 ran as Sonnet subagent."

Call `mcp__codex__codex` directly (do not dispatch a subagent) with:
```

**Step 6: Verify the change in drift-check**

```bash
grep -A3 "mcp__codex__codex is unavailable" skills/drift-check/SKILL.md
```

Expected: the fallback note visible.

**Step 7: Run the test suite**

```bash
bash hooks/test_gate.sh 2>&1 | tail -5
```

Expected: `44/44 tests passed`

**Step 8: Commit**

```bash
git add skills/design/SKILL.md skills/review/SKILL.md skills/drift-check/SKILL.md
git commit -m "fix: document graceful degradation for Context7 and Codex MCP absence"
```
