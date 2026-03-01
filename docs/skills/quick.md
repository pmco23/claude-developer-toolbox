# /quick — Fast Implementation

**Gate:** None (always available — pipeline-aware, never blocked)
**Writes:** nothing
**Model:** Sonnet (default) | Opus with `--deep`

Implements small features, bug fixes, typo corrections, config tweaks, or any well-understood change that does not require the full pipeline. Completely independent of the brief → design → review → plan → build → qa flow.

If a pipeline is active in the current project, a warning is shown before proceeding — you decide whether to continue.

After implementing, offers an optional lightweight audit on touched files only: LSP diagnostics, security spot-check on changed code, and a reminder to run existing tests if they exist. No `.pipeline/` artifacts written.

## Usage

```
/quick fix the null check in UserCard.tsx
/quick --deep refactor the auth middleware   # escalates to Opus
/quick                                        # prompts for task description
```

## Pipeline warnings

| Active state | Warning shown |
|---|---|
| Build in progress | `⚠ Build in progress — /quick may conflict with active builders if touching the same files.` |
| QA phase | `Pipeline at QA phase — /quick will not affect pipeline artifacts.` |
| Planning/design phases | Informational note, no risk |
