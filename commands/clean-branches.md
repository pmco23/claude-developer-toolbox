---
allowed-tools: Bash(git fetch:*), Bash(git branch:*), Bash(git worktree:*), Bash(git rev-parse:*)
description: Remove local branches deleted from remote
---

## Context

- Local branches: !`git branch -v`
- Worktrees: !`git worktree list`

## Your task

Clean up stale local branches that have been deleted from the remote.

Steps:
1. Run `git fetch --prune` to update remote tracking info.
2. List branches marked as `[gone]` using `git branch -v | grep '\[gone\]'`.
3. If no branches are gone, report: "No stale branches found. Nothing to clean up."
4. For each gone branch:
   - Check if it has an associated worktree. If so, remove the worktree first with `git worktree remove --force`.
   - Delete the branch with `git branch -D <name>`.
   - Report each removal.
5. Summarize: "Cleaned [N] stale branches."

Never delete the current branch. If the current branch is gone, warn and skip it.
