# Plugin Quality Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address all findings from the plugin quality evaluation across three phases: immediate distribution blockers, important quality improvements, and polish/optimization.

**Architecture:** Pure file edits — no new dependencies, no new runtime behavior. Each task is a focused change to one or two files with a verification step. Test suite (`hooks/test_gate.sh`) is run after any hook script change.

**Tech Stack:** Bash, Node.js (statusline), JSON (manifest), Markdown (docs/skills)

---

## Phase 1 — Immediate (Distribution Blockers)

### Task 1: Fix version mismatch in plugin.json

**Files:**
- Modify: `.claude-plugin/plugin.json:3`

**Context:** `plugin.json` says `"version": "2.0.1"` but CHANGELOG shows `2.0.2` as the last released version. The `/release` skill was run but the manifest was not updated.

**Step 1: Open the file and verify the current state**

```bash
cat .claude-plugin/plugin.json
```
Expected: `"version": "2.0.1"` on line 3.

**Step 2: Update the version field**

Edit `.claude-plugin/plugin.json` line 3:

```json
{
  "name": "claude-developer-toolbox",
  "version": "2.0.2",
  "description": "Quality-gated development pipeline: brief → design → review → plan → build → qa",
  "author": {
    "name": "pemcoliveira"
  },
  "keywords": ["pipeline", "quality-gates", "tdd", "adversarial-review"],
  "mcpServers": {
    "repomix": {
      "command": "repomix",
      "args": ["--mcp"]
    }
  }
}
```

**Step 3: Verify JSON is valid**

```bash
python3 -m json.tool .claude-plugin/plugin.json
```
Expected: prints the formatted JSON without errors.

**Step 4: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "fix: bump plugin.json version to 2.0.2"
```

---

### Task 2: Commit the 4 pending context-optimization skill trims

**Files:**
- Modify: `skills/brief/SKILL.md` (staged)
- Modify: `skills/build/SKILL.md` (unstaged)
- Modify: `skills/init/SKILL.md` (unstaged)
- Modify: `skills/qa/SKILL.md` (unstaged)

**Context:** Four skills have uncommitted working-tree changes from a context-window optimization pass. The changes are:
- `brief/SKILL.md`: trims verbose MEMORY.md output block to single line
- `build/SKILL.md`: promotes 3-failure escalation to Hard Rule #4; steps reference it by rule number (DRY)
- `init/SKILL.md`: same MEMORY.md trim + empty-project questions extracted to `references/empty-project-questions.md`
- `qa/SKILL.md`: deduplicates PASS criteria — inline duplicates replaced with "Apply PASS Criteria (defined above)"

**Step 1: Verify the expected diffs are the only changes**

```bash
git diff HEAD -- skills/brief/SKILL.md skills/build/SKILL.md skills/init/SKILL.md skills/qa/SKILL.md
```
Expected: diffs matching the context-optimization descriptions above. If there are unexpected additional changes, review them before staging.

**Step 2: Stage all four files**

```bash
git add skills/brief/SKILL.md skills/build/SKILL.md skills/init/SKILL.md skills/qa/SKILL.md
```

**Step 3: Verify staged content**

```bash
git diff --cached --stat
```
Expected: 4 files changed, additions and deletions consistent with trimming.

**Step 4: Commit**

```bash
git commit -m "chore: context-window optimization — trim verbose MEMORY.md blocks and deduplicate PASS criteria"
```

---

### Task 3: Replace `<repo-url>` placeholder in README.md

**Files:**
- Modify: `README.md:56`

**Context:** The Quick Install section uses `<repo-url>` as a literal placeholder. The actual remote is `https://github.com/pmco23/claude-developer-toolbox.git`. Users following the guide get a broken `git clone` command.

**Step 1: Verify the placeholder is present**

```bash
grep -n "repo-url" README.md
```
Expected: one match at line 56 in the Quick Install section.

**Step 2: Replace the placeholder with the actual URL**

Edit `README.md` — replace:
```
git clone <repo-url> ~/claude-developer-toolbox
```
With:
```
git clone https://github.com/pmco23/claude-developer-toolbox.git ~/claude-developer-toolbox
```

**Step 3: Verify no other placeholders remain**

