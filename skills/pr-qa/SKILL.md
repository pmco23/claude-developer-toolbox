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

Read:
- `../../docs/guides/interview-system.md`
- `references/interview-fields.md`

If the invocation includes `--base <ref>`, pass it to the bundled script.

Otherwise run the script without `--base` and let it auto-detect the best base from:
- the current branch upstream
- `origin/HEAD`
- `origin/main`, `origin/master`, `main`, `master`

Run:

```bash
node scripts/collect-diff-context.js [--base <ref>] --json
```

The script returns JSON with:
- `status`: `ok | empty | error`
- `code`: stable error code on failures
- `message`: human-readable explanation when `status` is `error`

If the script returns `status: "error"` with `code: "base_ref_required"`, ask one question:

- Prefer AskUserQuestion with a small set of likely refs (`origin/main`, `main`, `origin/master`) when structured prompts are available, plus `"Other / let me explain"` as the free-form option.
- Otherwise ask one concise plain-text question: "What base ref should `/pr-qa` compare against? Example: origin/main"

Then rerun the script with the user-provided base.

If the script returns `status: "error"` with any other code, stop and surface the message. Do not guess or reconstruct the diff context manually.

### Step 2: Triage the scope

Read the JSON report from the script.

Emit a compact `[Requirements]` block immediately after diff collection resolves. Include:
- Goal: diff-scoped pre-PR review
- Inputs: base ref, base commit if known, changed files summary
- Constraints: changed files only, no repo-wide audit, report-only
- Assumptions: any defaults used by the collector
- Open questions: `None` when the collector resolved cleanly, otherwise the blocked or deferred detail

If the script returned `status: "error"`, include that blocked state in the block before stopping.

- If `status` is `empty`: stop with `PR QA complete — no changed files detected relative to <baseRef>.`
- If `summary.docsOnly` is `true`: stop with `PR QA skipped — only documentation files changed. Review the docs diff directly before /commit or /commit-push-pr. If this change is already part of a build-complete pipeline, /doc-audit can be used separately.`
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

If the Task tool is available, dispatch all three tracks in parallel in the same response turn. Each track must return a fenced `json` block matching the schema in `references/agent-prompts.md`.

If the Task tool is unavailable, announce: `Parallel PR QA unavailable — Task tool not present. Running the three review tracks sequentially.` Then run the same three tracks one at a time yourself using the same instructions.

### Step 4: Synthesize the result

Read `references/report-template.md` and use it as the output structure.

Parse the fenced `json` block from each track result. If a track omits valid JSON or returns malformed JSON, re-run that track once with a narrow instruction: `Re-send only the final JSON report, wrapped in a fenced json block.` If the retry still fails, stop and tell the user that the track report was invalid.

Merge the three structured track results into one report.

Overall verdict rules:
- `FAIL` if any track returns `fail` or any `HIGH` severity finding remains
- `PASS WITH WARNINGS` if no `fail` results exist but one or more `MEDIUM` or `LOW` findings remain
- `PASS` if all three tracks return `pass` with no findings

When reporting findings:
- keep them scoped to changed files
- include file references whenever possible
- avoid duplicate findings across tracks
- call out test gaps separately from correctness bugs

Emit a fenced `json` summary block first, then the human-readable Markdown report from `references/report-template.md`.

### Step 5: Next-step guidance

End with the lightest relevant follow-up:
- If verdict is `PASS`: suggest `/commit` or `/commit-push-pr`
- If verdict is `PASS WITH WARNINGS`: suggest addressing the warnings before `/commit-push-pr`
- If verdict is `FAIL`: suggest fixing the blocking findings first, then re-running `/pr-qa`

## Output

One consolidated diff-scoped PR review report with a leading machine-readable fenced `json` summary block. No files written. No `.pipeline/` artifacts created.
