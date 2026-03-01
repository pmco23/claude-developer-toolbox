# Agents vs Skills — Plugin Architecture Refactor

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert 6 self-contained audit skills into dedicated `.claude/agents/` subagents with restricted (read-only) tool access, reduce their SKILL.md files to thin wrappers, simplify `/qa` dispatch, and add a `/plugin-architecture` decision guide.

**Architecture:** Each converted skill splits into two files: an agent file (`.claude/agents/<name>.md`) containing the full audit logic with `tools: Read, Grep, Glob, Bash` only, and a thin SKILL.md wrapper (8–12 lines) that gates on `.pipeline/build.complete` and invokes the named agent. `/qa` dispatches the underlying agents directly instead of embedding full prompts. Two new files add a decision guide for future plugin work.

**Tech Stack:** Claude Code plugin system — SKILL.md files, `.claude/agents/` frontmatter, `hooks/test_gate.sh` for regression verification.

---

## Conversion Types

**Type A — Pure audit (no interactive steps):** frontend-audit, backend-audit, doc-audit, security-review
Agent contains full SKILL.md body. Skill is minimal gate + dispatch.

**Type B — Split (interactive phase stays in skill):** cleanup, drift-check
Agent contains analysis phase only. Skill handles user interaction (cleanup: confirm before removal; drift-check: ask for source/target).

---

### Task 1: Create `.claude/agents/` directory and four Type A agent files

**Files:**
- Create: `.claude/agents/frontend-audit.md`
- Create: `.claude/agents/backend-audit.md`
- Create: `.claude/agents/doc-audit.md`
- Create: `.claude/agents/security-review.md`

**Step 1: Create the agents directory**

```bash
mkdir -p .claude/agents
```

**Step 2: Create `.claude/agents/frontend-audit.md`**

Frontmatter + body copied verbatim from `skills/frontend-audit/SKILL.md` (strip the existing frontmatter and add the new one):

```yaml
---
name: frontend-audit
description: Audits frontend TypeScript/JavaScript/CSS/HTML for style violations, naming conventions, and type errors. Returns structured findings.
tools: Read, Grep, Glob, Bash
model: claude-sonnet-4-6
---
```

Body: everything below the `---` closing line of `skills/frontend-audit/SKILL.md` (the `# QF — Frontend Style Audit` heading through to the end, minus the "After reviewing findings" footer line).

**Step 3: Create `.claude/agents/backend-audit.md`**

Same pattern. Frontmatter:

```yaml
---
name: backend-audit
description: Audits backend code (Go, Python, TypeScript, C#) for naming, error handling, package structure, and API conventions. Returns structured findings.
tools: Read, Grep, Glob, Bash
model: claude-sonnet-4-6
---
```

Body: full body of `skills/backend-audit/SKILL.md`.

**Step 4: Create `.claude/agents/doc-audit.md`**

```yaml
---
name: doc-audit
description: Audits documentation freshness — README accuracy, API doc accuracy, and CHANGELOG format compliance. Returns structured findings.
tools: Read, Grep, Glob, Bash
model: claude-sonnet-4-6
---
```

Body: full body of `skills/doc-audit/SKILL.md`.

**Step 5: Create `.claude/agents/security-review.md`**

```yaml
---
name: security-review
description: Scans for OWASP Top 10 vulnerabilities — injection, broken access control, cryptographic failures, and misconfiguration. Returns findings with severity and remediation.
tools: Read, Grep, Glob, Bash
model: claude-sonnet-4-6
---
```

Body: full body of `skills/security-review/SKILL.md`.

**Step 6: Verify structure**

```bash
ls .claude/agents/
```

Expected: `backend-audit.md  doc-audit.md  frontend-audit.md  security-review.md`

**Step 7: Run tests to confirm no regressions**

```bash
bash hooks/test_gate.sh
```

Expected: 44/44 tests pass.

**Step 8: Commit**

```bash
git add .claude/agents/
git commit -m "feat: add four Type A audit agents with read-only tool restriction"
```

---