```bash
grep -n "<repo-url>\|<PLACEHOLDER>\|\[PLACEHOLDER\]" README.md
```
Expected: no matches (or only intentional ones in other sections).

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: replace <repo-url> placeholder with actual GitHub URL"
```

---

## Phase 2 — Next (Important Quality Improvements)

### Task 4: Add homepage and repository fields to plugin.json

**Files:**
- Modify: `.claude-plugin/plugin.json`

**Context:** The manifest lacks `homepage` and `repository` fields. These are needed for public marketplace discoverability and are expected by standard plugin tooling.

**Step 1: Open and inspect the current manifest**

```bash
cat .claude-plugin/plugin.json
```

**Step 2: Add the two new fields**

Edit `.claude-plugin/plugin.json` to add `homepage` and `repository` after the `keywords` line:

```json
{
  "name": "claude-developer-toolbox",
  "version": "2.0.2",
  "description": "Quality-gated development pipeline: brief → design → review → plan → build → qa",
  "author": {
    "name": "pemcoliveira"
  },
  "keywords": ["pipeline", "quality-gates", "tdd", "adversarial-review"],
  "homepage": "https://github.com/pmco23/claude-developer-toolbox",
  "repository": {
    "type": "git",
    "url": "https://github.com/pmco23/claude-developer-toolbox.git"
  },
  "mcpServers": {
    "repomix": {
      "command": "repomix",
      "args": ["--mcp"]
    }
  }
}
```

**Step 3: Validate JSON**

```bash
python3 -m json.tool .claude-plugin/plugin.json
```
Expected: no errors.

**Step 4: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "feat: add homepage and repository fields to plugin.json"
```

---

### Task 5: Add CHANGELOG link to README navigation

**Files:**
- Modify: `README.md`

**Context:** README has no link to CHANGELOG.md. Users upgrading won't know where to find release notes. Add a link in the Documentation section.

**Step 1: Inspect the Documentation section**

```bash
grep -n "^## \|CHANGELOG\|Changelog" README.md
```
Expected: Documentation section present, no CHANGELOG link.

**Step 2: Add CHANGELOG link**

In the `## Documentation` section, add a `### Releases` subsection or a direct link in the Guides table. Preferred placement: add a row to the Guides table:

```markdown
| [Changelog](CHANGELOG.md) | Release history and version notes |
```

Insert this as the **last row** of the Guides table (after the Troubleshooting row).

**Step 3: Verify the link renders correctly**

```bash
grep -n "CHANGELOG" README.md
```
Expected: one match in the Guides table.

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add CHANGELOG link to README documentation section"
```

---

### Task 6: Add `--deep` flag to quick skill trigger description

**Files:**
- Modify: `skills/quick/SKILL.md:4` (description field in YAML frontmatter)

**Context:** The `--deep` flag (escalates to Opus) is documented in the skill body but not in the trigger description. Users who scan the description never discover it.

**Step 1: Read the current frontmatter**

```bash
head -6 skills/quick/SKILL.md
```
Expected:
```yaml
---
name: quick
description: Use when implementing small features, bug fixes, typo corrections, config tweaks, or any well-understood change that does not require the full pipeline. Completely independent of the brief/design/review/plan/build/qa flow. Supports --parallel flag to escalate from Sonnet to Opus for trickier problems.
---
```

**Step 2: Update the description to mention --deep correctly**

The flag is `--deep` (not `--parallel`). Edit the description field:

```yaml
description: Use when implementing small features, bug fixes, typo corrections, config tweaks, or any well-understood change that does not require the full pipeline. Completely independent of the brief/design/review/plan/build/qa flow. Use --deep to escalate to Opus for trickier problems.
```

**Step 3: Verify the change**

```bash
head -6 skills/quick/SKILL.md
```
Expected: description now reads `Use --deep to escalate to Opus for trickier problems.`

**Step 4: Commit**

```bash
git add skills/quick/SKILL.md
git commit -m "docs: surface --deep flag in quick skill trigger description"
```

---

### Task 7: Add SESSION_ID UUID validation in context-monitor.sh

**Files:**
- Modify: `hooks/context-monitor.sh`

**Context:** `context-monitor.sh` reads `session_id` from the PostToolUse JSON payload and uses it directly to build a `/tmp/claude-ctx-${SESSION_ID}.json` file path. If `session_id` were ever non-UUID (e.g. path traversal characters), the temp file could be written outside `/tmp/`. Adding a UUID format check eliminates this.

**Step 1: Read the current SESSION_ID extraction block**

```bash
sed -n '30,37p' hooks/context-monitor.sh
```
Expected:
```bash
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | _json_stdin_field "session_id")

[[ -z "$SESSION_ID" ]] && exit 0

BRIDGE_FILE="/tmp/claude-ctx-${SESSION_ID}.json"
[[ ! -f "$BRIDGE_FILE" ]] && exit 0
```

**Step 2: Add UUID validation after extraction**

Replace the block:
```bash
SESSION_ID=$(echo "$INPUT" | _json_stdin_field "session_id")

