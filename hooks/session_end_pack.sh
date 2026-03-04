#!/usr/bin/env bash
# session_end_pack.sh
# SessionEnd hook: packs the codebase with repomix CLI so the next session's /qa
# has a fresh snapshot at .pipeline/repomix-output.xml and a refreshed packedAt
# timestamp. The stored outputId (from any in-session /pack run) is left untouched —
# if the MCP server is still alive when the next session opens, /qa can reuse it.
#
# Skips silently if:
#   - repomix is not installed
#   - no .pipeline/ directory exists (no active pipeline project)
#   - CLAUDE.md contains "session-end-pack: disabled"

command -v repomix >/dev/null 2>&1 || exit 0

# Check for opt-out in CLAUDE.md (walk up to find it)
check_opt_out() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/CLAUDE.md" ]; then
      grep -qiE '^session-end-pack:\s*disabled' "$dir/CLAUDE.md" 2>/dev/null && return 0
      return 1
    fi
    dir=$(dirname "$dir")
  done
  return 1
}
check_opt_out && exit 0

# Walk up from cwd to find .pipeline/ directory (consistent with pipeline_gate.sh)
find_project_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.pipeline" ]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

PROJECT_ROOT=$(find_project_root) || exit 0
PIPELINE_DIR="$PROJECT_ROOT/.pipeline"

repomix --compress --output "$PIPELINE_DIR/repomix-output.xml" "$PROJECT_ROOT" 2>/dev/null || exit 0

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if command -v python3 >/dev/null 2>&1; then
  python3 - "$PIPELINE_DIR" "$PROJECT_ROOT" <<'PYEOF'
import json, os, datetime, sys

pipeline_dir = sys.argv[1]
project_root = sys.argv[2]
pack_file = os.path.join(pipeline_dir, "repomix-pack.json")
output_file = os.path.join(pipeline_dir, "repomix-output.xml")

data = {}
try:
    with open(pack_file) as f:
        data = json.load(f)
except Exception:
    pass

# Refresh timestamp and record file path; leave outputId untouched
data["packedAt"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
data["source"]   = project_root
data["filePath"] = output_file

try:
    data["fileSize"] = os.path.getsize(output_file)
except Exception:
    pass

with open(pack_file, "w") as f:
    json.dump(data, f, indent=2)
PYEOF

elif command -v jq >/dev/null 2>&1; then
  # Merge packedAt + filePath into existing JSON, or create minimal file
  existing="{}"
  [ -f "$PIPELINE_DIR/repomix-pack.json" ] && existing=$(cat "$PIPELINE_DIR/repomix-pack.json")
  echo "$existing" \
    | jq --arg t "$NOW" --arg src "$PROJECT_ROOT" --arg fp "$PIPELINE_DIR/repomix-output.xml" \
      '. + {"packedAt": $t, "source": $src, "filePath": $fp}' \
    > "$PIPELINE_DIR/repomix-pack.json" 2>/dev/null || true
fi

exit 0
