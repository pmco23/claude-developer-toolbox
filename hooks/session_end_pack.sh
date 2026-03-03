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

command -v repomix >/dev/null 2>&1 || exit 0
[ -d ".pipeline" ] || exit 0

repomix --compress --output ".pipeline/repomix-output.xml" . 2>/dev/null || exit 0

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if command -v python3 >/dev/null 2>&1; then
  python3 - <<'PYEOF'
import json, os, datetime, sys

pack_file = ".pipeline/repomix-pack.json"
output_file = ".pipeline/repomix-output.xml"

data = {}
try:
    with open(pack_file) as f:
        data = json.load(f)
except Exception:
    pass

# Refresh timestamp and record file path; leave outputId untouched
data["packedAt"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
data["source"]   = os.getcwd()
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
  [ -f ".pipeline/repomix-pack.json" ] && existing=$(cat ".pipeline/repomix-pack.json")
  echo "$existing" \
    | jq --arg t "$NOW" --arg src "$(pwd)" --arg fp ".pipeline/repomix-output.xml" \
      '. + {"packedAt": $t, "source": $src, "filePath": $fp}' \
    > ".pipeline/repomix-pack.json" 2>/dev/null || true
fi

exit 0