[[ -z "$SESSION_ID" ]] && exit 0
```
With:
```bash
SESSION_ID=$(echo "$INPUT" | _json_stdin_field "session_id")

[[ -z "$SESSION_ID" ]] && exit 0
# Validate UUID format (hex + dashes) before using in file path
[[ ! "$SESSION_ID" =~ ^[0-9a-f-]+$ ]] && exit 0
```

**Step 3: Run the test gate to confirm no regressions**

```bash
bash hooks/test_gate.sh
```
Expected: `Results: 52 passed, 0 failed` (test_gate.sh covers pipeline_gate.sh; context-monitor.sh does not have dedicated scenario tests, but the gate should still pass).

**Step 4: Commit**

```bash
git add hooks/context-monitor.sh
git commit -m "fix: validate SESSION_ID as UUID before using in temp file path"
```

---

### Task 8: Add CONTRIBUTING.md to the plugin

**Files:**
- Create: `CONTRIBUTING.md`

**Context:** The plugin generates CONTRIBUTING.md for user projects via `/init` but has none itself. Users wanting to contribute have no documented process.

**Step 1: Verify it doesn't already exist**

```bash
ls CONTRIBUTING.md 2>/dev/null || echo "not found"
```
Expected: `not found`.

**Step 2: Create CONTRIBUTING.md**

Write `CONTRIBUTING.md` at the repo root:

```markdown
# Contributing

## Branching

Follow [Conventional Branch](https://conventional-branch.github.io/) — `<type>/<short-description>`.

Valid types: `feat`, `fix`, `chore`, `docs`, `refactor`, `release`

Examples: `feat/session-end-hook`, `fix/version-mismatch`, `docs/contributing-guide`

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) — `<type>[scope]: <description>`.

Examples:
- `feat: add compact-prep hook`
- `fix: bump plugin.json version to 2.0.2`
- `docs: add CHANGELOG link to README`
- `chore: context-window optimization trim`

## Development Setup

```bash
# Clone
git clone https://github.com/pmco23/claude-developer-toolbox.git
cd claude-developer-toolbox

# Register as local plugin
# In a Claude Code session:
/plugin marketplace add ./
/plugin install claude-developer-toolbox@local-dev
```

Restart Claude Code after install.

## Testing

Run the pipeline gate regression suite before any PR:

```bash
bash hooks/test_gate.sh
```

Expected: `Results: 52 passed, 0 failed`

## Pull Request Process

1. Branch from `main`
2. Make your changes
3. Run `bash hooks/test_gate.sh` — all 52 scenarios must pass
4. Update `CHANGELOG.md` under `## [Unreleased]`
5. Open PR against `main`

## Releases

Use the `/release` skill inside Claude Code to cut releases. It bumps `plugin.json`, updates CHANGELOG, commits, and tags. Never push tags manually.
```

**Step 3: Verify the file was created**

```bash
wc -l CONTRIBUTING.md
```
Expected: ~50 lines.

**Step 4: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING.md with branch, commit, dev setup, and release process"
```

---

## Phase 3 — Later (Polish and Optimization)

### Task 9: Replace python3 -c string interpolation with safe arg passing

**Files:**
- Modify: `hooks/compact-prep.sh:34`
- Modify: `hooks/context-monitor.sh` (`_json_file_field` function)

**Context:** Both files embed shell variables inside `python3 -c "..."` strings. While current inputs are controlled, the pattern is a maintenance trap. Replacing with `sys.argv` or heredoc eliminates the class of injection entirely.

**Step 1: Fix compact-prep.sh**

Read line 33–36:
```bash
sed -n '32,37p' hooks/compact-prep.sh
```
Expected:
```bash
if [ -f "$PIPELINE_DIR/repomix-pack.json" ]; then
  outputId=$(python3 -c "import json,sys; d=json.load(open('$PIPELINE_DIR/repomix-pack.json')); print(d.get('outputId',''))" 2>/dev/null)
  [ -n "$outputId" ] && echo "Repomix outputId: $outputId (verify age before reuse)"
fi
```

Replace the `python3 -c` line with a heredoc approach:
```bash
if [ -f "$PIPELINE_DIR/repomix-pack.json" ]; then
  outputId=$(python3 - "$PIPELINE_DIR/repomix-pack.json" <<'PYEOF' 2>/dev/null
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    print(d.get("outputId", ""))
except Exception:
    pass
PYEOF
)
  [ -n "$outputId" ] && echo "Repomix outputId: $outputId (verify age before reuse)"
fi
```

**Step 2: Fix context-monitor.sh `_json_file_field`**

