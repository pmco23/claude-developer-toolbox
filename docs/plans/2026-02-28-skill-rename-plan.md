# Skill Rename Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename 7 cryptic skill names to plain-English equivalents throughout the plugin codebase.

**Architecture:** Each rename requires: (1) `git mv` the skill directory, (2) update `name:` frontmatter, (3) update self-references within the renamed SKILL.md. Then batch-update cross-references in other SKILL.md files, the gate hook, the test suite, and README.

**Tech Stack:** Bash, Markdown. No code — all prose and shell script edits.

---

## Rename Map

| Old | New | Old directory | New directory |
|-----|-----|---------------|---------------|
| `arm` | `brief` | `skills/arm/` | `skills/brief/` |
| `ar` | `review` | `skills/ar/` | `skills/review/` |
| `pmatch` | `drift-check` | `skills/pmatch/` | `skills/drift-check/` |
| `qf` | `frontend-audit` | `skills/qf/` | `skills/frontend-audit/` |
| `qb` | `backend-audit` | `skills/qb/` | `skills/backend-audit/` |
| `qd` | `doc-audit` | `skills/qd/` | `skills/doc-audit/` |
| `denoise` | `cleanup` | `skills/denoise/` | `skills/cleanup/` |

---

## Task 1: Rename `arm` → `brief`

**Files:**
- Move: `skills/arm/` → `skills/brief/`
- Modify: `skills/brief/SKILL.md`

**Step 1: Move the directory**

```bash
cd /home/pemcoliveira/claude-agents-custom
git mv skills/arm skills/brief
```

**Step 2: Update frontmatter**

In `skills/brief/SKILL.md` line 2, change:
```
name: arm
```
to:
```
name: brief
```

**Step 3: Update description**

In `skills/brief/SKILL.md` line 3, the description ends with:
```
Always run this before /design.
```
This stays unchanged (no self-reference to `/arm` in the description).

**Step 4: Check for self-references**

```bash
grep -n "/arm\|\"arm\"" skills/brief/SKILL.md
```
Expected: 0 matches (the file has no self-references to `/arm`).

**Step 5: Verify frontmatter**

```bash
grep -n "^name:" skills/brief/SKILL.md
```
Expected: `2:name: brief`

**Step 6: Commit**

```bash
git add skills/brief/SKILL.md
git commit -m "refactor: rename skill arm → brief (directory + frontmatter)"
```

---

## Task 2: Rename `ar` → `review`

**Files:**
- Move: `skills/ar/` → `skills/review/`
- Modify: `skills/review/SKILL.md`

**Step 1: Move the directory**

```bash
git mv skills/ar skills/review
```

**Step 2: Update frontmatter**

In `skills/review/SKILL.md` line 2, change:
```
name: ar
```
to:
```
name: review
```

**Step 3: Check for self-references in the file body**

```bash
grep -n "/ar\b" skills/review/SKILL.md
```
Expected: 0 matches (the file body refers to `/design` and `/plan` but not back to itself).

**Step 4: Verify frontmatter**

```bash
grep "^name:" skills/review/SKILL.md
```
Expected: `name: review`

**Step 5: Commit**

```bash
git add skills/review/SKILL.md
git commit -m "refactor: rename skill ar → review (directory + frontmatter)"
```

---

## Task 3: Rename `pmatch` → `drift-check`

**Files:**
- Move: `skills/pmatch/` → `skills/drift-check/`
- Modify: `skills/drift-check/SKILL.md`

**Step 1: Move the directory**

```bash
git mv skills/pmatch skills/drift-check
```

**Step 2: Update frontmatter**

Change `name: pmatch` → `name: drift-check` on line 2.

**Step 3: Update self-references in the file body**

The file body contains two self-references. Make these replacements:

Old:
```
If /pmatch is running as part of the /build post-build check:
```
New:
```
If /drift-check is running as part of the /build post-build check:
```

Old:
```
If /pmatch is running standalone:
```
New:
```
If /drift-check is running standalone:
```

**Step 4: Verify**

```bash
grep -c "/pmatch" skills/drift-check/SKILL.md
```
Expected: `0`

```bash
grep "^name:" skills/drift-check/SKILL.md
```
Expected: `name: drift-check`

**Step 5: Commit**

```bash
git add skills/drift-check/SKILL.md
git commit -m "refactor: rename skill pmatch → drift-check (directory + frontmatter + self-refs)"
```

---

## Task 4: Rename `qf` → `frontend-audit`

