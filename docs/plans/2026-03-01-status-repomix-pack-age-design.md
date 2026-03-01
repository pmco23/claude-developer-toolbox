# Design: /status Artifact Age Display + Repomix Pack Row

**Date:** 2026-03-01
**Feature:** S7 — Show age for all pipeline artifacts and Repomix pack in `/status` output

## Context

`/status` reports the current pipeline phase by checking 5 `.pipeline/` artifacts. Currently it shows only `✓ exists` / `✗ missing` — no age information. When `/pack` runs, it writes `.pipeline/repomix-pack.json` with `outputId`, `source`, `packedAt`, `fileCount`, `tokensBefore`, and `tokensAfter`. Neither the pipeline artifact age nor the pack age is visible at a glance.

## Design

### Change: Step 2 — Artifact check

For each of the 5 existing pipeline artifacts, read the file mtime when it exists. Add `repomix-pack.json` as a sixth artifact; read `packedAt` from the JSON for its age.

### Change: Step 4 — Report format

Replace `✓ exists` with `✓ <age>` for all present artifacts.

**Example output:**
```
Pipeline status: Design written, pending review

  brief.md         ✓ 3d 2h old
  design.md        ✓ 1d 14h old
  design.approved  ✗ missing
  plan.md          ✗ missing
  build.complete   ✗ missing
  repomix-pack     ✓ 23m old — 142 files, 8,450 tokens

Next: Run /review
```

**Stale repomix-pack (≥ 1 hour):**
```
  repomix-pack     ⚠ 2h 14m old — 142 files, 8,450 tokens (stale — run /pack to refresh)
```

**Absent repomix-pack:**
```
  repomix-pack     ✗ missing
```

### Age format

| Duration | Format | Example |
|----------|--------|---------|
| < 1 hour | `Nm old` | `23m old` |
| < 1 day | `Nh Nm old` | `2h 14m old` |
| ≥ 1 day | `Nd Hh old` | `3d 2h old` |

### Age source

| Artifact | Source |
|----------|--------|
| `brief.md`, `design.md`, `design.approved`, `plan.md`, `build.complete` | File mtime |
| `repomix-pack.json` | `packedAt` ISO timestamp from JSON content |

### Staleness

Staleness marker (`⚠`) applies **only** to `repomix-pack` (threshold: 1 hour, matching `/qa` preamble auto-repack logic). The 5 pipeline artifacts have no defined freshness threshold — age is informational only.

### No phase logic changes

Age display does not affect phase determination in Step 3. Informational only.

## Files Affected

- `skills/status/SKILL.md` — only file changed
