#!/usr/bin/env bash
# PostToolUse hook — warns Claude when context window is running low.
# Reads the bridge file written by hooks/statusline.js.

set -euo pipefail

# Parse session_id from the PostToolUse JSON payload on stdin
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d.get('session_id',''))" \
  2>/dev/null || true)

[[ -z "$SESSION_ID" ]] && exit 0

BRIDGE_FILE="/tmp/claude-ctx-${SESSION_ID}.json"
[[ ! -f "$BRIDGE_FILE" ]] && exit 0

USED_PCT=$(python3 -c \
  "import json; d=json.load(open('${BRIDGE_FILE}')); print(d.get('used_pct',0))" \
  2>/dev/null || echo "0")

TIMESTAMP=$(python3 -c \
  "import json; d=json.load(open('${BRIDGE_FILE}')); print(d.get('timestamp',0))" \
  2>/dev/null || echo "0")

NOW=$(date +%s)
AGE=$(( NOW - TIMESTAMP ))

# Only warn if bridge file is fresh (updated within last 60 seconds)
(( AGE > 60 )) && exit 0

if (( USED_PCT >= 95 )); then
  echo "💀 Context critical (${USED_PCT}%) — /compact now"
elif (( USED_PCT >= 81 )); then
  echo "⚠ Context at ${USED_PCT}% — /compact recommended"
elif (( USED_PCT >= 63 )); then
  echo "⚠ Context at ${USED_PCT}% — consider /compact soon"
fi