**Files:**
- Move: `skills/qf/` → `skills/frontend-audit/`
- Modify: `skills/frontend-audit/SKILL.md`

**Step 1: Move the directory**

```bash
git mv skills/qf skills/frontend-audit
```

**Step 2: Update frontmatter**

Change `name: qf` → `name: frontend-audit`.

**Step 3: Update self-references and cross-reference to qb**

Make these replacements in `skills/frontend-audit/SKILL.md`:

Old (Role section):
```
defer to `/qb`.
```
New:
```
defer to `/backend-audit`.
```

Old (Output section):
```
Re-run `/qf` after fixing to confirm they are resolved.
```
New:
```
Re-run `/frontend-audit` after fixing to confirm they are resolved.
```

**Step 4: Verify**

```bash
grep -c '`/qf`\|`/qb`' skills/frontend-audit/SKILL.md
```
Expected: `0`

```bash
grep "^name:" skills/frontend-audit/SKILL.md
```
Expected: `name: frontend-audit`

**Step 5: Commit**

```bash
git add skills/frontend-audit/SKILL.md
git commit -m "refactor: rename skill qf → frontend-audit (directory + frontmatter + self-refs)"
```

---

## Task 5: Rename `qb` → `backend-audit`

**Files:**
- Move: `skills/qb/` → `skills/backend-audit/`
- Modify: `skills/backend-audit/SKILL.md`

**Step 1: Move the directory**

```bash
git mv skills/qb skills/backend-audit
```

**Step 2: Update frontmatter**

Change `name: qb` → `name: backend-audit`.

**Step 3: Update self-references and cross-reference to qf**

Old (Role section):
```
frontend TypeScript components are covered by `/qf`.
```
New:
```
frontend TypeScript components are covered by `/frontend-audit`.
```

Old (Output section):
```
Re-run `/qb` after fixing to confirm they are resolved.
```
New:
```
Re-run `/backend-audit` after fixing to confirm they are resolved.
```

**Step 4: Verify**

```bash
grep -c '`/qb`\|`/qf`' skills/backend-audit/SKILL.md
```
Expected: `0`

```bash
grep "^name:" skills/backend-audit/SKILL.md
```
Expected: `name: backend-audit`

**Step 5: Commit**

```bash
git add skills/backend-audit/SKILL.md
git commit -m "refactor: rename skill qb → backend-audit (directory + frontmatter + self-refs)"
```

---

## Task 6: Rename `qd` → `doc-audit`

**Files:**
- Move: `skills/qd/` → `skills/doc-audit/`
- Modify: `skills/doc-audit/SKILL.md`

**Step 1: Move the directory**

```bash
git mv skills/qd skills/doc-audit
```

**Step 2: Update frontmatter**

Change `name: qd` → `name: doc-audit`.

**Step 3: Update self-reference in Output section**

Old:
```
Re-run `/qd` after fixing to confirm.
```
New:
```
Re-run `/doc-audit` after fixing to confirm.
```

**Step 4: Verify**

```bash
grep -c '`/qd`' skills/doc-audit/SKILL.md
```
Expected: `0`

```bash
grep "^name:" skills/doc-audit/SKILL.md
```
Expected: `name: doc-audit`

**Step 5: Commit**

```bash
git add skills/doc-audit/SKILL.md
git commit -m "refactor: rename skill qd → doc-audit (directory + frontmatter + self-refs)"
```

---

## Task 7: Rename `denoise` → `cleanup`

**Files:**
- Move: `skills/denoise/` → `skills/cleanup/`
- Modify: `skills/cleanup/SKILL.md`

**Step 1: Move the directory**

```bash
git mv skills/denoise skills/cleanup
```

**Step 2: Update frontmatter**

Change `name: denoise` → `name: cleanup`.

**Step 3: Update self-references and cross-reference to qb**

Old (Note in Step 2):
```
If running as part of `/qa --parallel`, `/qb` also checks unused imports for Go and TypeScript. Overlapping findings on that category are expected — both reports are correct.
```
New:
```
If running as part of `/qa --parallel`, `/backend-audit` also checks unused imports for Go and TypeScript. Overlapping findings on that category are expected — both reports are correct.
```

Old (Output section):
```
Re-run `/denoise` to confirm.
```
New:
```
Re-run `/cleanup` to confirm.
```

**Step 4: Verify**

```bash
grep -c '`/denoise`\|`/qb`' skills/cleanup/SKILL.md
```
Expected: `0`

