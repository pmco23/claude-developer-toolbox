#!/usr/bin/env bash
# Tests pipeline-gate.sh and related hook JSON outputs against supported hook payloads.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$SCRIPT_DIR/pipeline-gate.sh"
GUARD="$SCRIPT_DIR/convention-guard.sh"
MONITOR="$SCRIPT_DIR/context-monitor.sh"
COMPACT="$SCRIPT_DIR/compact-prep.sh"
SESSION_SUMMARY="$SCRIPT_DIR/../scripts/session-summary.js"
SESSION_CONTEXT="$SCRIPT_DIR/../scripts/session-context.js"
PASS=0
FAIL=0

run_gate() {
  local prompt="$1"
  local test_dir="$2"
  printf '{"prompt":"%s"}\n' "$prompt" | PIPELINE_TEST_DIR="$test_dir" bash "$GATE"
}

expect_block_reason() {
  local prompt="$1"
  local test_dir="$2"
  local expected_fragment="$3"
  local desc="$4"
  local output
  output=$(run_gate "$prompt" "$test_dir")
  if echo "$output" | grep -q '"decision":"block"' && echo "$output" | grep -q "$expected_fragment"; then
    echo "PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "FAIL: $desc — expected block reason '$expected_fragment', got: '$output'"
    FAIL=$((FAIL+1))
  fi
}

expect_allow() {
  local prompt="$1"
  local test_dir="$2"
  local desc="$3"
  local output
  output=$(run_gate "$prompt" "$test_dir")
  if echo "$output" | grep -q '"decision":"block"'; then
    echo "FAIL: $desc — expected allow, got block: '$output'"
    FAIL=$((FAIL+1))
  else
    echo "PASS: $desc"
    PASS=$((PASS+1))
  fi
}

check_output_contains() {
  local output="$1"
  local expected_fragment="$2"
  local desc="$3"
  if echo "$output" | grep -q "$expected_fragment"; then
    echo "PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "FAIL: $desc — expected '$expected_fragment' in output, got: '$output'"
    FAIL=$((FAIL+1))
  fi
}

expect_empty_output() {
  local output="$1"
  local desc="$2"
  if [ -z "$output" ]; then
    echo "PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "FAIL: $desc — expected empty output, got: '$output'"
    FAIL=$((FAIL+1))
  fi
}

expect_file_contains() {
  local file_path="$1"
  local expected_fragment="$2"
  local desc="$3"
  if [ -f "$file_path" ] && grep -q "$expected_fragment" "$file_path"; then
    echo "PASS: $desc"
    PASS=$((PASS+1))
  else
    local content="<missing>"
    if [ -f "$file_path" ]; then
      content=$(cat "$file_path")
    fi
    echo "FAIL: $desc — expected '$expected_fragment' in '$file_path', got: '$content'"
    FAIL=$((FAIL+1))
  fi
}

expect_file_missing() {
  local file_path="$1"
  local desc="$2"
  if [ ! -e "$file_path" ]; then
    echo "PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "FAIL: $desc — expected file to be absent: '$file_path'"
    FAIL=$((FAIL+1))
  fi
}

run_session_summary() {
  local payload_file="$1"
  local project_dir="$2"
  CLAUDE_PROJECT_DIR="$project_dir" node "$SESSION_SUMMARY" < "$payload_file"
}

run_session_context() {
  local payload_file="$1"
  local project_dir="$2"
  CLAUDE_PROJECT_DIR="$project_dir" node "$SESSION_CONTEXT" < "$payload_file"
}

run_guard() {
  local file_path="$1"
  printf '{"tool_input":{"file_path":"%s"}}\n' "$file_path" | bash "$GUARD"
}

# Setup temp dirs
NO_PIPELINE=$(mktemp -d)
HAS_BRIEF=$(mktemp -d)    && mkdir -p "$HAS_BRIEF/.pipeline"    && touch "$HAS_BRIEF/.pipeline/brief.md"
HAS_DESIGN=$(mktemp -d)   && mkdir -p "$HAS_DESIGN/.pipeline"   && touch "$HAS_DESIGN/.pipeline/design.md"
HAS_APPROVED=$(mktemp -d) && mkdir -p "$HAS_APPROVED/.pipeline" && touch "$HAS_APPROVED/.pipeline/design.approved"
HAS_PLAN=$(mktemp -d)     && mkdir -p "$HAS_PLAN/.pipeline"     && touch "$HAS_PLAN/.pipeline/plan.md"
HAS_BUILD=$(mktemp -d)    && mkdir -p "$HAS_BUILD/.pipeline"    && touch "$HAS_BUILD/.pipeline/build.complete"

