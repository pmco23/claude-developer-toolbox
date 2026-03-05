---
allowed-tools: Bash(git fetch:*), Bash(git rebase:*), Bash(git merge:*), Bash(git branch:*), Bash(git status:*), Bash(git rev-parse:*), Bash(git log:*)
description: Fetch and rebase current branch onto upstream
---

## Context

- Current branch: !`git branch --show-current`
- Default branch: !`git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main"`
- Current status: !`git status --short`

## Your task

Sync the current branch with the remote.

Steps:
1. If there are uncommitted changes, warn: "You have uncommitted changes. Commit or stash them first." and stop.
2. Run `git fetch origin`.
3. Rebase the current branch onto the default branch (main/master): `git rebase origin/<default-branch>`.
4. If rebase conflicts occur, abort the rebase (`git rebase --abort`) and report: "Rebase conflicts detected. Resolve manually or use `git merge origin/<default-branch>` instead."
5. If successful, report how many commits ahead/behind and the sync result.

Execute in a single message where possible.