### Task 2: Update four Type A SKILL.md thin wrappers

**Files:**
- Modify: `skills/frontend-audit/SKILL.md`
- Modify: `skills/backend-audit/SKILL.md`
- Modify: `skills/doc-audit/SKILL.md`
- Modify: `skills/security-review/SKILL.md`

Each file becomes ~10 lines. Replace the entire body (everything after the frontmatter `---`) with this pattern, substituting the agent name and title:

**Template for `.pipeline/build.complete`-gated audits:**

```markdown
# [Title]

Check that `.pipeline/build.complete` exists. If it does not: report "Build required — run /build first." and stop.

Invoke the `[agent-name]` subagent. Pass this context in the prompt:
- `.pipeline/build.complete` exists

Return the agent's findings verbatim to the user.

After presenting findings, suggest `/quick` to address individual items. Re-run `/[skill-name]` after fixing to confirm.
```

Apply to all four files:

- `frontend-audit`: title `Frontend Audit`, agent `frontend-audit`
- `backend-audit`: title `Backend Audit`, agent `backend-audit`
- `doc-audit`: title `Documentation Audit`, agent `doc-audit`
- `security-review`: title `Security Review`, agent `security-review`

Keep existing frontmatter unchanged for each file (name, description, — these are the user-facing entry points).

**Step 1: Update all four wrappers**

Apply the template to each file. Confirm each is ≤ 15 lines of body content.

**Step 2: Verify content**

Read each file. Confirm:
- Frontmatter unchanged
- Body is the thin wrapper (no audit logic)
- Agent name in the dispatch matches the `.claude/agents/` filename

**Step 3: Run tests**

```bash
bash hooks/test_gate.sh
```

Expected: 44/44 pass.

**Step 4: Commit**

```bash
git add skills/frontend-audit/SKILL.md skills/backend-audit/SKILL.md skills/doc-audit/SKILL.md skills/security-review/SKILL.md
git commit -m "refactor: slim frontend-audit, backend-audit, doc-audit, security-review to thin wrappers"
```

---

### Task 3: Create cleanup agent (analysis only) and update cleanup SKILL.md

**Files:**
- Create: `.claude/agents/cleanup.md`
- Modify: `skills/cleanup/SKILL.md`

**Rationale:** Cleanup is interactive — it shows findings and asks the user to confirm before removing. The agent handles Steps 1–2 (identify language, find dead code, return list). The skill handles Steps 3–5 (confirm, remove, verify).

**Step 1: Create `.claude/agents/cleanup.md`**

```yaml
---
name: cleanup
description: Scans for dead code — unused imports, unreachable branches, commented-out code, and symbols with no callers. Returns a structured findings list only; does not remove anything.
tools: Read, Grep, Glob, Bash
model: claude-sonnet-4-6
---

# CLEANUP — Dead Code Scanner

## Role

You are Sonnet acting as a dead code scanner. Find dead code and return a structured list. Do not remove anything — report only.

## Process

### Step 1: Identify project language

Read `.pipeline/brief.md` to find the primary language. Check which LSP tools are available in this session.

### Step 2: Find dead code

**Announce quality tier before proceeding:**
- If LSP is available: output `🟢 LSP active — dead code findings are authoritative.`
- If LSP is not available: output `🟡 No LSP detected — findings are heuristic (grep-pattern). Install the language LSP for authoritative results (see README Language Support Matrix).`

**If LSP is available** for the project language, use it:
- Request all unused symbol diagnostics
- Request all unreachable code diagnostics
- List unused imports via LSP

**If LSP is not available**, use static analysis:
- Search for symbols defined but never referenced (grep patterns)
- Look for commented-out code blocks (// TODO: remove, /* dead */, etc.)
- Find imports with no usages in the file
- Identify functions/methods with no callers (search for their name across codebase)

**Note:** If running as part of `/qa --parallel`, `/backend-audit` also checks unused imports for Go and TypeScript. Overlapping findings on that category are expected.

### Step 3: Return findings

Return a structured list:

```
Dead code found:
- [file:line] — [symbol/description] — [reason: unused/unreachable/no callers]
```

If no findings: "No dead code found."
```