# /brief — always allowed
expect_allow "/brief" "$NO_PIPELINE" "/brief with no .pipeline: allow"
expect_allow "/brief" "$HAS_BRIEF"   "/brief with brief: allow"

# /design gate
expect_block_reason "/design" "$NO_PIPELINE" "No brief found" "/design with no .pipeline: block"
expect_allow "/design" "$HAS_BRIEF"   "/design with brief: allow"

# /review gate
expect_block_reason "/review" "$NO_PIPELINE" "No design doc found" "/review with no .pipeline: block"
expect_block_reason "/review" "$HAS_BRIEF"   "No design doc found" "/review with only brief: block"
expect_allow "/review" "$HAS_DESIGN"  "/review with design.md: allow"

# /plan gate
expect_block_reason "/plan" "$NO_PIPELINE" "Design not approved" "/plan with no .pipeline: block"
expect_block_reason "/plan" "$HAS_DESIGN" "Design not approved" "/plan with design.md but no approval: block"
expect_allow "/plan" "$HAS_APPROVED" "/plan with design.approved: allow"

# /build gate
expect_block_reason "/build" "$NO_PIPELINE" "No execution plan found" "/build with no .pipeline: block"
expect_block_reason "/build" "$HAS_APPROVED" "No execution plan found" "/build without plan: block"
expect_allow "/build" "$HAS_PLAN" "/build with plan.md: allow"

# /drift-check gate
expect_block_reason "/drift-check" "$NO_PIPELINE" "No execution plan found" "/drift-check without plan: block"
expect_allow "/drift-check" "$HAS_PLAN" "/drift-check with plan.md: allow"

# QA skills gate
for skill in qa cleanup frontend-audit backend-audit doc-audit security-review; do
  expect_block_reason "/$skill" "$NO_PIPELINE" "Build not complete" "/$skill without build.complete: block"
  expect_block_reason "/$skill" "$HAS_PLAN" "Build not complete" "/$skill with only plan (no build): block"
  expect_allow "/$skill" "$HAS_BUILD" "/$skill with build.complete: allow"
done

# /quick — always allowed, but emits warning when pipeline is active
expect_allow "/quick" "$NO_PIPELINE" "/quick with no pipeline: allow (no warning)"
expect_allow "/quick" "$HAS_BRIEF" "/quick at brief phase: allow (warn)"
expect_allow "/quick" "$HAS_DESIGN" "/quick at design phase: allow (warn)"
expect_allow "/quick" "$HAS_APPROVED" "/quick at planning phase: allow (warn)"
expect_allow "/quick" "$HAS_PLAN" "/quick with build in progress: allow (warn)"
expect_allow "/quick" "$HAS_BUILD" "/quick at QA phase: allow (warn)"

check_warning() {
  local test_dir="$1"
  local expected_fragment="$2"
  local desc="$3"
  local output
  output=$(run_gate "/quick" "$test_dir")
  check_output_contains "$output" "$expected_fragment" "$desc"
}

check_warning "$HAS_PLAN" "Build in progress" "/quick warns about active build"
check_warning "$HAS_BUILD" "QA phase" "/quick warns at QA phase"
check_warning "$HAS_APPROVED" "planning phase" "/quick warns at planning phase"
check_warning "$HAS_DESIGN" "design/review" "/quick warns at design/review phase"
check_warning "$HAS_BRIEF" "brief phase" "/quick warns at brief phase"

# /pack — always allowed (no gate)
expect_allow "/pack" "$NO_PIPELINE" "/pack with no pipeline: allow"
expect_allow "/pack" "$HAS_BRIEF" "/pack at brief phase: allow"
expect_allow "/pack" "$HAS_BUILD" "/pack at QA phase: allow"

# /test, /rollback, /reset — always allowed (self-gated internally)
expect_allow "/test" "$NO_PIPELINE" "/test with no pipeline: allow"
expect_allow "/rollback" "$NO_PIPELINE" "/rollback with no pipeline: allow"
expect_allow "/reset" "$NO_PIPELINE" "/reset with no pipeline: allow"
expect_allow "/reset" "$HAS_BUILD" "/reset at QA phase: allow"

# Non-slash prompt — ignored
empty_output=$(run_gate "summarize the repo" "$HAS_BUILD")
expect_empty_output "$empty_output" "non-slash prompt is ignored"

# convention-guard JSON
guard_output=$(run_guard "/tmp/x/.claude-plugin/foo.txt")
check_output_contains "$guard_output" '"permissionDecision":"deny"' "convention-guard denies non-manifest writes"
check_output_contains "$guard_output" 'Only manifests' "convention-guard deny reason included"

