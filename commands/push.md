---
allowed-tools: Bash(git push:*), Bash(git branch:*), Bash(git remote:*), Bash(git status:*), Bash(git rev-parse:*)
description: Push current branch to remote
---

## Context

- Current branch: !`git branch --show-current`
- Remote tracking: !`git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "No upstream set"`
- Unpushed commits: !`git log @{u}..HEAD --oneline 2>/dev/null || echo "No upstream to compare"`

## Your task

Push the current branch to the remote.

Rules:
1. If on main or master, warn: "You are on a protected branch. Consider creating a feature branch first." Ask for confirmation before pushing.
2. If no upstream is set, push with `-u origin <branch>` to set tracking.
3. If upstream exists, push normally.
4. Never force-push. If push is rejected, report the error and suggest `/sync` first.

Execute the push in a single message.
