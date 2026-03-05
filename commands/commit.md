---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git commit:*), Read
description: Stage changes and create a conventional commit
---

## Context

- Current git status: !`git status`
- Staged and unstaged changes: !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits (for style reference): !`git log --oneline -10`
- CLAUDE.md commit conventions (if present): !`head -30 CLAUDE.md 2>/dev/null || echo "No CLAUDE.md found"`

## Your task

Create a single git commit following Conventional Commits format: `<type>[scope]: <description>`

Types: feat, fix, docs, refactor, test, chore, ci, build, perf

Rules:
1. Read CLAUDE.md for project-specific commit conventions. If none found, match the style of recent commits.
2. Stage relevant files. Never stage files likely containing secrets (.env, credentials.json, *.key, *.pem).
3. Write a concise commit message focused on the "why" not the "what".
4. Use a HEREDOC for the commit message to ensure correct formatting.
5. Do not push. Do not create branches. Just commit.

You have the capability to call multiple tools in a single response. Stage and create the commit in a single message.
