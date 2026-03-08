---
name: pack
description: Pack the local codebase using Repomix CLI into three targeted snapshots (code, docs, full) stored in .pipeline/ for sharing across /qa audit agents. Run before /qa for maximum token efficiency. Usage: /pack [path] (defaults to cwd).
argument-hint: [path]
compatibility:
  requires: ["Repomix CLI"]
  optional: []
---

# PACK — Codebase Snapshot

## Role

> **Model:** Haiku (`claude-haiku-4-5`). Haiku is sufficient for this task. Sonnet or Opus will also work.

Pack the current project into three targeted Repomix snapshots via CLI:

| Variant | File | Purpose |
|---------|------|---------|
| **code** | `repomix-code.xml` | Source code only — used by `/cleanup`, `/frontend-audit`, `/backend-audit`, `/security-review` |
| **docs** | `repomix-docs.xml` | Documentation only — used by `/doc-audit` |
| **full** | `repomix-full.xml` | Full codebase — fallback and ad-hoc use |

Metadata stored at `.pipeline/repomix-pack.json`. All `/qa` audit agents read from their mapped snapshot variant instead of independently discovering files.

## Hard Rules

1. **Repomix must be installed.** If `repomix` is not found on PATH, stop: "PACK BLOCKED — repomix is not installed. Run `npm install -g repomix` first."
2. **Never modify source files.** This skill only reads the codebase and writes to `.pipeline/`.
3. **Use the bundled script.** Do not reconstruct the Repomix commands manually. Run `scripts/repomix-pack.js` so `/pack` and the SessionEnd hook share one deterministic implementation.

## Process

### Step 1: Resolve path

If an argument is provided, use it as the target directory. Otherwise use the current working directory.

### Step 2: Run the bundled packer

Run the bundled script from this skill directory:

```bash
node scripts/repomix-pack.js --source <resolved-path> --pipeline-dir <resolved-path>/.pipeline --json
```

The script:
- verifies `repomix` is installed
- generates the three snapshots deterministically
- writes `.pipeline/repomix-pack.json`
- returns a stable JSON report with `source`, `manifestPath`, `snapshots`, and any partial failures

If the script exits non-zero with the `PACK BLOCKED` message, stop with the message from Hard Rule #1.
If it returns a partial-success JSON payload, report the failures explicitly but still treat `/pack` as successful.

### Step 3: Report

Report to user:

```
Pack complete.
  code:  .pipeline/repomix-code.xml  (<size>KB)
  docs:  .pipeline/repomix-docs.xml  (<size>KB)
  full:  .pipeline/repomix-full.xml  (<size>KB)
  Source: <path>

QA agents will use their mapped snapshot variant.
Run /qa to use these packs across all audits.
```

## Output

Three snapshots written to `.pipeline/`. `.pipeline/repomix-pack.json` updated with paths, sizes, and timestamp. Run `/qa` to use these packs across all five audit agents.
