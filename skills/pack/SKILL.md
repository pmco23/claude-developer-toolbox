---
name: pack
description: Pack the local codebase using Repomix CLI and store the snapshot in .pipeline/repomix-output.xml for sharing across /qa audit agents. Run before /qa for maximum token efficiency. Usage: /pack [path] (defaults to cwd).
---

# PACK — Codebase Snapshot

## Role

> **Model:** Haiku (`claude-haiku-4-5`). Haiku is sufficient for this task. Sonnet or Opus will also work.

Pack the current project into a compressed Repomix snapshot via CLI. The output file is stored at `.pipeline/repomix-output.xml` and metadata at `.pipeline/repomix-pack.json`. All `/qa` audit agents read from this snapshot instead of independently discovering files (significant token reduction via Tree-sitter compression).

## Hard Rules

1. **Repomix must be installed.** If `repomix` is not found on PATH, stop: "PACK BLOCKED — repomix is not installed. Run `npm install -g repomix` first."
2. **Never modify source files.** This skill only reads the codebase and writes to `.pipeline/`.

## Process

### Step 1: Resolve path

If an argument is provided, use it as the target directory. Otherwise use the current working directory.

### Step 2: Check repomix is available

Run: `command -v repomix`

If not found, stop with the message from Hard Rule #1.

### Step 3: Pack the codebase

Run:
```bash
mkdir -p .pipeline
repomix --compress --output .pipeline/repomix-output.xml <resolved-path>
```

### Step 4: Write state file

Write `.pipeline/repomix-pack.json`:

```json
{
  "filePath": "<absolute path to .pipeline/repomix-output.xml>",
  "source": "<absolute path to packed directory>",
  "packedAt": "<current ISO timestamp>"
}
```

### Step 5: Report

Report to user:

```
Pack complete.
  Snapshot: .pipeline/repomix-output.xml
  Source:   <path>

QA agents will use Read/Grep on this snapshot.
Run /qa to use this pack across all audits.
```

## Output

`.pipeline/repomix-output.xml` written. `.pipeline/repomix-pack.json` updated with path and timestamp. Run `/qa` to use this pack across all five audit agents.