```bash
grep "^name:" skills/cleanup/SKILL.md
```
Expected: `name: cleanup`

**Step 5: Commit**

```bash
git add skills/cleanup/SKILL.md
git commit -m "refactor: rename skill denoise → cleanup (directory + frontmatter + self-refs)"
```

---

## Task 8: Update Cross-References in Other SKILL.md Files

Update every SKILL.md that is NOT being renamed but references the old names.

**Files:**
- Modify: `skills/design/SKILL.md`
- Modify: `skills/plan/SKILL.md`
- Modify: `skills/build/SKILL.md`
- Modify: `skills/qa/SKILL.md`
- Modify: `skills/quick/SKILL.md`
- Modify: `skills/init/SKILL.md`
- Modify: `skills/status/SKILL.md`

### `skills/design/SKILL.md`

Make these replacements:

| Old | New |
|-----|-----|
| `Use after /arm to transform` | `Use after /brief to transform` |
| `the adversarial review in /ar` | `the adversarial review in /review` |
| `## Open Questions for /ar` | `## Open Questions for /review` |
| `Run \`/ar\` to stress-test it.` | `Run \`/review\` to stress-test it.` |

Verify:
```bash
grep -c "/arm\|/ar\b" skills/design/SKILL.md
```
Expected: `0`

### `skills/plan/SKILL.md`

| Old | New |
|-----|-----|
| `Use after /ar to transform` | `Use after /review to transform` |

Verify:
```bash
grep -c "/ar\b" skills/plan/SKILL.md
```
Expected: `0`

### `skills/build/SKILL.md`

| Old | New |
|-----|-----|
| `Runs /pmatch post-build` (in description) | `Runs /drift-check post-build` |
| `run /pmatch:` | `run /drift-check:` |
| `Invoke /pmatch by dispatching` | `Invoke /drift-check by dispatching` |
| `` Invoke the `pmatch` skill `` | `` Invoke the `drift-check` skill `` |
| `### Step 4: Evaluate /pmatch result` | `### Step 4: Evaluate /drift-check result` |
| `If /pmatch finds MISSING` | `If /drift-check finds MISSING` |
| `Re-run /pmatch after remediation` | `Re-run /drift-check after remediation` |
| `Repeat until /pmatch passes` | `Repeat until /drift-check passes` |
| `When /pmatch passes` | `When /drift-check passes` |

Verify:
```bash
grep -c "/pmatch\|pmatch" skills/build/SKILL.md
```
Expected: `0`

### `skills/qa/SKILL.md`

| Old | New |
|-----|-----|
| `` Invoke the denoise skill `` | `` Invoke the cleanup skill `` |
| `` Invoke the qf skill `` | `` Invoke the frontend-audit skill `` |
| `` Invoke the qb skill `` | `` Invoke the backend-audit skill `` |
| `` Invoke the qd skill `` | `` Invoke the doc-audit skill `` |
| `## /denoise` | `## /cleanup` |
| `## /qf — Frontend` | `## /frontend-audit — Frontend` |
| `## /qb — Backend` | `## /backend-audit — Backend` |
| `## /qd — Documentation` | `## /doc-audit — Documentation` |
| `` Invoke the `denoise` skill `` | `` Invoke the `cleanup` skill `` |
| `` Invoke the `qf` skill `` | `` Invoke the `frontend-audit` skill `` |
| `` Invoke the `qb` skill `` | `` Invoke the `backend-audit` skill `` |
| `` Invoke the `qd` skill `` | `` Invoke the `doc-audit` skill `` |
| `Continue to /qf?` | `Continue to /frontend-audit?` |
| `Continue to /qb?` | `Continue to /backend-audit?` |
| `Continue to /qd?` | `Continue to /doc-audit?` |

Verify:
```bash
grep -c "denoise\|/qf\|/qb\|/qd" skills/qa/SKILL.md
```
Expected: `0`

### `skills/quick/SKILL.md`

| Old | New |
|-----|-----|
| `arm/design/ar/plan/build/qa flow` | `brief/design/review/plan/build/qa flow` |
| `` (`/qf`, `/qb`, `/qd`, `/security-review`) `` | `` (`/frontend-audit`, `/backend-audit`, `/doc-audit`, `/security-review`) `` |

Verify:
```bash
grep -c "/arm\|/ar\b\|/qf\|/qb\|/qd" skills/quick/SKILL.md
```
Expected: `0`

### `skills/init/SKILL.md`

