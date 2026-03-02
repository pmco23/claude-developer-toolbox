# Design: Workflow Discoverability

**Date:** 2026-03-02
**Brief:** Users cannot orient themselves at the start of a session (cold start) or navigate confidently mid-task. The plugin has grown to 18 skills and 3 named agents — without a unified mental model surface, users don't know what workflow options exist or what to run next.

## Problem

Two distinct gaps:

1. **Cold start** — No pipeline active, user opens Claude Code and doesn't know whether to reach for `/quick`, `/brief`, or something else. `/status` currently says "No pipeline active in this directory tree." — no guidance.

2. **Mid-task** — `/status` already outputs "Next: Run /X" per phase. This part mostly works. The remaining gap is that new users don't know to run `/status` at all.

## Approach

**Approach B + C: Enrich `/status` for in-session guidance + add `WORKFLOWS.md` as out-of-session reference.**

The two named workflow paths are:
- **Fast Track** — `/quick [--deep]` — small features, bug fixes, well-understood changes, no pipeline artifacts
- **Pipeline** — `/brief → /design → /review → /plan → /build → /qa` — quality-gated, design-sensitive, or complex changes

Named agents (`strategic-critic`, `drift-verifier`, `task-builder`) are implementation internals dispatched by skills. Users never invoke them directly. They are not surfaced in any user-facing guidance.

## Components

### 1. `/status` cold-start output

**Trigger:** No `.pipeline/` directory found, or directory exists but contains no recognized artifacts.

**New output format:**

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
```

**What stays the same:** When artifacts exist, `/status` continues to report artifact presence, age, repomix-pack stats, current phase, and "Next: Run /X" exactly as today.

### 2. `docs/guides/workflows.md` (new file)

The out-of-session reference document. Structured as a decision guide, not a repeat of the walkthrough.

**Sections:**
- Which path? — decision table (Fast Track vs Pipeline vs unsure)
- Fast Track — when to use, when not to, flag guide, optional audit
- Pipeline — one-sentence description of each phase, what the gate enforces, reset commands summary
- Always-Available Skills — table with one-line description each
- How Agents Fit In — three-sentence explanation that skills dispatch agents automatically; users never invoke agents directly

**Relationship to existing docs:**
- `walkthrough.md` — keeps the detailed end-to-end example and full reset command reference
- `workflows.md` — entry-point decision guide; links to walkthrough for details

### 3. `/status` SKILL.md — description update

**Current:** `"Use at any time to check the current pipeline state. Reports which .pipeline/ artifacts exist and what phase the pipeline is in. No gate — always available."`

**Updated:** `"Use at any time to check pipeline state and get next-step guidance. When no pipeline is active, shows available workflow options and paths. No gate — always available."`

### 4. `docs/skills/status.md` — add cold-start example

Add a second usage example block showing the cold-start output so users browsing docs know what to expect before running anything.

### 5. `README.md` — add Workflows to Guides table

Add as the **first row** in the Guides table:

| [Workflows](docs/guides/workflows.md) | Which path to use: Fast Track vs Pipeline, always-available skills, how agents work |

## Constraints

- No new skills — all changes are to existing skill logic and documentation
- Agents stay invisible — `strategic-critic`, `drift-verifier`, `task-builder` are not listed anywhere in user-facing output or docs (except the "How Agents Fit In" section of workflows.md which explains they're automatic)
- `/status` mid-task behavior is unchanged — only the cold-start branch is modified
- Token cost of `/status` — cold-start output is a fixed-size text block, Haiku handles it cheaply

## Non-Goals

- A new concierge `/guide` or `/start` skill
- Interactive routing ("what do you want to do?")
- Listing agent files in any user-facing navigation surface
- Modifying pipeline logic, gates, or any other skill behavior

## Success Criteria

- A user who has never used the plugin runs `/status` and knows which workflow to use and what to run first
- A user mid-task runs `/status` and knows exactly what phase they're in and what to run next
- `docs/guides/workflows.md` can be read in under 2 minutes and answers "what should I run?" without needing the walkthrough