guard_output=$(run_guard "/tmp/x/.claude-plugin/plugin.json")
check_output_contains "$guard_output" 'systemMessage' "convention-guard emits version sync reminder"
check_output_contains "$guard_output" 'bump both' "convention-guard version sync reminder text"

guard_output=$(run_guard "/tmp/x/hooks/test.sh")
check_output_contains "$guard_output" 'systemMessage' "convention-guard emits hook reminder"
check_output_contains "$guard_output" 'test-gate.sh' "convention-guard hook reminder text"

# context-monitor JSON additionalContext
SESSION_ID="deadbeef-dead-beef-dead-beefdeadbeef"
BRIDGE_FILE="/tmp/claude-ctx-${SESSION_ID}.json"
printf '{"used_pct":96,"timestamp":%s}\n' "$(date +%s)" > "$BRIDGE_FILE"
monitor_output=$(printf '{"session_id":"%s"}\n' "$SESSION_ID" | bash "$MONITOR")
check_output_contains "$monitor_output" 'Context critical' "context-monitor emits additionalContext when threshold exceeded"
printf '{"used_pct":96,"timestamp":0}\n' > "$BRIDGE_FILE"
monitor_output=$(printf '{"session_id":"%s"}\n' "$SESSION_ID" | bash "$MONITOR")
expect_empty_output "$monitor_output" "context-monitor skips stale bridge files"
rm -f "$BRIDGE_FILE"

# compact-prep JSON additionalContext
compact_dir=$(mktemp -d)
mkdir -p "$compact_dir/.pipeline"
touch "$compact_dir/.pipeline/brief.md" "$compact_dir/.pipeline/design.md" "$compact_dir/.pipeline/plan.md"
printf 'abc' > "$compact_dir/.pipeline/repomix-code.xml"
compact_output=$(PIPELINE_TEST_DIR="$compact_dir" bash "$COMPACT")
check_output_contains "$compact_output" 'Artifacts present:' "compact-prep emits pipeline artifact summary"
check_output_contains "$compact_output" 'build-ready' "compact-prep emits stage summary"
rm -rf "$compact_dir"

# session-summary / session-context smoke tests
session_dir=$(mktemp -d)
mkdir -p "$session_dir/project"
printf '.claude/session-log.md\n' > "$session_dir/project/.gitignore"
cat > "$session_dir/transcript.jsonl" <<'EOF'
{"type":"user","message":{"role":"user","content":"Implement session log memory for this plugin"},"timestamp":"2026-03-07T10:00:00.000Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I'll go with a SessionEnd summary hook and keep it local-only."},{"type":"tool_use","name":"Write","input":{"file_path":"scripts/session-summary.js"}},{"type":"tool_use","name":"Edit","input":{"file_path":"README.md"}}]},"timestamp":"2026-03-07T10:03:00.000Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Next step: verify the hook output and update documentation. Still need to add tests."}]},"timestamp":"2026-03-07T10:05:00.000Z"}
EOF
cat > "$session_dir/session-end.json" <<EOF
{"cwd":"$session_dir/project","hook_event_name":"SessionEnd","transcript_path":"$session_dir/transcript.jsonl","session_id":"session-memory-test"}
EOF
cat > "$session_dir/session-start.json" <<EOF
{"cwd":"$session_dir/project","hook_event_name":"SessionStart","session_id":"session-memory-test"}
EOF

run_session_summary "$session_dir/session-end.json" "$session_dir/project" >/dev/null 2>/dev/null
session_log="$session_dir/project/.claude/session-log.md"
expect_file_contains "$session_log" 'Implement session log memory for this plugin' "session-summary writes extracted goal"
expect_file_contains "$session_log" 'scripts/session-summary.js: written' "session-summary records key changes"
expect_file_contains "$session_log" 'Next step: verify the hook output and update documentation' "session-summary records open thread"

run_session_summary "$session_dir/session-end.json" "$session_dir/project" >/dev/null 2>/dev/null
entry_count=$(grep -c '^## Session:' "$session_log")
if [ "$entry_count" -eq 1 ]; then
  echo "PASS: session-summary skips duplicate SessionEnd append"
  PASS=$((PASS+1))
else
  echo "FAIL: session-summary skips duplicate SessionEnd append — expected 1 entry, got $entry_count"
  FAIL=$((FAIL+1))
fi

cat > "$session_log" <<'EOF'
## Session: 2026-03-07T09:00:00.000Z | 2m

**Goal:** oldest
**Outcome:** completed
**Key changes:**
- old.txt: edited
**Decisions made:**
- none
**Open threads:**
- none

---

## Session: 2026-03-07T09:10:00.000Z | 2m

