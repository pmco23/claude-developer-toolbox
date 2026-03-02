# Workflow Discoverability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich `/status` cold-start output with named workflow paths + create `docs/guides/workflows.md` as an out-of-session decision guide, so users always know what to run next.

**Architecture:** All changes are markdown only. `/status` SKILL.md gets a new cold-start output branch (no artifacts found). `docs/guides/workflows.md` is created as the decision entry-point. README, `docs/skills/status.md` get minor supporting updates.

**Tech Stack:** Markdown. No code changes. No new skills.

---

### Task 1: Update `/status` SKILL.md — cold-start output

**Files:**
- Modify: `skills/status/SKILL.md`

**Step 1: Read the current file**

Open `skills/status/SKILL.md` and locate the three sections that handle the no-pipeline case:
- Step 1 (line ~18): `"If none found, report 'No pipeline active in this directory tree.'"`
- Step 3 table (line ~44): `"No artifacts | Not started | Run /brief"`
- Step 4 report block

**Step 2: Replace the Step 1 no-pipeline instruction**

Find:
```
Walk up from the current working directory looking for a `.pipeline/` directory. If none found, report "No pipeline active in this directory tree."
```

Replace with:
```
Walk up from the current working directory looking for a `.pipeline/` directory. If none found, OR if found but contains no recognized artifacts (`brief.md`, `design.md`, `design.approved`, `plan.md`, `build.complete`), output the **cold-start report** (see Step 4) and stop — do not proceed to Steps 2–3.
```

**Step 3: Update Step 3 table — remove the no-artifacts row**

The "No artifacts | Not started | Run /brief" row is now handled by the cold-start branch in Step 1. Remove it from the Step 3 table so the table only covers states where at least one artifact exists.

**Step 4: Add the cold-start output format to Step 4**

In the Step 4 Report section, add a second block BEFORE the existing pipeline report block:

```
### Cold-start report (no pipeline active)

Output exactly:

```
No pipeline active.

Choose a workflow:

  Fast Track — small features, bug fixes, well-understood changes
    /quick [--deep]         implement directly, no artifacts

  Pipeline — new features, design-sensitive or complex changes
    /brief                  crystallize requirements  →  .pipeline/brief.md
      /design               first-principles design   →  .pipeline/design.md
        /review             adversarial review        →  .pipeline/design.approved
          /plan             atomic execution plan     →  .pipeline/plan.md
            /build          coordinated build         →  .pipeline/build.complete
              /qa           post-build audits

Always available (no pipeline required):
  /init          scaffold README, CHANGELOG, CONTRIBUTING, .gitignore
  /git-workflow  before branch creation, first push, PR, destructive ops
  /pack          Repomix snapshot — run before /qa for token efficiency
  /status        this report

See docs/guides/workflows.md for the full decision guide.
```
```

**Step 5: Update the frontmatter description**

Find:
```
description: Use at any time to check the current pipeline state. Reports which .pipeline/ artifacts exist and what phase the pipeline is in. No gate — always available.
```

Replace with:
```
description: Use at any time to check pipeline state and get next-step guidance. When no pipeline is active, shows available workflow options and paths. No gate — always available.
```

**Step 6: Verify the file reads correctly**

Re-read `skills/status/SKILL.md` in full. Confirm:
- Cold-start branch triggers when no directory OR no artifacts
- Step 3 table no longer has the "No artifacts" row
- Step 4 has the cold-start block followed by the existing pipeline report block
- Frontmatter description is updated

**Step 7: Commit**

```bash
git add skills/status/SKILL.md
git commit -m "feat: enrich /status with cold-start workflow options output"
```

---

### Task 2: Create `docs/guides/workflows.md`

**Files:**
- Create: `docs/guides/workflows.md`

**Step 1: Write the file**

Create `docs/guides/workflows.md` with exactly this content:

```markdown
# Workflows

Two workflow paths are available. Everything else in the plugin supports one of these two paths.

## Which path?

| Situation | Path |
|-----------|------|
| Small feature, bug fix, typo, config tweak — you know exactly what to change | **Fast Track** (`/quick`) |
| New feature, design-sensitive change, anything that warrants a design doc | **Pipeline** (`/brief → /qa`) |
| Not sure | Start with **Pipeline** — you can abandon it after `/brief` if it turns out to be simple |

---

## Fast Track

```
/quick [task description]     Sonnet implements directly — no artifacts
/quick --deep [task]          Escalate to Opus for trickier problems
/quick                        Prompts you for task description
```

**What it does:**
1. Parses your task, clarifies if ambiguous (one question max)
2. Reads only the relevant files — not the whole codebase
3. Implements the change following existing patterns
4. Self-reviews the diff before handing back
5. Offers a lightweight audit: LSP diagnostics, security spot-check, test reminder

**What it does NOT do:**
- Write `.pipeline/` artifacts — ever
- Invoke the full QA pipeline
- Refactor surrounding code unless asked

**When to NOT use Fast Track:**
- The change requires a design decision with non-obvious trade-offs
- Multiple systems are affected
- The change is large enough that a plan would prevent rework

---

## Pipeline

A quality-gated sequence. Each phase writes an artifact. The gate hook blocks forward progress until the required artifact exists.

```
/brief    →  .pipeline/brief.md         requirements crystallization (Opus)
/design   →  .pipeline/design.md        first-principles design (Opus + Context7)
/review   →  .pipeline/design.approved  adversarial review (Opus + Codex in parallel)
/plan     →  .pipeline/plan.md          atomic execution plan (Opus + Repomix)
/build    →  .pipeline/build.complete   coordinated build (Opus lead + Sonnet builders)
/qa                                     post-build audits (parallel or sequential)
```

### What each phase produces

| Phase | Output | Purpose |
|-------|--------|---------|
| `/brief` | `brief.md` | Requirements, constraints, non-goals, success criteria — the contract |
| `/design` | `design.md` | Architecture, component breakdown, library decisions, testing strategy |
| `/review` | `design.approved` | Adversarial findings addressed; design hardened before any code |
| `/plan` | `plan.md` | Exact file paths, code patterns, test cases, acceptance criteria per task group |
| `/build` | `build.complete` | Implementation complete and drift-verified against the plan |
| `/qa` | (none) | Dead code, frontend/backend/doc/security audits |

### Resetting to a prior phase

```bash
# Start over completely
rm -rf .pipeline/

# Redo from /design (keep brief)
rm .pipeline/design.md .pipeline/design.approved .pipeline/plan.md .pipeline/build.complete

# Redo from /review (keep design)
rm .pipeline/design.approved .pipeline/plan.md .pipeline/build.complete

# Redo from /plan (keep approved design)
rm .pipeline/plan.md .pipeline/build.complete

# Redo from /build (keep plan)
rm .pipeline/build.complete
```

---

## Always-Available Skills

These run independently of any pipeline state — no gate, no artifacts required.

| Skill | When to use |
|-------|-------------|
| `/status` | Any time — shows pipeline state and next step; cold-start shows this workflow guide |
| `/init` | New project or missing boilerplate — generates README, CHANGELOG, CONTRIBUTING, .gitignore |
| `/git-workflow` | Before branch creation, first push, PR open/merge, or destructive git op (force-push, reset --hard) |
| `/pack` | Before `/qa` to snapshot the codebase — all QA skills share the pack for token efficiency |
| `/plugin-architecture` | When deciding whether to use a skill vs agent in a plugin you're building |
| `/quick` | Fast-track implementation (see above) |

---

## How Agents Work

Three named agents exist in the `agents/` directory: `strategic-critic`, `drift-verifier`, and `task-builder`. You never invoke these directly. Skills dispatch them automatically:

- `/review` dispatches `strategic-critic` (Opus) and Codex MCP in parallel
- `/drift-check` dispatches `drift-verifier` (Sonnet) and Codex MCP in parallel
- `/build` dispatches `task-builder` (Sonnet) per task group

The agents enforce model routing (`model: opus` / `model: sonnet`) at the runtime level rather than by prompt instruction alone. This is an implementation detail — for workflow purposes, just run the skill.
```

**Step 2: Verify the file reads correctly**

Re-read `docs/guides/workflows.md` in full. Confirm:
- Decision table is present
- Both paths are explained
- Always-available table has all 6 skills
- Agents section explains they're automatic (3 agents named)

