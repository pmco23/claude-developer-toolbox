# Session Persistence Design

**Date:** 2026-03-02

## Problem

Claude Code has no memory between sessions. Each conversation starts from scratch, with no awareness of what was worked on, what decisions were made, or what state a feature is in.

## Goals

Persist three categories of information between sessions:
1. **Task state** — what's in progress, current pipeline phase, active branch
2. **Decisions** — architectural choices, patterns adopted, things to avoid
3. **Work log** — what was shipped/committed each session

Restoration must be:
- **Automatic (concise)** — a summary always injected into every conversation with no action needed
- **On-demand (full)** — full history retrievable when needed

## Non-Goals

- No CLAUDE.md modification — it is for project config, not session logs
- No in-repo session files — keeps git history clean
- No new `/init` changes — auto-injection already works via MEMORY.md

## Architecture

Two storage layers inside `~/.claude/projects/<project>/memory/` (Claude Code's auto-managed memory directory, outside the repo):

```
memory/
├── MEMORY.md              ← always injected into every conversation (≤200 lines)
└── sessions/
    ├── 2026-03-01.md      ← full session summary (unlimited)
    ├── 2026-03-02.md
    └── ...
```

**MEMORY.md** holds a "Last Session" block (≤15 lines) with a pointer to the full file. It is overwritten by `/end-session` at the end of each session.

**Session files** hold the full summary for a given day. Multiple sessions in one day are separated by `---` within the same file (append, not overwrite).

## New Skill: `/end-session`

### Trigger
User invokes `/end-session` explicitly at the end of a working session.

### Behavior

1. Read recent git log (~10 commits on current branch) → populate "Shipped"
2. Read `.pipeline/` state → populate "Pipeline" and current phase
3. Read active task list → populate "Task state"
4. Ask user: any decisions worth capturing? any open items / next steps?
5. Write full summary to `memory/sessions/YYYY-MM-DD.md`
6. Overwrite the "Last Session" block in `memory/MEMORY.md`

### MEMORY.md Block Format

```markdown
## Last Session — YYYY-MM-DD

**Branch:** <branch> | **Pipeline:** <phase>
**Worked on:** <short description>
**Shipped:** <list of commits or "nothing committed">
**Decisions:** <key decisions or "none">
**Next:** <open items>
→ Full notes: memory/sessions/YYYY-MM-DD.md
```

### Full Session File Format

```markdown
# Session — YYYY-MM-DD [HH:MM]

## Task State
- Branch: <branch>
- Pipeline phase: <phase>
- In progress: <description>

## Work Done
- <commit sha> <message>
- ...

## Decisions Made
- <decision and rationale>
- ...

## Open Items / Next Steps
- <item>
- ...

## Notes
<user-provided notes>
```

### Edge Cases

| Condition | Behavior |
|-----------|----------|
| No git repo | Omit "Shipped" section |
| No `.pipeline/` directory | Omit pipeline state |
| Multiple sessions same day | Append new block separated by `---` |
| `memory/sessions/` doesn't exist | Skill creates it |
| No existing "Last Session" in MEMORY.md | Skill appends block |

## Full History Retrieval

No new skill needed. Session files are plain markdown — Claude or the user can read them directly. They are also indexed by the `episodic-memory:search-conversations` plugin for semantic search.

## What Existing Mechanisms Already Cover

| Need | Mechanism |
|------|-----------|
| Always-injected context | `memory/MEMORY.md` (auto) |
| Full session history | `memory/sessions/*.md` |
| Semantic search over past decisions | `episodic-memory:search-conversations` |
| Feature lifecycle state | `.pipeline/` artifacts |
| Decision audit trail | `docs/plans/` design docs |
