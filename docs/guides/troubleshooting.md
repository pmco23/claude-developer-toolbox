# Troubleshooting

## "No brief found. Run /brief first"

You tried to run `/design` without a brief. Run `/brief` first.

## "Design not approved. Run /review and iterate until all findings resolve."

You tried to run `/plan` without going through `/review`. Run `/review` and iterate until the review loop resolves.

## "Claude didn't auto-run /brief, /build, or another workflow skill"

That is expected for the stateful slash workflows in this plugin. Core pipeline
and safety skills set `disable-model-invocation: true` so they only start when
you run the slash command explicitly.

Examples:
- `/brief`
- `/build`
- `/pr-qa`
- `/qa`
- `/git-workflow`
- `/rollback`

Run the command directly to enter the workflow.

## "I expected a picker, but Claude asked a plain-text question"

The current runtime does not expose structured prompts. The skills are designed
to fail soft: answer the question inline and the workflow will continue with the
same logic. If the original prompt was additive, reply with a concise
comma-separated list instead of expecting an `all of the above` option.

## "`/pr-qa` skipped because only docs changed"

That is expected. `/pr-qa` is a diff-scoped code review lane, not a standalone
documentation auditor.

Recommended next step:
- review the docs diff directly before `/commit` or `/commit-push-pr`
- if the docs change is already part of a build-complete pipeline, run
  `/doc-audit` separately

## Gate is not firing (hook not active)

1. Verify the plugin is installed: in Claude Code, run `/plugin list` and confirm `claude-developer-toolbox@pmco23-tools` appears.
2. Restart Claude Code — hooks are loaded at startup.
3. Check that `hooks/pipeline-gate.sh` is executable: `ls -la ~/claude-developer-toolbox/hooks/`
4. Check `hooks/hooks.json` is valid: `python3 -m json.tool ~/claude-developer-toolbox/hooks/hooks.json`

## Resetting pipeline state

```bash
# Full reset
rm -rf .pipeline/

# Partial reset — see docs/guides/workflows.md#resetting-to-a-prior-phase
```

## Verifying gate logic and runtime fixtures

Run both verification layers to confirm the hook bundle and curated runtime
fixtures are healthy:

```bash
bash ~/claude-developer-toolbox/hooks/test-gate.sh
node ~/claude-developer-toolbox/scripts/grade-runtime-fixtures.js
```

Expected:

- `hooks/test-gate.sh` => `Results: 88 passed, 0 failed`
- `grade-runtime-fixtures.js` => `Results: 125 passed, 0 failed`

## Statusline symlink did not update

The `SessionStart` hook will not overwrite a custom statusline or another
plugin's statusline. It only creates or refreshes `~/.claude/statusline.js`
when the file is missing or already points to `claude-developer-toolbox`.

If you want this plugin's statusline, replace it manually:

```bash
ln -sf /path/to/claude-developer-toolbox/hooks/statusline.js ~/.claude/statusline.js
```

## "Recent session history did not appear at startup"

Check these conditions:

1. `.claude/session-log.md` exists in the current project root
2. the file contains at least one `## Session:` entry
3. Claude Code was restarted after installing or updating the plugin
4. `hooks/hooks.json` still includes the `SessionStart` command for `scripts/session-context.js`

The context hook is bounded on purpose: it only injects the last 3 entries, not
the whole log.

## ".claude/session-log.md keeps showing up in git status"

The memory file is project-local. If you do not want it tracked, add this to
your project's `.gitignore`:

```gitignore
.claude/session-log.md
```

The plugin only prints a one-time reminder; it does not edit `.gitignore`
automatically.

## "Rollback blocked" safety checks

`/rollback` now stops rather than guessing when the worktree is unsafe.

Common causes:
- unrelated dirty files exist outside the selected rollback scope
- a modified file is not tracked by git
- a plan-derived path escapes the project root or targets a protected file

Fix the reported condition, then re-run `/rollback`.

## Plugin not loading after changes

```bash
/plugin uninstall claude-developer-toolbox@pmco23-tools
/plugin install claude-developer-toolbox@pmco23-tools
# Restart Claude Code
```