**Step 3: Commit**

```bash
git add docs/guides/workflows.md
git commit -m "docs: add workflows.md — Fast Track vs Pipeline decision guide"
```

---

### Task 3: Update `docs/skills/status.md` — add cold-start example

**Files:**
- Modify: `docs/skills/status.md`

**Step 1: Read the current file**

Open `docs/skills/status.md`. Note the existing Example output block (mid-task state).

**Step 2: Update the description line**

Find:
```
Reports the current pipeline phase based on which `.pipeline/` artifacts exist, including file age for each artifact and Repomix pack stats. Run at any point to know where you are and what to run next.
```

Replace with:
```
Reports pipeline phase, artifact ages, and Repomix pack stats. When no pipeline is active, shows available workflow paths and always-available skills. Run at any point to know where you are and what to run next.
```

**Step 3: Add a cold-start example before the existing example**

Add this block BEFORE the existing `## Example output` section:

```markdown
## Cold-start output (no pipeline active)

```
No pipeline active.

Choose a workflow:

  Fast Track — small features, bug fixes, well-understood changes
    /quick [--deep]         implement directly, no artifacts

  Pipeline — new features, design-sensitive or complex changes
    /brief                  crystallize requirements  →  .pipeline/brief.md
      /design               first-principles design   →  .pipeline/design.md
        /review             adversarial review        →  .pipeline/design.approved
          /plan             atomic execution plan     →  .pipeline/plan.md
            /build          coordinated build         →  .pipeline/build.complete
              /qa           post-build audits

Always available (no pipeline required):
  /init          scaffold README, CHANGELOG, CONTRIBUTING, .gitignore
  /git-workflow  before branch creation, first push, PR, destructive ops
  /pack          Repomix snapshot — run before /qa for token efficiency
  /status        this report

See docs/guides/workflows.md for the full decision guide.
```
```

**Step 4: Rename the existing example section**

Change `## Example output` to `## Mid-task output (pipeline active)` to distinguish the two cases.

**Step 5: Verify**

Re-read `docs/skills/status.md`. Confirm two example blocks: cold-start first, mid-task second.

**Step 6: Commit**

```bash
git add docs/skills/status.md
git commit -m "docs: update /status reference — add cold-start example, two example blocks"
```

---

### Task 4: Update `README.md` — add Workflows to Guides table

**Files:**
- Modify: `README.md`

**Step 1: Read the current Guides table**

Open `README.md` and locate the `### Guides` section.

**Step 2: Add Workflows as the first row**

Find the table header:
```
| Guide | |
|-------|--|
| [Installation](docs/guides/installation.md) | Full install steps, statusline setup, verification |
```

Replace with:
```
| Guide | |
|-------|--|
| [Workflows](docs/guides/workflows.md) | Which path to use: Fast Track vs Pipeline, always-available skills, how agents work |
| [Installation](docs/guides/installation.md) | Full install steps, statusline setup, verification |
```

**Step 3: Verify**

Re-read `README.md`. Confirm Workflows is the first guide entry.

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add Workflows guide to README — first entry in guides table"
```

---

### Task 5: Update `CHANGELOG.md`

**Files:**
- Modify: `CHANGELOG.md`

**Step 1: Add entries to `## [Unreleased]`**

Under `### Added`, add:
```
- `docs/guides/workflows.md` — Fast Track vs Pipeline decision guide; explains named workflow paths, always-available skills, and how agents work (internal, not user-invocable)
```

Under `### Changed`, add:
```
- `/status` cold-start output: when no pipeline is active, now shows named workflow paths (Fast Track / Pipeline), always-available skills, and a link to `workflows.md` — replaces bare "No pipeline active in this directory tree" message
- `/status` frontmatter description updated to reflect the new cold-start guidance behavior
- `docs/skills/status.md`: description updated; two example blocks added (cold-start and mid-task)
- `README.md`: Workflows guide added as first entry in the Guides table
```

**Step 2: Verify**

Re-read `CHANGELOG.md` `## [Unreleased]` section. Confirm entries are under the correct headings.

**Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for workflow discoverability feature"
```