**Goal:** older
**Outcome:** completed
**Key changes:**
- older.txt: edited
**Decisions made:**
- none
**Open threads:**
- none

---

## Session: 2026-03-07T09:20:00.000Z | 2m

**Goal:** newer
**Outcome:** completed
**Key changes:**
- newer.txt: edited
**Decisions made:**
- none
**Open threads:**
- none

---

## Session: 2026-03-07T09:30:00.000Z | 2m

**Goal:** newest
**Outcome:** completed
**Key changes:**
- newest.txt: edited
**Decisions made:**
- none
**Open threads:**
- none

---
EOF
context_output=$(run_session_context "$session_dir/session-start.json" "$session_dir/project" 2>/dev/null)
check_output_contains "$context_output" 'Recent Session History' "session-context emits header"
check_output_contains "$context_output" 'older.txt: edited' "session-context includes the third-most-recent entry"
check_output_contains "$context_output" 'newest.txt: edited' "session-context includes the newest entry"
if echo "$context_output" | grep -q 'Goal:** oldest'; then
  echo "FAIL: session-context limits output to the last three entries — oldest entry was included"
  FAIL=$((FAIL+1))
else
  echo "PASS: session-context limits output to the last three entries"
  PASS=$((PASS+1))
fi

empty_dir=$(mktemp -d)
mkdir -p "$empty_dir/project"
printf '' | CLAUDE_PROJECT_DIR="$empty_dir/project" node "$SESSION_SUMMARY" >/dev/null 2>/dev/null
expect_file_missing "$empty_dir/project/.claude/session-log.md" "session-summary ignores empty stdin without creating a log"

malformed_dir=$(mktemp -d)
mkdir -p "$malformed_dir/project"
printf 'not-json' | CLAUDE_PROJECT_DIR="$malformed_dir/project" node "$SESSION_SUMMARY" >/dev/null 2>/dev/null
expect_file_missing "$malformed_dir/project/.claude/session-log.md" "session-summary ignores malformed stdin without creating a log"

trim_dir=$(mktemp -d)
mkdir -p "$trim_dir/project/.claude"
printf '.claude/session-log.md\n' > "$trim_dir/project/.gitignore"
node - "$trim_dir/project/.claude/session-log.md" <<'EOF'
const fs = require("fs");
const filePath = process.argv[2];
let out = "";
for (let i = 0; i < 220; i += 1) {
  out += `## Session: 2026-03-07T09:${String(i % 60).padStart(2, "0")}:00.000Z | 2m\n\n`;
  out += `**Goal:** filler entry ${i} with enough repeated text to exercise trimming behavior across the 50KB log limit.\n`;
  out += "**Outcome:** completed\n";
  out += "**Key changes:**\n";
  out += `- filler-${i}.txt: edited\n`;
  out += "**Decisions made:**\n";
  out += "- none\n";
  out += "**Open threads:**\n";
  out += "- none\n\n---\n\n";
}
fs.writeFileSync(filePath, out, "utf8");
EOF
cat > "$trim_dir/transcript.jsonl" <<'EOF'
{"type":"user","message":{"role":"user","content":"Finalize the memory hook"},"timestamp":"2026-03-07T11:00:00.000Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Edit","input":{"file_path":"scripts/session-summary.js"}},{"type":"text","text":"We should keep only the newest entries if the log grows too large."}]},"timestamp":"2026-03-07T11:02:00.000Z"}
EOF
cat > "$trim_dir/session-end.json" <<EOF
{"cwd":"$trim_dir/project","hook_event_name":"SessionEnd","transcript_path":"$trim_dir/transcript.jsonl","session_id":"trim-test"}
EOF
run_session_summary "$trim_dir/session-end.json" "$trim_dir/project" >/dev/null 2>/dev/null
trim_size=$(wc -c < "$trim_dir/project/.claude/session-log.md" | tr -d ' ')
if [ "$trim_size" -le 51200 ]; then
  echo "PASS: session-summary trims logs to 50KB or less"
  PASS=$((PASS+1))
else
  echo "FAIL: session-summary trims logs to 50KB or less — got $trim_size bytes"
  FAIL=$((FAIL+1))
fi
expect_file_contains "$trim_dir/project/.claude/session-log.md" 'Finalize the memory hook' "session-summary preserves the newest entry after trimming"

# Cleanup
rm -rf "$NO_PIPELINE" "$HAS_BRIEF" "$HAS_DESIGN" "$HAS_APPROVED" "$HAS_PLAN" "$HAS_BUILD"
rm -rf "$session_dir" "$empty_dir" "$malformed_dir" "$trim_dir"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
