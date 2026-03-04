---
name: qa
description: Use after /build to run the full post-build QA pipeline. Supports --parallel (all audits simultaneously) or --sequential (denoise → qf → qb → qd → security-review in order). Requires .pipeline/build.complete.
---

# QA — Post-Build QA Pipeline

## Role

> **Model:** Sonnet (`claude-sonnet-4-6`).

You are Sonnet acting as a QA pipeline orchestrator. Acquire a Repomix pack, then dispatch the five audit agents according to the selected mode.

## Repomix Preamble

Before dispatching any agents, acquire a Repomix outputId for the codebase:

1. Check if `.pipeline/repomix-pack.json` exists
2. If it exists, read `packedAt` — if less than 1 hour old, use the stored `outputId`
3. If missing or stale, invoke the `/pack` skill — it packs the codebase and writes `.pipeline/repomix-pack.json` with the correct schema.
4. After `/pack` completes, read `outputId` from `.pipeline/repomix-pack.json`.
5. If `/pack` fails or Repomix is unavailable, proceed without an outputId — omit the Repomix instruction from agent prompts; agents fall back to native Glob/Read/Grep.

Hold the outputId in context for use in the agent prompts below.

## PASS Criteria

An overall PASS requires:
- Zero findings in /cleanup, /frontend-audit, /backend-audit, and /doc-audit
- Zero CRITICAL or HIGH findings in /security-review (MEDIUM and LOW do not block PASS)

These criteria apply to both parallel and sequential mode and are shown in the Overall QA Verdict table at the end of each run.

## Mode Selection

Check the invocation arguments:
- If `/qa --parallel` was used: parallel mode
- If `/qa --sequential` was used: sequential mode
- If no flag: ask the user before proceeding

Use AskUserQuestion with:
  question: "Which QA mode?"
  header: "QA mode"
  options:
    - label: "Parallel"
      description: "All 5 audits run simultaneously — faster, independent concerns"
    - label: "Sequential"
      description: "One audit at a time in order — review each result before continuing"

## Process

### Parallel Mode

Read `references/agent-prompts.md` from this skill's base directory. Dispatch all five agents simultaneously via the Task tool, substituting `<outputId>` with the acquired Repomix outputId (or omitting the Repomix instruction if unavailable).

Wait for all five to complete, then present the consolidated report and Overall QA Verdict using the format in `references/report-template.md`. Apply PASS Criteria (defined above).

### Sequential Mode

Run in order, presenting each result before proceeding. When invoking each skill, prepend the Repomix context: "Repomix outputId: <outputId> — use mcp__repomix__grep_repomix_output for file discovery and mcp__repomix__read_repomix_output for file contents." If no outputId was acquired, omit this.

1. `cleanup` — present findings — ask "Continue to /frontend-audit? (yes / fix first — then re-run /qa to verify)"
2. `frontend-audit` — present findings — ask "Continue to /backend-audit?"
3. `backend-audit` — present findings — ask "Continue to /doc-audit?"
4. `doc-audit` — present findings — ask "Continue to /security-review?"
5. `security-review` — present final findings

After all five complete, present the Overall QA Verdict using `references/report-template.md`. Apply PASS Criteria (defined above).

## Output

Present consolidated or sequential findings to the user. No file written to `.pipeline/`.