| Old | New |
|-----|-----|
| `run /arm to crystallize` | `run /brief to crystallize` |

Verify:
```bash
grep -c "/arm" skills/init/SKILL.md
```
Expected: `0`

### `skills/status/SKILL.md`

| Old | New |
|-----|-----|
| `\| \`/arm\` \|` | `\| \`/brief\` \|` |
| `\| \`/ar\` \|` | `\| \`/review\` \|` |
| `Run \`/arm\`` | `Run \`/brief\`` |
| `Run \`/ar\`` | `Run \`/review\`` |

Verify:
```bash
grep -c '`/arm`\|`/ar`' skills/status/SKILL.md
```
Expected: `0`

**Commit all cross-reference updates together:**

```bash
git add skills/design/SKILL.md skills/plan/SKILL.md skills/build/SKILL.md \
        skills/qa/SKILL.md skills/quick/SKILL.md skills/init/SKILL.md skills/status/SKILL.md
git commit -m "refactor: update cross-references in all SKILL.md files to use new skill names"
```

---

## Task 9: Update Gate Hook

**Files:**
- Modify: `hooks/pipeline_gate.sh`

The current gate `case` block (lines 52–83) references old names. Make these changes:

**Line 69** — block message:
Old: `Run /arm first to crystallize requirements into a brief.`
New: `Run /brief first to crystallize requirements into a brief.`

**Line 71** — case label:
Old: `"ar")`
New: `"review")`

**Line 75** — block message:
Old: `Run /ar and iterate until all findings resolve.`
New: `Run /review and iterate until all findings resolve.`

**Line 77** — case label:
Old: `"build"|"pmatch")`
New: `"build"|"drift-check")`

**Line 80** — case label:
Old: `"denoise"|"qf"|"qb"|"qd"|"security-review"|"qa")`
New: `"cleanup"|"frontend-audit"|"backend-audit"|"doc-audit"|"security-review"|"qa")`

**Line 81** — block message:
Old: `ensure /pmatch passes.`
New: `ensure /drift-check passes.`

**Verify:**

```bash
grep -n "arm\|\"ar\"\|pmatch\|\"qf\"\|\"qb\"\|\"qd\"\|denoise" hooks/pipeline_gate.sh
```
Expected: `0` matches.

```bash
grep -n "brief\|review\|drift-check\|frontend-audit\|backend-audit\|doc-audit\|cleanup" hooks/pipeline_gate.sh
```
Expected: matches on the updated lines.

**Commit:**

```bash
git add hooks/pipeline_gate.sh
git commit -m "refactor: update pipeline_gate.sh case labels to new skill names"
```

---

## Task 10: Update Test Suite and Run Tests

**Files:**
- Modify: `hooks/test_gate.sh`

Update all test invocations and descriptions to use new skill names.

**Lines 52–53** — `/arm` tests:

Old:
```bash
expect_allow "arm" "$NO_PIPELINE" "/arm with no .pipeline: allow"
expect_allow "arm" "$HAS_BRIEF"   "/arm with brief: allow"
```
New:
```bash
expect_allow "brief" "$NO_PIPELINE" "/brief with no .pipeline: allow"
expect_allow "brief" "$HAS_BRIEF"   "/brief with brief: allow"
```

**Lines 60–62** — `/ar` tests:

Old:
```bash
expect_block "ar" "$NO_PIPELINE" "/ar with no .pipeline: block"
expect_block "ar" "$HAS_BRIEF"   "/ar with only brief: block"
expect_allow "ar" "$HAS_DESIGN"  "/ar with design.md: allow"
```
New:
```bash
expect_block "review" "$NO_PIPELINE" "/review with no .pipeline: block"
expect_block "review" "$HAS_BRIEF"   "/review with only brief: block"
expect_allow "review" "$HAS_DESIGN"  "/review with design.md: allow"
```

**Lines 75–76** — `/pmatch` tests:

Old:
```bash
expect_block "pmatch" "$NO_PIPELINE" "/pmatch without plan: block"
expect_allow "pmatch" "$HAS_PLAN"    "/pmatch with plan.md: allow"
```
New:
```bash
expect_block "drift-check" "$NO_PIPELINE" "/drift-check without plan: block"
expect_allow "drift-check" "$HAS_PLAN"    "/drift-check with plan.md: allow"
```

**Line 79** — QA skills loop:

Old:
```bash
for skill in qa denoise qf qb qd security-review; do
```
New:
```bash
for skill in qa cleanup frontend-audit backend-audit doc-audit security-review; do
```