**Step 2: Update `skills/cleanup/SKILL.md`**

Replace the body (keep frontmatter) with:

```markdown
# Dead Code Removal

Check that `.pipeline/build.complete` exists. If it does not: report "Build required — run /build first." and stop.

Invoke the `cleanup` subagent. Pass this context:
- `.pipeline/build.complete` exists

The agent returns a findings list. Present it to the user:

```
Dead code found:
[agent output]
```

Ask: "Remove all of these? (yes / review each / skip)"

For each confirmed item:
- Remove the dead symbol or block using the Edit tool
- Remove any imports that become unused as a result
- Do not touch surrounding code

After removal: "Run your test suite to confirm no regressions."

If items were skipped, use `/quick` to address them individually. Re-run `/cleanup` to confirm.
```

**Step 3: Run tests**

```bash
bash hooks/test_gate.sh
```

Expected: 44/44 pass.

**Step 4: Commit**

```bash
git add .claude/agents/cleanup.md skills/cleanup/SKILL.md
git commit -m "feat: add cleanup agent (analysis only), update skill to thin wrapper with removal step"
```

---

### Task 4: Create drift-check agent and update drift-check SKILL.md

**Files:**
- Create: `.claude/agents/drift-check.md`
- Modify: `skills/drift-check/SKILL.md`

**Rationale:** Drift-check currently asks the user for source/target (Step 1). That interaction stays in the skill. The agent receives source and target as inputs and performs Steps 2–4 (dispatch verifiers, reconcile, produce drift report).

**Step 1: Create `.claude/agents/drift-check.md`**

```yaml
---
name: drift-check
description: Verifies implementation drift between a source-of-truth document and a target. Dispatches two independent verifiers (Sonnet + Codex if available), reconciles findings, and returns a structured drift report.
tools: Read, Grep, Glob, Bash, mcp__codex__codex
model: claude-opus-4-6
---
```

Body: the content of Steps 2–4 from `skills/drift-check/SKILL.md` (the "Dispatch parallel verifiers", "Reconcile findings", and "Mitigate if called from /build" sections). The agent receives `source` and `target` paths in its prompt and uses them directly — no Step 1 user question.

**Step 2: Update `skills/drift-check/SKILL.md`**

Replace the body (keep frontmatter) with:

```markdown
# Drift Detection

Ask the user:
- **Source of truth:** what document contains the claims? (default: `.pipeline/plan.md`)
- **Target:** what is being verified against? (default: current working directory)

Resolve any defaults, then invoke the `drift-check` subagent with this context in the prompt:
- Source: [resolved path]
- Target: [resolved path or description]

Return the agent's drift report verbatim.

If called from `/build`: forward the drift report to the build lead for judgment on MISSING/CONTRADICTED findings.
```

**Step 3: Run tests**

```bash
bash hooks/test_gate.sh
```

Expected: 44/44 pass.

**Step 4: Commit**

```bash
git add .claude/agents/drift-check.md skills/drift-check/SKILL.md
git commit -m "feat: add drift-check agent, update skill to ask user then dispatch agent"
```

---

### Task 5: Update `/qa` to dispatch named agents

**Files:**
- Modify: `skills/qa/SKILL.md`

**Goal:** Replace the verbose per-agent prompts in the Parallel Mode dispatch with one-liner named-agent dispatch. Sequential mode similarly simplifies. The Overall QA Verdict table and PASS criteria are unchanged.

**Step 1: Read current `/qa` SKILL.md**

Read `skills/qa/SKILL.md` to see the current Parallel Mode dispatch prompts (the five "Agent N — ..." blocks with their full prompts).

**Step 2: Replace the five agent blocks**

Find the section starting with `Use the Task tool to launch 5 subagents at once. Prompt for each:` through the end of the five agent descriptions (Agent 5 — Security Review prompt). Replace with:

