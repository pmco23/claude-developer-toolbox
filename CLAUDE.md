# Project Conventions

Language: Bash (hooks), JavaScript (hook scripts/statusline), Markdown (skills/references/docs), JSON (config)
Test command: `bash hooks/test-gate.sh && node scripts/grade-runtime-fixtures.js`
Lint command: none
Build command: none

Style config: hooks follow POSIX-compatible bash (`set -euo pipefail`). Skills follow the SKILL.md format defined in the plugin spec.

## Project structure

- `skills/<name>/SKILL.md` — skill definitions (loaded by Claude Code on invocation)
- `skills/<name>/references/` — progressive-disclosure content loaded by skills at specific steps
- `hooks/` — UserPromptSubmit/PreToolUse/PostToolUse/PreCompact/SessionStart/SessionEnd bash hooks
- `hooks/lib/` — sourceable shared libraries (no shebang, not executable)
- `scripts/` — Node.js hook helpers for project-local session memory (`session-context.js`, `session-summary.js`)
- `skills/pack/scripts/repomix-pack.js` — shared deterministic Repomix packer used by `/pack` and the SessionEnd pack hook
- `skills/pr-qa/scripts/collect-diff-context.js` — diff collector used by `/pr-qa` to scope pre-PR review to changed files
- `hooks/test-gate.sh` — gate test suite (run before every commit)
- `tests/runtime-fixtures/` — curated transcript fixtures for `/brief`, `/build`, `/cleanup`, `/design`, `/drift-check`, `/init`, `/pr-qa`, `/qa`, `/quick`, `/review`, `/rollback`, `/test`, and `task-builder`
- `scripts/grade-runtime-fixtures.js` — fixture grader for the runtime transcripts
- `.claude-plugin/plugin.json` — plugin manifest (version source of truth)
- `.claude-plugin/marketplace.json` — local dev marketplace manifest
- `docs/guides/` — user-facing documentation
- `docs/guides/interview-system.md` — shared adaptive interview pattern for requirement-gathering skills

## Editing rules

- Keep SKILL.md files concise. Extract inline templates, checklists, and procedures to `references/` for progressive disclosure.
- Requirement-gathering skills should use the shared adaptive interview pattern from `docs/guides/interview-system.md` instead of hard-coded question scripts.
- Never put skills, hooks, or other components inside `.claude-plugin/` — that directory contains only manifests.
- All hooks must be executable (`chmod +x`) and use `#!/usr/bin/env bash`.
- Run `bash hooks/test-gate.sh` after any change to hooks or gate logic. All tests must pass.
- Run `node scripts/grade-runtime-fixtures.js` after changing workflow contracts, agent outputs, or transcript fixtures.
- Session memory stays project-local in `.claude/session-log.md`; do not commit raw logs or add external dependencies to the memory flow.
- Session memory hooks must fail open: exit 0 on empty input, malformed input, or missing transcript files.
- Version is tracked in both `plugin.json` and `marketplace.json` — always bump both.

# Git Conventions

Branching: Conventional Branch — `<type>/<short-description>` (feat, fix, hotfix, chore, release)
Commits: Conventional Commits — `<type>[scope][!]: <description>` (feat, fix, docs, refactor, test, chore, ci, build, perf)
Merge strategy: squash-merge to main
Protected branches: never push directly to main or master — use a PR

# Plugin Configuration (claude-developer-toolbox)
# Uncomment a flag to enable it.
# tdd: disabled
# session-end-pack: disabled

# Session Memory

- `SessionStart` runs `scripts/session-context.js` to load the last 3 summaries from `.claude/session-log.md` into Claude's context.
- `SessionEnd` runs `scripts/session-summary.js` to append a heuristic summary of the session to `.claude/session-log.md`.
- The memory system is intentionally local-only and dependency-free: no network calls, no database, no background service, no transcript dumps.
- If `.gitignore` exists but does not include `.claude/session-log.md`, the hook prints a one-time reminder instead of editing the file automatically.
