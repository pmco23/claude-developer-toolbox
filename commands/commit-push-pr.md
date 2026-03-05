---
allowed-tools: Bash(git checkout:*), Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git push:*), Bash(git commit:*), Bash(git branch:*), Bash(gh pr create:*), Read
description: Commit, push, and open a pull request
---

## Context

- Current git status: !`git status`
- Staged and unstaged changes: !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`
- CLAUDE.md conventions (if present): !`head -30 CLAUDE.md 2>/dev/null || echo "No CLAUDE.md found"`

## Your task

Complete workflow: commit, push, and create a PR.

Steps:
1. If on main/master, create a new branch using Conventional Branch format: `<type>/<short-description>` (e.g., `feat/add-auth`, `fix/null-check`). Read CLAUDE.md for branching conventions.
2. Stage relevant files. Never stage files likely containing secrets (.env, credentials.json, *.key, *.pem).
3. Create a commit following Conventional Commits format: `<type>[scope]: <description>`. Use a HEREDOC for the message.
4. Push with `-u origin <branch>` if first push, else push normally.
5. Create a PR using `gh pr create` with:
   - Short title (under 70 chars)
   - Body with `## Summary` (1-3 bullets), `## Test plan` (checklist)
   - Use a HEREDOC for the body

Return the PR URL when done.

You have the capability to call multiple tools in a single response. Execute all steps in as few messages as possible.