```markdown
Use the Agent tool to launch 5 subagents simultaneously, using their named `subagent_type`:

**Agent 1 — Dead Code Removal** (`cleanup`)
Prompt: `.pipeline/build.complete exists. Audit for dead code and report all findings.`

**Agent 2 — Frontend Audit** (`frontend-audit`)
Prompt: `.pipeline/build.complete exists. Report all findings.`

**Agent 3 — Backend Audit** (`backend-audit`)
Prompt: `.pipeline/build.complete exists. Report all findings.`

**Agent 4 — Documentation Freshness** (`doc-audit`)
Prompt: `.pipeline/build.complete exists. Report all findings.`

**Agent 5 — Security Review** (`security-review`)
Prompt: `.pipeline/build.complete exists. Report all findings.`
```

**Step 3: Update Sequential Mode**

Similarly, the five sequential invocations currently say "Invoke the `cleanup` skill", "Invoke the `frontend-audit` skill", etc. Update each to "Invoke the `cleanup` subagent", "Invoke the `frontend-audit` subagent", etc., matching the named agents.

**Step 4: Verify**

Read `skills/qa/SKILL.md`. Confirm:
- Parallel Mode: 5 one-liner dispatch blocks with `subagent_type` named
- Sequential Mode: updated references
- Overall QA Verdict table: unchanged
- PASS criteria: unchanged

**Step 5: Run tests**

```bash
bash hooks/test_gate.sh
```

Expected: 44/44 pass.

**Step 6: Commit**

```bash
git add skills/qa/SKILL.md
git commit -m "refactor: /qa dispatches named agents instead of embedding full prompts"
```

---

### Task 6: Create `/plugin-architecture` skill

**Files:**
- Create: `skills/plugin-architecture/SKILL.md`

**Goal:** A concise reference skill (~80 lines) that Claude can consult when designing or evaluating Claude Code plugins.

**Step 1: Create `skills/plugin-architecture/SKILL.md`**

```markdown
---
name: plugin-architecture
description: Use when designing or evaluating Claude Code plugins — explains when to use skills vs agents and how to compose them correctly.
---

# Plugin Architecture — Skills vs Agents Decision Guide

## Core Distinction

**Skills** (SKILL.md) — loaded into the main conversation context. Claude reads the instructions and acts inline. The user can invoke with `/skill-name`. Use for conversational workflows, orchestration, and interactive multi-step tasks.

**Agents** (`.claude/agents/<name>.md`) — run in an isolated context window with restricted tool access. Return a result to the parent conversation. Use for self-contained analysis that produces a report.

## Fitness Criterion

A task should be an **agent** when it satisfies all three:

1. **Self-contained** — no mid-task questions to the user; input comes from files or the prompt, output is a structured report
2. **Read-only** — no writes, edits, or file creation as part of its core task
3. **Verbose output** — produces findings that would pollute the main context if kept inline

If any criterion fails → use a **skill** (or a skill that wraps an agent for the read-only phase).

## Agent Frontmatter

```yaml
---
name: <name>
description: <one-line description for Claude to use when choosing this agent>
tools: Read, Grep, Glob, Bash        # restrict to what the agent actually needs
model: claude-sonnet-4-6             # or claude-opus-4-6 for complex reasoning
---
```

Key restriction: omit `Write`, `Edit`, and `Agent` for pure audit agents.

## Thin Wrapper Skill Pattern

When a skill exists only to gate and dispatch an agent:

```markdown
---
name: <name>
description: <user-facing description>
---

# <Title>

Check [precondition]. If not met: [error message]. Stop.

Invoke the `<agent-name>` subagent with this context:
- [relevant context items]

