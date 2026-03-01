# /status Artifact Age Display Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show file age for all 5 pipeline artifacts and add a sixth `repomix-pack` row (with token stats and staleness warning) to the `/status` report.

**Architecture:** Single SKILL.md edit. Step 2 gains age-reading instructions for each artifact; Step 4's report template gains `✓ <age>` formatting and a new repomix-pack row. No scripts or new files.

**Tech Stack:** SKILL.md prose instructions — Claude reads file mtime and JSON `packedAt` at runtime.

---

### Task 1: Update `skills/status/SKILL.md`

**Files:**
- Modify: `skills/status/SKILL.md`

**Step 1: Read the current file**

Read `skills/status/SKILL.md` in full before editing.

**Step 2: Replace Step 2 — Check artifacts**

Replace the entire `### Step 2: Check artifacts` section with:

```markdown
### Step 2: Check artifacts and ages

For each of the 5 pipeline artifacts, check whether it exists and, if so, read its **file modification time** to compute age from now:

| Artifact | Skill that writes it |
|----------|---------------------|
| `.pipeline/brief.md` | `/brief` |
| `.pipeline/design.md` | `/design` |
| `.pipeline/design.approved` | `/review` |
| `.pipeline/plan.md` | `/plan` |
| `.pipeline/build.complete` | `/build` |

Also check `.pipeline/repomix-pack.json`. If it exists, read the `packedAt` field (ISO timestamp) to compute age from now.

**Age format:**

| Duration | Format | Example |
|----------|--------|---------|
| < 1 hour | `Nm old` | `23m old` |
| < 1 day | `Nh Nm old` | `2h 14m old` |
| ≥ 1 day | `Nd Hh old` | `3d 2h old` |
```

**Step 3: Replace Step 4 — Report**

Replace the entire `### Step 4: Report` section with:

```markdown
### Step 4: Report

```
Pipeline status: [phase name]

  brief.md         [✓ <age> | ✗ missing]
  design.md        [✓ <age> | ✗ missing]
  design.approved  [✓ <age> | ✗ missing]
  plan.md          [✓ <age> | ✗ missing]
  build.complete   [✓ <age> | ✗ missing]
  repomix-pack     [✓ <age> — <fileCount> files, <tokensAfter> tokens | ⚠ <age> — <fileCount> files, <tokensAfter> tokens (stale — run /pack to refresh) | ✗ missing]

Next: [next step]
```

**repomix-pack row rules:**
- If `.pipeline/repomix-pack.json` exists and age < 1 hour: `✓ <age> — <fileCount> files, <tokensAfter> tokens`
- If `.pipeline/repomix-pack.json` exists and age ≥ 1 hour: `⚠ <age> — <fileCount> files, <tokensAfter> tokens (stale — run /pack to refresh)`
- If `.pipeline/repomix-pack.json` does not exist: `✗ missing`
```

**Step 4: Verify the full file looks correct**

Read `skills/status/SKILL.md` and confirm:
- Step 2 heading is `### Step 2: Check artifacts and ages`
- Step 2 has the age format table
- Step 2 mentions `repomix-pack.json` and `packedAt`
- Step 4 report template shows 6 rows (brief, design, design.approved, plan, build.complete, repomix-pack)
- Step 4 uses `✓ <age>` not `✓ exists`
- Step 4 has repomix-pack row rules (fresh / stale / missing)

**Step 5: Commit**

```bash
git add skills/status/SKILL.md
git commit -m "feat: show artifact age in /status — all 5 pipeline files + repomix-pack row with staleness indicator"
```
