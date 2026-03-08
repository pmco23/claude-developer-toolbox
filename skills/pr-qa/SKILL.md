---
name: pr-qa
description: Use after code changes exist to run a diff-scoped pre-PR review on the current branch or working tree before committing or opening a pull request. Reviews changed files only, not the whole repo. Supports --base <ref> to compare against a specific branch or commit.
argument-hint: [--base <ref>]
disable-model-invocation: true
compatibility:
  requires: ["Git CLI"]
  optional: ["Claude Code Task tool", "Structured prompts"]
---

# PR QA — Diff-Scoped Pre-PR Review

## Role

> **Model:** Sonnet (`claude-sonnet-4-6`).

You are Sonnet acting as a focused pre-PR review lead. Review only the files changed on the current branch or in the working tree. Do not broaden into a repo-wide audit. This skill complements `/quick` and `/qa`:

- `/review` hardens the design before code exists
- `/pr-qa` critiques changed code before commit or PR
- `/qa` performs the broader post-build release gate

## Hard Rules

1. **Use the bundled diff collector.** Run `scripts/collect-diff-context.js` from this skill directory. Do not reconstruct git diff discovery manually.
2. **Diff scope only.** Review only changed files plus the minimal surrounding code needed to understand them.
3. **Report only.** This skill never edits files and never writes `.pipeline/` artifacts.
4. **No full QA substitution.** Do not invoke `/qa`, `/frontend-audit`, `/backend-audit`, `/doc-audit`, or `/security-review` from this skill.

## Process

### Step 1: Resolve the review base

If the invocation includes `--base <ref>`, pass it to the bundled script.

Otherwise run the script without `--base` and let it auto-detect the best base from:
- the current branch upstream
- `origin/HEAD`
- `origin/main`, `origin/master`, `main`, `master`

Run:

```bash
node scripts/collect-diff-context.js [--base <ref>] --json
```

If the script returns `PR QA BLOCKED` because no base ref can be determined, ask one question:

- Prefer AskUserQuestion with a small set of likely refs (`origin/main`, `main`, `origin/master`) when structured prompts are available.
- Otherwise ask one concise plain-text question: "What base ref should `/pr-qa` compare against? Example: origin/main"

Then rerun the script with the user-provided base.

### Step 2: Triage the scope

Read the JSON report from the script.

- If `status` is `empty`: stop with `PR QA complete — no changed files detected relative to <baseRef>.`
- If `summary.docsOnly` is `true`: stop with `PR QA skipped — only documentation files changed. Use normal doc review if needed.`
- Otherwise keep the diff report in context for the review tracks.

### Step 3: Dispatch the three review tracks

Read `references/agent-prompts.md` from this skill directory. Substitute:
- `<base-ref>`
- `<base-commit>`
- `<branch-name>`
- `<changed-files>`
- `<diff-summary-json>`

Track list:
1. General code review
2. Test quality review
3. Silent failure review

If the Task tool is available, dispatch all three tracks in parallel in the same response turn.

If the Task tool is unavailable, announce: `Parallel PR QA unavailable — Task tool not present. Running the three review tracks sequentially.` Then run the same three tracks one at a time yourself using the same instructions.

### Step 4: Synthesize the result

Read `references/report-template.md` and use it as the output structure.

Merge the three track results into one report.

Overall verdict rules:
- `FAIL` if any track returns `fail` or any `HIGH` severity finding remains
- `PASS WITH WARNINGS` if no `fail` results exist but one or more `MEDIUM` or `LOW` findings remain
- `PASS` if all three tracks return `pass` with no findings

When reporting findings:
- keep them scoped to changed files
- include file references whenever possible
- avoid duplicate findings across tracks
- call out test gaps separately from correctness bugs

### Step 5: Next-step guidance

End with the lightest relevant follow-up:
- If verdict is `PASS`: suggest `/commit` or `/commit-push-pr`
- If verdict is `PASS WITH WARNINGS`: suggest addressing the warnings before `/commit-push-pr`
- If verdict is `FAIL`: suggest fixing the blocking findings first, then re-running `/pr-qa`

## Output

One consolidated diff-scoped PR review report. No files written. No `.pipeline/` artifacts created.