Return the agent's findings verbatim.
```

## Split Pattern (interactive + analysis)

When a task has both an interactive phase and an analysis phase:

- **Agent:** analysis phase only (read files, return findings list)
- **Skill:** interactive phase (confirm, approve, or remove based on findings)

Example: `/cleanup` — agent scans for dead code; skill asks user to confirm before removing.

## Composition Rules

| Scenario | Pattern |
|----------|---------|
| Pure analysis → report | Agent only; skill is thin wrapper |
| Analysis + user confirmation | Agent for analysis; skill for interaction |
| Orchestrating multiple analyses | Skill dispatches multiple agents |
| Conversational workflow | Skill only (no agent) |
| Agents spawning agents | Not supported — chain from skill instead |

## Decision Tree

```
Does the task require mid-task questions to the user?
├─ YES → Skill (or Skill with Agent for analysis phase)
└─ NO → Does it produce verbose output and only read files?
    ├─ YES → Agent (with read-only tools)
    └─ NO → Skill
```

## Anti-Patterns

- **Agent writing files:** add the task to skills instead, or split into agent (find) + skill (write)
- **Skill embedding full agent prompt:** move the logic to a named agent file
- **Agent with unrestricted tools:** always specify `tools:` — omitting it grants full tool access
- **Nested agents:** agents cannot spawn agents; if you need this, use a skill as the orchestrator
```

**Step 2: Verify**

Read the file. Confirm it is under 100 lines and covers: distinction, criterion, agent frontmatter, thin wrapper pattern, split pattern, composition table, decision tree, anti-patterns.

**Step 3: Run tests**

```bash
bash hooks/test_gate.sh
```

Expected: 44/44 pass.

**Step 4: Commit**

```bash
git add skills/plugin-architecture/SKILL.md
git commit -m "feat: add /plugin-architecture decision guide skill"
```

---

### Task 7: Create `docs/guides/agents-vs-skills.md`

**Files:**
- Create: `docs/guides/agents-vs-skills.md`

**Goal:** Human-readable companion to the `/plugin-architecture` skill — prose explanation, full conversion table with reasoning, and before/after examples from this refactoring.

**Step 1: Create `docs/guides/` directory**

```bash
mkdir -p docs/guides
```

**Step 2: Create `docs/guides/agents-vs-skills.md`**

Content sections:

1. **Overview** — 2-3 sentence summary of the distinction
2. **Full conversion table** — all 16 skills with decision and reason (from design doc at `docs/plans/2026-03-01-agents-vs-skills-design.md`)
3. **Fitness criterion** — expanded prose for each of the three tests
4. **Before/After examples** — show the cleanup skill (before: 66 lines of logic; after: 12-line wrapper) and the cleanup agent (66 lines, read-only restricted)
5. **Composition patterns** — same four patterns as the skill, with prose explanation
6. **When to revisit** — signals that a skill should become an agent (first time it produces output too verbose for main context; first time a bug is caused by accidentally writing a file)

Target length: 200–300 lines.

**Step 3: Run tests**

```bash
bash hooks/test_gate.sh
```

Expected: 44/44 pass.

**Step 4: Commit**

```bash
git add docs/guides/agents-vs-skills.md
git commit -m "docs: add agents-vs-skills guide with full conversion table and patterns"
```

---

### Task 8: Verify complete refactor and push

**Step 1: Check all agent files exist**

```bash
ls .claude/agents/
```

Expected: `backend-audit.md  cleanup.md  doc-audit.md  drift-check.md  frontend-audit.md  security-review.md`

**Step 2: Check all thin wrapper skills are slim**

For each of the 6 converted skills, confirm body length ≤ 20 lines:

```bash
wc -l skills/cleanup/SKILL.md skills/frontend-audit/SKILL.md skills/backend-audit/SKILL.md skills/doc-audit/SKILL.md skills/security-review/SKILL.md skills/drift-check/SKILL.md
```

**Step 3: Run full test suite**

```bash
bash hooks/test_gate.sh
```

Expected: 44/44 pass.

**Step 4: Verify plugin-architecture skill exists**

```bash
ls skills/plugin-architecture/SKILL.md
```

**Step 5: Verify guide exists**

```bash
ls docs/guides/agents-vs-skills.md
```

**Step 6: Check git log**

```bash
git log --oneline -8
```

Expected: 7 commits from this plan (Tasks 1–7 commits) on top of `2e6fece`.

**Step 7: Push**

```bash
git push
```