**Run the tests:**

```bash
bash hooks/test_gate.sh
```
Expected output: `Results: 44 passed, 0 failed`

**Commit:**

```bash
git add hooks/test_gate.sh
git commit -m "refactor: update test_gate.sh to use new skill names — 44/44 passing"
```

---

## Task 11: Update README

**Files:**
- Modify: `README.md`

The README has many references to old names. Apply these replacements throughout the file (use search-and-replace carefully — some replacements are context-dependent):

### Pipeline diagram (top of file)

| Old | New |
|-----|-----|
| ` └─ /arm        → .pipeline/brief.md` | ` └─ /brief      → .pipeline/brief.md` |
| `         └─ /ar → .pipeline/design.approved` | `         └─ /review → .pipeline/design.approved` |
| ` ├─ /denoise` | ` ├─ /cleanup` |
| ` ├─ /qf` | ` ├─ /frontend-audit` |
| ` ├─ /qb` | ` ├─ /backend-audit` |
| ` ├─ /qd` | ` ├─ /doc-audit` |

### Installation / smoke test section (~line 95–98)

| Old | New |
|-----|-----|
| `/arm` | `/brief` |
| `the arm skill` | `the brief skill` |
| `trying \`/design\` before running \`/arm\`` | `trying \`/design\` before running \`/brief\`` |

### `.pipeline/` State Directory section (~lines 106–130)

| Old | New |
|-----|-----|
| `written by /arm` | `written by /brief` |
| `written by /ar when` | `written by /review when` |
| `after /pmatch passes` | `after /drift-check passes` |
| `start fresh from /arm` | `start fresh from /brief` |
| `redo /ar forward` | `redo /review forward` |

### Command reference section headers and bodies

| Old | New |
|-----|-----|
| `### /arm — Requirements Crystallization` | `### /brief — Requirements Crystallization` |
| `/arm` (usage code block) | `/brief` |
| `### /ar — Adversarial Review` | `### /review — Adversarial Review` |
| `/ar` (usage code block) | `/review` |
| `### /pmatch — Drift Detection` | `### /drift-check — Drift Detection` |
| `/pmatch` (usage code block and references) | `/drift-check` |
| `after /pmatch passes` | `after /drift-check passes` |
| `Runs /pmatch post-build` | `Runs /drift-check post-build` |

### QA table (~lines 240–243)

| Old | New |
|-----|-----|
| `\`/denoise\`` | `\`/cleanup\`` |
| `\`/qf\`` | `\`/frontend-audit\`` |
| `\`/qb\`` | `\`/backend-audit\`` |
| `\`/qd\`` | `\`/doc-audit\`` |

### Language Support Matrix (~line 363)

| Old | New |
|-----|-----|
| `/denoise` | `/cleanup` |

### End-to-end walkthrough (~lines 382–451)

| Old | New |
|-----|-----|
| `/arm` | `/brief` |
| `/ar` | `/review` |
| `# /pmatch runs post-build` | `# /drift-check runs post-build` |

### Troubleshooting section

| Old | New |
|-----|-----|
| `"No brief found. Run /arm first"` | `"No brief found. Run /brief first"` |
| `Run \`/arm\` first.` | `Run \`/brief\` first.` |
| `"Design not approved. Run /ar and iterate` | `"Design not approved. Run /review and iterate` |
| `Run \`/ar\` and iterate` | `Run \`/review\` and iterate` |

**Verify no old names remain:**

```bash
grep -c "\b/arm\b\|/ar\b\|\bpmatch\b\|/qf\b\|/qb\b\|/qd\b\|/denoise\b" README.md
```
Expected: `0`

**Commit:**

```bash
git add README.md
git commit -m "docs: update README — all skill references to new names"
```

---

## Final Verification

After all 11 tasks:

```bash
# Confirm all old skill directories are gone
ls skills/ | grep -E "^arm$|^ar$|^pmatch$|^qf$|^qb$|^qd$|^denoise$"
```
Expected: no output.

```bash
# Confirm all new skill directories exist
ls skills/ | grep -E "brief|review|drift-check|frontend-audit|backend-audit|doc-audit|cleanup"
```
Expected: all 7 new names listed.

```bash
# Run the gate test suite
bash hooks/test_gate.sh
```
Expected: `Results: 44 passed, 0 failed`

```bash
# Check git log
git log --oneline -13
```
Expected: 11 new commits on top of the existing history.