Read the `_json_file_field` function:
```bash
sed -n '19,28p' hooks/context-monitor.sh
```
Expected:
```bash
_json_file_field() {
  local file="$1" field="$2" default="${3:-0}"
  if command -v jq >/dev/null 2>&1; then
    jq -r ".${field} // ${default}" "$file" 2>/dev/null || echo "$default"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "import json; d=json.load(open('${file}')); print(d.get('${field}',${default}))" 2>/dev/null || echo "$default"
  else
    echo "$default"
  fi
}
```

Replace the `python3 -c` line with `sys.argv`:
```bash
_json_file_field() {
  local file="$1" field="$2" default="${3:-0}"
  if command -v jq >/dev/null 2>&1; then
    jq -r ".${field} // ${default}" "$file" 2>/dev/null || echo "$default"
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$file" "$field" "$default" <<'PYEOF' 2>/dev/null || echo "$default"
import json, sys
file, field, default = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    d = json.load(open(file))
    print(d.get(field, default))
except Exception:
    print(default)
PYEOF
  else
    echo "$default"
  fi
}
```

**Step 3: Run the test gate**

```bash
bash hooks/test_gate.sh
```
Expected: `Results: 52 passed, 0 failed`

**Step 4: Commit**

```bash
git add hooks/compact-prep.sh hooks/context-monitor.sh
git commit -m "fix: replace python3 -c string interpolation with sys.argv in hook scripts"
```

---

### Task 10: Strengthen plugin-architecture skill trigger description

**Files:**
- Modify: `skills/plugin-architecture/SKILL.md:4`

**Context:** Current description `"Use when designing or evaluating Claude Code plugins — explains when to use skills vs agents and how to compose them correctly"` is vague. A more concrete trigger helps Claude route to it reliably.

**Step 1: Read the current description**

```bash
head -5 skills/plugin-architecture/SKILL.md
```

**Step 2: Update the description**

Replace the existing description with:
```yaml
description: Use when choosing between Skills and Agents for a plugin component, when fitness criteria for a skill-vs-agent decision are unclear, when deciding whether to use the thin-wrapper or split pattern, or when evaluating whether a nested agent pattern is appropriate. Provides the composition rules table and decision tree.
```

**Step 3: Verify**

```bash
head -5 skills/plugin-architecture/SKILL.md
```
Expected: new description present.

**Step 4: Commit**

```bash
git add skills/plugin-architecture/SKILL.md
git commit -m "docs: strengthen plugin-architecture skill trigger description with concrete decision examples"
```

---

### Task 11: Add version and description to marketplace.json

**Files:**
- Modify: `.claude-plugin/marketplace.json`

**Context:** The `plugins` array entry lacks `version` and `description` fields. These are needed for public marketplace submission and make the installed plugin's identity unambiguous.

**Step 1: Read the current marketplace.json**

```bash
cat .claude-plugin/marketplace.json
```
Expected:
```json
{
  "name": "local-dev",
  "owner": { "name": "pemcoliveira" },
  "plugins": [
    {
      "name": "claude-developer-toolbox",
      "source": "./"
    }
  ]
}
```

**Step 2: Add version and description**

```json
{
  "name": "local-dev",
  "owner": {
    "name": "pemcoliveira"
  },
  "plugins": [
    {
      "name": "claude-developer-toolbox",
      "version": "2.0.2",
      "description": "Quality-gated development pipeline: brief → design → review → plan → build → qa",
      "source": "./"
    }
  ]
}
```

**Step 3: Validate JSON**

```bash
python3 -m json.tool .claude-plugin/marketplace.json
```
Expected: no errors.

**Step 4: Commit**

```bash
git add .claude-plugin/marketplace.json
git commit -m "feat: add version and description to marketplace.json plugins entry"
```

---

## Verification Checklist

After all tasks are complete, run:

```bash
# Gate regression suite — must be 52/52
bash hooks/test_gate.sh

# Manifest version consistency check
python3 -c "
import json
p = json.load(open('.claude-plugin/plugin.json'))
m = json.load(open('.claude-plugin/marketplace.json'))
plugin_v = p['version']
market_v = m['plugins'][0]['version']
print(f'plugin.json: {plugin_v}')
print(f'marketplace.json: {market_v}')
print('PASS' if plugin_v == market_v else 'FAIL — version mismatch')
"

# No remaining placeholders in README
grep -n "<repo-url>\|<PLACEHOLDER>\|\[PLACEHOLDER\]" README.md && echo "FAIL — placeholder found" || echo "PASS — no placeholders"
```

All three checks must pass before tagging.
