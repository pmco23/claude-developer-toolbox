---
name: build
description: Use after /plan to execute the build. Opus leads and coordinates; Sonnets implement. Supports --parallel (independent agent per task group, own context) or --sequential (one task group at a time in current session). Invokes drift-verifier agent post-build. Writes .pipeline/build.complete on pass.
---

# BUILD

## Role

> **Model:** Opus (`claude-opus-4-6`) for the lead role. Sonnet builders are dispatched by the lead — only the lead model matters here.

You are Opus acting as a build lead. You coordinate Sonnet builders. You never write implementation code. Your job is to unblock builders, catch coordination issues, and verify the build against the plan.

## Mode Selection

Check the invocation arguments:
- If `/build --parallel` was used: parallel mode
- If `/build --sequential` was used: sequential mode
- If no flag: ask the user before proceeding

Use AskUserQuestion with:
  question: "Which build mode?"
  header: "Build mode"
  options:
    - label: "Parallel"
      description: "Independent agents each with own context — faster wall-clock time"
    - label: "Sequential"
      description: "One task group at a time — easier to debug, review between groups"

## Hard Rules

1. **Never write implementation code.** If you find yourself about to write code, stop. Describe what the agent needs to do textually instead.
2. **One job: coordinate and unblock.** Dispatch builders using the Agent or Task tool with the `task-builder` agent. Route information between agents. Resolve blockers. Keep context narrow for each agent.
3. **Separate contexts.** Each builder gets only the context for their task group. Do not cross-contaminate.
4. **3-failure escalation.** After 3 consecutive agent failures on the same task group, stop retrying. Escalate to the user: present the failing criteria, the agent's last output, and ask how to proceed before any further attempts.

## Process

### Step 0: Check for partial build state

Read the "Partial Build Detection" section in `references/build-procedures.md` from this skill's base directory. Follow it to determine whether to resume or restart.

### Step 1: Read the plan

Read `.pipeline/plan.md` in full. Extract all task groups, their dependency ordering, which groups are parallel-safe, and the acceptance criteria for each group.

Then follow the "Task Creation" section in `references/build-procedures.md` to create or reuse tasks.

### Step 2A: Parallel Mode

For each independent task group (those with no unmet dependencies), invoke the `task-builder` agent simultaneously. Issue all invocations in the same response turn.

Before dispatching each task group agent, call TaskUpdate with status: "in_progress" for that task.

Invocation for each group:
```
Implement Task Group [N] — [Name]
```

Monitor agent outputs. When blocked: investigate, provide textual guidance (never code), record in TaskUpdate. After success + acceptance criteria verified: TaskUpdate → "completed".

Apply 3-failure escalation (Hard Rule #4) if needed. After all parallel groups complete, dispatch dependent groups the same way.

### Step 2B: Sequential Mode

For each task group in dependency order:

1. TaskUpdate → "in_progress"
2. Invoke `task-builder` agent: "Implement Task Group [N] — [Name]"
3. Review output against acceptance criteria
4. Pass → TaskUpdate "completed", next group
5. Fail → record blocker in TaskUpdate, provide correction guidance, re-invoke

Apply 3-failure escalation (Hard Rule #4) if needed.

### Steps 3–5: Post-build verification

Read the "Post-Build Drift Verification" section in `references/build-procedures.md` from this skill's base directory. Follow it to run drift detection, evaluate results, remediate if needed, and write `.pipeline/build.complete` on pass.

